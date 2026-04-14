import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ScanFace, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { detectFaceSnapshot, formatConfidence, isTransientFaceApiError, loadFaceModels, requestUserCamera } from "@/lib/biometrics";

interface RecognitionPanelProps {
  onRecognition?: () => void;
  onSuspiciousMatch?: () => void;
}

type MatchStatus = "idle" | "matched" | "duplicate" | "no_match" | "no_face" | "error";

const STATUS_LABELS: Record<MatchStatus, string> = {
  idle: "Recognition paused",
  matched: "Matched to your enrolled identity",
  duplicate: "Suspicious duplicate match detected",
  no_match: "No confident match",
  no_face: "No face detected",
  error: "Recognition unavailable",
};

const STATUS_STYLES: Record<MatchStatus, string> = {
  idle: "border-border bg-secondary text-muted-foreground",
  matched: "border-primary/30 bg-primary/10 text-foreground",
  duplicate: "border-destructive/30 bg-destructive/10 text-foreground",
  no_match: "border-border bg-secondary text-muted-foreground",
  no_face: "border-border bg-secondary text-muted-foreground",
  error: "border-destructive/30 bg-destructive/10 text-foreground",
};

const RecognitionPanel = ({ onRecognition, onSuspiciousMatch }: RecognitionPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestInFlight = useRef(false);
  const snapshotInFlight = useRef(false);
  const consecutiveErrors = useRef(0);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setActive(false);
    setStatus("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const pollRecognition = useCallback(async () => {
    if (!videoRef.current || requestInFlight.current || snapshotInFlight.current) return;

    snapshotInFlight.current = true;

    try {
      const snapshot = await detectFaceSnapshot(videoRef.current);
      if (!snapshot) {
        setStatus("no_face");
        setConfidence(0);
        return;
      }

      requestInFlight.current = true;
      const { data, error: invokeError } = await supabase.functions.invoke("biometric-recognize", {
        body: { embedding: snapshot.embedding },
      });

      if (invokeError) throw invokeError;

      const nextStatus = (data?.matchStatus ?? "no_match") as MatchStatus;
      setStatus(nextStatus);
      setConfidence(Number(data?.confidence ?? 0));
      onRecognition?.();

      if (nextStatus === "duplicate") {
        onSuspiciousMatch?.();
      }
    } catch (caught) {
      if (isTransientFaceApiError(caught)) {
        consecutiveErrors.current += 1;
        if (consecutiveErrors.current >= 5) {
          setStatus("error");
          setError("Recognition became unstable. Please restart recognition.");
        } else {
          setStatus("no_face");
          setError("Recalibrating recognition stream…");
        }
      } else {
        setStatus("error");
        setError(caught instanceof Error ? caught.message : "Recognition failed");
      }
    } finally {
      requestInFlight.current = false;
      snapshotInFlight.current = false;
    }
  }, [onRecognition, onSuspiciousMatch]);

  const start = useCallback(async () => {
    try {
      setError(null);
      consecutiveErrors.current = 0;
      await loadFaceModels();
      const stream = await requestUserCamera();

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setActive(true);
      setStatus("no_face");
      intervalRef.current = setInterval(() => {
        void pollRecognition();
      }, 2200);
      void pollRecognition();
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Camera unavailable");
    }
  }, [pollRecognition]);

  const Icon = status === "duplicate" ? ShieldAlert : status === "matched" ? ShieldCheck : ScanFace;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Real-Time Face Recognition</h3>
        </div>
        <button
          onClick={active ? stop : start}
          className={`rounded-md px-3 py-1.5 text-xs font-mono transition-colors ${
            active ? "bg-secondary text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {active ? "Stop" : "Start"}
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-secondary">
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
      </div>

      <div className={`mt-4 rounded-md border px-3 py-3 ${STATUS_STYLES[status]}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <p className="text-sm font-mono text-foreground">{STATUS_LABELS[status]}</p>
        </div>
        <p className="mt-2 text-xs font-body text-muted-foreground">
          Confidence score: <span className="font-mono text-foreground">{formatConfidence(confidence)}</span>
        </p>
        {error && <p className="mt-2 text-xs font-body text-destructive">{error}</p>}
      </div>
    </div>
  );
};

export default RecognitionPanel;
