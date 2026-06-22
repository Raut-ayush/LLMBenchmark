import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { PROCESS_STEPS } from "@/lib/mock-data";

export const Route = createFileRoute("/process")({
  head: () => ({
    meta: [
      { title: "Process · Local LLMx" },
      { name: "description", content: "Step-by-step beginner setup flow from Ollama install to first benchmark." },
    ],
  }),
  component: ProcessPage,
});

function ProcessPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Process</h1>
        <p className="text-muted-foreground">
          A beginner-friendly walkthrough from a blank machine to your first running benchmark.
        </p>
      </header>

      <div className="relative">
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
        <ol className="space-y-4">
          {PROCESS_STEPS.map((step, i) => {
            const done = i < 2;
            return (
              <li key={step.id} className="relative pl-12">
                <span className={`absolute left-0 top-2 flex h-10 w-10 items-center justify-center rounded-full border-2 ${done ? "border-success bg-success/10 text-success" : "border-primary bg-primary/10 text-primary"}`}>
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </span>
                <Card className={done ? "border-success/30" : ""}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-[10px]">Step {step.id}</Badge>
                      {done && <Badge variant="outline" className="border-success/40 text-[10px] text-success">done</Badge>}
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                    <CardDescription>{step.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
