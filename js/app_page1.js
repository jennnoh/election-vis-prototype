// js/app_page1.js
// Page 1: axis truncation demo for polling over time

// === DOM elements ===
const ctx = document.getElementById("pollChart").getContext("2d");
const xRangeSliderEl = document.getElementById("xRangeSlider");
const yRangeSliderEl = document.getElementById("yRangeSlider");
const xRangeLabel = document.getElementById("xRangeLabel");
const yRangeLabel = document.getElementById("yRangeLabel");

// === data / defaults ===
const nYears = pollingYears.length;

// sensible y-axis range (in millions)
const Y_MIN_ALLOWED = 0;
const Y_MAX_ALLOWED = 85;

// --- initial state (updated) ---
// years: [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]
let xMinIndex = pollingYears.indexOf(2012);
let xMaxIndex = pollingYears.indexOf(2024);

// fallback just in case
if (xMinIndex === -1) xMinIndex = 0;
if (xMaxIndex === -1) xMaxIndex = nYears - 1;

// default y-axis from 55 to 85
let yMin = 55;
let yMax = 85;

// === helper: datasets for current x-range ===
function buildDatasets(minIdx, maxIdx) {
    const start = minIdx;
    const end = maxIdx + 1; // slice is exclusive
    return pollingParties.map((party, i) => ({
        label: party,
        data: pollingValues[party].slice(start, end),
        // non red/blue colours
        backgroundColor: i === 0 ? "#8E6C8A" : "#45A27D"
    }));
}

// === Chart.js config ===
const chartConfig = {
    type: "bar",
    data: {
        labels: pollingYears.slice(xMinIndex, xMaxIndex + 1),
        datasets: buildDatasets(xMinIndex, xMaxIndex)
    },
    options: {
        responsive: false,
        plugins: {
            legend: { position: "top" },
            title: {
                display: true,
                text: "Election Polling by Party (in millions)"
            },
            tooltip: {
                callbacks: {
                    label: context => {
                        const label = context.dataset.label || "";
                        const value = context.parsed.y;
                        return `${label}: ${value.toFixed(1)} million`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Year"
                }
            },
            y: {
                title: {
                    display: true,
                    text: "Polls (millions)"
                },
                min: yMin,
                max: yMax,
                ticks: {
                    stepSize: 10
                }
            }
        }
    }
};

const pollChart = new Chart(ctx, chartConfig);

// === UI updates ===
function updateLabels() {
    xRangeLabel.textContent =
        `${pollingYears[xMinIndex]} – ${pollingYears[xMaxIndex]}`;
    yRangeLabel.textContent = `${yMin} – ${yMax}`;
}

function updateChart() {
    pollChart.data.labels = pollingYears.slice(xMinIndex, xMaxIndex + 1);
    pollChart.data.datasets = buildDatasets(xMinIndex, xMaxIndex);
    pollChart.options.scales.y.min = yMin;
    pollChart.options.scales.y.max = yMax;
    pollChart.update();
}

// === Create dual-handle sliders with noUiSlider ===

// X-axis: indices into pollingYears
if (xRangeSliderEl) {
    noUiSlider.create(xRangeSliderEl, {
        start: [xMinIndex, xMaxIndex], // default 2012–2024
        step: 1,
        connect: true,
        range: {
            min: 0,
            max: nYears - 1
        },
        format: {
            to: value => Math.round(value),
            from: value => Number(value)
        }
    });

    // Slider events
    xRangeSliderEl.noUiSlider.on("update", (values) => {
        xMinIndex = Math.min(+values[0], +values[1]);
        xMaxIndex = Math.max(+values[0], +values[1]);
        updateLabels();
        updateChart();
    });
} else {
    console.warn("app_page1: #xRangeSlider not found");
}

// Y-axis: actual poll values (millions)
if (yRangeSliderEl) {
    noUiSlider.create(yRangeSliderEl, {
        start: [yMin, yMax], // default 55–85
        step: 1,
        connect: true,
        orientation: "vertical",
        direction: "rtl", // so lower values are at bottom visually
        range: {
            min: Y_MIN_ALLOWED,
            max: Y_MAX_ALLOWED
        }
    });

    yRangeSliderEl.noUiSlider.on("update", (values) => {
        yMin = Math.min(+values[0], +values[1]);
        yMax = Math.max(+values[0], +values[1]);
        updateLabels();
        updateChart();
    });
} else {
    console.warn("app_page1: #yRangeSlider not found");
}

// initial text + chart
updateLabels();
updateChart();
