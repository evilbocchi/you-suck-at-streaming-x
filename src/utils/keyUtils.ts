const DISPLAY_MAP: Record<string, string> = {
    space: "Space",
    arrowup: "Arrow Up",
    arrowdown: "Arrow Down",
    arrowleft: "Arrow Left",
    arrowright: "Arrow Right",
    backspace: "Backspace",
    delete: "Delete",
    enter: "Enter",
    tab: "Tab",
};

const BLOCKED_KEYS = new Set(["dead"]);

export const normalizeKey = (raw: string | null | undefined): string | null => {
    if (!raw) {
        return null;
    }

    if (raw === " ") {
        return "space";
    }

    const candidate = raw.toLowerCase();
    if (candidate === "spacebar") {
        return "space";
    }
    if (BLOCKED_KEYS.has(candidate)) {
        return null;
    }

    return candidate;
};

export const formatKeyLabel = (key: string): string => {
    const normalized = key.toLowerCase();
    if (DISPLAY_MAP[normalized]) {
        return DISPLAY_MAP[normalized];
    }

    if (normalized.length === 1) {
        return normalized.toUpperCase();
    }

    return normalized
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
};
