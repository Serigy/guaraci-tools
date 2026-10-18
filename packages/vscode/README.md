# Guaraci for VS Code

Editor support for [Guaraci](https://github.com/Serigy/guaraci) `.gc` templates: HTML with Classic-ASP-style tags `<% lua code %>`, `<%= lua expression %>`, and the `include(name, data)` / `partial(name, data)` helpers.

## Features

- **Syntax highlighting** — `.gc` files get full HTML plus Lua highlighting inside template tags. An injection grammar extends highlighting into attribute values, `<script>` blocks, and `<style>` blocks (e.g. `<a href="<%= url %>">`).
- **Language configuration** — block comments (`<!-- -->`), bracket matching and auto-closing for `<% %>` / `<%= %>`, quotes, and folding markers for `<% if/for/while/function/do %>` … `<% end %>` blocks.
- **Snippets** — `<% %>`, `<%= %>`, `if`, `for`, `include`, `partial`.
- **Linting** — templates are checked with `guaraci check --json` on open and save; findings appear as Problems (`source: guaraci`).

## Requirements

For linting, either:

- install the Guaraci CLI with LuaRocks (`luarocks install guaraci`), so the `guaraci` binary is on `PATH`; **or**
- keep the defaults and point `guaraci.srcPath` at a Guaraci source checkout, so the bundled `lua -e` fallback can load `guaraci_cli.check` directly.

Syntax highlighting and snippets work without the CLI.

## Commands

| Command             | Title                           |
| ------------------- | ------------------------------- |
| `guaraci.checkFile` | Guaraci: Check current template |

## Configuration

| Key                    | Default     | Description                                                                                                                                      |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `guaraci.checkCommand` | `"guaraci"` | CLI binary used for linting. Falls back to the Lua interpreter below when it cannot be spawned.                                                  |
| `guaraci.luaPath`      | `"lua5.4"`  | Lua interpreter used by the `lua -e` fallback.                                                                                                   |
| `guaraci.srcPath`      | `""`        | Guaraci source checkout for the fallback (module path `<src>/*.lua` and `<src>/src/*.lua`). Leave empty when Guaraci is installed with LuaRocks. |
| `guaraci.lintOnSave`   | `true`      | Check templates on save.                                                                                                                         |
| `guaraci.templateMode` | `"html"`    | Checker mode: `html` warns about template tags in `<script>`/`<style>` contexts, `text` suppresses those warnings.                               |

A single status-bar warning appears when neither the CLI nor the fallback can run.

## Development

No bundler, no runtime dependencies — plain JavaScript.

```bash
npm install
npm run test:grammar   # vscode-tmgrammar-snap over test/fixtures/*.gc
npm run package         # produces guaraci-vscode-<version>.vsix
node --check extension.js
```

Test grammars vendored under `test/grammars/` (see `test/grammars/README.md`) are excluded from the packaged `.vsix`.

## Known limitations

- An unclosed `<%` runs to the next `%>` (or end of file): the grammar keeps the Lua scope open that far, and the linter flags it as `template-syntax`.
- `%>` inside a Lua string literal ends the tag for the compiler; there is no escape sequence for it.
- `guaraci check` flags `<%` inside HTML comments as an unclosed tag; keep Lua out of comments.
- This package was developed and verified without a local VS Code binary (snapshots, `node --check`, `vsce ls`); the visual UI check in a real editor is a user step.

## License

BSD-3-Clause — see [LICENSE](LICENSE).
