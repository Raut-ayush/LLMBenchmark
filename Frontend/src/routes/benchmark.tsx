import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { MOCK_MODELS, MOCK_PROMPTS, MOCK_RESULTS } from "@/lib/mock-data";
import { BenchmarkCharts } from "@/components/benchmark-charts";
import { toast } from "sonner";
import { getBenchmarkSession, getBenchmarkSessions, runBenchmark } from "@/lib/api";


export const Route = createFileRoute("/benchmark")({
  head: () => ({
    meta: [
      { title: "Benchmark · Local LLMx" },
      { name: "description", content: "Measure throughput, latency, CPU, GPU, and memory for any local Ollama model." },
    ],
  }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const [model, setModel] = useState("qwen2.5-coder:3b");
  const [promptId, setPromptId] = useState(MOCK_PROMPTS[0].id);
  const [prompt, setPrompt] = useState(MOCK_PROMPTS[0].text);
  const [mode, setMode] = useState<"cold" | "warm" | "both">("warm");
  const [ctx, setCtx] = useState(4096);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [temp, setTemp] = useState([0.7]);
  const [reps, setReps] = useState(1);
  const [interval, setInterval] = useState(0.5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsOpen, setLogsOpen] = useState(true);
  const [result, setResult] = useState(MOCK_RESULTS[0]);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const start = async () => {
    setRunning(true);
    setProgress(0);
    setLogs([]);

    try {
      const res = await runBenchmark({
        model,
        prompt_id: promptId,
        mode,
        interval,
        repetitions: reps,
        ctx,
        maxTokens,
        temperature: temp[0],
      });

      setLastSessionId(res.session_id);
      setProgress(100);
      toast.success(`Benchmark started · session ${res.session_id}`);

      // For now, the backend runs synchronously; so we fetch once.
      // Later we can poll / stream progress.
      const details = await getBenchmarkSession(res.session_id);

      // Attempt to map backend trial/summary -> existing MOCK_RESULTS shape.
      // If mapping is missing, we at least avoid crashing.
      if (details?.summary) {
        setResult((prev) => ({
          ...prev,
          model,
          mode,
          // best-effort: if backend summary already matches these fields, you can enhance mapping later
          ...(details.summary?.[`${model}::${mode}`] ?? details.summary?.[Object.keys(details.summary)[0]] ?? {}),
        }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Benchmark failed");
      setProgress(0);
    } finally {
      setRunning(false);
    }
  };

  return (

    <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Benchmark</h1>
        <p className="text-muted-foreground">Configure a run and capture throughput, latency, and hardware metrics.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-1">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOCK_MODELS.filter((m) => m.status === "installed").map((m) => (
                      <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prompt preset</Label>
                <Select value={promptId} onValueChange={(v) => {
                  setPromptId(v);
                  const p = MOCK_PROMPTS.find((x) => x.id === v);
                  if (p) setPrompt(p.text);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOCK_PROMPTS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Custom prompt</Label>
                <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="font-mono text-sm" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Mode</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as never)} className="flex gap-4">
                  {(["cold", "warm", "both"] as const).map((m) => (
                    <label key={m} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm capitalize hover:border-primary/50">
                      <RadioGroupItem value={m} /> {m}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Context length</Label>
                <Input type="number" value={ctx} onChange={(e) => setCtx(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max tokens</Label>
                <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Temperature: <span className="font-mono text-primary">{temp[0].toFixed(2)}</span></Label>
                <Slider value={temp} onValueChange={setTemp} min={0} max={2} step={0.05} />
              </div>
              <div className="space-y-2">
                <Label>Repetitions</Label>
                <Input type="number" value={reps} onChange={(e) => setReps(+e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sample interval (s)</Label>
                <Input type="number" step={0.1} value={interval} onChange={(e) => setInterval(+e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <Button onClick={start} disabled={running} size="lg" className="w-full bg-gradient-primary text-primary-foreground shadow-glow">
                  {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running… {progress}%</> : <><Play className="mr-2 h-4 w-4" /> Start benchmark</>}
                </Button>
                {running && <Progress className="mt-3" value={progress} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>{result.model} · {result.mode} mode · {new Date(result.created_at).toLocaleString()}</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="Generation" value={`${result.generation_tps} tok/s`} highlight />
                <Metric label="Prompt eval" value={`${result.prompt_tps} tok/s`} />
                <Metric label="TTFT" value={`${result.time_to_first_token_sec}s`} />
                <Metric label="Total time" value={`${result.total_time_sec}s`} />
                <Metric label="Peak GPU util" value={`${result.peak_gpu_util_percent}%`} />
                <Metric label="Peak VRAM" value={`${(result.peak_gpu_memory_mb / 1024).toFixed(2)} GB`} />
                <Metric label="Peak CPU" value={`${result.peak_cpu_percent}%`} />
                <Metric label="Peak RAM" value={`${result.peak_ram_used_gb} GB`} />
              </div>
              <BenchmarkCharts />
            </CardContent>
          </Card>
        </div>

        {/* Right panel: live logs */}
        <Card className="h-fit sticky top-20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm">Live progress</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setLogsOpen(!logsOpen)} className="h-7 w-7">
              {logsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardHeader>
          {logsOpen && (
            <CardContent>
              <div className="space-y-2 mb-3 text-xs">
                <Badge variant="outline" className={running ? "border-primary/50 text-primary" : "border-muted-foreground/30 text-muted-foreground"}>
                  {running ? "running" : "idle"}
                </Badge>
              </div>
              <div className="h-80 overflow-y-auto rounded-md bg-background/60 p-3 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">Logs will appear here once a run starts.</p>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} className="leading-relaxed text-muted-foreground">
                      <span className="text-primary">›</span> {l}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-muted/30 p-3 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
