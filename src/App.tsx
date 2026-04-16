import { useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import "./App.css";
import { PrimaryGraph3D } from "./components/PrimaryGraph3D";
import { TravelMetricGraph, type TravelSeriesPoint } from "./components/TravelMetricGraph";
import { analyzeTravel, Vehicle, type AnalysisResult } from "./engine/suspension/vehicle";
import { useAppStore, buildVehicle, type DesignConfig } from "./state/store";

function mapMetricSeries(
    results: AnalysisResult[],
    selector: (result: AnalysisResult) => number
): TravelSeriesPoint[] {
    return results.map((result) => ({
        zDelta: result.zDelta,
        value: selector(result),
    }));
}

function parseNumericInput(value: string): number | null {
    if (value === "" || value === "-") return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function formatNumericInput(value: number, reverseSign = false): string {
    const displayValue = reverseSign ? -value : value;
    return String(displayValue);
}

function normalizeDownTravel(value: number): number {
    return value > 0 ? -value : value;
}

function isPointDef(value: unknown): value is { x: number; y: number; z: number } {
    if (!value || typeof value !== "object") return false;
    const point = value as Record<string, unknown>;
    return (
        typeof point.x === "number" &&
        typeof point.y === "number" &&
        typeof point.z === "number"
    );
}

function isVectorDef(value: unknown): value is { chassis: { x: number; y: number; z: number }; wheel: { x: number; y: number; z: number } } {
    if (!value || typeof value !== "object") return false;
    const vector = value as Record<string, unknown>;
    return isPointDef(vector.chassis) && isPointDef(vector.wheel);
}

function isDesignConfig(value: unknown): value is DesignConfig {
    if (!value || typeof value !== "object") return false;
    const cfg = value as Record<string, unknown>;
    const front = cfg.front as Record<string, unknown> | undefined;
    const rear = cfg.rear as Record<string, unknown> | undefined;

    return (
        typeof cfg.name === "string" &&
        cfg.suspensionType === "triangulated4link" &&
        !!front &&
        !!rear &&
        typeof front.upTravel === "number" &&
        typeof front.downTravel === "number" &&
        isVectorDef(front.upper) &&
        isVectorDef(front.lower) &&
        typeof rear.upTravel === "number" &&
        typeof rear.downTravel === "number" &&
        isVectorDef(rear.upper) &&
        isVectorDef(rear.lower) &&
        typeof cfg.cgHeight === "number" &&
        typeof cfg.wheelbase === "number" &&
        typeof cfg.frontBrakeBias === "number" &&
        typeof cfg.frontDriveBias === "number" &&
        typeof cfg.tireRollingRadius === "number"
    );
}

function normalizeImportedDesign(value: unknown): DesignConfig | null {
    if (!value || typeof value !== "object") return null;
    const cfg = value as Record<string, unknown>;
    const front = cfg.front as Record<string, unknown> | undefined;
    const rear = cfg.rear as Record<string, unknown> | undefined;

    const normalized = {
        ...cfg,
        front: front
            ? {
                ...front,
                upTravel:
                    typeof front.upTravel === "number" ? front.upTravel : 20,
                downTravel:
                    typeof front.downTravel === "number"
                        ? normalizeDownTravel(front.downTravel)
                        : -20,
            }
            : front,
        rear: rear
            ? {
                ...rear,
                upTravel:
                    typeof rear.upTravel === "number" ? rear.upTravel : 20,
                downTravel:
                    typeof rear.downTravel === "number"
                        ? normalizeDownTravel(rear.downTravel)
                        : -20,
            }
            : rear,
    };

    return isDesignConfig(normalized) ? normalized : null;
}

function App() {
    const designs = useAppStore((s) => s.designs);
    const primaryKey = useAppStore((s) => s.primaryKey);
    const secondaryKey = useAppStore((s) => s.secondaryKey);
    const draft = useAppStore((s) => s.draft);
    const setPrimaryKey = useAppStore((s) => s.setPrimaryKey);
    const setSecondaryKey = useAppStore((s) => s.setSecondaryKey);
    const updateDraft = useAppStore((s) => s.updateDraft);
    const updateDraftFront = useAppStore((s) => s.updateDraftFront);
    const updateDraftRear = useAppStore((s) => s.updateDraftRear);
    const saveDesign = useAppStore((s) => s.saveDesign);
    const loadDesignIntoDraft = useAppStore((s) => s.loadDesignIntoDraft);
    const removeDesign = useAppStore((s) => s.removeDesign);
    const [selectedLoadName, setSelectedLoadName] = useState("");
    const [selectedRemoveName, setSelectedRemoveName] = useState("");
    const [dataPointCount, setDataPointCount] = useState(100);
    const importInputRef = useRef<HTMLInputElement>(null);
    const dataPointFillPercent = ((dataPointCount - 5) / (100 - 5)) * 100;

    const designNames = useMemo(() => Object.keys(designs), [designs]);
    const hasDesigns = designNames.length > 0;
    const selectedPrimaryConfig = designs[primaryKey] ?? draft;
    const selectedSecondaryConfig =
        secondaryKey != null && designs[secondaryKey]
            ? designs[secondaryKey]
            : undefined;

    function updateDraftNumberField<K extends keyof typeof draft>(
        key: K,
        value: string,
        reverseSign = false
    ) {
        const parsed = parseNumericInput(value);
        if (parsed === null) return;
        const next = reverseSign ? -parsed : parsed;
        updateDraft({ [key]: next } as Pick<typeof draft, K>);
    }

    function handleSaveDraft() {
        const trimmedName = draft.name.trim();
        if (!trimmedName) {
            window.alert("Please enter a design name before saving.");
            return;
        }

        const existing = designs[trimmedName];
        if (existing) {
            const shouldOverwrite = window.confirm(
                `A design named "${trimmedName}" already exists. Overwrite it?`
            );
            if (!shouldOverwrite) return;
        }

        const toSave = { ...draft, name: trimmedName };
        saveDesign(toSave);
        updateDraft({ name: trimmedName });
        setSelectedLoadName(trimmedName);
    }

    function handleRemoveDesign() {
        if (!selectedRemoveName) {
            window.alert("Please select a design to remove.");
            return;
        }

        const shouldDelete = window.confirm(
            `Are you sure you want to delete "${selectedRemoveName}"?`
        );
        if (!shouldDelete) return;

        removeDesign(selectedRemoveName);
        setSelectedRemoveName("");
        setSelectedLoadName("");
    }

    function handleExportDesigns() {
        const payload = {
            schema: "4lnk-designs-v1",
            exportedAt: new Date().toISOString(),
            designs: designNames.map((name) => designs[name]),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `4link-designs-${stamp}.4lnk`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function handleImportDesigns() {
        importInputRef.current?.click();
    }

    async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as unknown;

            let candidates: unknown[] = [];
            if (Array.isArray(parsed)) {
                candidates = parsed;
            } else if (parsed && typeof parsed === "object") {
                const obj = parsed as Record<string, unknown>;
                if (Array.isArray(obj.designs)) {
                    candidates = obj.designs;
                } else {
                    candidates = Object.values(obj);
                }
            }

            const validDesigns = candidates
                .map((candidate) => normalizeImportedDesign(candidate))
                .filter((candidate): candidate is DesignConfig => candidate !== null);
            if (validDesigns.length === 0) {
                window.alert("No valid vehicle designs were found in this file.");
                return;
            }

            // Import behaves like replace: clear existing library first.
            designNames.forEach((name) => {
                removeDesign(name);
            });

            const importedNames: string[] = [];
            validDesigns.forEach((cfg) => {
                const trimmedName = cfg.name.trim();
                if (!trimmedName) return;
                saveDesign({ ...cfg, name: trimmedName });
                importedNames.push(trimmedName);
            });

            const firstImportedName = importedNames[0];
            if (firstImportedName) {
                loadDesignIntoDraft(firstImportedName);
                setSelectedLoadName(firstImportedName);
            }
        } catch {
            window.alert("Failed to import file. Ensure it is a valid .4lnk export.");
        } finally {
            event.target.value = "";
        }
    }

    const primaryVehicle = useMemo(
        () => buildVehicle(selectedPrimaryConfig),
        [selectedPrimaryConfig]
    );
    const secondaryVehicle: Vehicle | undefined = useMemo(
        () => (selectedSecondaryConfig ? buildVehicle(selectedSecondaryConfig) : undefined),
        [selectedSecondaryConfig]
    );

    const primaryFrontAnalysis = useMemo(
        () => [
            ...analyzeTravel(
                primaryVehicle,
                selectedPrimaryConfig.front.upTravel,
                selectedPrimaryConfig.front.downTravel,
                dataPointCount
            ),
        ],
        [
            primaryVehicle,
            selectedPrimaryConfig.front.upTravel,
            selectedPrimaryConfig.front.downTravel,
            dataPointCount,
        ]
    );
    const primaryRearAnalysis = useMemo(
        () => [
            ...analyzeTravel(
                primaryVehicle,
                selectedPrimaryConfig.rear.upTravel,
                selectedPrimaryConfig.rear.downTravel,
                dataPointCount
            ),
        ],
        [
            primaryVehicle,
            selectedPrimaryConfig.rear.upTravel,
            selectedPrimaryConfig.rear.downTravel,
            dataPointCount,
        ]
    );
    const secondaryFrontAnalysis = useMemo(
        () =>
            secondaryVehicle && selectedSecondaryConfig
                ? [
                    ...analyzeTravel(
                        secondaryVehicle,
                        selectedSecondaryConfig.front.upTravel,
                        selectedSecondaryConfig.front.downTravel,
                        dataPointCount
                    ),
                ]
                : [],
        [secondaryVehicle, selectedSecondaryConfig, dataPointCount]
    );
    const secondaryRearAnalysis = useMemo(
        () =>
            secondaryVehicle && selectedSecondaryConfig
                ? [
                    ...analyzeTravel(
                        secondaryVehicle,
                        selectedSecondaryConfig.rear.upTravel,
                        selectedSecondaryConfig.rear.downTravel,
                        dataPointCount
                    ),
                ]
                : [],
        [secondaryVehicle, selectedSecondaryConfig, dataPointCount]
    );

    const frontAntiDiveSeries = useMemo(
        () => mapMetricSeries(primaryFrontAnalysis, (r) => r.characteristics.antiDive * 100),
        [primaryFrontAnalysis]
    );
    const rearAntiLiftSeries = useMemo(
        () => mapMetricSeries(primaryRearAnalysis, (r) => r.characteristics.antiLiftRear * 100),
        [primaryRearAnalysis]
    );
    const frontAntiLiftSeries = useMemo(
        () => mapMetricSeries(primaryFrontAnalysis, (r) => r.characteristics.antiLiftFront * 100),
        [primaryFrontAnalysis]
    );
    const rearAntiSquatSeries = useMemo(
        () => mapMetricSeries(primaryRearAnalysis, (r) => r.characteristics.antiSquat * 100),
        [primaryRearAnalysis]
    );
    const frontRollCenterSeries = useMemo(
        () => mapMetricSeries(primaryFrontAnalysis, (r) => Math.abs(r.characteristics.rollCenterHeightFront)),
        [primaryFrontAnalysis]
    );
    const rearRollCenterSeries = useMemo(
        () => mapMetricSeries(primaryRearAnalysis, (r) => Math.abs(r.characteristics.rollCenterHeightRear)),
        [primaryRearAnalysis]
    );

    const comparisonFrontAntiDiveSeries = useMemo(
        () => mapMetricSeries(secondaryFrontAnalysis, (r) => r.characteristics.antiDive * 100),
        [secondaryFrontAnalysis]
    );
    const comparisonRearAntiLiftSeries = useMemo(
        () => mapMetricSeries(secondaryRearAnalysis, (r) => r.characteristics.antiLiftRear * 100),
        [secondaryRearAnalysis]
    );
    const comparisonFrontAntiLiftSeries = useMemo(
        () => mapMetricSeries(secondaryFrontAnalysis, (r) => r.characteristics.antiLiftFront * 100),
        [secondaryFrontAnalysis]
    );
    const comparisonRearAntiSquatSeries = useMemo(
        () => mapMetricSeries(secondaryRearAnalysis, (r) => r.characteristics.antiSquat * 100),
        [secondaryRearAnalysis]
    );
    const comparisonFrontRollCenterSeries = useMemo(
        () => mapMetricSeries(secondaryFrontAnalysis, (r) => Math.abs(r.characteristics.rollCenterHeightFront)),
        [secondaryFrontAnalysis]
    );
    const comparisonRearRollCenterSeries = useMemo(
        () => mapMetricSeries(secondaryRearAnalysis, (r) => Math.abs(r.characteristics.rollCenterHeightRear)),
        [secondaryRearAnalysis]
    );
    const frontRollCenterInclinationSeries = useMemo(
        () => mapMetricSeries(primaryFrontAnalysis, (r) => r.characteristics.rollCenterInclinationFront),
        [primaryFrontAnalysis]
    );
    const rearRollCenterInclinationSeries = useMemo(
        () => mapMetricSeries(primaryRearAnalysis, (r) => r.characteristics.rollCenterInclinationRear),
        [primaryRearAnalysis]
    );
    const comparisonFrontRollCenterInclinationSeries = useMemo(
        () => mapMetricSeries(secondaryFrontAnalysis, (r) => r.characteristics.rollCenterInclinationFront),
        [secondaryFrontAnalysis]
    );
    const comparisonRearRollCenterInclinationSeries = useMemo(
        () => mapMetricSeries(secondaryRearAnalysis, (r) => r.characteristics.rollCenterInclinationRear),
        [secondaryRearAnalysis]
    );
    const frontPinionAngleChangeSeries = useMemo(
        () => mapMetricSeries(primaryFrontAnalysis, (r) => r.characteristics.pinionAngleChangeFront),
        [primaryFrontAnalysis]
    );
    const rearPinionAngleChangeSeries = useMemo(
        () => mapMetricSeries(primaryRearAnalysis, (r) => r.characteristics.pinionAngleChangeRear),
        [primaryRearAnalysis]
    );
    const comparisonFrontPinionAngleChangeSeries = useMemo(
        () => mapMetricSeries(secondaryFrontAnalysis, (r) => r.characteristics.pinionAngleChangeFront),
        [secondaryFrontAnalysis]
    );
    const comparisonRearPinionAngleChangeSeries = useMemo(
        () => mapMetricSeries(secondaryRearAnalysis, (r) => r.characteristics.pinionAngleChangeRear),
        [secondaryRearAnalysis]
    );

    return (
        <div className="app-shell">
            <aside className="app-sidebar">
                <div className="panel shell-intro">
                    <p className="eyebrow">By Dylan Moon</p>
                    <h1>4-Link Calculator</h1>
                    <p>
                        Calculator assumes a symetrical triangulated 4-link and 1g of acceleration.
                    </p>
                </div>

                <section className="panel">
                    <div className="panel-heading">
                        <p className="eyebrow">Setup</p>
                        <h2>Link Data</h2>
                    </div>
                    <div className="setup-field">
                        <label className="setup-field-label" htmlFor="setup-name">
                            Name
                        </label>
                        <input
                            id="setup-name"
                            className="setup-field-input"
                            type="text"
                            value={draft.name}
                            onChange={(e) => updateDraft({ name: e.target.value })}
                        />
                    </div>
                    <div className="setup-field">
                        <label className="setup-field-label" htmlFor="setup-cg-height">
                            Cg Height
                        </label>
                        <input
                            id="setup-cg-height"
                            className="setup-field-input"
                            type="number"
                            step="any"
                            value={formatNumericInput(draft.cgHeight, true)}
                            onChange={(e) => {
                                updateDraftNumberField("cgHeight", e.target.value, true);
                            }}
                        />
                    </div>
                    <div className="setup-field">
                        <label className="setup-field-label" htmlFor="setup-wheelbase">
                            Wheelbase
                        </label>
                        <input
                            id="setup-wheelbase"
                            className="setup-field-input"
                            type="number"
                            step="any"
                            value={formatNumericInput(draft.wheelbase)}
                            onChange={(e) => {
                                updateDraftNumberField("wheelbase", e.target.value);
                            }}
                        />
                    </div>
                    <div className="setup-field">
                        <label className="setup-field-label" htmlFor="setup-front-brake-bias">
                            Front Brake Bias (%)
                        </label>
                        <input
                            id="setup-front-brake-bias"
                            className="setup-field-input"
                            type="number"
                            step="any"
                            value={formatNumericInput(draft.frontBrakeBias)}
                            onChange={(e) => {
                                updateDraftNumberField("frontBrakeBias", e.target.value);
                            }}
                        />
                    </div>
                    <div className="setup-field">
                        <label className="setup-field-label" htmlFor="setup-front-drive-bias">
                            Front Drive Bias (%)
                        </label>
                        <input
                            id="setup-front-drive-bias"
                            className="setup-field-input"
                            type="number"
                            step="any"
                            value={formatNumericInput(draft.frontDriveBias)}
                            onChange={(e) => {
                                updateDraftNumberField("frontDriveBias", e.target.value);
                            }}
                        />
                    </div>
                    <div className="setup-field">
                        <label className="setup-field-label" htmlFor="setup-tire-rolling-radius">
                            Tire Rolling Radius
                        </label>
                        <input
                            id="setup-tire-rolling-radius"
                            className="setup-field-input"
                            type="number"
                            step="any"
                            value={formatNumericInput(draft.tireRollingRadius)}
                            onChange={(e) => {
                                updateDraftNumberField("tireRollingRadius", e.target.value);
                            }}
                        />
                    </div>

                    <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
                        <h3 style={{ fontSize: "18px", marginBottom: "15px", fontWeight: 600 }}>Front Suspension</h3>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "15px" }}>
                            <div className="setup-field" style={{ marginBottom: 0 }}>
                                <label className="setup-field-label" htmlFor="front-up-travel">
                                    Up Travel
                                </label>
                                <input
                                    id="front-up-travel"
                                    className="setup-field-input"
                                    type="number"
                                    step="any"
                                    value={formatNumericInput(draft.front.upTravel)}
                                    onChange={(e) => {
                                        const parsed = parseNumericInput(e.target.value);
                                        if (parsed === null) return;
                                        updateDraftFront({
                                            upTravel: parsed,
                                        });
                                    }}
                                />
                            </div>
                            <div className="setup-field" style={{ marginBottom: 0 }}>
                                <label className="setup-field-label" htmlFor="front-down-travel">
                                    Down Travel
                                </label>
                                <input
                                    id="front-down-travel"
                                    className="setup-field-input"
                                    type="number"
                                    step="any"
                                    value={formatNumericInput(draft.front.downTravel, true)}
                                    onChange={(e) => {
                                        const parsed = parseNumericInput(e.target.value);
                                        if (parsed === null) return;
                                        updateDraftFront({
                                            downTravel: -Math.abs(parsed),
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Upper Link</p>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>X</p>
                                <input type="number" step="any" value={formatNumericInput(draft.front.upper.chassis.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ upper: { ...draft.front.upper, chassis: { ...draft.front.upper.chassis, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.front.upper.wheel.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ upper: { ...draft.front.upper, wheel: { ...draft.front.upper.wheel, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Y</p>
                                <input type="number" step="any" value={formatNumericInput(draft.front.upper.chassis.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ upper: { ...draft.front.upper, chassis: { ...draft.front.upper.chassis, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.front.upper.wheel.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ upper: { ...draft.front.upper, wheel: { ...draft.front.upper.wheel, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Z</p>
                                <input type="number" step="any" value={formatNumericInput(draft.front.upper.chassis.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ upper: { ...draft.front.upper, chassis: { ...draft.front.upper.chassis, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.front.upper.wheel.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ upper: { ...draft.front.upper, wheel: { ...draft.front.upper.wheel, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginTop: "6px", fontSize: "11px", color: "#999" }}>
                                <span></span>
                                <span>Chassis</span>
                                <span>Wheel</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Lower Link</p>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>X</p>
                                <input type="number" step="any" value={formatNumericInput(draft.front.lower.chassis.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ lower: { ...draft.front.lower, chassis: { ...draft.front.lower.chassis, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.front.lower.wheel.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ lower: { ...draft.front.lower, wheel: { ...draft.front.lower.wheel, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Y</p>
                                <input type="number" step="any" value={formatNumericInput(draft.front.lower.chassis.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ lower: { ...draft.front.lower, chassis: { ...draft.front.lower.chassis, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.front.lower.wheel.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ lower: { ...draft.front.lower, wheel: { ...draft.front.lower.wheel, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Z</p>
                                <input type="number" step="any" value={formatNumericInput(draft.front.lower.chassis.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ lower: { ...draft.front.lower, chassis: { ...draft.front.lower.chassis, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.front.lower.wheel.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftFront({ lower: { ...draft.front.lower, wheel: { ...draft.front.lower.wheel, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginTop: "6px", fontSize: "11px", color: "#999" }}>
                                <span></span>
                                <span>Chassis</span>
                                <span>Wheel</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
                        <h3 style={{ fontSize: "18px", marginBottom: "15px", fontWeight: 600 }}>Rear Suspension</h3>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "15px" }}>
                            <div className="setup-field" style={{ marginBottom: 0 }}>
                                <label className="setup-field-label" htmlFor="rear-up-travel">
                                    Up Travel
                                </label>
                                <input
                                    id="rear-up-travel"
                                    className="setup-field-input"
                                    type="number"
                                    step="any"
                                    value={formatNumericInput(draft.rear.upTravel)}
                                    onChange={(e) => {
                                        const parsed = parseNumericInput(e.target.value);
                                        if (parsed === null) return;
                                        updateDraftRear({
                                            upTravel: parsed,
                                        });
                                    }}
                                />
                            </div>
                            <div className="setup-field" style={{ marginBottom: 0 }}>
                                <label className="setup-field-label" htmlFor="rear-down-travel">
                                    Down Travel
                                </label>
                                <input
                                    id="rear-down-travel"
                                    className="setup-field-input"
                                    type="number"
                                    step="any"
                                    value={formatNumericInput(draft.rear.downTravel, true)}
                                    onChange={(e) => {
                                        const parsed = parseNumericInput(e.target.value);
                                        if (parsed === null) return;
                                        updateDraftRear({
                                            downTravel: -Math.abs(parsed),
                                        });
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Upper Link</p>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>X</p>
                                <input type="number" step="any" value={formatNumericInput(draft.rear.upper.chassis.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ upper: { ...draft.rear.upper, chassis: { ...draft.rear.upper.chassis, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.rear.upper.wheel.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ upper: { ...draft.rear.upper, wheel: { ...draft.rear.upper.wheel, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Y</p>
                                <input type="number" step="any" value={formatNumericInput(draft.rear.upper.chassis.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ upper: { ...draft.rear.upper, chassis: { ...draft.rear.upper.chassis, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.rear.upper.wheel.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ upper: { ...draft.rear.upper, wheel: { ...draft.rear.upper.wheel, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Z</p>
                                <input type="number" step="any" value={formatNumericInput(draft.rear.upper.chassis.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ upper: { ...draft.rear.upper, chassis: { ...draft.rear.upper.chassis, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.rear.upper.wheel.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ upper: { ...draft.rear.upper, wheel: { ...draft.rear.upper.wheel, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginTop: "6px", fontSize: "11px", color: "#999" }}>
                                <span></span>
                                <span>Chassis</span>
                                <span>Wheel</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <p style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Lower Link</p>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>X</p>
                                <input type="number" step="any" value={formatNumericInput(draft.rear.lower.chassis.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ lower: { ...draft.rear.lower, chassis: { ...draft.rear.lower.chassis, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.rear.lower.wheel.x)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ lower: { ...draft.rear.lower, wheel: { ...draft.rear.lower.wheel, x: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginBottom: "5px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Y</p>
                                <input type="number" step="any" value={formatNumericInput(draft.rear.lower.chassis.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ lower: { ...draft.rear.lower, chassis: { ...draft.rear.lower.chassis, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.rear.lower.wheel.y)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ lower: { ...draft.rear.lower, wheel: { ...draft.rear.lower.wheel, y: parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", alignItems: "center" }}>
                                <p style={{ fontSize: "11px", color: "#666", margin: 0, fontWeight: "bold" }}>Z</p>
                                <input type="number" step="any" value={formatNumericInput(draft.rear.lower.chassis.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ lower: { ...draft.rear.lower, chassis: { ...draft.rear.lower.chassis, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                                <input type="number" step="any" value={formatNumericInput(draft.rear.lower.wheel.z, true)} onChange={(e) => { const parsed = parseNumericInput(e.target.value); if (parsed === null) return; updateDraftRear({ lower: { ...draft.rear.lower, wheel: { ...draft.rear.lower.wheel, z: -parsed } } }); }} className="setup-field-input" style={{ padding: "4px", fontSize: "12px" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 1fr", gap: "6px", marginTop: "6px", fontSize: "11px", color: "#999" }}>
                                <span></span>
                                <span>Chassis</span>
                                <span>Wheel</span>
                            </div>
                        </div>
                    </div>

                    <div className="setup-actions" style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "20px" }}>
                        <div className="setup-field">
                            <label className="setup-field-label" htmlFor="setup-load-design">
                                Load Design
                            </label>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <select
                                    id="setup-load-design"
                                    className="setup-field-input setup-field-select"
                                    value={
                                        selectedLoadName && designs[selectedLoadName]
                                            ? selectedLoadName
                                            : (designNames[0] ?? "")
                                    }
                                    onChange={(e) => {
                                        const nextName = e.target.value;
                                        setSelectedLoadName(nextName);
                                        if (!nextName) return;
                                        loadDesignIntoDraft(nextName);
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    {!hasDesigns ? (
                                        <option value="">No saved designs</option>
                                    ) : (
                                        designNames.map((name) => (
                                            <option key={name} value={name}>{name}</option>
                                        ))
                                    )}
                                </select>
                                <button
                                    type="button"
                                    className="setup-action-button"
                                    onClick={handleSaveDraft}
                                    style={{ flex: 0 }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                        <div className="setup-field">
                            <label className="setup-field-label" htmlFor="setup-remove-design">
                                Remove Design
                            </label>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <select
                                    id="setup-remove-design"
                                    className="setup-field-input setup-field-select"
                                    value={selectedRemoveName}
                                    onChange={(e) => setSelectedRemoveName(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">Select a design...</option>
                                    {designNames.map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="setup-action-button"
                                    onClick={handleRemoveDesign}
                                    style={{ flex: 0 }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="panel">
                    <div className="panel-heading">
                        <p className="eyebrow">Library</p>
                        <h2>Saved Configurations</h2>
                    </div>
                    <div className="library-actions">
                        <button
                            type="button"
                            className="setup-action-button"
                            onClick={handleImportDesigns}
                        >
                            Import
                        </button>
                        <button
                            type="button"
                            className="setup-action-button"
                            onClick={handleExportDesigns}
                            disabled={!hasDesigns}
                        >
                            Export
                        </button>
                        <input
                            ref={importInputRef}
                            type="file"
                            accept=".4lnk,application/json"
                            className="library-hidden-input"
                            onChange={handleImportFile}
                        />
                    </div>
                </section>
            </aside>

            <main className="app-workspace">

                <section className="workspace-grid">
                    <article className="panel workspace-panel workspace-panel-primary">
                        <div className="panel-heading">
                        </div>
                        <div className="placeholder-canvas graph-canvas">
                            <PrimaryGraph3D
                                primaryVehicle={primaryVehicle}
                                secondaryVehicle={secondaryVehicle}
                            />
                        </div>
                    </article>

                    <article className="panel workspace-panel workspace-panel-secondary">
                        <div className="panel-heading">
                            <p className="eyebrow">Geometry Selection</p>
                        </div>
                        <div className="geometry-select-stack">
                            <div className="geometry-select-field">
                                <label className="geometry-select-label">Primary</label>
                                <select
                                    className="geometry-select-input"
                                    value={designs[primaryKey] ? primaryKey : ""}
                                    onChange={(e) => setPrimaryKey(e.target.value)}
                                >
                                    {Object.keys(designs).map((key) => (
                                        <option key={key} value={key}>{key}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="geometry-select-field">
                                <label className="geometry-select-label">Secondary</label>
                                <select
                                    className="geometry-select-input"
                                    value={secondaryKey ?? ""}
                                    onChange={(e) =>
                                        setSecondaryKey(e.target.value === "" ? null : e.target.value)
                                    }
                                >
                                    <option value="">— None —</option>
                                    {Object.keys(designs).map((key) => (
                                        <option key={key} value={key}>{key}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="geometry-select-field">
                                <label className="geometry-select-label" htmlFor="geometry-data-points">
                                    Data Points: {dataPointCount}
                                </label>
                                <input
                                    id="geometry-data-points"
                                    className="geometry-slider-input"
                                    type="range"
                                    min={5}
                                    max={100}
                                    step={1}
                                    value={dataPointCount}
                                    style={{ "--slider-fill": `${dataPointFillPercent}%` } as CSSProperties}
                                    onChange={(e) => {
                                        setDataPointCount(Number(e.target.value));
                                    }}
                                />
                            </div>
                        </div>
                    </article>

                    <article className="panel workspace-panel workspace-panel-wide">
                        <div className="panel-heading">
                        </div>
                        <div className="metrics-grid-shell">
                            <div className="metrics-grid-label">Front</div>
                            <div className="metrics-grid-label">Rear</div>

                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Anti-Lift"
                                    primaryResults={frontAntiLiftSeries}
                                    secondaryResults={comparisonFrontAntiLiftSeries}
                                    valueLabel="Anti-Lift %"
                                />
                            </div>
                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Anti-Squat"
                                    primaryResults={rearAntiSquatSeries}
                                    secondaryResults={comparisonRearAntiSquatSeries}
                                    valueLabel="Anti-Squat %"
                                />
                            </div>

                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Anti-Dive"
                                    primaryResults={frontAntiDiveSeries}
                                    secondaryResults={comparisonFrontAntiDiveSeries}
                                    valueLabel="Anti-Dive %"
                                />
                            </div>
                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Anti-Lift"
                                    primaryResults={rearAntiLiftSeries}
                                    secondaryResults={comparisonRearAntiLiftSeries}
                                    valueLabel="Anti-Lift %"
                                />
                            </div>

                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Roll Center Height"
                                    primaryResults={frontRollCenterSeries}
                                    secondaryResults={comparisonFrontRollCenterSeries}
                                    valueLabel="Roll-Center height"
                                />
                            </div>
                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Roll Center Height"
                                    primaryResults={rearRollCenterSeries}
                                    secondaryResults={comparisonRearRollCenterSeries}
                                    valueLabel="Roll-Center height"
                                />
                            </div>

                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Roll Center Inclination"
                                    primaryResults={frontRollCenterInclinationSeries}
                                    secondaryResults={comparisonFrontRollCenterInclinationSeries}
                                    valueLabel="Roll-Center Inclination °"
                                />
                            </div>
                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Roll Center Inclination"
                                    primaryResults={rearRollCenterInclinationSeries}
                                    secondaryResults={comparisonRearRollCenterInclinationSeries}
                                    valueLabel="Roll-Center Inclination °"
                                />
                            </div>

                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Pinion Angle Change"
                                    primaryResults={frontPinionAngleChangeSeries}
                                    secondaryResults={comparisonFrontPinionAngleChangeSeries}
                                    valueLabel="Pinion Angle Change °"
                                />
                            </div>
                            <div className="metric-plot-card">
                                <TravelMetricGraph
                                    title="Pinion Angle Change"
                                    primaryResults={rearPinionAngleChangeSeries}
                                    secondaryResults={comparisonRearPinionAngleChangeSeries}
                                    valueLabel="Pinion Angle Change °"
                                />
                            </div>
                        </div>
                    </article>
                </section>
            </main>
        </div>
    );
}

export default App;
