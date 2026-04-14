import { type FormEvent, useState } from "react";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="glass-panel motion-enter rounded-2xl p-8">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              <span className="text-xl font-mono font-bold tracking-tight text-foreground">E-Vara</span>
            </div>
            <h1 className="text-lg font-mono font-semibold text-foreground">Reset Password</h1>
            <p className="mt-1 text-sm font-body text-muted-foreground">
              Enter your email and we'll send a reset link.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4 text-center">
              <Mail className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm font-body text-foreground">
                If an account exists for <strong className="font-mono">{email}</strong>, a password reset link has been sent.
              </p>
              <p className="text-xs font-body text-muted-foreground">Check your inbox and spam folder.</p>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="you@example.com"
                />
              </div>

              {error && <p className="text-sm font-body text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="interactive-scale w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <p className="text-center">
                <a href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
