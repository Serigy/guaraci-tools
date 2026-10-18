# guaraci-tools

Editor and Paseo tooling for [Guaraci](https://github.com/Serigy/guaraci) `.gc` templates.

Guaraci templates (extension `.gc`) are HTML with Classic-ASP-style tags:

- `<% lua code %>` — code blocks
- `<%= lua expression %>` — output expressions (HTML-escaped)
- `include(name, data)` / `partial(name, data)` — template helpers

## Packages

| Package | Purpose |
|---|---|
| [`packages/vscode`](packages/vscode) | VS Code extension: language, grammar, snippets, lint plumbing |
| [`packages/paseo`](packages/paseo) | Paseo plugin: workspace panel with lint status (planned) |

## License

BSD-3-Clause (see [LICENSE](LICENSE)).
