import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_RESULTS } from "@/lib/mock-data";

const samples = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  gpu: Math.round(20 + 60 * Math.sin(i / 3) + Math.random() * 15),
  cpu: Math.round(10 + 35 * Math.cos(i / 4) + Math.random() * 10),
  ram: +(11 + 2 * Math.sin(i / 5) + Math.random() * 0.5).toFixed(2),
  vram: +(2 + 0.4 * Math.sin(i / 6) + Math.random() * 0.2).toFixed(2),
  tps: +(11 + 4 * Math.sin(i / 4) + Math.random() * 2).toFixed(1),
  temp: Math.round(60 + 12 * Math.sin(i / 5) + Math.random() * 4),
}));

const compare = MOCK_RESULTS.map((r) => ({
  model: r.model.split(":")[0],
  generation: r.generation_tps,
  prompt: r.prompt_tps,
}));

const tooltipStyle = {
  backgroundColor: "oklch(0.20 0.014 50)",
  border: "1px solid oklch(0.28 0.018 50)",
  borderRadius: "8px",
  fontSize: "12px",
};

export function BenchmarkCharts() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens / second over run</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer>
            <AreaChart data={samples}>
              <defs>
                <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="tps" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#tpsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">GPU / CPU utilization (%)</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer>
            <LineChart data={samples}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="gpu" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cpu" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Memory: RAM vs VRAM (GB)</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer>
            <AreaChart data={samples}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="t" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="ram" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.25} />
              <Area type="monotone" dataKey="vram" stroke="var(--color-chart-3)" fill="var(--color-chart-3)" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compare runs · tok/s</CardTitle></CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer>
            <BarChart data={compare}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="model" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="generation" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="prompt" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
