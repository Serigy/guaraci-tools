# Guaraci .gc templates

A workspace panel for Guaraci projects. The panel lists every `.gc` template under the workspace's `views/` directory together with its lint status, so you can see which templates are clean and which have findings without leaving Paseo.

Linting runs through the Guaraci CLI. The panel calls a plugin RPC on the daemon, which runs `guaraci check --json` over the found templates and maps each finding (line, column, severity, code, message) onto the file's row. A "Lint Guaraci templates" item in the Command Center opens the panel from anywhere.

Setup: the Guaraci CLI must be installed on the daemon machine, normally with LuaRocks, so the `guaraci` binary is on the daemon's PATH. The CLI comes from the Guaraci project. Without it the panel still lists templates, marked as not linted, and explains what is missing.

Known limits: Paseo plugins cannot contribute syntax highlighting or file viewers, so this panel does not color `.gc` templates or open them; it only lists and lints them. Syntax highlighting for `.gc` files exists as a separate VS Code extension in the same repository. Lint findings are those of `guaraci check`; templates outside `views/` are not listed.
