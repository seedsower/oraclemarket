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
          <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" opacity={0.6} />
          <XAxis
            dataKey="time"
            stroke="#e2e8f0"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#e2e8f0" }}
          />
          <YAxis
            stroke="#e2e8f0"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: "#e2e8f0" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a202c",
              border: "1px solid #4a5568",
              borderRadius: "0.5rem",
              color: "#e2e8f0",
            }}
            formatter={(value: number) => [`${value}%`, "Probability"]}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="#a78bfa"
            strokeWidth={2}
            fill={`url(#gradient-${marketId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
