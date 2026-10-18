import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import { gcLint, type LintDiagnostic, type LintResult } from "../shared/lint";

const execFileAsync = promisify(execFile);

const MAX_FILES = 500;
const MAX_BUFFER = 4 * 1024 * 1024;

async function findGcFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".gc")) {
        out.push(full);
      }
    }
  };
  await walk(root);
  out.sort();
  return out;
}

function uncheckedResult(cwd: string, file: string): LintResult {
  return {
    file,
    relative: path.relative(cwd, file),
    status: "unchecked",
    findings: 0,
    diagnostics: [],
  };
}

/** Parses newline-delimited guaraci check --json output. */
function parseDiagnostics(stdout: string): Map<string, LintDiagnostic[]> | null {
  const byFile = new Map<string, LintDiagnostic[]>();
  for (const line of stdout.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text) as { file?: unknown; diagnostics?: unknown };
      if (parsed && typeof parsed.file === "string" && Array.isArray(parsed.diagnostics)) {
        byFile.set(parsed.file, parsed.diagnostics as LintDiagnostic[]);
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
  return byFile;
}

export async function lintTemplates({ cwd }: RpcInput<typeof gcLint>) {
  const files = (await findGcFiles(path.join(cwd, "views"))).slice(0, MAX_FILES);
  if (files.length === 0) {
    return { available: true, results: [] };
  }
  const unchecked = files.map((file) => uncheckedResult(cwd, file));

  let stdout = "";
  try {
    const result = await execFileAsync("guaraci", ["check", "--json", ...files], { maxBuffer: MAX_BUFFER });
    stdout = result.stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string };
    if (err.code === "ENOENT") {
      return {
        available: false,
        hint: "guaraci CLI not found on the daemon PATH (luarocks install guaraci)",
        results: unchecked,
      };
    }
    if (typeof err.stdout === "string") {
      stdout = err.stdout;
    } else {
      return {
        available: false,
        hint: "guaraci check failed to run",
        results: unchecked,
      };
    }
  }

  const byFile = parseDiagnostics(stdout);
  if (byFile === null) {
    return {
      available: false,
      hint: "unparseable output from guaraci check",
      results: unchecked,
    };
  }

  const results: LintResult[] = files.map((file) => {
    const diagnostics = byFile.get(file) ?? [];
    return {
      file,
      relative: path.relative(cwd, file),
      status: diagnostics.length > 0 ? "findings" : "ok",
      findings: diagnostics.length,
      diagnostics,
    };
  });
  return { available: true, results };
}
