import { useState } from "react";
import { Shield, ArrowLeft, User, Fingerprint, Lock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import IdentityForm from "@/components/IdentityForm";
import FaceScan, { type BiometricScanResult } from "@/components/FaceScan";

const CONSENT_TEXT = "I consent to live biometric processing for face authentication, liveness verification, duplicate identity checks, and secure storage of encrypted face embeddings only.";

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage = ({ onBack }: ProfilePageProps) => {
  const { user, profile, isBiometricEnrolled, biometricVerified, alerts, saveProfile, refreshState } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [showReEnroll, setShowReEnroll] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [scanResult, setScanResult] = useState<BiometricScanResult | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      setPasswordMessage("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage("Password updated successfully");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleReEnroll = async () => {
    if (!scanResult || !consentChecked) return;
    setEnrolling(true);
    setEnrollMessage(null);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error, data } = await supabase.functions.invoke("biometric-register", {
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
      });
      if (error) throw error;
      setEnrollMessage(data?.duplicateMatches ? `Re-enrolled. ${data.duplicateMatches} duplicate match(es) flagged.` : "Biometric re-enrollment completed successfully.");
      await refreshState();
      setScanResult(null);
      setShowReEnroll(false);
      setConsentChecked(false);
    } catch (err) {
      setEnrollMessage(err instanceof Error ? err.message : "Re-enrollment failed");
    } finally {
      setEnrolling(false);
    }
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledgedByUser);
  const inputClass = "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-mono font-bold tracking-tight text-foreground">Profile & Security</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
        {/* Account Info */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Account</h3>
          </div>
          <div className="space-y-2 text-sm font-body text-muted-foreground">
            <p><span className="font-mono text-foreground">Email:</span> {user?.email}</p>
            <p><span className="font-mono text-foreground">User ID:</span> <span className="text-xs">{user?.id}</span></p>
          </div>
        </div>

        {/* Biometric Status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Biometric Status</h3>
            </div>
            {isBiometricEnrolled && (
              <button
                onClick={() => setShowReEnroll((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/90 px-3 py-1.5 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                {showReEnroll ? "Cancel" : "Re-enroll Face"}
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 p-4">
              {isBiometricEnrolled ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
              )}
              <div>
                <p className="text-sm font-mono font-medium text-foreground">Enrollment</p>
                <p className="text-xs text-muted-foreground">{isBiometricEnrolled ? "Face biometrics enrolled" : "Not enrolled yet"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 p-4">
              {biometricVerified ? (
                <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-destructive" />
              )}
              <div>
                <p className="text-sm font-mono font-medium text-foreground">Session Verification</p>
                <p className="text-xs text-muted-foreground">{biometricVerified ? "Verified this session" : "Not verified this session"}</p>
              </div>
            </div>
          </div>
          {unacknowledgedAlerts.length > 0 && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-xs font-mono text-destructive">{unacknowledgedAlerts.length} unacknowledged security alert(s)</p>
            </div>
          )}
        </div>

        {/* Re-enrollment section */}
        {showReEnroll && (
          <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-6">
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Biometric Re-Enrollment</h3>
            <p className="text-xs font-body text-muted-foreground">
              Complete a new multi-angle face scan to replace your stored biometric data. Your previous enrollment will be overwritten.
            </p>

            <label className="flex items-start gap-3 rounded-md border border-border bg-secondary/90 p-3">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border bg-background text-primary"
              />
              <span className="text-xs font-body leading-relaxed text-foreground">{CONSENT_TEXT}</span>
            </label>

            <FaceScan mode="enroll" consentGranted={consentChecked} onComplete={setScanResult} />

            <button
              onClick={handleReEnroll}
              disabled={!scanResult || !consentChecked || enrolling}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {enrolling ? "Processing..." : "Update Biometric Data"}
            </button>

            {enrollMessage && <p className="text-xs font-body text-muted-foreground">{enrollMessage}</p>}
          </div>
        )}

        {/* Identity Profile Form */}
        <IdentityForm onSave={saveProfile} initial={profile} />

        {/* Change Password */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Change Password</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-mono text-muted-foreground">Confirm New Password</label>
              <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
            <button
              onClick={handlePasswordChange}
              disabled={changingPassword || !newPassword}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
            {passwordMessage && <p className="text-xs font-body text-muted-foreground">{passwordMessage}</p>}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
