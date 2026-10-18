# Vendored test grammars

Dev/test-only assets used by the snapshot tests so that `text.html.basic` and
`source.lua` includes resolve. Not shipped in the .vsix (excluded via .vscodeignore).

| File | Source | License |
|---|---|---|
| `html.tmLanguage.json` | https://raw.githubusercontent.com/microsoft/vscode/1.85.0/extensions/html/syntaxes/html.tmLanguage.json | MIT (microsoft/vscode) |
| `lua.tmLanguage.json` | https://raw.githubusercontent.com/JetBrains/intellij-community/master/plugins/textmate/lib/bundles/lua/syntaxes/lua.tmLanguage.json | Apache-2.0 (JetBrains/intellij-community) |
| `js.tmLanguage.json` | minimal stand-in written in this repo (not the real VS Code JavaScript grammar) | BSD-3-Clause (this repo) |
| `css.tmLanguage.json` | minimal stand-in written in this repo (not the real VS Code CSS grammar) | BSD-3-Clause (this repo) |
| `c.tmLanguage.json` | minimal stand-in written in this repo (stub for the Lua grammar's `source.c` include) | BSD-3-Clause (this repo) |
