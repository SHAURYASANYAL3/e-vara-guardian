import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import {
  ENROLLMENT_SEQUENCE,
  averageEmbeddings,
  challengeLabel,
  createVerificationSequence,
  detectFaceSnapshot,
  formatConfidence,
  loadFaceModels,
  type BiometricChallenge,
} from "@/lib/biometrics";

export interface BiometricScanResult {
  embedding: number[];
  anglesCompleted: string[];
  blinkDetected: boolean;
  completedChallenges: string[];
  sampleCount: number;
  confidence: number;
}

interface FaceScanProps {
  mode: "enroll" | "verify";
  consentGranted: boolean;
  onComplete: (result: BiometricScanResult) => void;
}

const CLOSED_EYE_THRESHOLD = 0.19;
const OPEN_EYE_THRESHOLD = 0.245;

const FaceScan = ({ mode, consentGranted, onComplete }: FaceScanProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const embeddingsRef = useRef<number[][]>([]);
  const blinkArmedRef = useRef(false);
  const stableFramesRef = useRef(0);
  const [active, setActive] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedChallenges, setCompletedChallenges] = useState<BiometricChallenge[]>([]);
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [confidence, setConfidence] = useState(0);

  const sequence = useMemo(
    () => (mode === "enroll" ? ENROLLMENT_SEQUENCE : createVerificationSequence()),
    [mode],
  );

  const currentChallenge = sequence[completedChallenges.length];

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const finish = useCallback(() => {
    const embedding = averageEmbeddings(embeddingsRef.current);
    if (!embedding.length) {
      setError("Unable to extract a stable face embedding. Please retry in brighter lighting.");
      stop();
      return;
    }

    onComplete({
      embedding,
      anglesCompleted: completedChallenges.filter((challenge) => challenge !== "blink") as Array<"front" | "turn_left" | "turn_right">,
      blinkDetected,
      completedChallenges,
      sampleCount,
      confidence,
    });
    stop();
  }, [blinkDetected, completedChallenges, confidence, onComplete, sampleCount, stop]);

  useEffect(() => {
    if (active && completedChallenges.length === sequence.length) {
      finish();
    }
  }, [active, completedChallenges, finish, sequence.length]);

  const handleSnapshot = useCallback(async () => {
    if (!videoRef.current || !currentChallenge) return;

    const snapshot = await detectFaceSnapshot(videoRef.current);
    if (!snapshot) {
      stableFramesRef.current = 0;
      return;
    }

    setConfidence(snapshot.confidence);
    setSampleCount((count) => count + 1);

    if (currentChallenge === "blink") {
      if (snapshot.eyeAspectRatio > OPEN_EYE_THRESHOLD) {
        blinkArmedRef.current = true;
      }

      if (blinkArmedRef.current && snapshot.eyeAspectRatio < CLOSED_EYE_THRESHOLD) {
        setBlinkDetected(true);
        setCompletedChallenges((current) => [...current, "blink"]);
      }

      return;
    }

    if (snapshot.direction === currentChallenge) {
      stableFramesRef.current += 1;
    } else {
      stableFramesRef.current = 0;
    }

    if (stableFramesRef.current >= 3) {
      embeddingsRef.current.push(snapshot.embedding);
      setCompletedChallenges((current) => [...current, currentChallenge]);
      stableFramesRef.current = 0;
    }
  }, [currentChallenge]);

  const start = useCallback(async () => {
    if (!consentGranted) {
      setError("Consent is required before activating the live camera.");
      return;
    }

    try {
      setError(null);
      setLoadingModels(true);
      setCompletedChallenges([]);
      setBlinkDetected(false);
      setSampleCount(0);
      setConfidence(0);
      embeddingsRef.current = [];
      blinkArmedRef.current = false;
      stableFramesRef.current = 0;

      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setActive(true);
      intervalRef.current = setInterval(() => {
        void handleSnapshot();
      }, 350);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Camera unavailable");
    } finally {
      setLoadingModels(false);
    }
  }, [consentGranted, handleSnapshot]);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">
          {mode === "enroll" ? "Live Face Enrollment" : "Live Face Verification"}
        </h2>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-secondary">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
      </div>

      <div className="mt-4 rounded-md border border-border bg-secondary px-4 py-3">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Current challenge</p>
        <p className="mt-1 text-sm font-body text-foreground">{currentChallenge ? challengeLabel(currentChallenge) : "Scan complete"}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {sequence.map((challenge) => {
          const complete = completedChallenges.includes(challenge);
          return (
            <div key={challenge} className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2">
              <CheckCircle2 className={`h-4 w-4 ${complete ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-mono text-foreground">{challengeLabel(challenge)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-4 py-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Detector confidence</p>
          <p className="mt-1 text-sm font-body text-foreground">{formatConfidence(confidence)}</p>
        </div>
        <button
          onClick={active ? stop : () => void start()}
          disabled={loadingModels}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-mono transition-colors ${
            active ? "bg-background text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {loadingModels && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {active ? "Stop scan" : mode === "enroll" ? "Start live capture" : "Start live verification"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm font-body text-destructive">{error}</p>}
      <p className="mt-3 text-xs font-body leading-relaxed text-muted-foreground">
        Live camera only. The component uses face-api.js locally in the browser and never stores raw images.
      </p>
    </div>
  );
};

export default FaceScan;
