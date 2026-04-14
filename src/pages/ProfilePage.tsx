import { useState } from "react";
import { Shield, ArrowLeft, User, Fingerprint, Lock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import IdentityForm from "@/components/IdentityForm";

interface ProfilePageProps {
  onBack: () => void;
}

const ProfilePage = ({ onBack }: ProfilePageProps) => {
  const { user, profile, isBiometricEnrolled, biometricVerified, alerts, saveProfile } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

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
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Biometric Status</h3>
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
