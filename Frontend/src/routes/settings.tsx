import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MOCK_MODELS } from "@/lib/mock-data";
import { Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Local LLMx" },
      { name: "description", content: "Configure Ollama URL, default model, output folder, and sampling." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [url, setUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState("qwen2.5-coder:3b");
  const [folder, setFolder] = useState("~/.ollama/models");
  const [interval, setInterval] = useState([0.5]);
  const [theme, setTheme] = useState("dark");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Defaults used across the app.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Connection</CardTitle><CardDescription>Where Ollama is reachable.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          <Label>Ollama URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Defaults</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOCK_MODELS.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Output folder</Label>
            <Input value={folder} onChange={(e) => setFolder(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Sampling interval: <span className="font-mono text-primary">{interval[0].toFixed(2)}s</span></Label>
            <Slider value={interval} onValueChange={setInterval} min={0.1} max={2} step={0.1} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme} className="flex gap-3">
            {["dark", "light", "system"].map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-2 text-sm capitalize hover:border-primary/50">
                <RadioGroupItem value={t} /> {t}
              </label>
            ))}
          </RadioGroup>
          <p className="mt-2 text-xs text-muted-foreground">Currently optimized for dark mode.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Settings saved")} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Save className="mr-2 h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}
