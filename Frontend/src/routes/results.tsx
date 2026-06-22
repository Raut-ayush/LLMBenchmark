import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileJson, FileText, ChevronRight } from "lucide-react";
import { MOCK_RESULTS, type BenchmarkResult } from "@/lib/mock-data";
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
                {MOCK_RESULTS.map((r) => (
                  <TableRow
                    key={r.session_id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer ${selected.session_id === r.session_id ? "bg-primary/10" : ""}`}
                  >
                    <TableCell className="font-mono text-xs">{r.model}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.mode}</Badge></TableCell>
                    <TableCell className="font-mono text-primary">{r.generation_tps}</TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
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
