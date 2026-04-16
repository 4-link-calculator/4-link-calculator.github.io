import Plotly from "plotly.js/dist/plotly";
import createPlotlyComponent from "react-plotly.js/factory";
import type { Data, Layout } from "plotly.js";

const Plot = createPlotlyComponent(Plotly);

export type TravelSeriesPoint = {
    zDelta: number;
    value: number;
};

type TravelMetricGraphProps = {
    title: string;
    primaryResults: TravelSeriesPoint[];
    secondaryResults?: TravelSeriesPoint[];
    primaryColor?: string;
    secondaryColor?: string;
    height?: number;
    valueLabel?: string;
};

export function TravelMetricGraph({
    title,
    primaryResults,
    secondaryResults,
    primaryColor = "#000000",
    secondaryColor = "#6a6a6a",
    height = 400,
    valueLabel = "Value",
}: TravelMetricGraphProps) {
    const data: Data[] = [
        {
            type: "scatter",
            mode: "lines+markers" as const,
            x: primaryResults.map((point) => point.zDelta),
            y: primaryResults.map((point) => point.value),
            line: { color: primaryColor, width: 3 },
            marker: { color: primaryColor, size: 5 },
            hovertemplate: `Travel %{x}<br>${valueLabel} %{y:.2f}<extra></extra>`,
        },
        ...(secondaryResults
            ? [
                  {
                      type: "scatter" as const,
                      mode: "lines+markers" as const,
                      x: secondaryResults.map((point) => point.zDelta),
                      y: secondaryResults.map((point) => point.value),
                      line: {
                          color: secondaryColor,
                          width: 3,
                          dash: "dash" as const,
                      },
                      marker: { color: secondaryColor, size: 4 },
                      hovertemplate: `Travel %{x}<br>${valueLabel} %{y:.2f}<extra></extra>`,
                  },
              ]
            : []),
    ];

    const layout: Partial<Layout> = {
        title: { text: title, x: 0.04, xanchor: "left", font: { size: 15 } },
        autosize: true,
        height,
        paper_bgcolor: "rgba(255,255,255,0)",
        plot_bgcolor: "#fcfcfc",
        margin: { l: 48, r: 16, t: 44, b: 40 },
        showlegend: false,
        xaxis: {
            title: { text: "Travel" },
            gridcolor: "#d6e0da",
            zerolinecolor: "#bac9c1",
        },
        yaxis: {
            title: { text: valueLabel },
            gridcolor: "#d6e0da",
            zerolinecolor: "#bac9c1",
        },
    };

    return (
        <Plot
            data={data}
            layout={layout}
            config={{ responsive: true, displaylogo: false }}
            style={{ width: "100%", height: `${height}px`, minHeight: `${height}px` }}
            useResizeHandler
        />
    );
}