import { useState, useCallback } from "react";
import { Shield, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import FaceScan from "@/components/FaceScan";
import IdentityForm from "@/components/IdentityForm";
import MonitoringFeed from "@/components/MonitoringFeed";
import ToolsPanel from "@/components/ToolsPanel";

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const { user, logout, getIdentity, saveIdentity } = useAuth();
  const [identity, setIdentity] = useState(getIdentity());

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleFaceComplete = useCallback((imageData: string) => {
    const current = getIdentity();
    const updated = { ...(current || { fullName: "", username: "", socialLink: "", keywords: "" }), faceImage: imageData };
    saveIdentity(updated);
    setIdentity(updated);
  }, [getIdentity, saveIdentity]);

  const handleIdentitySave = useCallback((data: { fullName: string; username: string; socialLink: string; keywords: string }) => {
    const current = getIdentity();
    const updated = { ...data, faceImage: current?.faceImage || null };
    saveIdentity(updated);
    setIdentity(updated);
  }, [getIdentity, saveIdentity]);

  const isSetupComplete = identity?.faceImage && identity?.fullName;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-mono font-bold text-foreground tracking-tight">E-Vara Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Left: Control Column */}
          <div className="space-y-4 lg:sticky lg:top-[57px] lg:self-start">
            <FaceScan onComplete={handleFaceComplete} existingImage={identity?.faceImage || null} />
            <IdentityForm onSave={handleIdentitySave} initial={identity} />
            <ToolsPanel />
          </div>

          {/* Right: Feed Column */}
          <div className="space-y-4">
            {isSetupComplete ? (
              <MonitoringFeed
                fullName={identity!.fullName}
                username={identity!.username}
                keywords={identity!.keywords || ""}
              />
            ) : (
              <div className="rounded-lg border border-border bg-card p-12 text-center">
                <Shield className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-mono text-muted-foreground">
                  Complete identity verification and information to activate monitoring.
                </p>
              </div>
            )}

            {/* Security Note */}
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-body text-muted-foreground leading-relaxed text-center">
                E-Vara is a prototype monitoring tool designed to help users identify potential identity misuse online.
                No real web scraping occurs during this demonstration.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
