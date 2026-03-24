export function parseApiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { error?: { code?: unknown } } } })
    ?.response?.data?.error?.code;
  return typeof code === "string" ? code : null;
}

export function formatAuditAction(value: string): string {
  return value.replace(/[._]/g, " ");
}