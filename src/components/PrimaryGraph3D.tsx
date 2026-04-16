import { useMemo, useRef, useState } from "react";
import Plotly from "plotly.js/dist/plotly";
import createPlotlyComponent from "react-plotly.js/factory";
import type { Data, Layout } from "plotly.js";
import type { Point } from "../engine/geometry/point";
import { mirrorAboutXZPlane } from "../engine/geometry/point";
import type { Vector } from "../engine/geometry/vector";
import type { Vehicle } from "../engine/suspension/vehicle";

const Plot = createPlotlyComponent(Plotly);

type PrimaryGraph3DProps = {
    primaryVehicle: Vehicle;
    secondaryVehicle?: Vehicle;
};

type VehicleTracePalette = {
    upperLink: string;
    lowerLink: string;
};

const primaryPalette: VehicleTracePalette = {
    upperLink: "#1f77ff",
    lowerLink: "#d6332a",
};

const secondaryPalette: VehicleTracePalette = {
    upperLink: "#7ea8f8",
    lowerLink: "#d98b86",
};

const cameraPresets = {
    iso: {
        eye: { x: 1.45, y: 1.35, z: 0.45 },
        up: { x: 0, y: 0, z: 1 },
        projection: { type: "orthographic" },
    },
    side: {
        eye: { x: 0, y: 1, z: 0 },
        up: { x: 0, y: 0, z: 1 },
        projection: { type: "orthographic" },
    },
    top: {
        eye: { x: 0, y: 0, z: 1 },
        up: { x: 0, y: -1, z: 0 },
        projection: { type: "orthographic" },
    },
    front: {
        eye: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 },
        projection: { type: "orthographic" },
    },
} as const;

function cloneCameraPreset(preset: keyof typeof cameraPresets) {
    const camera = cameraPresets[preset];

    return {
        eye: { ...camera.eye },
        up: { ...camera.up },
        projection: { ...camera.projection },
    };
}

function camerasMatch(
    camera: any,
    preset: keyof typeof cameraPresets,
    tolerance = 1e-6
) {
    const target = cameraPresets[preset];

    return (
        Math.abs((camera?.eye?.x ?? NaN) - target.eye.x) < tolerance &&
        Math.abs((camera?.eye?.y ?? NaN) - target.eye.y) < tolerance &&
        Math.abs((camera?.eye?.z ?? NaN) - target.eye.z) < tolerance &&
        Math.abs((camera?.up?.x ?? NaN) - target.up.x) < tolerance &&
        Math.abs((camera?.up?.y ?? NaN) - target.up.y) < tolerance &&
        Math.abs((camera?.up?.z ?? NaN) - target.up.z) < tolerance
    );
}

function resolvePresetFromCamera(camera: any): keyof typeof cameraPresets | null {
    if (!camera) return null;

    for (const preset of Object.keys(cameraPresets) as (keyof typeof cameraPresets)[]) {
        if (camerasMatch(camera, preset)) {
            return preset;
        }
    }

    return null;
}

function lineTrace(
    start: Point,
    end: Point,
    name: string,
    color: string,
    isDashed: boolean,
    legendSuffix: string,
    showLegend = false
): Data {
    return {
        type: "scatter3d",
        mode: "lines+markers",
        name: `${name}${legendSuffix}`,
        x: [start.x, end.x],
        y: [start.y, end.y],
        z: [-start.z, -end.z],
        line: {
            color,
            width: 7,
            dash: isDashed ? "dash" : "solid",
        },
        marker: {
            color,
            size: 4,
        },
        showlegend: showLegend,
    };
}

function mirroredTraces(
    vector: Vector,
    name: string,
    color: string,
    isDashed: boolean,
    legendSuffix: string
): Data[] {
    return [
        lineTrace(
            vector.chassis,
            vector.wheel,
            name,
            color,
            isDashed,
            legendSuffix,
            true
        ),
        lineTrace(
            mirrorAboutXZPlane(vector.chassis),
            mirrorAboutXZPlane(vector.wheel),
            name,
            color,
            isDashed,
            legendSuffix,
            false
        ),
    ];
}

function buildVehicleTraces(
    vehicle: Vehicle,
    palette: VehicleTracePalette,
    isDashed: boolean,
    legendSuffix: string
): Data[] {
    const frontVectors = vehicle.frontSuspension.solidAxleSuspensionVectors();
    const rearVectors = vehicle.rearSuspension.solidAxleSuspensionVectors();

    return [
        ...mirroredTraces(
            frontVectors.upperLink,
            "Upper Links (Front)",
            palette.upperLink,
            isDashed,
            legendSuffix
        ),
        ...mirroredTraces(
            rearVectors.upperLink,
            "Upper Links (Rear)",
            palette.upperLink,
            isDashed,
            legendSuffix
        ),
        ...mirroredTraces(
            frontVectors.lowerLink,
            "Lower Links (Front)",
            palette.lowerLink,
            isDashed,
            legendSuffix
        ),
        ...mirroredTraces(
            rearVectors.lowerLink,
            "Lower Links (Rear)",
            palette.lowerLink,
            isDashed,
            legendSuffix
        ),
    ];
}

export function PrimaryGraph3D({
    primaryVehicle,
    secondaryVehicle,
}: PrimaryGraph3DProps) {
    const graphDivRef = useRef<any>(null);
    const [activePreset, setActivePreset] = useState<keyof typeof cameraPresets | null>("iso");

    function updateActivePresetFromGraph() {
        const liveCamera = graphDivRef.current?.layout?.scene?.camera;
        setActivePreset(resolvePresetFromCamera(liveCamera));
    }

    function handlePresetClick(preset: keyof typeof cameraPresets) {
        const nextCamera = cloneCameraPreset(preset);
        setActivePreset(preset);

        if (graphDivRef.current) {
            void Plotly.relayout(graphDivRef.current, {
                "scene.camera": nextCamera,
            } as any);
        }
    }

    const data: Data[] = useMemo(
        () => [
            ...buildVehicleTraces(primaryVehicle, primaryPalette, false, " (Primary)"),
            ...(secondaryVehicle
                ? buildVehicleTraces(
                    secondaryVehicle,
                    secondaryPalette,
                    true,
                    " (Secondary)"
                )
                : []),
        ],
        [primaryVehicle, secondaryVehicle]
    );

    const layout: Partial<Layout> = useMemo(() => ({
        title: { text: "Suspension Geometry" },
        autosize: true,
        margin: { l: 0, r: 0, t: 44, b: 0 },
        paper_bgcolor: "rgba(255,255,255,0)",
        uirevision: 1,
        scene: {
            xaxis: { title: { text: "X (Length)" }, gridcolor: "#dbe5de" },
            yaxis: { title: { text: "Y (Width)" }, gridcolor: "#dbe5de" },
            zaxis: {
                title: { text: "Z (Height)" },
                gridcolor: "#dbe5de",
            },
            aspectmode: "data",
            camera: cloneCameraPreset("iso"),
        },
        showlegend: false,
    }), []);

    return (
        <div className="primary-graph-3d">
            <div className="primary-graph-controls">
                {(["iso", "side", "top", "front"] as const).map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        className={
                            activePreset === preset
                                ? "primary-graph-control primary-graph-control-active"
                                : "primary-graph-control"
                        }
                        onClick={() => handlePresetClick(preset)}
                    >
                        {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </button>
                ))}
            </div>
            <div className="primary-graph-plot-area">
                <Plot
                    data={data}
                    layout={layout}
                    config={{ responsive: true, displaylogo: false }}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler
                    onInitialized={(_, graphDiv) => {
                        graphDivRef.current = graphDiv;
                        updateActivePresetFromGraph();
                    }}
                    onUpdate={(_, graphDiv) => {
                        graphDivRef.current = graphDiv;
                    }}
                    onRelayout={() => {
                        updateActivePresetFromGraph();
                    }}
                />
            </div>
        </div>
    );
}