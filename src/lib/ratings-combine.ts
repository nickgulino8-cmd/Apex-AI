/**
 * Combine ratings of several photos from one session into one steadier rating.
 * Scores are averaged; the likely range widens to cover the spread between photos;
 * text (evidence, strengths, suggestions) is taken from the photo closest to the average.
 */
export type RatingLike = {
  ratable: boolean;
  reason_if_not: string;
  overall: { score: number; low: number; high: number };
  pillars: { pillar: string; score: number; evidence: string; note: string; improve?: { action: string; detail: string; impact: "small" | "moderate" | "large" }[] }[];
  leans_toward: string;
  leans_summary: string;
  strengths: string[];
  caveats: string[];
};

const r1 = (x: number) => Math.round(x * 10) / 10;

export function combineRatings<T extends RatingLike>(all: (T | null)[]): (T & { photos: number }) | null {
  const rs = all.filter((r): r is T => !!r && r.ratable);
  if (!rs.length) return null;
  if (rs.length === 1) return { ...rs[0], photos: 1 };
  const mean = rs.reduce((s, r) => s + r.overall.score, 0) / rs.length;
  const scores = rs.map((r) => r.overall.score);
  const closest = rs.reduce((a, b) => (Math.abs(b.overall.score - mean) < Math.abs(a.overall.score - mean) ? b : a));
  const pillars = closest.pillars.map((p) => {
    const vals = rs.map((r) => r.pillars.find((x) => x.pillar === p.pillar)?.score).filter((v): v is number => typeof v === "number" && v > 0);
    return { ...p, score: vals.length ? r1(vals.reduce((a, b) => a + b, 0) / vals.length) : p.score };
  });
  const leans = pillars.reduce((a, b) => (b.score > a.score ? b : a)).pillar;
  const spread = Math.max(...scores) - Math.min(...scores);
  const avgLow = rs.reduce((s, r) => s + r.overall.low, 0) / rs.length;
  const avgHigh = rs.reduce((s, r) => s + r.overall.high, 0) / rs.length;
  return {
    ...closest,
    overall: { score: r1(mean), low: r1(Math.min(avgLow, Math.min(...scores))), high: r1(Math.max(avgHigh, Math.max(...scores))) },
    pillars,
    leans_toward: leans,
    leans_summary: leans === closest.leans_toward ? closest.leans_summary : `Averaged across ${rs.length} photos, ${leans} scores highest.`,
    caveats: [`Averaged across ${rs.length} photos (individual scores ${scores.map(r1).join(", ")}; spread ${r1(spread)}).`, ...closest.caveats],
    photos: rs.length,
  };
}
