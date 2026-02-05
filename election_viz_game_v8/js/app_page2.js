// js/app_page2.js (v4)
// Scene 4: aggregation demo with BIN COUNT ONLY (no boundary slider).
// Uses fixed deterministic dataset from incomeVotes.js

let histChart;
let page2Initialized = false;

const MIN_INCOME = 0;
const MAX_INCOME = 300000;

let incomeValues = incomeData.map(d => d.income);
let votePurpleParty = incomeData.map(d => d.jenny);
let voteGreenParty = incomeData.map(d => d.matthew);

const candidateA = "Purple Party (Jenny)";
const candidateB = "Green Party (Matthew)";

let currentBinned = null;

function formatIncome(x) {
  const k = Math.round(x / 1000);
  return `$${k}k`;
}

function computeBinnedData(binEdges) {
  const centers = [];
  const labels = [];
  const meansA = [];
  const meansB = [];

  for (let i = 0; i < binEdges.length - 1; i++) {
    const left = binEdges[i];
    const right = binEdges[i + 1];
    const center = (left + right) / 2;

    let sumA = 0, sumB = 0, count = 0;

    for (let j = 0; j < incomeValues.length; j++) {
      const inc = incomeValues[j];
      const isLast = i === binEdges.length - 2;

      const inBin = isLast ? (inc >= left && inc <= right) : (inc >= left && inc < right);
      if (inBin) {
        sumA += votePurpleParty[j];
        sumB += voteGreenParty[j];
        count++;
      }
    }

    centers.push(center);
    labels.push(`${formatIncome(left)}  ${formatIncome(right)}`);
    meansA.push(count ? sumA / count : null);
    meansB.push(count ? sumB / count : null);
  }

  return { binEdges, centers, labels, meansA, meansB };
}

const histogramPlugin = {
  id: "histogramPlugin",
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

      const meanPurpleParty = meansA[i];
      if (meanPurpleParty != null) {
        const topPurpleParty = yScale.getPixelForValue(meanPurpleParty);
        const heightPurpleParty = bottomPixel - topPurpleParty;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "rgba(142, 108, 138, 0.45)";
        ctx.strokeStyle = "#8E6C8A";
        ctx.lineWidth = 1;
        ctx.fillRect(innerLeft, topPurpleParty, innerWidth, heightPurpleParty);
        ctx.strokeRect(innerLeft, topPurpleParty, innerWidth, heightPurpleParty);
      }

      const meanGreenParty = meansB[i];
      if (meanGreenParty != null) {
        const topGreenParty = yScale.getPixelForValue(meanGreenParty);
        const heightGreenParty = bottomPixel - topGreenParty;
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "rgba(69, 162, 125, 0.45)";
        ctx.strokeStyle = "#45A27D";
        ctx.lineWidth = 1;
        ctx.fillRect(innerLeft, topGreenParty, innerWidth, heightGreenParty);
        ctx.strokeRect(innerLeft, topGreenParty, innerWidth, heightGreenParty);
      }
    }

    ctx.restore();
  }
};

function createOrUpdateChart(binEdges) {
  currentBinned = computeBinnedData(binEdges);

  const { centers, labels, meansA, meansB } = currentBinned;

  const dataA = centers.map((c, i) => ({ x: c, y: meansA[i], binLabel: labels[i] }));
  const dataB = centers.map((c, i) => ({ x: c, y: meansB[i], binLabel: labels[i] }));

  const data = {
    datasets: [
      { label: candidateA, data: dataA, parsing: false, pointRadius: 0, pointHitRadius: 12, borderWidth: 0, backgroundColor: "#8E6C8A" },
      { label: candidateB, data: dataB, parsing: false, pointRadius: 0, pointHitRadius: 12, borderWidth: 0, backgroundColor: "#45A27D" }
    ]
  };

  const config = {
    type: "scatter",
    data,
    options: {
      responsive: true,
            maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Vote share by median income" },
        tooltip: {
          callbacks: {
            label: ctx => {
              const label = ctx.dataset.label || "";
              const value = ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) : "NA";
              const binLabel = (ctx.raw && ctx.raw.binLabel) ? ctx.raw.binLabel : "";
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
          ticks: { callback: v => formatIncome(v) }
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

  if (histChart) histChart.destroy();
  const ctx = document.getElementById("histChart").getContext("2d");
  histChart = new Chart(ctx, config);
}

function edgesFromCount(k){
  const count = Math.max(1, Math.min(8, Number(k) || 3));
  const edges = [];
  const span = MAX_INCOME - MIN_INCOME;
  for (let i = 0; i <= count; i++) edges.push(MIN_INCOME + (span * i) / count);
  return edges;
}

function initPage2() {
  if (page2Initialized) return;
  page2Initialized = true;

  const binInput = document.getElementById("binCountInput");
  if (!binInput) {
    console.warn("Scene4: binCountInput missing.");
    return;
  }

  binInput.value = 3;
  createOrUpdateChart(edgesFromCount(3));

  const onChange = () => {
    const k = Math.max(1, Math.min(8, Number(binInput.value) || 3));
    binInput.value = k;
    createOrUpdateChart(edgesFromCount(k));
  };

  binInput.addEventListener("change", onChange);
  binInput.addEventListener("input", onChange);
}

function getScenario4State(){
  const binInput = document.getElementById("binCountInput");
  return { binCount: binInput ? Number(binInput.value) : 3 };
}

window.initPage2 = initPage2;
window.getScenario4State = getScenario4State;

