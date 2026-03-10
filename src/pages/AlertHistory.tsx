import { ExternalLink, ArrowLeft, Clock } from "lucide-react";
import type { AlertItem } from "@/components/MonitoringFeed";

interface AlertHistoryProps {
  alerts: AlertItem[];
  onBack: () => void;
}

const AlertHistory = ({ alerts, onBack }: AlertHistoryProps) => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={onBack} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-mono font-bold text-foreground tracking-tight">Alert History</h1>
          <span className="ml-auto text-xs font-mono text-muted-foreground">{alerts.length} alerts</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Clock className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-mono text-muted-foreground">No alerts recorded yet.</p>
            <p className="mt-1 text-xs font-body text-muted-foreground">Start monitoring to generate alerts.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={alert.id}
                className="rounded-md border border-border bg-card p-4 animate-fade-in"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: "both" }}
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <p className="text-xs font-body text-foreground">{alert.message}</p>
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {alert.timestamp.toLocaleDateString()} {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(alert.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                  >
                    Google <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href={`https://www.bing.com/search?q=${encodeURIComponent(alert.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline"
                  >
                    Bing <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AlertHistory;
