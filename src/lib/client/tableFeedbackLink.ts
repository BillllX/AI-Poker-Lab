const DEFAULT_FEEDBACK_BASE = "https://github.com/BillllX/texas-poker/issues/new";

export type TableFeedbackContext = {
  handId?: number;
  pageUrl?: string;
  phase?: string;
  tableId: string;
  tableName?: string;
};

function feedbackBaseUrl(): string {
  return process.env.NEXT_PUBLIC_TABLE_FEEDBACK_URL?.trim() || DEFAULT_FEEDBACK_BASE;
}

/** Prefilled GitHub issue / mailto link with live table context for in-table feedback (F18). */
export function buildTableFeedbackUrl(context: TableFeedbackContext): string {
  const base = feedbackBaseUrl();
  const title = `[Table feedback] ${context.tableName?.trim() || context.tableId}`;
  const body = [
    "## What happened?",
    "",
    "(Describe the issue)",
    "",
    "## Context",
    `- Table: ${context.tableName ?? "—"} (\`${context.tableId}\`)`,
    `- Hand: #${context.handId ?? "—"}`,
    `- Phase: ${context.phase ?? "—"}`,
    `- URL: ${context.pageUrl ?? "—"}`,
    `- Time: ${new Date().toISOString()}`,
  ].join("\n");

  if (base.startsWith("mailto:")) {
    const params = new URLSearchParams({ subject: title, body });
    return `${base}?${params.toString()}`;
  }

  try {
    const url = new URL(base);
    url.searchParams.set("title", title);
    url.searchParams.set("body", body);
    return url.toString();
  } catch {
    return base;
  }
}
