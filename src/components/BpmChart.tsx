import { useMemo } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { BpmSample } from "../hooks/useTapTracker";

type BpmChartProps = {
    data: BpmSample[];
};

const BpmChart = ({ data }: BpmChartProps) => {
    const chartData = useMemo(() => {
        if (!data.length) {
            return [] as Array<{ seconds: number; bpm: number }>;
        }

        const baseline = data[0].timestamp;
        return data.map((sample) => ({
            seconds: (sample.timestamp - baseline) / 1000,
            bpm: Number(sample.bpm.toFixed(2)),
        }));
    }, [data]);

    if (!chartData.length) {
        return (
            <div className="flex h-72 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70">
                <p className="text-sm text-slate-500">Start tapping to populate the BPM graph.</p>
            </div>
        );
    }

    return (
        <div className="h-72 w-full rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                    <XAxis
                        dataKey="seconds"
                        tickFormatter={(value: number) => `${Math.floor(value)}s`}
                        stroke="#64748b"
                        fontSize={12}
                    />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, "auto"]} />
                    <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }}
                        labelFormatter={(value: number) => `${value.toFixed(2)}s`}
                    />
                    <Line
                        type="monotone"
                        dataKey="bpm"
                        stroke="#34d399"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BpmChart;
