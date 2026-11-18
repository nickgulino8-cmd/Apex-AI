import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { RatingCard } from "../src/components/RatingCard";

test("rating card renders pillars and highlights the leaning pillar", () => {
  const rating = {
        ratable: true, reason_if_not: "",
        overall: { score: 6.2, low: 5.6, high: 6.9 },
        pillars: [
          { pillar: "harmony", score: 6.5, evidence: "Thirds within 3% of each other.", note: "", improve: [{ action: "Shape brows", detail: "Clean up the tail.", impact: "small" }] },
          { pillar: "angularity", score: 5.8, evidence: "Jaw-to-cheek 0.86.", note: "", improve: [{ action: "Get leaner", detail: "Training and diet reveal jaw definition.", impact: "large" }] },
          { pillar: "dimorphism", score: 6.0, evidence: "FWHR 1.9.", note: "" },
          { pillar: "features", score: 6.4, evidence: "Positive canthal tilt.", note: "" },
        ],
        leans_toward: "harmony", leans_summary: "Balanced proportions are the strongest pillar.",
        strengths: ["Even facial thirds"],
        caveats: ["Single photo."],
  } as const;
  const html = renderToStaticMarkup(<RatingCard title="Facial rating" rating={rating as never} />);
  assert.ok(html.includes("6.2"));
  assert.equal((html.match(/Strongest/g) ?? []).length, 1);
  // The weakest pillar (angularity) opens by default with its improvement plan.
  assert.ok(html.includes("How to improve") && html.includes("Get leaner"));
  assert.ok(!html.includes("Shape brows"), "other pillars stay collapsed");
  assert.ok(html.includes("Harmony") && html.includes("Angularity") && html.includes("Dimorphism") && html.includes("Features"));
});

test("rating card shows the reason when a rating was declined", () => {
  const html = renderToStaticMarkup(<RatingCard title="x" rating={null} error="Photo is heavily filtered." />);
  assert.ok(html.includes("heavily filtered"));
});
