import { useState } from "react";
import { Eye, Shield } from "lucide-react";
import FaceScan, { type BiometricScanResult } from "@/components/FaceScan";
import { useAuth } from "@/hooks/useAuth";

const CONSENT_TEXT = "I consent to live biometric processing for face authentication and secure storage of encrypted face embeddings only.";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [scanResult, setScanResult] = useState<BiometricScanResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, login, setBiometricVerified } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        if (!scanResult) throw new Error("Complete the live face enrollment scan before creating an account.");
        if (!consentChecked) throw new Error("Consent is required before registration.");

        const result = await register({ email, password, confirmPassword, displayName });
        if (result.error) throw new Error(result.error);

        if (result.hasSession) {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error: enrollError } = await supabase.functions.invoke("biometric-register", {
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
                displayName,
                username: "",
                socialLink: "",
                keywords: "",
              },
            },
          });

          if (enrollError) throw enrollError;
          setBiometricVerified(true);
          setNotice("Account created and biometric enrollment completed.");
        } else {
          setNotice("Account created. Verify your email, then sign in to complete biometric enrollment.");
          setMode("login");
        }
      } else {
        const loginError = await login(email, password);
        if (loginError) throw new Error(loginError);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-mono font-bold tracking-tight text-foreground">E-Vara</h1>
            </div>
            <p className="text-sm font-body text-muted-foreground">Live-only biometric access and identity protection.</p>
          </div>

          <h2 className="mb-6 text-lg font-mono font-semibold text-foreground">
            {mode === "login" ? "Sign In" : "Create Account"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 pr-10 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((open) => !open)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>

                <label className="flex items-start gap-3 rounded-md border border-border bg-secondary p-3">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border bg-background text-primary"
                  />
                  <span className="text-xs font-body leading-relaxed text-foreground">{CONSENT_TEXT}</span>
                </label>
              </>
            )}

            {error && <p className="text-sm font-body text-destructive">{error}</p>}
            {notice && <p className="text-sm font-body text-primary">{notice}</p>}

            <button
              type="submit"
              disabled={submitting || (mode === "register" && (!scanResult || !consentChecked))}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processing..." : mode === "login" ? "Sign In" : "Create Secure Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs font-body text-muted-foreground">
            {mode === "login" ? "Need a protected account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
              className="text-primary hover:underline"
            >
              {mode === "login" ? "Register" : "Sign In"}
            </button>
          </p>
        </div>

        <div className="space-y-4">
          {mode === "register" ? (
            <FaceScan mode="enroll" consentGranted={consentChecked} onComplete={setScanResult} />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8">
              <h2 className="text-lg font-mono font-semibold text-foreground">Biometric login step</h2>
              <p className="mt-3 text-sm font-body leading-relaxed text-muted-foreground">
                After password sign-in, the app requires a live webcam face verification with liveness checks before granting access.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  "Live webcam only",
                  "Blink + head-turn liveness",
                  "Encrypted embeddings only",
                ].map((item) => (
                  <div key={item} className="rounded-md border border-border bg-secondary px-4 py-6 text-center text-xs font-mono text-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
