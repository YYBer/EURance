"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Coins } from "lucide-react";

interface Metrics {
  totalBridged: number;
  activeAgents: number;
  avgCostPerTask: number;
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalBridged: 0,
    activeAgents: 0,
    avgCostPerTask: 0,
  });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch {}
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: "Total Real EURO Bridged to EURD",
      value: `€${metrics.totalBridged.toFixed(2)}`,
      icon: Coins,
      color: "text-emerald-400",
    },
    {
      label: "MiCA-Compliant Active AI Agents",
      value: metrics.activeAgents.toString(),
      icon: Users,
      color: "text-cyan-400",
    },
    {
      label: "Average EURD Cost per AI Task",
      value: `${metrics.avgCostPerTask.toFixed(2)} EURD`,
      icon: TrendingUp,
      color: "text-purple-400",
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-500 mb-3 uppercase tracking-wider">
        Quantoz & MiCA Live Metrics
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <stat.icon className={`h-5 w-5 mt-0.5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
