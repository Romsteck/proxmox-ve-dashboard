"use client";

import React, { memo, useMemo, Suspense, lazy } from "react";
import clsx from "clsx";
import { useIntersectionObserver } from "@/lib/utils/performance";
import { CHART_CONFIG } from "@/lib/constants";

// Lazy load recharts components to reduce initial bundle size
const LazyLineChart = lazy(() => import("recharts").then(module => ({ default: module.LineChart })));
const LazyAreaChart = lazy(() => import("recharts").then(module => ({ default: module.AreaChart })));
const LazyBarChart = lazy(() => import("recharts").then(module => ({ default: module.BarChart })));
const LazyLine = lazy(() => import("recharts").then(module => ({ default: module.Line })));
const LazyArea = lazy(() => import("recharts").then(module => ({ default: module.Area })));
const LazyBar = lazy(() => import("recharts").then(module => ({ default: module.Bar })));
const LazyXAxis = lazy(() => import("recharts").then(module => ({ default: module.XAxis })));
const LazyYAxis = lazy(() => import("recharts").then(module => ({ default: module.YAxis })));
const LazyCartesianGrid = lazy(() => import("recharts").then(module => ({ default: module.CartesianGrid })));
const LazyTooltip = lazy(() => import("recharts").then(module => ({ default: module.Tooltip })));
const LazyResponsiveContainer = lazy(() => import("recharts").then(module => ({ default: module.ResponsiveContainer })));

export type ChartData = {
  [key: string]: string | number;
};

export type ChartProps = {
  data: ChartData[];
  type?: "line" | "area" | "bar";
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  className?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  lazy?: boolean; // Enable lazy loading
  animationDuration?: number;
};

const defaultColors = {
  line: CHART_CONFIG.COLORS.PRIMARY,
  area: CHART_CONFIG.COLORS.PRIMARY,
  bar: CHART_CONFIG.COLORS.PRIMARY,
};

/**
 * Chart loading skeleton
 */
const ChartSkeleton: React.FC<{ height: number; className?: string }> = memo(({ height, className }) => (
  <div
    className={clsx("w-full bg-gray-100 dark:bg-gray-800 rounded animate-pulse", className)}
    style={{ height }}
  >
    <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
      Loading chart...
    </div>
  </div>
));

ChartSkeleton.displayName = 'ChartSkeleton';

/**
 * Optimized tooltip content
 */
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: any;
    color: string;
  }>;
  label?: string;
}

const OptimizedTooltip = memo<TooltipProps>(({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-gray-800 dark:bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg">
      <p className="text-gray-200 text-sm font-medium">{label}</p>
      {payload.map((entry, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {`${entry.name}: ${entry.value}`}
        </p>
      ))}
    </div>
  );
});

OptimizedTooltip.displayName = 'OptimizedTooltip';

/**
 * Chart component with performance optimizations
 */
export const Chart = memo<ChartProps>(({
  data,
  type = "line",
  dataKey,
  xAxisKey = "name",
  height = CHART_CONFIG.DEFAULT_HEIGHT,
  color,
  className,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  lazy = true,
  animationDuration = CHART_CONFIG.ANIMATION_DURATION,
}) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Memoize chart color to prevent unnecessary recalculations
  const chartColor = useMemo(() => color || defaultColors[type], [color, type]);

  // Memoize common props
  const commonProps = useMemo(() => ({
    data,
    height,
    className: clsx("w-full", className),
  }), [data, height, className]);

  // Memoize tooltip style
  const tooltipStyle = useMemo(() => ({
    backgroundColor: "rgb(31 41 55)",
    border: "1px solid rgb(75 85 99)",
    borderRadius: "0.5rem",
    color: "rgb(243 244 246)",
  }), []);

  // Don't render chart if lazy loading is enabled and not in viewport
  const shouldRender = !lazy || isIntersecting;

  const renderChart = useMemo(() => {
    if (!shouldRender) {
      return null;
    }

    const gridProps = showGrid ? {
      strokeDasharray: "3 3",
      className: "stroke-gray-200 dark:stroke-gray-700"
    } : null;

    const xAxisProps = showXAxis ? {
      dataKey: xAxisKey,
      className: "text-xs fill-gray-500 dark:fill-gray-400"
    } : null;

    const yAxisProps = showYAxis ? {
      className: "text-xs fill-gray-500 dark:fill-gray-400"
    } : null;

    const tooltipProps = showTooltip ? {
      content: <OptimizedTooltip />,
      contentStyle: tooltipStyle,
    } : null;

    switch (type) {
      case "area":
        return (
          <Suspense fallback={<ChartSkeleton height={height} className={className} />}>
            <LazyResponsiveContainer width="100%" height={height}>
              <LazyAreaChart {...commonProps}>
                {showGrid && <LazyCartesianGrid {...gridProps} />}
                {showXAxis && <LazyXAxis {...xAxisProps} />}
                {showYAxis && <LazyYAxis {...yAxisProps} />}
                {showTooltip && <LazyTooltip {...tooltipProps} />}
                <LazyArea
                  type="monotone"
                  dataKey={dataKey}
                  stroke={chartColor}
                  fill={chartColor}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  animationDuration={animationDuration}
                />
              </LazyAreaChart>
            </LazyResponsiveContainer>
          </Suspense>
        );

      case "bar":
        return (
          <Suspense fallback={<ChartSkeleton height={height} className={className} />}>
            <LazyResponsiveContainer width="100%" height={height}>
              <LazyBarChart {...commonProps}>
                {showGrid && <LazyCartesianGrid {...gridProps} />}
                {showXAxis && <LazyXAxis {...xAxisProps} />}
                {showYAxis && <LazyYAxis {...yAxisProps} />}
                {showTooltip && <LazyTooltip {...tooltipProps} />}
                <LazyBar
                  dataKey={dataKey}
                  fill={chartColor}
                  radius={[2, 2, 0, 0]}
                  animationDuration={animationDuration}
                />
              </LazyBarChart>
            </LazyResponsiveContainer>
          </Suspense>
        );

      default: // line
        return (
          <Suspense fallback={<ChartSkeleton height={height} className={className} />}>
            <LazyResponsiveContainer width="100%" height={height}>
              <LazyLineChart {...commonProps}>
                {showGrid && <LazyCartesianGrid {...gridProps} />}
                {showXAxis && <LazyXAxis {...xAxisProps} />}
                {showYAxis && <LazyYAxis {...yAxisProps} />}
                {showTooltip && <LazyTooltip {...tooltipProps} />}
                <LazyLine
                  type="monotone"
                  dataKey={dataKey}
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={{ fill: chartColor, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: chartColor, strokeWidth: 2 }}
                  animationDuration={animationDuration}
                />
              </LazyLineChart>
            </LazyResponsiveContainer>
          </Suspense>
        );
    }
  }, [
    shouldRender,
    type,
    commonProps,
    showGrid,
    showXAxis,
    showYAxis,
    showTooltip,
    xAxisKey,
    tooltipStyle,
    dataKey,
    chartColor,
    animationDuration,
    height,
    className,
  ]);

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="w-full">
      {shouldRender ? (
        renderChart
      ) : (
        <ChartSkeleton height={height} className={className} />
      )}
    </div>
  );
});

Chart.displayName = 'Chart';

export default Chart;