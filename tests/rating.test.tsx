import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RatingCard } from "../src/components/RatingCard";

test("rating card renders pillars and highlights the leaning pillar", () => {
  const html = renderToStaticMarkup(
    RatingCard({
      title: "Facial rating",
      rating: {
        ratable: true, reason_if_not: "",
        overall: { score: 6.2, low: 5.6, high: 6.9 },
        pillars: [
          { pillar: "harmony", score: 6.5, evidence: "Thirds within 3% of each other.", note: "" },
          { pillar: "angularity", score: 5.8, evidence: "Jaw-to-cheek 0.86.", note: "" },
          { pillar: "dimorphism", score: 6.0, evidence: "FWHR 1.9.", note: "" },
          { pillar: "features", score: 6.4, evidence: "Positive canthal tilt.", note: "" },
        ],
        leans_toward: "harmony", leans_summary: "Balanced proportions are the strongest pillar.",
        strengths: ["Even facial thirds"], modifiable: [{ area: "Skin", suggestion: "Daily sunscreen and a retinoid.", impact: "moderate" }],
        caveats: ["Single photo."],
      },
    }),
  );
  assert.ok(html.includes("6.2"));
  assert.ok(html.includes("Leans here"));
  assert.equal((html.match(/Leans here/g) ?? []).length, 1);
  assert.ok(html.includes("Harmony") && html.includes("Angularity") && html.includes("Dimorphism") && html.includes("Features"));
});

test("rating card shows the reason when a rating was declined", () => {
  const html = renderToStaticMarkup(RatingCard({ title: "x", rating: null, error: "Photo is heavily filtered." }) ?? <div />);
  assert.ok(html.includes("heavily filtered"));
});
