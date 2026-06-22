import { Activity, CircuitBoard } from "lucide-react";
import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getInstalledModelNames, getOllamaStatus, type OllamaStatus } from "@/lib/api";

export function StatusBar({ model }: { model?: string }) {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [activeModel, setActiveModel] = useState(model ?? "No model");

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const [ollamaStatus, models] = await Promise.all([
          getOllamaStatus(),
          getInstalledModelNames(),
        ]);

        if (!mounted) return;

        setStatus(ollamaStatus);
        setActiveModel(model ?? models[0] ?? "No model");
      } catch {
        if (!mounted) return;

        setStatus({
          installed: false,
          running: false,
          version: null,
        });
        setActiveModel(model ?? "No model");
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 10_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [model]);

  const online = status?.running ?? false;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-2 text-sm">
        <span className="relative flex h-2 w-2">
          {online && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              online ? "bg-success" : "bg-destructive"
            }`}
          />
        </span>
        <span className="font-medium">{online ? "Ollama online" : "Ollama offline"}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {status?.version ? `v${status.version}` : "localhost:11434"}
        </span>
      </div>
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-2 text-sm">
        <CircuitBoard className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Active model</span>
        <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
          {activeModel}
        </Badge>
      </div>
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        <span className="font-mono">{online ? "Backend connected" : "Waiting for backend"}</span>
      </div>
    </header>
  );
}
