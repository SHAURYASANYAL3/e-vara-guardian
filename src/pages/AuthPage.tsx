import { type FormEvent, useState } from "react";
import { Eye, Shield } from "lucide-react";
import FaceScan, { type BiometricScanResult } from "@/components/FaceScan";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

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

  const handleSubmit = async (e: FormEvent) => {
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[420px_1fr]">
        <div className="glass-panel motion-enter hover-lift rounded-2xl p-8">
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
                  className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground transition-all duration-300 focus:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground transition-all duration-300 focus:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 pr-10 text-sm font-body text-foreground placeholder:text-muted-foreground transition-all duration-300 focus:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground transition-all duration-300 focus:-translate-y-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                  />
                </div>

                <label className="interactive-scale flex items-start gap-3 rounded-md border border-border bg-secondary/90 p-3">
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
              className="interactive-scale w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-all duration-300 hover:opacity-90 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.9)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processing..." : mode === "login" ? "Sign In" : "Create Secure Account"}
            </button>
          </form>

          {mode === "login" && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    setError("");
                    setSubmitting(true);
                    try {
                      const result = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin,
                      });
                      if (result.error) throw result.error;
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : "Google sign-in failed");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="interactive-scale flex items-center justify-center gap-2 rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-mono text-foreground transition-all duration-300 hover:bg-secondary disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={async () => {
                    setError("");
                    setSubmitting(true);
                    try {
                      const result = await lovable.auth.signInWithOAuth("apple", {
                        redirect_uri: window.location.origin,
                      });
                      if (result.error) throw result.error;
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : "Apple sign-in failed");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="interactive-scale flex items-center justify-center gap-2 rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-mono text-foreground transition-all duration-300 hover:bg-secondary disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs font-body text-muted-foreground">
            {mode === "login" ? "Need a protected account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setNotice("");
              }}
              className="transition-all duration-300 text-primary hover:underline hover:opacity-80"
            >
              {mode === "login" ? "Register" : "Sign In"}
            </button>
          </p>
        </div>

        <div className="motion-enter motion-enter-delay-2 space-y-4">
          {mode === "register" ? (
            <FaceScan mode="enroll" consentGranted={consentChecked} onComplete={setScanResult} />
          ) : (
            <div className="glass-panel hover-lift rounded-2xl p-8">
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
                  <div key={item} className="interactive-scale rounded-md border border-border bg-secondary/90 px-4 py-6 text-center text-xs font-mono text-foreground">
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
