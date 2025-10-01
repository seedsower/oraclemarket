import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PriceChartProps {
  marketId: string;
  yesProbability: number;
}

export function PriceChart({ marketId, yesProbability }: PriceChartProps) {
  const data = useMemo(() => {
    const now = Date.now();
    const points = 30;
    const interval = 24 * 60 * 60 * 1000;
    
    return Array.from({ length: points }, (_, i) => {
      const variance = (Math.random() - 0.5) * 0.1;
      const price = Math.max(0.1, Math.min(0.9, yesProbability + variance));
      
      return {
        time: new Date(now - (points - i) * interval).toLocaleDateString(),
        price: Number((price * 100).toFixed(2)),
      };
    });
  }, [marketId, yesProbability]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${marketId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="time"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
            }}
            formatter={(value: number) => [`${value}%`, "Probability"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill={`url(#gradient-${marketId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
