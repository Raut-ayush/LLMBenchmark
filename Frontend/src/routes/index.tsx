import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Gauge,
  MessageSquare,
  Boxes,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Cpu,
} from "lucide-react";
import { MOCK_RESULTS } from "@/lib/mock-data";
import { getInstalledModelNames, getOllamaStatus, type OllamaStatus } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Local LLMx — Dashboard" },
      {
        name: "description",
        content: "Run, benchmark, and chat with open-source LLMs locally on your machine.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const last = MOCK_RESULTS[0];

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      try {
        const [models, status] = await Promise.all([getInstalledModelNames(), getOllamaStatus()]);

        if (!mounted) return;

        setInstalledModels(models);
        setOllamaStatus(status);
        setSummaryError(null);
      } catch (err) {
        if (!mounted) return;

        setInstalledModels([]);
        setOllamaStatus({
          installed: false,
          running: false,
          version: null,
        });
        setSummaryError(err instanceof Error ? err.message : "Backend unavailable");
      }
    };

    void loadSummary();

    return () => {
      mounted = false;
    };
  }, []);

  const online = ollamaStatus?.running ?? false;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="relative mx-auto max-w-7xl space-y-10 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-6">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Sparkles className="mr-1.5 h-3 w-3" /> Local-first AI workbench
            </Badge>
            <h1 className="font-display text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              <span className="text-gradient">Local LLMx</span>
              <br />
              <span className="text-foreground">Your private LLM lab.</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Install Ollama, pull open-source models, benchmark them on your own hardware, and chat
              with them — all without sending a single token to the cloud.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Link to="/install">
                  <Download className="mr-2 h-4 w-4" /> Install
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/benchmark">
                  <Gauge className="mr-2 h-4 w-4" /> Benchmark
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/use">
                  <MessageSquare className="mr-2 h-4 w-4" /> Chat{" "}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="border-primary/20 bg-card/60 shadow-card backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" /> Why Ollama?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p className="flex gap-2">
                <Shield className="h-4 w-4 shrink-0 text-primary" /> Models run entirely on your
                machine — no data leaves.
              </p>
              <p className="flex gap-2">
                <Cpu className="h-4 w-4 shrink-0 text-primary" /> Single-binary runtime, REST API on{" "}
                <code className="font-mono text-foreground">localhost:11434</code>.
              </p>
              <p className="flex gap-2">
                <Boxes className="h-4 w-4 shrink-0 text-primary" /> Pull from a catalog of open
                models: Llama, Qwen, Phi, Mistral, and more.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title="Installed models"
            value={installedModels.length.toString()}
            hint={
              installedModels.length
                ? installedModels.slice(0, 2).join(" · ")
                : summaryError
                  ? "Backend not reachable"
                  : "No models found yet"
            }
            href="/models"
            icon={<Boxes className="h-5 w-5" />}
          />
          <SummaryCard
            title="Last benchmark"
            value={`${last.generation_tps} tok/s`}
            hint={`${last.model} · ${last.mode}`}
            href="/results"
            icon={<Gauge className="h-5 w-5" />}
          />
          <SummaryCard
            title="Server status"
            value={online ? "Online" : "Offline"}
            hint={
              online
                ? `Ollama responding${ollamaStatus?.version ? ` · v${ollamaStatus.version}` : ""}`
                : summaryError || "Ollama not responding"
            }
            href="/settings"
            icon={<Zap className="h-5 w-5" />}
            success={online}
          />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Get going in three steps</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                title: "Install",
                desc: "Set up Ollama and pull your first model.",
                to: "/install",
                icon: Download,
              },
              {
                n: "02",
                title: "Benchmark",
                desc: "Measure tokens/sec, latency, and VRAM usage.",
                to: "/benchmark",
                icon: Gauge,
              },
              {
                n: "03",
                title: "Use",
                desc: "Open a chat and talk to your local model.",
                to: "/use",
                icon: MessageSquare,
              },
            ].map((s) => (
              <Link key={s.n} to={s.to} className="group">
                <Card className="h-full border-border/60 transition-all hover:border-primary/50 hover:shadow-glow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                      <s.icon className="h-4 w-4 text-primary opacity-60 transition-opacity group-hover:opacity-100" />
                    </div>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                    <CardDescription>{s.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  href,
  icon,
  success,
}: {
  title: string;
  value: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
  success?: boolean;
}) {
  return (
    <Link to={href}>
      <Card className="group h-full transition-all hover:border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={success ? "text-success" : "text-primary"}>{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="font-display text-3xl font-semibold tracking-tight">{value}</div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
