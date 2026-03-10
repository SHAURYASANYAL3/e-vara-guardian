import { useState, useEffect, useCallback, useRef } from "react";
import { Activity, ExternalLink } from "lucide-react";

interface Alert {
  id: number;
  message: string;
  query: string;
  timestamp: Date;
  isNew: boolean;
}

interface MonitoringFeedProps {
  fullName: string;
  username: string;
  keywords: string;
}

const TEMPLATES = [
  "Potential identity mention detected for: {query}",
  "Possible profile reference found for: {query}",
  "Username match identified for: {query}",
  "Social mention flagged for: {query}",
  "Content similarity detected for: {query}",
];

const MonitoringFeed = ({ fullName, username, keywords }: MonitoringFeedProps) => {
  const [monitoring, setMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const counterRef = useRef(0);

  const queries = [fullName, username, ...(keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [])].filter(Boolean);

  const generateAlert = useCallback(() => {
    const query = queries[Math.floor(Math.random() * queries.length)] || fullName;
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    counterRef.current += 1;
    const alert: Alert = {
      id: counterRef.current,
      message: template.replace("{query}", query),
      query,
      timestamp: new Date(),
      isNew: true,
    };
    setAlerts(prev => [alert, ...prev].slice(0, 50));
    // Remove new flag after 3s
    setTimeout(() => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isNew: false } : a));
    }, 3000);
  }, [fullName, queries]);

  const toggleMonitoring = () => {
    if (monitoring) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setMonitoring(false);
    } else {
      setMonitoring(true);
      generateAlert();
      intervalRef.current = setInterval(generateAlert, 8000);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">Monitoring Dashboard</h3>
        </div>
        <button
          onClick={toggleMonitoring}
          className={`rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-all ${
            monitoring
              ? "bg-secondary text-muted-foreground hover:text-foreground"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {monitoring ? "Stop Monitoring" : "Start Monitoring"}
        </button>
      </div>

      {monitoring && (
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </span>
          <span className="text-xs font-mono text-muted-foreground">Live monitoring active</span>
        </div>
      )}

      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground font-body">
            {monitoring ? "Scanning for mentions..." : "Start monitoring to receive alerts"}
          </p>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`relative rounded-md border border-border bg-secondary p-3 transition-all ${alert.isNew ? "alert-wave" : ""}`}
            >
              {alert.isNew && (
                <span className="alert-pulse-dot absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              <p className="mb-2 text-xs font-body text-foreground">{alert.message}</p>
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
                <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MonitoringFeed;
