# Changelog

## 0.1.0

Initial release.

- Syntax highlighting for Guaraci `.gc` templates (HTML + `<% lua %>` / `<%= expression %>`), with Lua embedded through VS Code's built-in Lua grammar and an injection grammar that highlights template tags inside attribute values, `<script>`, and `<style>`.
- Language configuration: block comments, bracket matching, auto-closing pairs for `<%` / `<%=` and quotes, folding markers for `<% if/for/while/function/do %>` … `<% end %>`.
- Snippets for `<% %>`, `<%= %>`, `if`, `for`, `include`, `partial`.
- Linting through `guaraci check --json`, with an optional `lua5.4 -e` fallback for source checkouts.
