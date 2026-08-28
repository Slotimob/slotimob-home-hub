export type AppTheme = "light" | "dark";

/**
 * Prefixos de rota das páginas públicas/institucionais (tema "site").
 * Fonte única da verdade — o script de boot do index.html usa a mesma lista.
 */
export const PUBLIC_ROUTE_PREFIXES = [
  '/lp/',
  '/blog',
  '/calculadoras',
  '/auth',
  '/reset-password',
  '/legal',
  '/apresentacao',
  '/checkout',
  '/planos',
  '/sobre',
  '/demo',
] as const;

/** Verdadeiro se o caminho é a raiz ou começa com um prefixo público. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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
