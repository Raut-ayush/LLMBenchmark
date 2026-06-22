import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, Trash2, Info, Gauge, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteModel, getModels, getRunningModels, inspectModel, loadModel, unloadModel, type InstalledModel } from "@/lib/api";


export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models · Local LLMx" },
      { name: "description", content: "Manage your installed local models — load, unload, inspect, and benchmark." },
    ],
  }),
  component: ModelsPage,
});

import { useEffect, useMemo, useState } from "react";

function ModelsPage() {
  const [models, setModels] = useState<InstalledModel[]>([]);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [installed, runningRes] = await Promise.all([getModels(), getRunningModels()]);
      setModels(installed ?? []);
      const runningSet = new Set((runningRes?.models ?? []).map((m) => m.name).filter(Boolean));
      setRunning(runningSet);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load models");
      setModels([]);
      setRunning(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const runningCount = useMemo(() => running.size, [running]);

  const isRunning = (name: string) => running.has(name);

  const handleLoad = async (name: string) => {
    try {
      const res = await loadModel(name);
      if (!res.success) throw new Error(res.error || `Failed to load ${name}`);
      toast.success(`Loaded ${name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to load ${name}`);
    }
  };

  const handleUnload = async (name: string) => {
    try {
      const res = await unloadModel(name);
      if (!res.success) throw new Error(res.error || `Failed to unload ${name}`);
      toast.success(`Unloaded ${name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to unload ${name}`);
    }
  };

  const handleInspect = async (name: string) => {
    try {
      const res = await inspectModel(name);
      if (!res.success) throw new Error(res.error || `Failed to inspect ${name}`);
      toast.success(`Inspected ${name}`);
      // keeping it simple: toast-only inspection for now
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to inspect ${name}`);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const res = await deleteModel(name);
      if (!res.success) throw new Error(res.error || `Failed to delete ${name}`);
      toast.success(`Deleted ${name}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${name}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Models</h1>
          <p className="text-muted-foreground">
            Everything you've downloaded, plus actions to manage them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            {runningCount} running
          </Badge>
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
            <a href="/install"><Download className="mr-2 h-4 w-4" /> Pull new model</a>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Installed</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading models…
                  </TableCell>
                </TableRow>
              ) : models.length ? (
                models.map((m) => {
                  const runningNow = isRunning(m.name);
                  const sizeLabel = m.details?.parameter_size ?? m.size ?? "—";
                  const contextLen = (m as any).context_length ?? "—";
                  const modifiedAt = m.modified_at ?? "—";
                  return (
                    <TableRow key={m.name}>
                      <TableCell className="font-mono text-sm">{m.name}</TableCell>
                      <TableCell>{sizeLabel}</TableCell>
                      <TableCell>{typeof contextLen === "number" ? contextLen.toLocaleString() : contextLen}</TableCell>
                      <TableCell>
                        {runningNow ? (
                          <Badge variant="outline" className="border-success/40 text-success">
                            running
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">
                            not running
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {modifiedAt === "—" || !modifiedAt
                          ? "—"
                          : new Date(modifiedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <IconBtn
                            label="Load"
                            onClick={() => void handleLoad(m.name)}
                            disabled={runningNow}
                          >
                            <Play className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Unload"
                            onClick={() => void handleUnload(m.name)}
                            disabled={!runningNow}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn label="Inspect" onClick={() => void handleInspect(m.name)}>
                            <Info className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn
                            label="Benchmark"
                            onClick={() => toast.info("Benchmark wiring coming next (Phase 3).")}
                          >
                            <Gauge className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn label="Delete" danger onClick={() => void handleDelete(m.name)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No models found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

}

function IconBtn({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onClick}
      title={label}
      className={`h-7 w-7 ${danger ? "text-destructive hover:text-destructive" : ""}`}
    >
      {children}
    </Button>
  );
}

