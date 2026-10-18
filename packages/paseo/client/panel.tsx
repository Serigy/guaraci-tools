import { type PluginWorkspacePanelProps, useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { gcLint, type LintResult } from "../shared/lint";

function statusStyle(result: LintResult, theme: { ok: object; findings: object; unchecked: object }) {
  if (result.status === "findings") return theme.findings;
  if (result.status === "ok") return theme.ok;
  return theme.unchecked;
}

export function GcTemplatesPanel({ theme, layout, workspaceId }: PluginWorkspacePanelProps) {
  const workspace = useWorkspace(workspaceId, (ws) => ({ name: ws.name, directory: ws.directory }));
  const lint = useRpc(gcLint);
  const cwd = workspace?.directory ?? null;
  const query = useQuery({
    queryKey: ["guaraci", "gc-lint", cwd],
    queryFn: () => lint({ cwd: cwd as string }),
    enabled: cwd !== null,
    staleTime: 30_000,
  });
  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      scroll: { flex: 1, padding: layout.compact ? 16 : 24, gap: 8 },
      title: { color: theme.colors.foreground, fontSize: layout.compact ? 18 : 22, fontWeight: "600" as const },
      subtitle: { color: theme.colors.foregroundMuted, fontSize: 13 },
      row: { flexDirection: "row" as const, justifyContent: "space-between" as const, gap: 8 },
      file: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
      status: { fontSize: 13 },
      ok: { color: theme.colors.statusSuccess },
      findings: { color: theme.colors.statusDanger },
      unchecked: { color: theme.colors.foregroundMuted },
      detail: { color: theme.colors.foregroundMuted, fontSize: 12 },
      refresh: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.accent,
        alignSelf: "flex-start" as const,
      },
      refreshText: { color: theme.colors.accentForeground, fontSize: 13 },
      empty: { color: theme.colors.foregroundMuted, fontSize: 13 },
    }),
    [theme, layout.compact],
  );

  const data = query.data;
  const results = data?.results ?? [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Guaraci templates</Text>
        <Text style={styles.subtitle}>
          {workspace?.name ?? "workspace"} - views/**/*.gc
        </Text>
        {cwd === null ? (
          <Text style={styles.empty}>Workspace directory unavailable.</Text>
        ) : query.isPending ? (
          <Text style={styles.empty}>Checking templates...</Text>
        ) : (
          <>
            {data && !data.available ? (
              <Text style={styles.detail}>{data.hint ?? "guaraci CLI unavailable"}</Text>
            ) : null}
            {results.length === 0 ? (
              <Text style={styles.empty}>No .gc templates under views/.</Text>
            ) : (
              results.map((result) => (
                <View key={result.file}>
                  <View style={styles.row}>
                    <Text style={styles.file}>{result.relative}</Text>
                    <Text style={[styles.status, statusStyle(result, styles)]}>
                      {result.status === "findings"
                        ? `${result.findings} finding${result.findings === 1 ? "" : "s"}`
                        : result.status === "ok"
                          ? "clean"
                          : "not linted"}
                    </Text>
                  </View>
                  {result.status === "findings" && result.diagnostics.length > 0 ? (
                    <Text style={styles.detail}>
                      {`line ${result.diagnostics[0].line}: ${result.diagnostics[0].message}`}
                      {result.diagnostics.length > 1
                        ? ` (+${result.diagnostics.length - 1} more)`
                        : ""}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh lint status"
              onPress={() => void query.refetch()}
              style={styles.refresh}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
