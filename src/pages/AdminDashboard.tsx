import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Shield, ShieldAlert, Lock, ScrollText, RefreshCw, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AuditLog {
  id: string;
  event_type: string;
  user_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface Lockout {
  id: string;
  user_id: string;
  failed_attempts: number;
  locked_until: string | null;
  last_failed_at: string | null;
}

interface SuspAlert {
  id: string;
  user_id: string;
  alert_type: string;
  message: string;
  confidence: number | null;
  acknowledged_by_user: boolean;
  acknowledged_by_admin: boolean;
  created_at: string;
}

type Tab = "audit" | "lockouts" | "alerts";

const AdminDashboard = ({ onBack }: { onBack: () => void }) => {
  const { isAdmin, acknowledgeAlert } = useAuth();
  const [tab, setTab] = useState<Tab>("audit");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lockouts, setLockouts] = useState<Lockout[]>([]);
  const [suspAlerts, setSuspAlerts] = useState<SuspAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "audit") {
        const { data } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        setAuditLogs((data as AuditLog[]) ?? []);
      } else if (tab === "lockouts") {
        const { data } = await supabase
          .from("account_lockouts")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(100);
        setLockouts((data as Lockout[]) ?? []);
      } else {
        const { data } = await supabase
          .from("suspicious_activity_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        setSuspAlerts((data as SuspAlert[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="glass-panel rounded-2xl p-8 text-center max-w-md">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h1 className="text-lg font-mono font-semibold text-foreground">Access Denied</h1>
          <p className="mt-2 text-sm font-body text-muted-foreground">Admin privileges required.</p>
          <button onClick={onBack} className="mt-4 text-sm font-mono text-primary hover:underline">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const tabItems: { key: Tab; label: string; icon: typeof ScrollText }[] = [
    { key: "audit", label: "Audit Logs", icon: ScrollText },
    { key: "lockouts", label: "Lockouts", icon: Lock },
    { key: "alerts", label: "Alerts", icon: ShieldAlert },
  ];

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  };

  const handleClearLockout = async (userId: string) => {
    await supabase.from("account_lockouts").delete().eq("user_id", userId);
    void fetchData();
  };

  const handleAdminAck = async (alertId: string) => {
    await acknowledgeAlert(alertId);
    void fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={onBack} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-mono font-bold text-foreground tracking-tight">Admin Dashboard</h1>
          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/85 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          {tabItems.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-mono transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Audit Logs */}
        {!loading && tab === "audit" && (
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <div className="glass-panel rounded-lg p-12 text-center">
                <ScrollText className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-mono text-muted-foreground">No audit logs found.</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase text-foreground">
                        {log.event_type}
                      </span>
                      <p className="mt-1 text-xs font-body text-muted-foreground truncate">
                        User: {log.user_id?.slice(0, 8) ?? "—"}… {log.ip_address ? `• IP: ${log.ip_address}` : ""}
                      </p>
                      {Object.keys(log.details).length > 0 && (
                        <p className="mt-1 text-[10px] font-mono text-muted-foreground break-all">
                          {JSON.stringify(log.details).slice(0, 200)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Lockouts */}
        {!loading && tab === "lockouts" && (
          <div className="space-y-2">
            {lockouts.length === 0 ? (
              <div className="glass-panel rounded-lg p-12 text-center">
                <Lock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-mono text-muted-foreground">No lockouts recorded.</p>
              </div>
            ) : (
              lockouts.map((l) => {
                const isLocked = l.locked_until && new Date(l.locked_until) > new Date();
                return (
                  <div key={l.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-foreground">User: {l.user_id.slice(0, 8)}…</p>
                      <p className="text-[10px] font-body text-muted-foreground">
                        Failed attempts: {l.failed_attempts}
                        {isLocked && ` • Locked until ${formatTime(l.locked_until!)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLocked && (
                        <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-mono text-destructive">LOCKED</span>
                      )}
                      <button
                        onClick={() => void handleClearLockout(l.user_id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Unlock className="h-3 w-3" />
                        Clear
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Suspicious Alerts */}
        {!loading && tab === "alerts" && (
          <div className="space-y-2">
            {suspAlerts.length === 0 ? (
              <div className="glass-panel rounded-lg p-12 text-center">
                <ShieldAlert className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-mono text-muted-foreground">No suspicious activity alerts.</p>
              </div>
            ) : (
              suspAlerts.map((a) => (
                <div key={a.id} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-mono uppercase text-destructive">
                          {a.alert_type}
                        </span>
                        {a.confidence !== null && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {Math.round(a.confidence * 100)}% confidence
                          </span>
                        )}
                        {a.acknowledged_by_admin && (
                          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-mono text-primary">ACK</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-body text-foreground">{a.message}</p>
                      <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">User: {a.user_id.slice(0, 8)}…</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{formatTime(a.created_at)}</span>
                      {!a.acknowledged_by_admin && (
                        <button
                          onClick={() => void handleAdminAck(a.id)}
                          className="rounded-md border border-border px-2 py-1 text-[10px] font-mono text-primary hover:bg-primary/10 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
