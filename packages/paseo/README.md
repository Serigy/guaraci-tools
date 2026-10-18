# Guaraci .gc templates for Paseo

A Paseo plugin for Guaraci projects. It adds a **Guaraci templates** workspace panel that lists every `.gc` template under the workspace's `views/` directory together with its lint status, and a **Lint Guaraci templates** Command Center item that opens the panel.

## What it does

- Workspace panel (Workspace tab and Explorer location) listing `views/**/*.gc`.
- Each row shows the file and its lint status: `clean`, `n findings`, or `not linted` (when the Guaraci CLI is missing), with the first finding's line and message.
- A Refresh button re-runs the lint.
- A plugin RPC (`gc.lint`) runs `guaraci check --json` on the daemon and maps the JSON findings onto the rows.

## Requirements

- Paseo >= 0.11.4.
- For linting: the Guaraci CLI installed on the daemon machine (`luarocks install guaraci`), so the `guaraci` binary is on the daemon's PATH. Without it the panel still lists templates, marked `not linted`, and shows what is missing.

## Limitation

Paseo 0.11.x plugins have no grammar or file-viewer contribution (checked against the plugin reference), so this plugin cannot add syntax highlighting or file preview for `.gc` templates. It delivers the nearest useful thing: a listing with lint status. Syntax highlighting for `.gc` exists as the separate VS Code extension in this repository (`packages/vscode`).

## Development

```
npm install
npm run typecheck
paseo plugin install /absolute/path/to/this/directory --id guaraci-gc
paseo plugin logs guaraci-gc
paseo plugin remove guaraci-gc
```

Backend code stays in `server/` (Node APIs, filesystem, `guaraci` subprocess); client code stays in `client/` (React Native primitives only, colors from `theme.colors`).
