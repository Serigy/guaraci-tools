import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

const diagnostic = z.object({
  line: z.number(),
  col: z.number(),
  end_line: z.number(),
  severity: z.enum(["error", "warning"]),
  code: z.string(),
  message: z.string(),
});

const result = z.object({
  file: z.string(),
  relative: z.string(),
  status: z.enum(["ok", "findings", "unchecked"]),
  findings: z.number(),
  diagnostics: z.array(diagnostic),
});

export const gcLint = defineRpc({
  name: "gc.lint",
  input: z.object({ cwd: z.string() }),
  output: z.object({
    available: z.boolean(),
    hint: z.string().optional(),
    results: z.array(result),
  }),
});

export type LintDiagnostic = z.infer<typeof diagnostic>;
export type LintResult = z.infer<typeof result>;
