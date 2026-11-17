"use client";
/**
 * On-device vision via MediaPipe Tasks. Models and WASM are self-hosted under /mediapipe,
 * so images never leave the browser for landmark detection.
 */
import { BASE } from "./base";
import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

let face: Promise<FaceLandmarker> | null = null;
let pose: Promise<PoseLandmarker> | null = null;
let faceVideo: Promise<FaceLandmarker> | null = null;

async function fileset() {
  const { FilesetResolver } = await import("@mediapipe/tasks-vision");
  return FilesetResolver.forVisionTasks(`${BASE}/mediapipe`);
}

export function faceLandmarker() {
  return (face ??= (async () => {
    const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
    return FaceLandmarker.createFromOptions(await fileset(), {
      baseOptions: { modelAssetPath: `${BASE}/mediapipe/face_landmarker.task`, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 2,
    });
  })().catch((e) => { face = null; throw e; }));
}

export function poseLandmarker() {
  return (pose ??= (async () => {
    const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
    return PoseLandmarker.createFromOptions(await fileset(), {
      baseOptions: { modelAssetPath: `${BASE}/mediapipe/pose_landmarker_lite.task`, delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 1,
    });
  })().catch((e) => { pose = null; throw e; }));
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** Separate VIDEO-mode instance for the live capture guide. */
export function faceLandmarkerVideo() {
  return (faceVideo ??= (async () => {
    const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
    return FaceLandmarker.createFromOptions(await fileset(), {
      baseOptions: { modelAssetPath: `${BASE}/mediapipe/face_landmarker.task`, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 2,
    });
  })().catch((e) => { faceVideo = null; throw e; }));
}
