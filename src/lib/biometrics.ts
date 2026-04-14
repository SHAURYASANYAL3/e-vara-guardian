import * as faceapi from "face-api.js";

export type HeadDirection = "front" | "turn_left" | "turn_right";
export type BiometricChallenge = HeadDirection | "blink";

export interface FaceDetectionSnapshot {
  embedding: number[];
  confidence: number;
  eyeAspectRatio: number;
  direction: HeadDirection;
}

const MODEL_URL = "/models";
const TINY_FACE_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
});

let modelPromise: Promise<void> | null = null;
let enginePromise: Promise<void> | null = null;
let preferredBackend: "webgl" | "cpu" = "webgl";

function getUserMediaSupport() {
  if (typeof navigator === "undefined") {
    throw new Error("Camera access is only available in a browser environment.");
  }

  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia) {
    throw new Error("This browser or context does not support camera access. Try HTTPS or localhost in a modern browser.");
  }

  return mediaDevices;
}

export async function requestUserCamera() {
  const mediaDevices = getUserMediaSupport();

  return mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
}


async function ensureFaceApiBackend() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const backends: Array<"webgl" | "cpu"> =
        preferredBackend === "webgl" ? ["webgl", "cpu"] : ["cpu", "webgl"];

      for (const backend of backends) {
        try {
          const initialized = await faceapi.tf.setBackend(backend);
          await faceapi.tf.ready();

          if (initialized && faceapi.tf.getBackend() === backend) {
            preferredBackend = backend;
            return;
          }
        } catch {
          // Try the next backend.
        }
      }

      throw new Error("Unable to initialize a TensorFlow backend for face detection.");
    })();
  }

  return enginePromise;
}

async function switchFaceApiBackend(nextBackend: "webgl" | "cpu") {
  preferredBackend = nextBackend;
  enginePromise = null;
  await ensureFaceApiBackend();
}

function isRecoverableBackendError(error: unknown) {
  return error instanceof Error && /backend|webgl|tensor/i.test(error.message);
}

export async function loadFaceModels() {
  if (!modelPromise) {
    modelPromise = ensureFaceApiBackend().then(() => Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])).then(() => undefined);
  }

  return modelPromise;
}

function distance(a: faceapi.Point, b: faceapi.Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(eye: faceapi.Point[]) {
  const vertical1 = distance(eye[1], eye[5]);
  const vertical2 = distance(eye[2], eye[4]);
  const horizontal = distance(eye[0], eye[3]);

  if (!horizontal) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

export function getHeadDirection(landmarks: faceapi.FaceLandmarks68): HeadDirection {
  const jaw = landmarks.getJawOutline();
  const nose = landmarks.getNose();
  const leftJaw = jaw[0].x;
  const rightJaw = jaw[16].x;
  const noseBridge = nose[3]?.x ?? nose[0]?.x ?? (leftJaw + rightJaw) / 2;
  const normalized = (noseBridge - leftJaw) / Math.max(rightJaw - leftJaw, 1);

  if (normalized < 0.42) return "turn_left";
  if (normalized > 0.58) return "turn_right";
  return "front";
}

export async function detectFaceSnapshot(video: HTMLVideoElement, allowBackendFallback = true): Promise<FaceDetectionSnapshot | null> {
  try {
    await ensureFaceApiBackend();

    const result = await faceapi
      .detectSingleFace(video, TINY_FACE_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) return null;

    const leftEAR = eyeAspectRatio(result.landmarks.getLeftEye());
    const rightEAR = eyeAspectRatio(result.landmarks.getRightEye());

    return {
      embedding: Array.from(result.descriptor),
      confidence: result.detection.score,
      eyeAspectRatio: (leftEAR + rightEAR) / 2,
      direction: getHeadDirection(result.landmarks),
    };
  } catch (error) {
    if (allowBackendFallback && preferredBackend !== "cpu" && isRecoverableBackendError(error)) {
      await switchFaceApiBackend("cpu");
      return detectFaceSnapshot(video, false);
    }

    throw error;
  }
}

export function averageEmbeddings(embeddings: number[][]) {
  if (!embeddings.length) return [];

  const dimension = embeddings[0].length;
  const totals = new Array<number>(dimension).fill(0);

  for (const embedding of embeddings) {
    for (let index = 0; index < dimension; index += 1) {
      totals[index] += embedding[index] ?? 0;
    }
  }

  return totals.map((value) => value / embeddings.length);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] * a[index];
    magnitudeB += b[index] * b[index];
  }

  if (!magnitudeA || !magnitudeB) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export const ENROLLMENT_SEQUENCE: BiometricChallenge[] = ["front", "turn_left", "turn_right", "blink"];

export function createVerificationSequence(): BiometricChallenge[] {
  return ["front", Math.random() > 0.5 ? "turn_left" : "turn_right", "blink"];
}

export function challengeLabel(challenge: BiometricChallenge) {
  switch (challenge) {
    case "front":
      return "Look straight into the camera";
    case "turn_left":
      return "Turn your head left";
    case "turn_right":
      return "Turn your head right";
    case "blink":
      return "Blink once";
    default:
      return "Hold steady";
  }
}

export function formatConfidence(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function hasValidEmbedding(embedding: number[]) {
  return Array.isArray(embedding) && embedding.length === 128 && embedding.every((value) => Number.isFinite(value));
}

export function isTransientFaceApiError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("no face") || msg.includes("tensor") || msg.includes("webgl") || msg.includes("dimension");
}
