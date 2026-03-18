import { ShieldAlert } from "lucide-react";
import type { SuspiciousAlert } from "@/hooks/useAuth";

interface BiometricAlertsPanelProps {
  alerts: SuspiciousAlert[];
  isAdmin: boolean;
  onAcknowledge: (alertId: string) => Promise<string | null>;
}

const BiometricAlertsPanel = ({ alerts, isAdmin, onAcknowledge }: BiometricAlertsPanelProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Reputation Protection Alerts</h3>
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-md border border-border bg-secondary px-4 py-8 text-center">
          <p className="text-sm font-mono text-foreground">No duplicate or suspicious identities detected.</p>
          <p className="mt-1 text-xs font-body text-muted-foreground">Any future biometric misuse signals will appear here for you and admins.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const acknowledged = isAdmin ? alert.acknowledgedByAdmin : alert.acknowledgedByUser;

            return (
              <div key={alert.id} className="rounded-md border border-border bg-secondary p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-mono text-foreground">{alert.message}</p>
                    <p className="mt-1 text-xs font-body text-muted-foreground">
                      {alert.alertType.replace(/_/g, " ")} · confidence {Math.round(alert.confidence * 100)}%
                    </p>
                  </div>
                  <button
                    disabled={acknowledged}
                    onClick={() => void onAcknowledge(alert.id)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {acknowledged ? "Acknowledged" : isAdmin ? "Admin Ack" : "Acknowledge"}
                  </button>
                </div>
                <p className="mt-3 text-[11px] font-mono text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BiometricAlertsPanel;
