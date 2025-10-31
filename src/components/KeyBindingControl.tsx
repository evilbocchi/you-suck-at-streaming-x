import type { HotkeyId } from "../hooks/useTapTracker";
import { formatKeyLabel } from "../utils/keyUtils";

type KeyBindingControlProps = {
    hotkey: HotkeyId;
    label: string;
    keys: [string, string];
    listeningIndex: number | null;
    onCapture: (hotkey: HotkeyId, index: number) => void;
};

const KeyBindingControl = ({
    hotkey,
    label,
    keys,
    listeningIndex,
    onCapture,
}: KeyBindingControlProps) => {
    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <div className="grid grid-cols-2 gap-3">
                {keys.map((key, index) => {
                    const isListening = listeningIndex === index;
                    return (
                        <button
                            key={`${hotkey}-${index}`}
                            type="button"
                            onClick={() => onCapture(hotkey, index)}
                            className={`rounded-md border border-slate-700 px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                                isListening
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-slate-800/50 text-slate-200 hover:bg-slate-800"
                            }`}
                        >
                            {isListening ? "Press any key…" : formatKeyLabel(key)}
                        </button>
                    );
                })}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
                Click to rebind. Each key must be unique.
            </p>
        </div>
    );
};

export default KeyBindingControl;
