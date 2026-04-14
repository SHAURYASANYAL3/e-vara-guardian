import { lazy, Suspense, type FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, Layers3, LockKeyhole, ScanFace, Shield, Sparkles, Stars, WandSparkles } from "lucide-react";
import FaceScan, { type BiometricScanResult } from "@/components/FaceScan";
import FeatureCard from "@/components/landing/FeatureCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-5%] h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-[-4%] top-[12%] h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="grid-floor absolute inset-x-0 bottom-0 h-[40vh] opacity-40" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_40px_-16px_rgba(34,211,238,0.85)]">
              <Shield className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] text-cyan-200/80">E-VARA</p>
              <p className="text-xs text-slate-400">Futuristic identity command surface</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#hero" className="transition-colors hover:text-white">Hero</a>
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#cta" className="transition-colors hover:text-white">Launch</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="hero" className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-200/90 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5" />
                Premium 3D identity experience
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl">
                  A <span className="text-gradient">futuristic biometric portal</span> with motion, depth, and trust built in.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                  Dark glassmorphism, optimized 3D motion, and secure auth flows come together in a premium landing experience designed to feel alive without becoming noisy.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.12 * index }}
                    className="glass-panel rounded-2xl px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-xl font-semibold text-white">{stat.value}</p>
                  </motion.div>
                ))}
              </div>

              <div className="glass-panel overflow-hidden rounded-[2rem] border-white/10 p-1">
                <div
                  className="relative min-h-[340px] overflow-hidden rounded-[1.7rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))]"
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
                    const y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
                    setPointer({ x, y });
                  }}
                  onMouseLeave={() => setPointer({ x: 0, y: 0 })}
                >
                  {!isMobile ? (
                    <Suspense
                      fallback={
                        <div className="flex h-full min-h-[340px] items-center justify-center text-sm text-slate-300">
                          Loading immersive 3D scene…
                        </div>
                      }
                    >
                      <div className="absolute inset-0">
                        <HeroScene pointerX={pointer.x} pointerY={pointer.y} />
                      </div>
                    </Suspense>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="mobile-orb" />
                    </div>
                  )}

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(2,6,23,0.44)_72%)]" />
                  <div className="absolute inset-x-6 bottom-6 rounded-3xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Reactive scene</p>
                        <p className="mt-2 text-sm text-slate-300">Mouse movement subtly tilts the cluster while low-cost geometry and lazy loading keep the hero light.</p>
                      </div>
                      <Stars className="hidden h-6 w-6 text-cyan-300 sm:block" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="space-y-6"
            >
              <div className="glass-panel rounded-[2rem] p-7 sm:p-8">
                <div className="mb-8 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_50px_-18px_rgba(34,211,238,0.9)]">
                    <Shield className="h-6 w-6 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/80">Secure access</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{mode === "login" ? "Sign in" : "Create account"}</h2>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "register" && (
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-[0.22em] text-slate-400">Display name</label>
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        required
                        className="auth-input"
                        placeholder="Jane Doe"
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-[0.22em] text-slate-400">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="auth-input"
                      placeholder="you@example.com"
                    />
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
