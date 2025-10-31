import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { normalizeKey } from "../utils/keyUtils";

export type HotkeyId = "primary" | "secondary";
export type KeyBindings = Record<HotkeyId, [string, string]>;

export type TapMetrics = {
    tapsPerSecond: number;
    bpm: number;
    unstableRate: number;
    bpmVariance: number;
    windowTapCount: number;
};

export type BpmSample = {
    timestamp: number;
    bpm: number;
};

type TapEvent = {
    timestamp: number;
    hotkey: HotkeyId;
    key: string;
};

const MIN_TAPS_FOR_CALCULATION = 50;
const MAX_TAPS_FOR_CALCULATION = 50;
const HISTORY_MS = 20000;
const SERIES_MS = 30000;
const RESET_BASE_MS = 5000; // 5 seconds base timeout

// Check if we should reset stats due to inactivity
// Resets if gap is >= 5s + 2x the expected beat interval
const shouldResetStats = (tapEvents: TapEvent[], snap: number): boolean => {
    if (tapEvents.length < 2) {
        return false;
    }

    const now = Date.now();
    const lastTap = tapEvents[tapEvents.length - 1].timestamp;
    const timeSinceLastTap = now - lastTap;

    // Calculate the average interval from recent taps
    const sampleSize = Math.min(10, tapEvents.length);
    const recentTaps = tapEvents.slice(-sampleSize);

    if (recentTaps.length < 2) {
        return timeSinceLastTap >= RESET_BASE_MS;
    }

    // Calculate mean interval between taps
    let totalInterval = 0;
    let intervalCount = 0;
    for (let i = 1; i < recentTaps.length; i++) {
        const interval = recentTaps[i].timestamp - recentTaps[i - 1].timestamp;
        if (interval > 0) {
            totalInterval += interval;
            intervalCount++;
        }
    }

    const meanInterval = intervalCount > 0 ? totalInterval / intervalCount : 1000;
    const beatInterval = meanInterval / snap; // Adjust for snap divisor
    const resetThreshold = RESET_BASE_MS + 2 * beatInterval;

    return timeSinceLastTap >= resetThreshold;
};

// Dynamic tap count based on estimated speed
// Fast streaming (>8 taps/sec) uses more taps for stability
const getDynamicTapCount = (recentTaps: TapEvent[]): number => {
    if (recentTaps.length < MIN_TAPS_FOR_CALCULATION) {
        return recentTaps.length;
    }

    // Take a sample of the most recent taps to estimate speed
    const sampleSize = Math.min(20, recentTaps.length);
    const sample = recentTaps.slice(-sampleSize);

    if (sample.length < 2) {
        return MIN_TAPS_FOR_CALCULATION;
    }

    const sampleDuration = sample[sample.length - 1].timestamp - sample[0].timestamp;
    const estimatedTps = sampleDuration > 0 ? ((sample.length - 1) / sampleDuration) * 1000 : 0;

    // Scale tap count based on speed
    // Slow (< 4 tps): use 30 taps
    // Medium (4-8 tps): use 50-80 taps
    // Fast (> 8 tps): use 80-150 taps
    if (estimatedTps < 4) {
        return Math.min(MIN_TAPS_FOR_CALCULATION, recentTaps.length);
    } else if (estimatedTps < 8) {
        const ratio = (estimatedTps - 4) / 4; // 0 to 1
        const count = MIN_TAPS_FOR_CALCULATION + ratio * 50;
        return Math.min(Math.floor(count), recentTaps.length);
    } else {
        const ratio = Math.min((estimatedTps - 8) / 8, 1); // 0 to 1, capped at 16 tps
        const count = 80 + ratio * 70;
        return Math.min(Math.floor(count), MAX_TAPS_FOR_CALCULATION, recentTaps.length);
    }
};

const findHotkeyForKey = (bindings: KeyBindings, key: string): HotkeyId | undefined => {
    return (Object.entries(bindings) as Array<[HotkeyId, [string, string]]>).find(([, keys]) =>
        keys.includes(key),
    )?.[0];
};

type BpmSeriesState = {
    samples: BpmSample[];
    lastBpm: number;
    lastTimestamp: number;
};

type BpmSeriesAction = {
    type: "UPDATE";
    bpm: number;
    timestamp: number;
};

const bpmSeriesReducer = (state: BpmSeriesState, action: BpmSeriesAction): BpmSeriesState => {
    if (action.type === "UPDATE") {
        // Only update if bpm or timestamp changed
        if (action.bpm === state.lastBpm && action.timestamp === state.lastTimestamp) {
            return state;
        }

        const cutoff = action.timestamp - SERIES_MS;
        const trimmed = state.samples.filter((sample) => sample.timestamp >= cutoff);
        const updated = [...trimmed, { timestamp: action.timestamp, bpm: action.bpm }];

        return {
            samples: updated,
            lastBpm: action.bpm,
            lastTimestamp: action.timestamp,
        };
    }
    return state;
};

export const useTapTracker = (bindings: KeyBindings, snap: number) => {
    const [tapEvents, setTapEvents] = useState<TapEvent[]>([]);
    const [totalTaps, setTotalTaps] = useState<number>(0);
    const [bpmSeriesState, dispatchBpmSeries] = useReducer(bpmSeriesReducer, {
        samples: [],
        lastBpm: 0,
        lastTimestamp: 0,
    });

    const bindingsRef = useRef<KeyBindings>(bindings);
    const snapRef = useRef<number>(snap);
    const pressedKeysRef = useRef<Set<string>>(new Set());
    const activeKeyRef = useRef<Record<HotkeyId, string | null>>({
        primary: null,
        secondary: null,
    });

    useEffect(() => {
        bindingsRef.current = bindings;
    }, [bindings]);

    useEffect(() => {
        snapRef.current = snap;
    }, [snap]);

    // Check for inactivity and reset stats
    useEffect(() => {
        const checkInterval = setInterval(() => {
            if (shouldResetStats(tapEvents, snapRef.current)) {
                setTapEvents([]);
                // Note: totalTaps is not reset - it's a lifetime counter
            }
        }, 1000); // Check every second

        return () => clearInterval(checkInterval);
    }, [tapEvents]);

    useEffect(() => {
        const releaseAll = () => {
            pressedKeysRef.current.clear();
            activeKeyRef.current = { primary: null, secondary: null };
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState !== "visible") {
                releaseAll();
            }
        };

        window.addEventListener("blur", releaseAll);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("blur", releaseAll);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) {
                return;
            }

            const normalized = normalizeKey(event.key);
            if (!normalized) {
                return;
            }

            const hotkey = findHotkeyForKey(bindingsRef.current, normalized);
            if (!hotkey) {
                return;
            }

            const activeKey = activeKeyRef.current[hotkey];
            if (activeKey && activeKey !== normalized && pressedKeysRef.current.has(activeKey)) {
                return;
            }

            if (pressedKeysRef.current.has(normalized)) {
                return;
            }

            event.preventDefault();
            pressedKeysRef.current.add(normalized);
            activeKeyRef.current[hotkey] = normalized;

            const timestamp = Date.now();
            setTotalTaps((prev: number) => prev + 1);
            setTapEvents((prev: TapEvent[]) => {
                const cutoff = timestamp - HISTORY_MS;
                const trimmed = prev.filter((tap: TapEvent) => tap.timestamp >= cutoff);
                return [...trimmed, { timestamp, hotkey, key: normalized }];
            });
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            const normalized = normalizeKey(event.key);
            if (!normalized) {
                return;
            }

            pressedKeysRef.current.delete(normalized);

            const hotkey = findHotkeyForKey(bindingsRef.current, normalized);
            if (hotkey && activeKeyRef.current[hotkey] === normalized) {
                activeKeyRef.current[hotkey] = null;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    const windowEvents = useMemo(() => {
        // Dynamically determine how many taps to use based on speed
        const tapCount = getDynamicTapCount(tapEvents);
        return tapEvents.slice(-tapCount);
    }, [tapEvents]);

    const metrics: TapMetrics = useMemo(() => {
        if (windowEvents.length < 3) {
            return {
                tapsPerSecond: 0,
                bpm: 0,
                unstableRate: 0,
                bpmVariance: 0,
                windowTapCount: windowEvents.length,
            };
        }

        const sorted = [...windowEvents].sort((a, b) => a.timestamp - b.timestamp);

        // Calculate actual duration between first and last tap
        const firstTapTime = sorted[0].timestamp;
        const lastTapTime = sorted[sorted.length - 1].timestamp;
        const durationMs = lastTapTime - firstTapTime;

        // Calculate taps per second based on actual duration
        // If duration is 0, we have multiple taps at the same timestamp, so use a small duration
        const durationSeconds = durationMs > 0 ? durationMs / 1000 : 0.001;
        const tapsPerSecond = (windowEvents.length - 1) / durationSeconds; // -1 because we count intervals, not taps
        const bpm = tapsPerSecond > 0 ? (tapsPerSecond * 60) / snap : 0;

        // Calculate intervals for stability metrics
        const intervalsMs: number[] = [];
        for (let i = 1; i < sorted.length; i += 1) {
            const delta = sorted[i].timestamp - sorted[i - 1].timestamp;
            if (delta > 0) {
                intervalsMs.push(delta);
            }
        }

        if (!intervalsMs.length) {
            return {
                tapsPerSecond,
                bpm,
                unstableRate: 0,
                bpmVariance: 0,
                windowTapCount: windowEvents.length,
            };
        }

        const meanInterval =
            intervalsMs.reduce((acc, value) => acc + value, 0) / intervalsMs.length;
        const stdDev = Math.sqrt(
            intervalsMs.reduce((acc, value) => acc + (value - meanInterval) ** 2, 0) /
                intervalsMs.length,
        );
        const unstableRate = stdDev * 10;

        const instantBpms = intervalsMs.map((intervalMs) => {
            const intervalSeconds = intervalMs / 1000;
            return intervalSeconds > 0 ? 60 / (intervalSeconds * snap) : 0;
        });
        const meanBpm = instantBpms.reduce((acc, value) => acc + value, 0) / instantBpms.length;
        const bpmVariance =
            instantBpms.reduce((acc, value) => acc + (value - meanBpm) ** 2, 0) /
            instantBpms.length;

        return {
            tapsPerSecond,
            bpm,
            unstableRate,
            bpmVariance,
            windowTapCount: windowEvents.length,
        };
    }, [snap, windowEvents]);

    useEffect(() => {
        // Only record BPM samples when we have enough taps to calculate meaningful metrics
        if (windowEvents.length >= 3) {
            dispatchBpmSeries({
                type: "UPDATE",
                bpm: metrics.bpm,
                timestamp: Date.now(),
            });
        }
    }, [metrics.bpm, windowEvents.length]);

    return {
        metrics,
        bpmSeries: bpmSeriesState.samples,
        totalTaps,
    };
};
