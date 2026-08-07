"use client";

import { cn } from "@/lib/utils/cn";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeClassName?: string;
}

export function MiniSparkline({
  data,
  width = 72,
  height = 24,
  className,
  strokeClassName = "stroke-navy-700",
}: MiniSparklineProps) {
  if (data.length < 2) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const trendingUp = data[data.length - 1] >= data[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          strokeClassName,
          trendingUp ? "stroke-emerald-600" : "stroke-red-500",
        )}
        points={points}
      />
    </svg>
  );
}
