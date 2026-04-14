import { useState, useCallback, lazy, Suspense } from "react";
import { Shield, LogOut, History, Sun, Moon, ShieldAlert, UserCircle } from "lucide-react";

const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import IdentityForm from "@/components/IdentityForm";
import MonitoringFeed, { type AlertItem } from "@/components/MonitoringFeed";
import ToolsPanel from "@/components/ToolsPanel";
import StatsCards from "@/components/StatsCards";
import AlertHistory from "@/pages/AlertHistory";
import RecognitionPanel from "@/components/RecognitionPanel";
import BiometricAlertsPanel from "@/components/BiometricAlertsPanel";

const Dashboard = () => {
  const { user, logout, profile, alerts, isAdmin, saveProfile, refreshState, acknowledgeAlert } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [monitoringAlerts, setMonitoringAlerts] = useState<AlertItem[]>([]);
  const [scanCount, setScanCount] = useState(1);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [monitoringStart, setMonitoringStart] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const handleProfileSave = useCallback((data: { displayName: string; username: string; socialLink: string; keywords: string }) => {
    return saveProfile(data);
  }, [saveProfile]);

  const handleAlertsChange = useCallback((newAlerts: AlertItem[]) => {
    setMonitoringAlerts(newAlerts);
  }, []);

  const handleMonitoringChange = useCallback((active: boolean, startTime: Date | null) => {
    setMonitoringActive(active);
    setMonitoringStart(startTime);
  }, []);

  if (showProfile) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><p className="text-sm font-mono text-muted-foreground">Loading...</p></div>}>
        <ProfilePage onBack={() => setShowProfile(false)} />
      </Suspense>
    );
  }

  if (showAdmin) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><p className="text-sm font-mono text-muted-foreground">Loading...</p></div>}>
        <AdminDashboard onBack={() => setShowAdmin(false)} />
      </Suspense>
    );
  }

  if (showHistory) {
    return <AlertHistory alerts={monitoringAlerts} onBack={() => setShowHistory(false)} />;
  }

  const isSetupComplete = Boolean(profile?.displayName && profile?.username);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/70 bg-card/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Shield className="h-5 w-5 shrink-0 text-primary" />
            <h1 className="truncate text-sm font-mono font-bold tracking-tight text-foreground">E-Vara</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="interactive-scale inline-flex items-center gap-1 rounded-md border border-border bg-secondary/85 px-2 py-1.5 text-[10px] font-mono text-muted-foreground transition-all duration-300 hover:border-foreground/20 hover:text-foreground sm:px-3 sm:text-xs"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="interactive-scale inline-flex items-center gap-1 rounded-md border border-border bg-secondary/85 px-2 py-1.5 text-[10px] font-mono text-muted-foreground transition-all duration-300 hover:border-foreground/20 hover:text-foreground sm:px-3 sm:text-xs"
              >
                <ShieldAlert className="h-3 w-3" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button
              onClick={() => setShowHistory(true)}
              className="interactive-scale inline-flex items-center gap-1 rounded-md border border-border bg-secondary/85 px-2 py-1.5 text-[10px] font-mono text-muted-foreground transition-all duration-300 hover:border-foreground/20 hover:text-foreground sm:px-3 sm:text-xs"
            >
              <History className="h-3 w-3" />
              <span className="hidden sm:inline">History</span>
            </button>
            <span className="hidden text-xs font-mono text-muted-foreground lg:inline">{user?.email}</span>
            <button
              onClick={() => void logout()}
              className="interactive-scale inline-flex items-center gap-1 rounded-md border border-border bg-secondary/85 px-2 py-1.5 text-[10px] font-mono text-muted-foreground transition-all duration-300 hover:border-foreground/20 hover:text-foreground sm:px-3 sm:text-xs"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="motion-enter mb-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 shadow-[0_20px_60px_-40px_hsl(var(--primary)/0.9)] sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.3em] text-primary/80">Protected workspace</p>
              <h2 className="mt-2 text-2xl font-mono font-bold tracking-tight text-foreground">Monitor identity threats in real time.</h2>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">Animated status surfaces, biometric verification, and monitoring controls now feel more responsive and modern across the dashboard.</p>
          </div>
        </div>
        <div className="motion-enter motion-enter-delay-1 mb-4 sm:mb-6">
          <StatsCards
            alertCount={alerts.length}
            scanCount={scanCount}
            monitoringActive={monitoringActive}
            monitoringStartTime={monitoringStart}
          />
        </div>

        <div className="motion-enter motion-enter-delay-2 grid gap-4 sm:gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 lg:sticky lg:top-[57px] lg:self-start">
            <RecognitionPanel
              onRecognition={() => setScanCount((count) => count + 1)}
              onSuspiciousMatch={() => void refreshState()}
            />
            <IdentityForm onSave={handleProfileSave} initial={profile} />
            <ToolsPanel identity={profile ? { fullName: profile.displayName, username: profile.username } : null} />
          </div>

          <div className="space-y-4">
            <BiometricAlertsPanel alerts={alerts} isAdmin={isAdmin} onAcknowledge={acknowledgeAlert} />
            {isSetupComplete ? (
              <MonitoringFeed
                fullName={profile?.displayName ?? user?.email ?? ""}
                username={profile?.username ?? ""}
                keywords={profile?.keywords ?? ""}
                onAlertsChange={handleAlertsChange}
                onMonitoringChange={handleMonitoringChange}
              />
            ) : (
              <div className="glass-panel motion-enter hover-lift rounded-lg p-8 text-center sm:p-12">
                <Shield className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-mono text-muted-foreground sm:text-sm">
                  Complete your identity profile to activate monitoring.
                </p>
              </div>
            )}

            <div className="glass-panel motion-enter motion-enter-delay-3 rounded-lg p-4">
              <p className="text-center text-xs font-body leading-relaxed text-muted-foreground">
                E-Vara now uses live-only face-api.js biometric verification, encrypted embeddings, and duplicate-identity alerts for protected access.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
