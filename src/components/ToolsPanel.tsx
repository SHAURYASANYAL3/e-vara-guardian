import { Search, ExternalLink, AlertTriangle, Lock } from "lucide-react";

const ToolsPanel = () => {
  return (
    <div className="space-y-4">
      {/* Reverse Image Search */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">Reverse Image Search</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground font-body">Check if your images are being used elsewhere online.</p>
        <div className="space-y-2">
          {[
            { name: "Google Lens", url: "https://lens.google.com" },
            { name: "Yandex Images", url: "https://yandex.com/images" },
            { name: "Bing Visual Search", url: "https://www.bing.com/visualsearch" },
          ].map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-md border border-border bg-secondary px-3 py-2.5 text-xs font-mono text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {tool.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>

      {/* Report */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">Reporting</h3>
        </div>
        <a
          href="https://cybercrime.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Report to Cybercrime
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Dark Web */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-mono font-semibold text-muted-foreground uppercase tracking-wider">Dark Web Monitoring</h3>
        </div>
        <div className="rounded-md border border-border bg-secondary px-4 py-6 text-center">
          <p className="text-xs font-mono text-muted-foreground">Status: Coming Soon</p>
          <p className="mt-2 text-xs font-body text-muted-foreground">
            Future versions will scan underground sources for identity misuse.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ToolsPanel;
