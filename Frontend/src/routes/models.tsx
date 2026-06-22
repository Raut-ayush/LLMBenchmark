import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Pause, Trash2, Info, Gauge, Download } from "lucide-react";
import { MOCK_MODELS } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Models · Local LLMx" },
      { name: "description", content: "Manage your installed local models — load, unload, inspect, and benchmark." },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Models</h1>
          <p className="text-muted-foreground">Everything you've downloaded, plus actions to manage them.</p>
        </div>
        <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
          <a href="/install"><Download className="mr-2 h-4 w-4" /> Pull new model</a>
        </Button>
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
              {MOCK_MODELS.map((m) => (
                <TableRow key={m.name}>
                  <TableCell className="font-mono text-sm">{m.name}</TableCell>
                  <TableCell>{m.size}</TableCell>
                  <TableCell>{m.context_length.toLocaleString()}</TableCell>
                  <TableCell>
                    {m.status === "installed" ? (
                      <Badge variant="outline" className="border-success/40 text-success">installed</Badge>
                    ) : (
                      <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">not installed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.modified_at === "—" ? "—" : new Date(m.modified_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <IconBtn label="Load" onClick={() => toast.success(`Loaded ${m.name}`)}><Play className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Unload" onClick={() => toast(`Unloaded ${m.name}`)}><Pause className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Inspect" onClick={() => toast(`Inspecting ${m.name}`)}><Info className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Benchmark" onClick={() => toast(`Benchmark queued for ${m.name}`)}><Gauge className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label="Delete" danger onClick={() => toast.error(`Removed ${m.name}`)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
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
