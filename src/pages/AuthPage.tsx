import { type FormEvent, useState } from "react";
import { Eye, Shield } from "lucide-react";
import FaceScan, { type BiometricScanResult } from "@/components/FaceScan";
import FeatureCard from "@/components/landing/FeatureCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

const HeroScene = lazy(() => import("@/components/landing/HeroScene"));

const CONSENT_TEXT = "I consent to live biometric processing for face authentication and secure storage of encrypted face embeddings only.";

const featureCards = [
  {
    title: "Adaptive biometric access",
    description: "Live enrollment and verification flows combine liveness prompts, encrypted embeddings, and streamlined recovery states.",
    icon: ScanFace,
    accent: "#22d3ee",
  },
  {
    title: "Glassmorphism security surfaces",
    description: "Layered glass panels, glow gradients, and premium motion make every auth state feel tactile without sacrificing clarity.",
    icon: Layers3,
    accent: "#a78bfa",
  },
  {
    title: "Privacy-first control plane",
    description: "Protected account actions are framed with consent-first messaging and secure defaults tailored for sensitive identity workflows.",
    icon: LockKeyhole,
    accent: "#38bdf8",
  },
] as const;

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
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const { register, login, setBiometricVerified } = useAuth();
  const isMobile = useIsMobile();

  const stats = useMemo(
    () => [
      { label: "Identity confidence", value: "99.2%" },
      { label: "Runtime feel", value: "60 FPS" },
      { label: "Fraud detection", value: "Real time" },
    ],
    [],
  );

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
              </div>
            </motion.div>

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

          {mode === "login" && (
            <p className="mt-4 text-center">
              <a href="/forgot-password" className="text-xs font-mono text-primary hover:underline">
                Forgot your password?
              </a>
            </p>
          )}

          <p className="mt-4 text-center text-xs font-body text-muted-foreground">
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

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-[0.22em] text-slate-400">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="auth-input pr-12"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword((open) => !open)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {mode === "register" && (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-[0.22em] text-slate-400">Confirm password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="auth-input"
                          placeholder="••••••••"
                        />
                      </div>

                      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-white/15 bg-slate-950 text-cyan-400"
                        />
                        <span>{CONSENT_TEXT}</span>
                      </label>
                    </>
                  )}

                  {error && <p className="text-sm text-rose-300">{error}</p>}
                  {notice && <p className="text-sm text-cyan-300">{notice}</p>}

                  <button
                    type="submit"
                    disabled={submitting || (mode === "register" && (!scanResult || !consentChecked))}
                    className="cta-button"
                  >
                    <span>{submitting ? "Processing…" : mode === "login" ? "Enter workspace" : "Create secure account"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-400">
                  {mode === "login" ? "Need a protected account?" : "Already have an account?"}{" "}
                  <button
                    onClick={() => {
                      setMode(mode === "login" ? "register" : "login");
                      setError("");
                      setNotice("");
                    }}
                    className="font-medium text-cyan-300 transition-opacity hover:opacity-80"
                  >
                    {mode === "login" ? "Register" : "Sign in"}
                  </button>
                </p>
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                {mode === "register" ? (
                  <FaceScan mode="enroll" consentGranted={consentChecked} onComplete={setScanResult} />
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Biometric checkpoint</p>
                    <h3 className="mt-2 text-xl font-semibold text-white">3D-forward trust, operationally grounded.</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Password sign-in is followed by a live webcam biometric verification pass with liveness checks before workspace access is granted.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      {[
                        "Live webcam only",
                        "Hover-reactive 3D hero",
                        "Encrypted embeddings",
                      ].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center text-xs uppercase tracking-[0.22em] text-slate-200">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Features</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Reusable premium sections with smooth depth and motion.</h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              The landing system is built from reusable components, lazy-loaded 3D rendering, and motion-controlled cards to keep the UI futuristic yet maintainable.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {featureCards.map((card, index) => (
              <FeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                icon={card.icon}
                accent={card.accent}
                delay={index * 0.1}
              />
            ))}
          </div>
        </section>

        <section id="cta" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="glass-panel relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10"
          >
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_60%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Call to action</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Launch a security workflow that looks as advanced as it feels.</h2>
                <p className="mt-4 text-base leading-8 text-slate-300">
                  The 3D hero is lazy-loaded, responsive, and pointer-reactive. On mobile, it falls back to a lightweight CSS orb so the page stays smooth without heavy rendering.
                </p>
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="cta-button max-w-fit"
              >
                <WandSparkles className="h-4 w-4" />
                <span>Back to access</span>
              </button>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© 2026 E-Vara. Premium biometric access surfaces for modern identity workflows.</p>
          <div className="flex items-center gap-4">
            <span>React + Tailwind</span>
            <span>React Three Fiber</span>
            <span>Framer Motion</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
