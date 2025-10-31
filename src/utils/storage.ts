import type { KeyBindings } from "../hooks/useTapTracker";

const STORAGE_KEY_BINDINGS = "streaming-x-keybindings";
const STORAGE_KEY_SNAP = "streaming-x-snap";

export const saveBindings = (bindings: KeyBindings): void => {
    try {
        localStorage.setItem(STORAGE_KEY_BINDINGS, JSON.stringify(bindings));
    } catch (error) {
        console.error("Failed to save keybindings:", error);
    }
};

export const loadBindings = (): KeyBindings | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_BINDINGS);
        if (!stored) {
            return null;
        }
        return JSON.parse(stored) as KeyBindings;
    } catch (error) {
        console.error("Failed to load keybindings:", error);
        return null;
    }
};

export const saveSnap = (snap: number): void => {
    try {
        localStorage.setItem(STORAGE_KEY_SNAP, String(snap));
    } catch (error) {
        console.error("Failed to save snap divisor:", error);
    }
};

export const loadSnap = (): number | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SNAP);
        if (!stored) {
            return null;
        }
        const parsed = Number(stored);
        return Number.isNaN(parsed) ? null : parsed;
    } catch (error) {
        console.error("Failed to load snap divisor:", error);
        return null;
    }
};
