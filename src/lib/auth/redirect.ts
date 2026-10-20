export function safeNextPath(value: string | null | undefined): string {
  if (!value) {
    return "/";
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return "/";
  }

  return value;
}
