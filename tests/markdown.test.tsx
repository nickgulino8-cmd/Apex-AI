import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/Markdown";
test("markdown terminates on tricky input", () => {
  const html = renderToStaticMarkup(Markdown({ text: "**Day 1 · Push**\n\nReason here.\n\n- a\n- **b**\n\n1. one\n\n| a | b |\n|---|---|\n| 1 | 2 |\n*italic line*\n#nohash\n<script>alert(1)</script>" }));
  assert.ok(html.includes("<strong>Day 1 · Push</strong>"));
  assert.ok(!html.includes("<script>"));
});
