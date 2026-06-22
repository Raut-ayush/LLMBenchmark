import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  RefreshCw,
} from "lucide-react";
import {
  getOllamaStatus,
  getRecommendedModels,
  pullModel,
  type OllamaStatus,
  type RecommendedModel,
} from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/install")({
  head: () => ({
    meta: [
      { title: "Install · Local LLMx" },
      {
        name: "description",
        content: "Install Ollama, pick a model that fits your hardware, and validate the setup.",
      },
    ],
  }),
  component: InstallPage,
});

function InstallPage() {
  const [folder, setFolder] = useState("~/.ollama/models");
  const [selectedModel, setSelectedModel] = useState("qwen2.5-coder:3b");
  const [progress, setProgress] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [validated, setValidated] = useState<null | boolean>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [models, setModels] = useState<RecommendedModel[]>([]);
  const [system, setSystem] = useState<{ ram_gb: number; gpu_vram_gb: number } | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [steps, setSteps] = useState<Record<string, boolean>>({
    download: false,
    install: false,
    folder: false,
    model: false,
    validate: false,
  });

  const selectedRecommendation = useMemo(
    () => models.find((model) => model.name === selectedModel),
    [models, selectedModel],
  );

  const loadRecommendations = async () => {
    setLoadingModels(true);

    try {
      const [recommended, status] = await Promise.all([getRecommendedModels(), getOllamaStatus()]);

      setModels(recommended.models ?? []);
      setSystem(recommended.system);
      setOllamaStatus(status);

      const firstRecommended =
        recommended.models.find((model) => model.recommended)?.name ?? recommended.models[0]?.name;

      if (firstRecommended) {
        setSelectedModel((current) =>
          recommended.models.some((model) => model.name === current) ? current : firstRecommended,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load install data");
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, []);

  const pull = async () => {
    if (!selectedModel) return;

    setPulling(true);
    setProgress(10);

    try {
      const result = await pullModel(selectedModel);

      if (!result.success) {
        throw new Error(result.error || "Model download could not be started");
      }

      setProgress(100);
      setSteps((previous) => ({ ...previous, model: true }));
      toast.success(result.message || `Started downloading ${selectedModel}`);
    } catch (err) {
      setProgress(0);
      toast.error(err instanceof Error ? err.message : "Failed to start model download");
    } finally {
      window.setTimeout(() => {
        setPulling(false);
      }, 600);
    }
  };

  const validate = async () => {
    setValidated(null);

    try {
      const status = await getOllamaStatus();
      const ok = status.running;

      setOllamaStatus(status);
      setValidated(ok);
      setSteps((previous) => ({
        ...previous,
        install: status.installed,
        validate: ok,
      }));

      if (ok) {
        toast.success(`Ollama running${status.version ? ` · v${status.version}` : ""}`);
      } else {
        toast.error("Ollama is not responding on localhost:11434");
      }
    } catch (err) {
      setValidated(false);
      toast.error(err instanceof Error ? err.message : "Validation failed");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Install</h1>
          <p className="text-muted-foreground">
            Set up Ollama, pull a model, and confirm everything works.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void loadRecommendations()}
          disabled={loadingModels}
        >
          {loadingModels ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>What is Ollama?</CardTitle>
          <CardDescription>
            Ollama is an open-source runtime that lets you download and run large language models
            locally with a single command. It exposes a REST API on{" "}
            <code className="font-mono text-foreground">localhost:11434</code> that this app talks
            to.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model vs hardware</CardTitle>
          <CardDescription>
            {system
              ? `Detected about ${system.ram_gb} GB RAM and ${system.gpu_vram_gb} GB GPU VRAM.`
              : "Pick a model that matches your machine. Quantized variants may run lighter."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Params</TableHead>
                <TableHead>RAM</TableHead>
                <TableHead>VRAM</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.name}>
                  <TableCell className="font-mono text-sm">{model.name}</TableCell>
                  <TableCell>{model.parameters}</TableCell>
                  <TableCell>{model.ram_required} GB</TableCell>
                  <TableCell>{model.vram_required} GB</TableCell>
                  <TableCell className="capitalize">{model.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        model.recommended
                          ? "border-success/40 text-success"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }
                    >
                      {model.recommended ? "recommended" : "may be heavy"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!models.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {loadingModels
                      ? "Loading model recommendations…"
                      : "No recommendations loaded."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Setup checklist</CardTitle>
            <CardDescription>Tick off each step as you go.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                id: "download",
                label: "Download Ollama for your OS",
                cmd: "https://ollama.com/download",
              },
              { id: "install", label: "Run the installer", cmd: "ollama --version" },
              {
                id: "folder",
                label: "Set model folder",
                cmd: "export OLLAMA_MODELS=~/.ollama/models",
              },
              {
                id: "model",
                label: "Pull a starter model",
                cmd: `ollama pull ${selectedModel}`,
              },
              {
                id: "validate",
                label: "Validate it streams",
                cmd: `ollama run ${selectedModel} 'hi'`,
              },
            ].map((step) => (
              <div
                key={step.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <Checkbox
                  checked={!!steps[step.id]}
                  onCheckedChange={(value) =>
                    setSteps((previous) => ({ ...previous, [step.id]: !!value }))
                  }
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">{step.label}</div>
                  <code className="block rounded bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
                    <Terminal className="mr-1 inline h-3 w-3" /> {step.cmd}
                  </code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model folder</CardTitle>
              <CardDescription>
                Where weights will be stored. Backend persistence for this setting comes later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="folder">Path</Label>
              <div className="flex gap-2">
                <Input
                  id="folder"
                  value={folder}
                  onChange={(event) => {
                    setFolder(event.target.value);
                    setSteps((previous) => ({ ...previous, folder: true }));
                  }}
                  className="font-mono"
                />
                <Button variant="outline" type="button">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Download model</CardTitle>
              <CardDescription>
                Starts an Ollama pull in the backend. Refresh the Models page after it completes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name} · {model.parameters}
                        {model.recommended ? " · recommended" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRecommendation && (
                  <p className="text-xs text-muted-foreground">
                    Needs about {selectedRecommendation.ram_required} GB RAM and{" "}
                    {selectedRecommendation.vram_required} GB VRAM.
                  </p>
                )}
              </div>
              <Button
                onClick={() => void pull()}
                disabled={pulling || !selectedModel}
                className="w-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                {pulling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting pull… {progress}%
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" /> Pull model
                  </>
                )}
              </Button>
              {pulling && <Progress value={progress} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validate installation</CardTitle>
              <CardDescription>
                Pings Ollama and confirms the local server is reachable.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Button variant="outline" onClick={() => void validate()}>
                Run check
              </Button>
              {validated === true && (
                <span className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> All good
                  {ollamaStatus?.version ? ` · v${ollamaStatus.version}` : ""}
                </span>
              )}
              {validated === false && (
                <span className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" /> Failed
                </span>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
