import { type FormEvent, useEffect, useState } from "react";
import { Eye, Shield, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for recovery session from the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValidSession(true);
    } else {
      // Also check if user already has an active session (from redirect)
      supabase.auth.getSession().then(({ data }) => {
        setValidSession(Boolean(data.session));
      });
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (validSession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm font-mono text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md">
          <Shield className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h1 className="text-lg font-mono font-semibold text-foreground">Invalid or Expired Link</h1>
          <p className="mt-2 text-sm font-body text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <a
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-mono text-primary hover:underline"
          >
            Request New Reset Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="glass-panel motion-enter rounded-2xl p-8">
          <div className="mb-6 text-center">
            <Shield className="mx-auto mb-3 h-7 w-7 text-primary" />
            <h1 className="text-lg font-mono font-semibold text-foreground">Set New Password</h1>
            <p className="mt-1 text-sm font-body text-muted-foreground">Choose a strong password (min 8 characters).</p>
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-primary" />
              <p className="text-sm font-body text-foreground">Your password has been reset successfully.</p>
              <a href="/" className="inline-block text-sm font-mono text-primary hover:underline">
                Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 pr-10 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-secondary/90 px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-sm font-body text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="interactive-scale w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
