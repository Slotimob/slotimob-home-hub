import { cn } from "@/lib/utils";

export function formatCityLabel(
  city?: string | null,
  state?: string | null
): string | null {
  const c = city?.trim();
  if (!c) return null;
  const uf = state?.trim();
  return uf ? `${c}/${uf}` : c;
}

interface CityTextProps {
  city?: string | null;
  state?: string | null;
  className?: string;
}

/** Inline "Cidade/UF" text with UF muted, truncation and full-value tooltip. */
export function CityText({ city, state, className }: CityTextProps) {
  const c = city?.trim();
  const uf = state?.trim();

  if (!c) {
    return (
      <span className={cn("text-muted-foreground select-text", className)}>—</span>
    );
  }

  return (
    <span
      className={cn("block truncate select-text", className)}
      title={formatCityLabel(c, uf) ?? undefined}
    >
      {c}
      {uf && <span className="text-muted-foreground">/{uf}</span>}
    </span>
  );
}
