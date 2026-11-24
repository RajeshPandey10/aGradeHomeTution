const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** "Rs. 12,000" (Indian/Nepali digit grouping). */
export const formatRs = (amount: number | null | undefined) => `Rs. ${rupees.format(Number(amount) || 0)}`;

/** Rs. 1.2L / 45.3K for tight spaces; full figure below 10,000. */
export function formatRsCompact(amount: number | null | undefined): string {
  const n = Number(amount) || 0;
  if (Math.abs(n) >= 100000) return `Rs. ${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (Math.abs(n) >= 10000) return `Rs. ${(n / 1000).toFixed(1)}K`;
  return formatRs(n);
}

/** The number in a salary string ("Rs. 12,000/month" → 12000), or 0. Mirrors the backend's parseSalary. */
export function parseSalary(salary: string | number | null | undefined): number {
  const match = String(salary ?? "").match(/\d[\d,]*(\.\d+)?/);
  return match ? Number(match[0].replace(/,/g, "")) || 0 : 0;
}
