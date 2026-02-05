// js/app_page1.js (v3)
// Lazy init for Scenario 1 (avoid slider/chart init while hidden)

let _page1Initialized = false;
let pollChart = null;

let xMinIndex, xMaxIndex, yMin, yMax;

function buildDatasets(minIdx, maxIdx) {
  const start = minIdx;
  const end = maxIdx + 1;
  return pollingParties.map((party, i) => ({
    label: party,
    data: pollingValues[party].slice(start, end),
    backgroundColor: i === 0 ? "#8E6C8A" : "#45A27D"
  }));
}

function updateLabels() {
  const xRangeLabel = document.getElementById("xRangeLabel");
  const yRangeLabel = document.getElementById("yRangeLabel");
  if (!xRangeLabel || !yRangeLabel) return;
  xRangeLabel.textContent = `${pollingYears[xMinIndex]} - ${pollingYears[xMaxIndex]}`;
  yRangeLabel.textContent = `${yMin} - ${yMax}`;
}

function updateChart() {
  if (!pollChart) return;
  pollChart.data.labels = pollingYears.slice(xMinIndex, xMaxIndex + 1);
  pollChart.data.datasets = buildDatasets(xMinIndex, xMaxIndex);
  pollChart.options.scales.y.min = yMin;
  pollChart.options.scales.y.max = yMax;
  pollChart.update();
}

function initPage1() {
  if (_page1Initialized) return;
  _page1Initialized = true;

  const canvas = document.getElementById("pollChart");
  const xRangeSliderEl = document.getElementById("xRangeSlider");
  const yRangeSliderEl = document.getElementById("yRangeSlider");

  if (!canvas || !xRangeSliderEl || !yRangeSliderEl) {
    console.warn("Scene1: missing chart or sliders");
    return;
  }

  const ctx = canvas.getContext("2d");

  const nYears = pollingYears.length;
  const Y_MIN_ALLOWED = 0;
  const Y_MAX_ALLOWED = 85;

  xMinIndex = 0;
  xMaxIndex = nYears - 1;

  yMin = Y_MIN_ALLOWED;
  yMax = Y_MAX_ALLOWED;

  const chartConfig = {
    type: "bar",
    data: {
      labels: pollingYears.slice(xMinIndex, xMaxIndex + 1),
      datasets: buildDatasets(xMinIndex, xMaxIndex)
    },
    options: {
      responsive: true,
        maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Election Polling by Party (in millions)" },
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
        x: { title: { display: true, text: "Year" } },
        y: {
          title: { display: true, text: "Polls (millions)" },
          min: yMin,
          max: yMax,
          ticks: { stepSize: 10 }
        }
      }
    }
  };

  pollChart = new Chart(ctx, chartConfig);

  // Build sliders (safe even if hidden previously)
  if (xRangeSliderEl.noUiSlider) xRangeSliderEl.noUiSlider.destroy();
  if (yRangeSliderEl.noUiSlider) yRangeSliderEl.noUiSlider.destroy();

  noUiSlider.create(xRangeSliderEl, {
    start: [xMinIndex, xMaxIndex],
    step: 1,
    connect: true,
    range: { min: 0, max: nYears - 1 },
    format: { to: v => Math.round(v), from: v => Number(v) }
  });

  xRangeSliderEl.noUiSlider.on("update", (values) => {
    xMinIndex = Math.min(+values[0], +values[1]);
    xMaxIndex = Math.max(+values[0], +values[1]);
    updateLabels();
    updateChart();
  });

  noUiSlider.create(yRangeSliderEl, {
    start: [yMin, yMax],
    step: 1,
    connect: true,
    orientation: "vertical",
    direction: "rtl",
    range: { min: Y_MIN_ALLOWED, max: Y_MAX_ALLOWED }
  });

  yRangeSliderEl.noUiSlider.on("update", (values) => {
    yMin = Math.min(+values[0], +values[1]);
    yMax = Math.max(+values[0], +values[1]);
    updateLabels();
    updateChart();
  });

  updateLabels();
  updateChart();
}

function getScenario1State(){
  return { xMinIndex, xMaxIndex, yMin, yMax };
}

window.initPage1 = initPage1;
window.getScenario1State = getScenario1State;

