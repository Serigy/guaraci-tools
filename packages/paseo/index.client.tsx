import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GcTemplatesPanel } from "./client/panel";

export default function contribute(client: PluginClientContext) {
  client.addWorkspacePanel({
    id: "gc-templates",
    title: "Guaraci templates",
    icon: "FileCode",
    context: "workspace",
    locations: ["workspace", "explorer"],
    Component: GcTemplatesPanel,
  });
  client.addCommandCenterItem({
    id: "lint-gc-templates",
    title: "Lint Guaraci templates",
    icon: "FileCode",
    keywords: ["guaraci", "gc", "template", "lint"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("gc-templates");
    },
  });
  console.log("[guaraci-gc] registered workspace panel gc-templates and command center item");
  return () => {};
}
