/**
 * RC7: agrupa lançamentos por vencimento e ordena pela proximidade do período do extrato:
 * atrasados (antes do período, do mais próximo ao mais antigo), depois os do período
 * (crescente), depois futuros (crescente).
 */
export function orderDueDateGroups<T>(
  groups: { date: string; items: T[] }[],
  periodFrom: string,
  periodTo: string,
): { date: string; items: T[]; bucket: "before" | "period" | "after" }[] {
  const bucketOf = (d: string) => (d < periodFrom ? "before" : d > periodTo ? "after" : "period");
  const rank = { before: 0, period: 1, after: 2 } as const;
  return groups
    .map((g) => ({ ...g, bucket: bucketOf(g.date) as "before" | "period" | "after" }))
    .sort((a, b) => {
      if (a.bucket !== b.bucket) return rank[a.bucket] - rank[b.bucket];
      if (a.bucket === "before") return b.date.localeCompare(a.date);
      return a.date.localeCompare(b.date);
    });
}
