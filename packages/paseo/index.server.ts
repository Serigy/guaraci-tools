import type { PluginServerContext } from "@getpaseo/plugin/server";
import { lintTemplates } from "./server/lint";
import { gcLint } from "./shared/lint";

export default function contribute(server: PluginServerContext) {
  server.handle(gcLint, lintTemplates);
  console.log("[guaraci-gc] gc.lint handler registered");
  return () => {};
}
