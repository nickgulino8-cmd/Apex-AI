// Copies MediaPipe's WASM runtime into /public so on-device vision is fully self-hosted.
import fs from "node:fs";
import path from "node:path";
const src = path.resolve("node_modules/@mediapipe/tasks-vision/wasm");
const dst = path.resolve("public/mediapipe");
if (fs.existsSync(src)) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
  console.log("mediapipe wasm copied");
}
