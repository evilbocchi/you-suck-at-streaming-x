import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import BpmChart from "./components/BpmChart";
import KeyBindingControl from "./components/KeyBindingControl";
import StatsPanel from "./components/StatsPanel";
import type { HotkeyId, KeyBindings } from "./hooks/useTapTracker";
import { useTapTracker } from "./hooks/useTapTracker";
import { formatKeyLabel, normalizeKey } from "./utils/keyUtils";
import { loadBindings, loadSnap, saveBindings, saveSnap } from "./utils/storage";

const DEFAULT_BINDINGS: KeyBindings = {
    primary: ["z", "a"],
    secondary: ["x", "s"],
};

const DEFAULT_SNAP = 4;
const SNAP_OPTIONS = [1, 2, 3, 4, 6, 8];

type ListeningState = {
    hotkey: HotkeyId;
    index: number;
};

const App = () => {
    const [bindings, setBindings] = useState<KeyBindings>(() => {
        const saved = loadBindings();
        return saved ?? DEFAULT_BINDINGS;
    });
    const [snap, setSnap] = useState<number>(() => {
        const saved = loadSnap();
        return saved ?? DEFAULT_SNAP;
    });
    const [listening, setListening] = useState<ListeningState | null>(null);
    const [bindingError, setBindingError] = useState<string | null>(null);

    const { metrics, bpmSeries, totalTaps } = useTapTracker(bindings, snap);

    // Save bindings to localStorage whenever they change
    useEffect(() => {
        saveBindings(bindings);
    }, [bindings]);

    // Save snap divisor to localStorage whenever it changes
    useEffect(() => {
        saveSnap(snap);
    }, [snap]);

    const allKeys = useMemo(() => {
        const keys = Object.values(bindings).flat();
        return new Set<string>(keys);
    }, [bindings]);

    useEffect(() => {
        if (!listening) {
            return;
        }

        const { hotkey, index } = listening;

        const handleKeyCapture = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setListening(null);
                setBindingError(null);
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const normalized = normalizeKey(event.key);
            if (!normalized) {
                setBindingError("That key cannot be used. Try a different one.");
                setListening(null);
                return;
            }

            const alreadyUsed = allKeys.has(normalized);
            const currentKey = bindings[hotkey][index];

            if (alreadyUsed && currentKey !== normalized) {
                setBindingError(`Key ${formatKeyLabel(normalized)} is already bound.`);
                setListening(null);
                return;
            }

            setBindings((prev: KeyBindings) => {
                const updatedPair = [...prev[hotkey]] as [string, string];
                updatedPair[index] = normalized;
                return {
                    ...prev,
                    [hotkey]: updatedPair,
                };
            });

            setBindingError(null);
            setListening(null);
        };

        window.addEventListener("keydown", handleKeyCapture, { once: true });
        return () => window.removeEventListener("keydown", handleKeyCapture);
    }, [allKeys, bindings, listening]);

    const startCapture = (hotkey: HotkeyId, index: number) => {
        setBindingError(null);
        setListening({ hotkey, index });
    };

    const handleSnapChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setSnap(Number(event.target.value));
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-16">
            <main className="mx-auto mt-10 flex max-w-5xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
                <section className="space-y-4">
                    {bindingError && <p className="text-sm text-rose-400">{bindingError}</p>}
                    <div className="grid gap-4 md:grid-cols-2">
                        <KeyBindingControl
                            hotkey="primary"
                            label="Primary stream hotkey"
                            keys={bindings.primary}
                            listeningIndex={
                                listening?.hotkey === "primary" ? listening.index : null
                            }
                            onCapture={startCapture}
                        />
                        <KeyBindingControl
                            hotkey="secondary"
                            label="Secondary stream hotkey"
                            keys={bindings.secondary}
                            listeningIndex={
                                listening?.hotkey === "secondary" ? listening.index : null
                            }
                            onCapture={startCapture}
                        />
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-200">Performance metrics</h2>
                    <StatsPanel metrics={metrics} totalTaps={totalTaps} snap={snap} />
                    <div className="flex flex-wrap items-center gap-4">
                        <label className="text-sm font-medium text-slate-300">
                            Snap divisor
                            <select
                                value={snap}
                                onChange={handleSnapChange}
                                className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                            >
                                {SNAP_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        1/{option}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <span className="text-xs text-slate-500">BPM = taps/sec × 60 ÷ snap</span>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-200">BPM timeline</h2>
                    <BpmChart data={bpmSeries} />
                </section>

                <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                    <h2 className="text-base font-semibold text-slate-200">How it works</h2>
                    <ul className="mt-3 list-disc space-y-2 pl-5">
                        <li>
                            Only one key per hotkey pair registers at a time, so mashing both keys
                            together won&apos;t double-input.
                        </li>
                        <li>
                            BPM is calculated from your recent taps using a dynamic window size.
                            Faster streaming (8+ taps/sec) uses up to 150 taps for better accuracy,
                            while slower streaming uses 30-50 taps for responsiveness. The
                            calculation uses the actual time span between first and last tap.
                        </li>
                        <li>
                            Stats automatically reset after 5 seconds plus 2x your beat interval of
                            inactivity, so you can take a break and start fresh without stale data.
                        </li>
                        <li>
                            Unstable rate equals the standard deviation of tap spacing × 10,
                            matching osu! convention.
                        </li>
                        <li>
                            BPM variance reflects how steady your pacing is across the last few
                            seconds.
                        </li>
                    </ul>
                </section>
            </main>
        </div>
    );
};

export default App;
