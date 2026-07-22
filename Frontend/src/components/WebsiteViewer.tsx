import { useState } from "react";
import { ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

interface WebsiteViewerProps {
  url: string;
}

export default function WebsiteViewer({ url }: WebsiteViewerProps) {
  const [key, setKey] = useState(0);
  const [error, setError] = useState(false);

  const reload = () => { setKey((k) => k + 1); setError(false); };

  const displayUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="flex flex-col h-full bg-muted/5">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/40 backdrop-blur shrink-0">
        <div className="flex gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 mx-2 rounded-md bg-muted/30 border border-border/20 px-3 py-1 text-[11px] text-muted-foreground truncate">
          {displayUrl}
        </div>
        <button onClick={reload} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Frame */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-center max-w-xs">
              This site can't be embedded. Open it in a new tab to view.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open {displayUrl}
            </a>
          </div>
        ) : (
          <iframe
            key={key}
            src={url}
            title="Website preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  );
}
