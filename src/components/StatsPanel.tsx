import { memo } from "react";
import type { TapMetrics } from "../hooks/useTapTracker";

const formatNumber = (value: number, digits = 1): string => {
    if (!Number.isFinite(value)) {
        return "0";
    }

    return value.toFixed(digits);
};

type StatsPanelProps = {
    metrics: TapMetrics;
    totalTaps: number;
    snap: number;
};

const StatsPanel = memo(({ metrics, totalTaps, snap }: StatsPanelProps) => {
    return (
        <div className="grid gap-4 grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Current BPM
                </p>
                <p className="text-3xl font-bold text-emerald-400">
                    {formatNumber(metrics.bpm, 1)}
                </p>
                <p className="text-xs text-slate-500">@ 1/{snap}</p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Taps / Second
                </p>
                <p className="text-3xl font-bold text-sky-400">
                    {formatNumber(metrics.tapsPerSecond, 2)}
                </p>
                <p className="text-xs text-slate-500">Based on {metrics.windowTapCount} inputs</p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Unstable Rate
                </p>
                <p className="text-3xl font-bold text-orange-400">
                    {formatNumber(metrics.unstableRate, 0)}
                </p>
                <p className="text-xs text-slate-500">Lower is better (std dev × 10)</p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 col-span-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Lifetime Taps
                </p>
                <p className="text-2xl font-semibold text-slate-100">{totalTaps}</p>
                <p className="text-xs text-slate-500">Clears when you reload the page</p>
            </div>
        </div>
    );
});

StatsPanel.displayName = "StatsPanel";

export default StatsPanel;
