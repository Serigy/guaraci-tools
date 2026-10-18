"use strict";

/**
 * Guaraci .gc template support for VS Code.
 *
 * Lints templates through `guaraci check --json` (the Guaraci CLI, installed
 * with LuaRocks). When the CLI binary cannot be spawned, falls back to running
 * the checker inside the configured Lua interpreter:
 *
 *   lua -e "package.path=<src>/?.lua;<src>/src/?.lua;...;
 *          os.exit(require('guaraci_cli.check').run(
 *            {'--json', '--mode', mode, file},
 *            {stdout=io.stdout, stderr=io.stderr}))"
 *
 * JSON contract (one object per file):
 *   {"file": "...", "diagnostics": [
 *     {"line": 1-based, "col": 1-based, "end_line": 1-based,
 *      "severity": "error"|"warning", "code": "...", "message": "..."}]}
 * Exit codes: 0 clean, 1 findings, 2 usage error.
 */

const vscode = require("vscode");
const { execFile } = require("child_process");

const LANGUAGE_ID = "gc";
const CHECK_COMMAND_ID = "guaraci.checkFile";
const DEBOUNCE_MS = 300;

/** @type {import("vscode").DiagnosticCollection} */
let diagnostics = null;
/** @type {import("vscode").StatusBarItem} */
let statusBarItem = null;

/** Map of document uri string -> { timer, child } */
const pending = new Map();

function getConfig() {
    return vscode.workspace.getConfiguration("guaraci");
}

function isGcDocument(doc) {
    return !!doc && (doc.languageId === LANGUAGE_ID || doc.fileName.endsWith(".gc"));
}

// ---------------------------------------------------------------------------
// Lua fallback program building
// ---------------------------------------------------------------------------

function luaStr(value) {
    const escaped = String(value).replace(/["\\\n\r\t]/g, (ch) => {
        switch (ch) {
            case '"': return '\\"';
            case "\\": return "\\\\";
            case "\n": return "\\n";
            case "\r": return "\\r";
            case "\t": return "\\t";
            default: return ch;
        }
    });
    return '"' + escaped + '"';
}

function luaList(values) {
    return "{" + values.map(luaStr).join(",") + "}";
}

/**
 * Builds the `lua -e` program that runs guaraci_cli.check directly.
 * @param {import("vscode").WorkspaceConfiguration} cfg
 * @param {import("vscode").TextDocument} doc
 */
function buildLuaProgram(cfg, doc) {
    const srcPath = String(cfg.get("srcPath") || "").trim();
    const mode = String(cfg.get("templateMode") || "html");
    const args = ["--json", "--mode", mode, doc.uri.fsPath];
    const pathPrefix = srcPath
        ? "package.path = " + luaStr(srcPath + "/?.lua") +
          " .. ';' .. " + luaStr(srcPath + "/src/?.lua") +
          " .. ';' .. package.path; "
        : "";
    return pathPrefix +
        "local ok, err = pcall(function() " +
        "os.exit(require(" + luaStr("guaraci_cli.check") + ").run(" +
        luaList(args) + ", { stdout = io.stdout, stderr = io.stderr })) " +
        "end) " +
        "io.stderr:write(" + luaStr("guaraci fallback failed: ") +
        " .. tostring(err) .. " + luaStr("\n") + ") os.exit(2)";
}

// ---------------------------------------------------------------------------
// Process management (debounce + cancel in-flight per document)
// ---------------------------------------------------------------------------

function cancelPending(key) {
    const entry = pending.get(key);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    if (entry.child) {
        try { entry.child.kill("SIGKILL"); } catch (e) { /* already gone */ }
    }
    pending.delete(key);
}

function setPending(key, timer, child) {
    const previous = pending.get(key);
    if (previous) {
        if (previous.timer) clearTimeout(previous.timer);
        if (previous.child) {
            try { previous.child.kill("SIGKILL"); } catch (e) { /* already gone */ }
        }
    }
    pending.set(key, { timer: timer || null, child: child || null });
}

function scheduleCheck(doc, delay) {
    const key = doc.uri.toString();
    cancelPending(key);
    const entry = { timer: null, child: null };
    entry.timer = setTimeout(() => {
        entry.timer = null;
        runCheck(doc, key);
    }, delay === undefined ? DEBOUNCE_MS : delay);
    pending.set(key, entry);
}

function runCheckNow(doc) {
    const key = doc.uri.toString();
    cancelPending(key);
    runCheck(doc, key);
}

// ---------------------------------------------------------------------------
// Checker execution
// ---------------------------------------------------------------------------

function execOptions() {
    return { maxBuffer: 4 * 1024 * 1024, windowsHide: true };
}

function runCheck(doc, key) {
    const cfg = getConfig();
    const cmd = String(cfg.get("checkCommand") || "").trim();
    if (!cmd) {
        runFallback(doc, key, cfg);
        return;
    }
    const args = ["check", "--json", "--mode", String(cfg.get("templateMode") || "html"), doc.uri.fsPath];
    const child = execFile(cmd, args, execOptions(), (err, stdout, stderr) => {
        pending.delete(key);
        if (err && err.killed) return; // cancelled in flight
        if (err && (err.code === "ENOENT" || typeof err.code !== "number")) {
            runFallback(doc, key, cfg);
            return;
        }
        applyResult(doc, err, stdout, stderr, cmd);
    });
    setPending(key, null, child);
}

function runFallback(doc, key, cfg) {
    const lua = String(cfg.get("luaPath") || "").trim();
    if (!lua) {
        showUnavailable();
        return;
    }
    const program = buildLuaProgram(cfg, doc);
    const child = execFile(lua, ["-e", program], execOptions(), (err, stdout, stderr) => {
        pending.delete(key);
        if (err && err.killed) return; // cancelled in flight
        if (err && (err.code === "ENOENT" || typeof err.code !== "number")) {
            showUnavailable();
            return;
        }
        applyResult(doc, err, stdout, stderr, lua + " -e");
    });
    setPending(key, null, child);
}

// ---------------------------------------------------------------------------
// Result handling
// ---------------------------------------------------------------------------

/** Parses newline-delimited checker JSON. Returns an array or null on failure. */
function parseCheckerOutput(stdout) {
    const found = [];
    for (const line of String(stdout || "").split("\n")) {
        const text = line.trim();
        if (!text) continue;
        let obj;
        try {
            obj = JSON.parse(text);
        } catch (e) {
            return null;
        }
        if (!obj || !Array.isArray(obj.diagnostics)) return null;
        for (const d of obj.diagnostics) found.push(d);
    }
    return found;
}

function toDiagnostic(d) {
    const line = Math.max(1, Math.floor(d.line) || 1);
    const col = Math.max(1, Math.floor(d.col) || 1);
    const endLine = Math.max(line, Math.floor(d.end_line) || line);
    const range = new vscode.Range(line - 1, col - 1, endLine - 1, col);
    const severity = d.severity === "error"
        ? vscode.DiagnosticSeverity.Error
        : vscode.DiagnosticSeverity.Warning;
    const diagnostic = new vscode.Diagnostic(range, String(d.message || "guaraci finding"), severity);
    diagnostic.source = "guaraci";
    if (d.code !== undefined && d.code !== null) diagnostic.code = String(d.code);
    return diagnostic;
}

function applyResult(doc, err, stdout, stderr, what) {
    const items = parseCheckerOutput(stdout);
    if (items === null || (err && typeof err.code === "number" && err.code > 1)) {
        showCheckerFailed(what, stderr);
        return;
    }
    hideWarning();
    diagnostics.set(doc.uri, items.map(toDiagnostic));
}

// ---------------------------------------------------------------------------
// Status bar (single shared warning when the checker cannot run)
// ---------------------------------------------------------------------------

function showUnavailable() {
    statusBarItem.text = "$(alert) guaraci";
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBarItem.tooltip = "Guaraci checker unavailable. Set guaraci.checkCommand (LuaRocks binary) or guaraci.luaPath + guaraci.srcPath (source checkout). Click to retry.";
    statusBarItem.show();
    console.warn("[guaraci] checker unavailable: neither guaraci CLI nor lua fallback could be spawned");
}

function showCheckerFailed(what, stderr) {
    const firstLine = String(stderr || "").split("\n").filter((l) => l.trim())[0] || "no output";
    statusBarItem.text = "$(warning) guaraci";
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBarItem.tooltip = "guaraci check failed: " + firstLine;
    statusBarItem.show();
    console.warn("[guaraci] checker failed (" + what + "): " + String(stderr || "").trim());
}

function hideWarning() {
    statusBarItem.hide();
    statusBarItem.backgroundColor = undefined;
}

// ---------------------------------------------------------------------------
// Command + lifecycle
// ---------------------------------------------------------------------------

function onCommand() {
    const editor = vscode.window.activeTextEditor;
    if (editor && isGcDocument(editor.document)) {
        runCheckNow(editor.document);
        return;
    }
    vscode.window.showInformationMessage("Guaraci: open a .gc template to check it.");
}

function activate(context) {
    diagnostics = vscode.languages.createDiagnosticCollection("guaraci");
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    statusBarItem.name = "Guaraci";
    statusBarItem.command = CHECK_COMMAND_ID;

    const open = vscode.workspace.onDidOpenTextDocument((doc) => {
        if (isGcDocument(doc)) scheduleCheck(doc);
    });
    const save = vscode.workspace.onDidSaveTextDocument((doc) => {
        if (!isGcDocument(doc)) return;
        if (getConfig().get("lintOnSave") === false) return;
        scheduleCheck(doc, 0);
    });
    const active = vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isGcDocument(editor.document)) scheduleCheck(editor.document);
    });
    const close = vscode.workspace.onDidCloseTextDocument((doc) => {
        cancelPending(doc.uri.toString());
        diagnostics.delete(doc.uri);
    });
    const config = vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration("guaraci")) return;
        hideWarning();
        for (const doc of vscode.workspace.textDocuments) {
            if (isGcDocument(doc)) scheduleCheck(doc);
        }
    });
    const command = vscode.commands.registerCommand(CHECK_COMMAND_ID, onCommand);

    context.subscriptions.push(diagnostics, statusBarItem, open, save, active, close, config, command);

    const current = vscode.window.activeTextEditor;
    if (current && isGcDocument(current.document)) scheduleCheck(current.document);
}

function deactivate() {
    for (const key of Array.from(pending.keys())) cancelPending(key);
}

module.exports = { activate, deactivate };
