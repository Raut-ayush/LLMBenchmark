import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileJson, FileText, ChevronRight } from "lucide-react";
import { MOCK_RESULTS, type BenchmarkResult } from "@/lib/mock-data";
import { getBenchmarkSessions } from "@/lib/api";

import { BenchmarkCharts } from "@/components/benchmark-charts";
import { toast } from "sonner";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results · Local LLMx" },
      { name: "description", content: "Browse, compare, and export benchmark sessions." },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const [selected, setSelected] = useState<BenchmarkResult>(MOCK_RESULTS[0]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await getBenchmarkSessions();
        if (!mounted) return;
        setSessions(res.sessions ?? []);
        setSessionsLoaded(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load benchmark sessions");
        if (!mounted) return;
        setSessions([]);
        setSessionsLoaded(true);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (

    <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Results</h1>
        <p className="text-muted-foreground">Every benchmark session in one place. Open one to inspect, or compare runs.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>{MOCK_RESULTS.length} runs recorded</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>tok/s</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsLoaded && sessions.length ? (
                  sessions.map((s: any) => {
                    const model = s?.summary?.model ?? s?.summary?.["q" as any]?.model ?? "";
                    const mode = s?.summary?.mode ?? "";
                    const generation_tps = s?.summary?.generation_tps ?? 0;
                    return (
                      <TableRow
                        key={s.session_id}
                        onClick={() => {
                          // Best-effort mapping into existing UI type
                          setSelected((prev) => ({
                            ...prev,
                            session_id: s.session_id,
                            model: model || prev.model,
                            mode: (mode as any) || prev.mode,
                            generation_tps: generation_tps || prev.generation_tps,
                            created_at: s.created_at || prev.created_at,
                            prompt_name: prev.prompt_name,
                            prompt_tps: (s?.summary?.prompt_tps as any) ?? prev.prompt_tps,
                            time_to_first_token_sec: (s?.summary?.time_to_first_token_sec as any) ?? prev.time_to_first_token_sec,
                            load_time_sec: (s?.summary?.load_time_sec as any) ?? prev.load_time_sec,
                            prompt_tokens: (s?.summary?.prompt_tokens as any) ?? prev.prompt_tokens,
                            output_tokens: (s?.summary?.output_tokens as any) ?? prev.output_tokens,
                            peak_gpu_util_percent: (s?.summary?.peak_gpu_util_percent as any) ?? prev.peak_gpu_util_percent,
                            peak_gpu_memory_mb: (s?.summary?.peak_gpu_memory_mb as any) ?? prev.peak_gpu_memory_mb,
                            peak_cpu_percent: (s?.summary?.peak_cpu_percent as any) ?? prev.peak_cpu_percent,
                            peak_ram_used_gb: (s?.summary?.peak_ram_used_gb as any) ?? prev.peak_ram_used_gb,
                            peak_gpu_temp_c: (s?.summary?.peak_gpu_temp_c as any) ?? prev.peak_gpu_temp_c,
                          }));
                        }}
                        className={`cursor-pointer ${selected.session_id === s.session_id ? "bg-primary/10" : ""}`}
                      >
                        <TableCell className="font-mono text-xs">{model || "(unknown)"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{mode || ""}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-primary">{generation_tps}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {sessionsLoaded ? "No benchmark sessions yet" : "Loading sessions…"}
                    </TableCell>
                  </TableRow>
                )}

              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="font-mono text-base">{selected.model}</CardTitle>
                <CardDescription>
                  {selected.mode} · {selected.prompt_name} · {new Date(selected.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => toast.success("CSV downloaded")}>
                  <FileText className="mr-2 h-3.5 w-3.5" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success("JSON downloaded")}>
                  <FileJson className="mr-2 h-3.5 w-3.5" /> JSON
                </Button>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => toast.success("Report ready")}>
                  <Download className="mr-2 h-3.5 w-3.5" /> Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat k="Generation" v={`${selected.generation_tps} tok/s`} />
                <Stat k="Prompt eval" v={`${selected.prompt_tps} tok/s`} />
                <Stat k="TTFT" v={`${selected.time_to_first_token_sec}s`} />
                <Stat k="Load time" v={`${selected.load_time_sec}s`} />
                <Stat k="Tokens in/out" v={`${selected.prompt_tokens}/${selected.output_tokens}`} />
                <Stat k="Peak GPU" v={`${selected.peak_gpu_util_percent}%`} />
                <Stat k="Peak VRAM" v={`${(selected.peak_gpu_memory_mb / 1024).toFixed(2)} GB`} />
                <Stat k="Peak temp" v={`${selected.peak_gpu_temp_c}°C`} />
              </div>
            </CardContent>
          </Card>

          <BenchmarkCharts />
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-1 font-display text-base font-semibold">{v}</div>
    </div>
  );
}
