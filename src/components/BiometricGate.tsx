import { useMemo, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import FaceScan, { type BiometricScanResult } from "@/components/FaceScan";
import { useAuth } from "@/hooks/useAuth";

const CONSENT_TEXT = "I consent to live biometric processing for face authentication, liveness verification, duplicate identity checks, and secure storage of encrypted face embeddings only.";

const BiometricGate = () => {
  const { user, profile, isBiometricEnrolled, logout, refreshState, setBiometricVerified } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  const [scanResult, setScanResult] = useState<BiometricScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const mode = useMemo(() => (isBiometricEnrolled ? "verify" : "enroll"), [isBiometricEnrolled]);

  const handleSubmit = async () => {
    if (!scanResult || !consentChecked) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: invokeError, data } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke(
        mode === "enroll" ? "biometric-register" : "biometric-verify",
        {
          body: {
            embedding: scanResult.embedding,
            anglesCompleted: scanResult.anglesCompleted,
            liveness: {
              blinkDetected: scanResult.blinkDetected,
              completedChallenges: scanResult.completedChallenges,
              sampleCount: scanResult.sampleCount,
            },
            consentText: CONSENT_TEXT,
            profile: {
              displayName: profile?.displayName ?? user?.email?.split("@")[0] ?? "Protected User",
              username: profile?.username ?? "",
              socialLink: profile?.socialLink ?? "",
              keywords: profile?.keywords ?? "",
            },
          },
        },
      );

      if (invokeError) throw invokeError;

      if (mode === "verify" && data?.locked) {
        throw new Error(`Account temporarily locked. Try again in ${data.minutesRemaining} minute(s).`);
      }

      if (mode === "verify" && !data?.verified) {
        throw new Error("Face verification failed. Please try again in better lighting.");
      }

      if (mode === "verify") {
        setBiometricVerified(true);
        setSuccess(`Face verified at ${Math.round((data?.confidence ?? 0) * 100)}% confidence.`);
      } else {
        setSuccess(data?.duplicateMatches ? `${data.duplicateMatches} possible duplicate identity match(es) flagged.` : "Biometric enrollment completed.");
      }

      await refreshState();
      if (mode === "enroll") {
        setScanResult(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Biometric request failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-3xl space-y-6">
        <div className="motion-enter flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-mono font-bold tracking-tight text-foreground">Biometric Access Check</h1>
            </div>
            <p className="mt-2 text-sm font-body text-muted-foreground">
              {mode === "enroll"
                ? "Complete live multi-angle enrollment before entering the protected workspace."
                : "Complete a live liveness check and face verification to continue."}
            </p>
          </div>
          <button
            onClick={() => void logout()}
            className="interactive-scale inline-flex items-center gap-2 rounded-md border border-border bg-secondary/90 px-3 py-2 text-xs font-mono text-muted-foreground transition-all duration-300 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        <div className="motion-enter motion-enter-delay-1 grid gap-6 lg:grid-cols-[1fr_320px]">
          <FaceScan mode={mode} consentGranted={consentChecked} onComplete={setScanResult} />

          <div className="glass-panel hover-lift rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Consent & Secure Processing</h2>
            <p className="mt-3 text-sm font-body leading-relaxed text-muted-foreground">
              Live camera input only. No uploads. No URLs. No raw face images are stored — only encrypted biometric embeddings.
            </p>

            <label className="interactive-scale mt-4 flex items-start gap-3 rounded-md border border-border bg-secondary/90 p-3">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border bg-background text-primary"
              />
              <span className="text-xs font-body leading-relaxed text-foreground">{CONSENT_TEXT}</span>
            </label>

            <button
              onClick={() => void handleSubmit()}
              disabled={!scanResult || !consentChecked || submitting}
              className="interactive-scale mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-all duration-300 hover:opacity-90 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.9)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processing..." : mode === "enroll" ? "Store Encrypted Embedding" : "Verify Live Face"}
            </button>

            {error && <p className="mt-3 text-sm font-body text-destructive">{error}</p>}
            {success && <p className="mt-3 text-sm font-body text-primary">{success}</p>}
            {user?.email && <p className="mt-4 text-[11px] font-mono text-muted-foreground">Signed in as {user.email}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricGate;
