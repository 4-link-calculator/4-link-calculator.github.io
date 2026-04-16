/**
 * Central application state store (Zustand).
 *
 * Manages:
 *  - `designs`      — saved design library (available in Primary / Secondary dropdowns)
 *  - `primaryKey`   — which saved design is selected as Primary
 *  - `secondaryKey` — which saved design is selected as Secondary (null = none)
 *  - `draft`        — the design currently being built / edited in the sidebar setup area
 */

import { create } from "zustand";
import {
    Triangulated4LinkFront,
    Triangulated4LinkRear,
} from "../engine/suspension/triangulated4link";
import { Vehicle } from "../engine/suspension/vehicle";

// ---------------------------------------------------------------------------
// Serialisable geometry types (plain data — no class instances)
// ---------------------------------------------------------------------------

export type PointDef = { x: number; y: number; z: number };

export type VectorDef = { chassis: PointDef; wheel: PointDef };

export type SuspensionType = "triangulated4link";

/** Serialisable configuration for one complete suspension design. */
export type DesignConfig = {
    name: string;
    suspensionType: SuspensionType;
    front: {
        upTravel: number;
        downTravel: number;
        upper: VectorDef;
        lower: VectorDef;
    };
    rear: {
        upTravel: number;
        downTravel: number;
        upper: VectorDef;
        lower: VectorDef;
    };
    cgHeight: number;
    wheelbase: number;
    frontBrakeBias: number;
    frontDriveBias: number;
    tireRollingRadius: number;
};

// ---------------------------------------------------------------------------
// Vehicle factory — converts a DesignConfig into a live Vehicle instance
// ---------------------------------------------------------------------------

export function buildVehicle(config: DesignConfig): Vehicle {
    const { front, rear } = config;

    const frontSuspension = new Triangulated4LinkFront(
        front.upper,
        front.lower
    );

    const rearSuspension = new Triangulated4LinkRear(rear.upper, rear.lower);

    return new Vehicle(
        frontSuspension,
        rearSuspension,
        config.cgHeight,
        config.wheelbase,
        config.frontBrakeBias / 100,
        config.frontDriveBias / 100,
        config.tireRollingRadius
    );
}

const INITIAL_DESIGNS: Record<string, DesignConfig> = {};

const INITIAL_PRIMARY_KEY = "";
const INITIAL_SECONDARY_KEY: string | null = null;

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

export type AppStore = {
    // --- State ---

    /** All saved designs, keyed by name. These populate the dropdown options. */
    designs: Record<string, DesignConfig>;
    /** Name of the design currently shown as Primary in the workspace. */
    primaryKey: string;
    /** Name of the design shown as Secondary overlay, or null for none. */
    secondaryKey: string | null;
    /**
     * The design currently being assembled in the sidebar setup area.
     * Not saved to `designs` until the user commits it.
     */
    draft: DesignConfig;

    // --- Actions ---

    /** Save a design into the library. If a design with the same name exists it is replaced. */
    saveDesign: (config: DesignConfig) => void;
    /** Remove a design from the library by name. Clears selection if it was active. */
    removeDesign: (name: string) => void;

    /** Select which saved design to show as Primary. */
    setPrimaryKey: (key: string) => void;
    /** Select which saved design to show as Secondary (pass null to clear). */
    setSecondaryKey: (key: string | null) => void;

    /** Overwrite individual fields on the draft (shallow merge). */
    updateDraft: (partial: Partial<DesignConfig>) => void;
    /** Update a specific link vector inside the draft's front suspension. */
    updateDraftFront: (partial: Partial<DesignConfig["front"]>) => void;
    /** Update a specific link vector inside the draft's rear suspension. */
    updateDraftRear: (partial: Partial<DesignConfig["rear"]>) => void;

    /**
     * Commit the current draft into the design library under `draft.name`.
     * If a design with that name already exists it is replaced.
     * Also sets `primaryKey` to the committed design's name.
     */
    commitDraft: () => void;

    /** Reset the draft to its initial blank state. */
    resetDraft: () => void;

    /**
     * Load an existing saved design into the draft editor so the user can
     * make changes before saving as a new (or updated) design.
     */
    loadDesignIntoDraft: (name: string) => void;
};

// ---------------------------------------------------------------------------
// Initial draft — a blank triangulated design the user can fill in
// ---------------------------------------------------------------------------

const BLANK_DRAFT: DesignConfig = {
    name: "",
    suspensionType: "triangulated4link",
    front: {
        upTravel: 0,
        downTravel: 0,
        upper: { chassis: { x: 0, y: 0, z: 0 }, wheel: { x: 0, y: 0, z: 0 } },
        lower: { chassis: { x: 0, y: 0, z: 0 }, wheel: { x: 0, y: 0, z: 0 } },
    },
    rear: {
        upTravel: 0,
        downTravel: 0,
        upper: { chassis: { x: 0, y: 0, z: 0 }, wheel: { x: 0, y: 0, z: 0 } },
        lower: { chassis: { x: 0, y: 0, z: 0 }, wheel: { x: 0, y: 0, z: 0 } },
    },
    cgHeight: 0,
    wheelbase: 0,
    frontBrakeBias: 0,
    frontDriveBias: 0,
    tireRollingRadius: 0,
};

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useAppStore = create<AppStore>((set, get) => ({
    designs: INITIAL_DESIGNS,
    primaryKey: INITIAL_PRIMARY_KEY,
    secondaryKey: INITIAL_SECONDARY_KEY,
    draft: { ...BLANK_DRAFT },

    saveDesign(config) {
        set((state) => ({
            designs: { ...state.designs, [config.name]: config },
            primaryKey:
                !state.primaryKey || !state.designs[state.primaryKey]
                    ? config.name
                    : state.primaryKey,
        }));
    },

    removeDesign(name) {
        set((state) => {
            const next = { ...state.designs };
            delete next[name];

            const remainingKeys = Object.keys(next);
            const fallback = remainingKeys[0] ?? "";

            return {
                designs: next,
                primaryKey:
                    state.primaryKey === name ? fallback : state.primaryKey,
                secondaryKey:
                    state.secondaryKey === name ? null : state.secondaryKey,
            };
        });
    },

    setPrimaryKey(key) {
        set({ primaryKey: key });
    },

    setSecondaryKey(key) {
        set({ secondaryKey: key });
    },

    updateDraft(partial) {
        set((state) => ({ draft: { ...state.draft, ...partial } }));
    },

    updateDraftFront(partial) {
        set((state) => ({
            draft: {
                ...state.draft,
                front: { ...state.draft.front, ...partial },
            },
        }));
    },

    updateDraftRear(partial) {
        set((state) => ({
            draft: {
                ...state.draft,
                rear: { ...state.draft.rear, ...partial },
            },
        }));
    },

    commitDraft() {
        const { draft } = get();
        set((state) => ({
            designs: { ...state.designs, [draft.name]: { ...draft } },
            primaryKey: draft.name,
        }));
    },

    resetDraft() {
        set({ draft: { ...BLANK_DRAFT } });
    },

    loadDesignIntoDraft(name) {
        const config = get().designs[name];
        if (config) {
            set({ draft: { ...config } });
        }
    },
}));
