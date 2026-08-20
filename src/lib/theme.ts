export type AppTheme = "light" | "dark";

/**
 * Normaliza qualquer valor de tema (inclusive os legados light-green,
 * light-blue, light-purple, dark-green, dark-purple) para "light" ou "dark".
 */
export function normalizeTheme(value?: string | null): AppTheme {
  if (typeof value === "string" && value.trim().toLowerCase().startsWith("dark")) {
    return "dark";
  }
  return "light";
}

export function applyTheme(value?: string | null): AppTheme {
  const theme = normalizeTheme(value);
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}
