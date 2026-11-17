// Copies the WebAssembly runtimes (MediaPipe vision + sql.js SQLite) into /public so the app is fully self-hosted.
import fs from "node:fs";
import path from "node:path";
const copies = [
  ["node_modules/@mediapipe/tasks-vision/wasm", "public/mediapipe", () => true],
  ["node_modules/sql.js/dist", "public/sqljs", (f) => f === "sql-wasm.wasm" || f === "sql-wasm-browser.wasm"],
];
for (const [from, to, keep] of copies) {
  const src = path.resolve(from);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.resolve(to), { recursive: true });
  for (const f of fs.readdirSync(src).filter(keep)) fs.copyFileSync(path.join(src, f), path.resolve(to, f));
}
console.log("wasm runtimes copied");
