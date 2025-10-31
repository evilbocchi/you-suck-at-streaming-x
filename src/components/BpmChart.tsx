import { memo, useMemo } from "react";
import {
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { BpmSample } from "../hooks/useTapTracker";

type BpmChartProps = {
    data: BpmSample[];
};

type ChartDataPoint = {
    seconds: number;
    bpm: number;
    deviation?: number;
    deviationColor?: string;
};

const getDeviationColor = (deviationPercent: number): string => {
    if (deviationPercent < 50) return "#34d399"; // Green
    if (deviationPercent < 100) return "#fbbf24"; // Yellow
    return "#f87171"; // Red
};

const BpmChart = memo(({ data }: BpmChartProps) => {
    const chartData = useMemo(() => {
        if (!data.length) {
            return [] as ChartDataPoint[];
        }

        const baseline = data[0].timestamp;

        // Map samples with deviation colors based on last 5 notes
        return data.map((sample, index) => {
            const seconds = (sample.timestamp - baseline) / 1000;
            const bpm = Math.round(sample.bpm * 10) / 10;

            if (index === 0) {
                return { seconds, bpm, deviation: 0, deviationColor: "#34d399" };
            }

            // Calculate median interval from last 5 taps (up to 4 intervals)
            const lookbackStart = Math.max(0, index - 4);
            const recentIntervals: number[] = [];

            for (let i = lookbackStart + 1; i <= index; i++) {
                recentIntervals.push(data[i].timestamp - data[i - 1].timestamp);
            }

            if (recentIntervals.length === 0) {
                return { seconds, bpm, deviation: 0, deviationColor: "#34d399" };
            }

            // Calculate median of recent intervals
            const sortedIntervals = [...recentIntervals].sort((a, b) => a - b);
            const mid = Math.floor(sortedIntervals.length / 2);
            const medianInterval =
                sortedIntervals.length % 2 === 0
                    ? (sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2
                    : sortedIntervals[mid];

            const actualInterval = sample.timestamp - data[index - 1].timestamp;
            const deviation = Math.abs(actualInterval - medianInterval);
            const deviationPercent = (deviation / medianInterval) * 100;

            return {
                seconds,
                bpm,
                deviation,
                deviationColor: getDeviationColor(deviationPercent),
            };
        });
    }, [data]);

    if (!chartData.length) {
        return (
            <div className="flex h-72 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70">
                <p className="text-sm text-slate-500">Start tapping to populate the BPM graph.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="h-72 w-full rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, bottom: 10, left: 0 }}
                    >
                        <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                        <XAxis
                            dataKey="seconds"
                            tickFormatter={(value: number) => `${Math.floor(value)}s`}
                            stroke="#64748b"
                            fontSize={12}
                            tick={{ fill: "#64748b" }}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            domain={[0, "auto"]}
                            tick={{ fill: "#64748b" }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#0f172a",
                                border: "1px solid #1e293b",
                            }}
                            formatter={(value: number, name: string) => {
                                if (name === "deviation") {
                                    return [`${Math.round(value)}ms`, "Gap"];
                                }
                                return [value, name === "bpm" ? "BPM" : name];
                            }}
                            animationDuration={0}
                        />
                        {/* Trend line */}
                        <Line
                            type="monotone"
                            dataKey="bpm"
                            stroke="#34d399"
                            strokeWidth={1.5}
                            strokeOpacity={0.6}
                            dot={false}
                            isAnimationActive={false}
                        />
                        {/* Individual tap markers with color-coded deviation */}
                        <Scatter
                            dataKey="bpm"
                            fill="#34d399"
                            isAnimationActive={false}
                            shape={(props: {
                                cx?: number;
                                cy?: number;
                                payload?: ChartDataPoint;
                            }) => {
                                const { cx, cy, payload } = props;
                                const color = payload?.deviationColor || "#34d399";
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={3}
                                        fill={color}
                                        strokeWidth={0}
                                        opacity={0.9}
                                    />
                                );
                            }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

BpmChart.displayName = "BpmChart";

export default BpmChart;
