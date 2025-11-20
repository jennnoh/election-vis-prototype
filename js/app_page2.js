// js/app_page2.js
// Page 2: histogram-only view with adjustable bins / boundaries
// Uses fixed deterministic dataset from incomeVotes.js

let histChart;
let page2Initialized = false;

// Income range (fixed outer edges)
const MIN_INCOME = 0;
const MAX_INCOME = 300000;

// Extract arrays from the fixed incomeData (defined in incomeVotes.js)
let incomeValues = incomeData.map(d => d.income);
let voteJenny = incomeData.map(d => d.jenny);
let voteMatthew = incomeData.map(d => d.matthew);

// Candidate names (non-political people)
const candidateA = "Jenny";    // Cuomo-like
const candidateB = "Matthew";  // Mamdani-like

// Store current binned summary so the plugin can draw histogram bars
let currentBinned = null;

// ---------------------------------------------------------------------------
// 1. Binning helpers
// ---------------------------------------------------------------------------

function formatIncome(x) {
    const k = Math.round(x / 1000);
    return `$${k}k`;
}

// Given bin edges [e0, e1, ..., eN], compute averages per bin
function computeBinnedData(binEdges) {
    const centers = [];
    const labels = [];
    const meansA = [];
    const meansB = [];

    for (let i = 0; i < binEdges.length - 1; i++) {
        const left = binEdges[i];
        const right = binEdges[i + 1];
        const center = (left + right) / 2;

        let sumA = 0;
        let sumB = 0;
        let count = 0;

        for (let j = 0; j < incomeValues.length; j++) {
            const inc = incomeValues[j];
            const isLast = i === binEdges.length - 2;

            const inBin = isLast
                ? inc >= left && inc <= right
                : inc >= left && inc < right;

            if (inBin) {
                sumA += voteJenny[j];
                sumB += voteMatthew[j];
                count++;
            }
        }

        const meanA = count > 0 ? sumA / count : null;
        const meanB = count > 0 ? sumB / count : null;

        centers.push(center);
        labels.push(`${formatIncome(left)} – ${formatIncome(right)}`);
        meansA.push(meanA);
        meansB.push(meanB);
    }

    return { binEdges, centers, labels, meansA, meansB };
}

// ---------------------------------------------------------------------------
// 2. Custom plugin to draw variable-width histogram bars
// ---------------------------------------------------------------------------

const histogramPlugin = {
    id: "histogramPlugin",
    // Draw BEFORE the scatter points & tooltips so tooltips sit on top
    beforeDatasetsDraw(chart) {
        if (!currentBinned) return;

        const { ctx } = chart;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        const bottomPixel = yScale.getPixelForValue(0);

        const edges = currentBinned.binEdges;
        const meansA = currentBinned.meansA;
        const meansB = currentBinned.meansB;

        ctx.save();

        for (let i = 0; i < edges.length - 1; i++) {
            const leftVal = edges[i];
            const rightVal = edges[i + 1];
            const leftPx = xScale.getPixelForValue(leftVal);
            const rightPx = xScale.getPixelForValue(rightVal);
            const width = rightPx - leftPx;
            if (width <= 0) continue;

            const pad = width * 0.02;
            const innerLeft = leftPx + pad;
            const innerWidth = width - pad * 2;

            // Jenny histogram rect
            const meanJenny = meansA[i];
            if (meanJenny != null) {
                const topJenny = yScale.getPixelForValue(meanJenny);
                const heightJenny = bottomPixel - topJenny;
                ctx.globalAlpha = 0.45;
                ctx.fillStyle = "rgba(142, 108, 138, 0.45)";
                ctx.strokeStyle = "#8E6C8A";
                ctx.lineWidth = 1;
                ctx.fillRect(innerLeft, topJenny, innerWidth, heightJenny);
                ctx.strokeRect(innerLeft, topJenny, innerWidth, heightJenny);
            }

            // Matthew histogram rect
            const meanMatthew = meansB[i];
            if (meanMatthew != null) {
                const topMatthew = yScale.getPixelForValue(meanMatthew);
                const heightMatthew = bottomPixel - topMatthew;
                ctx.globalAlpha = 0.45;
                ctx.fillStyle = "rgba(69, 162, 125, 0.45)";
                ctx.strokeStyle = "#45A27D";
                ctx.lineWidth = 1;
                ctx.fillRect(innerLeft, topMatthew, innerWidth, heightMatthew);
                ctx.strokeRect(innerLeft, topMatthew, innerWidth, heightMatthew);
            }
        }

        ctx.restore();
    }
};

// ---------------------------------------------------------------------------
// 3. Chart creation / update (scatter only for tooltips + legend)
// ---------------------------------------------------------------------------

function createOrUpdateChart(binEdges) {
    currentBinned = computeBinnedData(binEdges);

    const { centers, labels, meansA, meansB } = currentBinned;

    // Invisible points used just for tooltip locations
    const dataA = centers.map((c, i) => ({
        x: c,
        y: meansA[i],
        binLabel: labels[i]
    }));
    const dataB = centers.map((c, i) => ({
        x: c,
        y: meansB[i],
        binLabel: labels[i]
    }));

    const data = {
        datasets: [
            {
                label: candidateA,
                data: dataA,
                parsing: false,
                pointRadius: 0,
                pointHitRadius: 12,
                borderWidth: 0,
                backgroundColor: "#8E6C8A" // legend colour
            },
            {
                label: candidateB,
                data: dataB,
                parsing: false,
                pointRadius: 0,
                pointHitRadius: 12,
                borderWidth: 0,
                backgroundColor: "#45A27D"
            }
        ]
    };

    const config = {
        type: "scatter",
        data,
        options: {
            responsive: false,
            interaction: {
                mode: "nearest",
                intersect: false
            },
            plugins: {
                legend: { position: "top" },
                title: {
                    display: true,
                    text: "Vote share by median income"
                },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const label = ctx.dataset.label || "";
                            const value =
                                ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : "NA";
                            const raw = ctx.raw || {};
                            const binLabel = raw.binLabel ? raw.binLabel : "";
                            return `${label}: ${value}% (${binLabel})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: "linear",
                    title: { display: true, text: "Median income" },
                    min: MIN_INCOME,
                    max: MAX_INCOME,
                    ticks: {
                        callback: value => formatIncome(value)
                    }
                },
                y: {
                    title: { display: true, text: "Vote share (%)" },
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 10 }
                }
            }
        },
        plugins: [histogramPlugin]
    };

    if (histChart) {
        histChart.destroy();
    }
    const ctx = document.getElementById("histChart").getContext("2d");
    histChart = new Chart(ctx, config);
}

// ---------------------------------------------------------------------------
// 4. Multi-handle slider for bin boundaries
//   - bins always span 0–300k
//   - handles cannot touch 0 or 300k (padding)
//   - handles cannot overlap (margin)
//   - default: 3 bins at 0–50k, 50–100k, 100–300k
//   - if binCount === 1, show single bin 0–300k and no slider handles
// ---------------------------------------------------------------------------

const MIN_BIN_WIDTH = 20000; // 20k min between edges & between bins

function createBinSlider(binCount) {
    const sliderEl = document.getElementById("binBoundarySlider");
    if (!sliderEl) return;

    // Destroy old slider if any
    if (sliderEl.noUiSlider) {
        sliderEl.noUiSlider.destroy();
    }

    // 1-bin case: whole range, no handles
    if (binCount === 1) {
        sliderEl.innerHTML = "";
        const edges = [MIN_INCOME, MAX_INCOME];
        createOrUpdateChart(edges);
        return;
    }

    const internalCount = binCount - 1;
    let startHandles = [];

    if (binCount === 3) {
        // Special default: bins at 0–50k, 50–100k, 100–300k
        startHandles = [50000, 100000];
    } else {
        const span = MAX_INCOME - MIN_INCOME;
        const step = span / binCount;
        for (let i = 1; i <= internalCount; i++) {
            startHandles.push(MIN_INCOME + step * i);
        }
    }

    // Rebuild DOM to be safe
    sliderEl.innerHTML = "";

    noUiSlider.create(sliderEl, {
        start: startHandles,
        connect: true,
        range: {
            min: MIN_INCOME,
            max: MAX_INCOME
        },
        step: 5000,
        padding: MIN_BIN_WIDTH,
        margin: MIN_BIN_WIDTH,
        tooltips: {
            to: value => formatIncome(value),
            from: value => Number(value.replace(/[^\d.-]/g, ""))
        }
    });

    const initialEdges = [MIN_INCOME, ...startHandles, MAX_INCOME];
    createOrUpdateChart(initialEdges);

    sliderEl.noUiSlider.on("update", values => {
        const numericHandles = values.map(v =>
            Number(String(v).replace(/[^\d.-]/g, ""))
        );
        numericHandles.sort((a, b) => a - b);
        const edges = [MIN_INCOME, ...numericHandles, MAX_INCOME];
        createOrUpdateChart(edges);
    });
}

// ---------------------------------------------------------------------------
// 5. initPage2 (called from nav.js when you go to page 2)
// ---------------------------------------------------------------------------

function initPage2() {
    if (page2Initialized) return;
    page2Initialized = true;

    const binInput = document.getElementById("binCountInput");
    if (!binInput) {
        console.warn("initPage2: binCountInput not found.");
        return;
    }

    // Default view: 3 bins with edges at 50k and 100k
    let binCount = 3;
    binInput.value = 3;

    createBinSlider(binCount);

    const onBinInputChange = () => {
        let newCount = Number(binInput.value);
        if (isNaN(newCount)) newCount = 3;
        newCount = Math.max(1, Math.min(8, newCount)); // allow 1–8 bins
        binInput.value = newCount;
        createBinSlider(newCount);
    };

    binInput.addEventListener("change", onBinInputChange);
    binInput.addEventListener("input", onBinInputChange);
}
