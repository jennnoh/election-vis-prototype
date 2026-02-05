// js/app_page3.js
// Scene 3 interaction: "Land doesn't vote"  grid-based prototype using landNodes (D3)

let page3Initialized = false;
let currentMode = 0;

let map3Svg = null;
let landLayer = null;
let circleLayer = null;
let regionLabelLayer = null;

const PARTY_A_NAME = "Purple Party (Jenny)";
const PARTY_B_NAME = "Green Party (Matthew)";
const PARTY_A_BASE = "#8E6C8A";
const PARTY_B_BASE = "#45A27D";

const WIDTH = 900;
const HEIGHT = 520;

let marginScale;
let radiusScale;
let regionScale;
let haveSwarmPositions = false;

const MODE_LABELS = [
  "Districts (area choropleth)",
  "Equal-size circles at district centers",
  "Circles sized & shaded by voters",
  "Beeswarm by margin",
  "Beeswarm by margin and region"
];

function colorByWinnerAndMargin(winner, margin) {
  const maxMargin = 25;
  let t = Math.abs(margin) / maxMargin;
  if (t > 1) t = 1;
  t = Math.pow(t, 0.7);

  const interpA = d3.interpolateRgb("#f0e7f6", "#4b2f59");
  const interpB = d3.interpolateRgb("#d3f2e2", "#18553c");

  return winner === "A" ? interpA(t) : interpB(t);
}

function computeBeeswarmPositions(nodes) {
  if (haveSwarmPositions) return;

  const baselineY = HEIGHT * 0.55;

  const marginNodes = nodes.map(d => ({
    id: d.id,
    r: radiusScale(d.voters),
    margin: d.margin,
    region: d.region,
    targetX: marginScale(d.margin),
    targetY: baselineY,
    x: marginScale(d.margin),
    y: baselineY
  }));

  const regionNodes = nodes.map(d => ({
    id: d.id,
    r: radiusScale(d.voters),
    margin: d.margin,
    region: d.region,
    targetX: marginScale(d.margin),
    targetY: regionScale(d.region),
    x: marginScale(d.margin),
    y: regionScale(d.region)
  }));

  function runSwarm(swarmNodes) {
    const sim = d3
      .forceSimulation(swarmNodes)
      .force("x", d3.forceX(d => d.targetX).strength(0.6))
      .force("y", d3.forceY(d => d.targetY).strength(0.6))
      .force("collide", d3.forceCollide(d => d.r + 1))
      .stop();

    for (let i = 0; i < 80; i++) sim.tick();
  }

  runSwarm(marginNodes);
  runSwarm(regionNodes);

  landNodes.forEach((d, i) => {
    d.xMarginSwarm = marginNodes[i].x;
    d.yMarginSwarm = marginNodes[i].y;
    d.xRegionSwarm = regionNodes[i].x;
    d.yRegionSwarm = regionNodes[i].y;
  });

  haveSwarmPositions = true;
}

function initPage3() {
  if (page3Initialized) return;
  page3Initialized = true;

  const container = document.getElementById("map3-container");
  const modeSlider = document.getElementById("mode3-slider");
  const modeLabel = document.getElementById("mode3-label");
  const header = document.querySelector("#s3-interact .s3-header");

  if (!container || !modeSlider || !modeLabel) return;

  map3Svg = d3.select(container)
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .attr("viewBox", `0 0 ${WIDTH} ${HEIGHT}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // Fit map height to available space (avoid overlapping header)
  function fitMapHeight(){
    if (!container) return;
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const padding = 200; // space for slider + actions + nav
    const maxH = Math.max(320, Math.floor(window.innerHeight * 0.55));
    container.style.maxHeight = `${maxH}px`;
    if (map3Svg) map3Svg.style("max-height", `${maxH}px`);
  }
  fitMapHeight();
  window.addEventListener("resize", fitMapHeight);

  landLayer = map3Svg.append("g").attr("class", "land-layer");
  circleLayer = map3Svg.append("g").attr("class", "circles-layer");
  regionLabelLayer = map3Svg.append("g").attr("class", "region-labels");

  const mapX0 = WIDTH * 0.15;
  const mapX1 = WIDTH * 0.8;
  const mapY0 = HEIGHT * 0.15;
  const mapY1 = HEIGHT * 0.85;
  const mapWidth = mapX1 - mapX0;
  const mapHeight = mapY1 - mapY0;

  const rows = d3.max(landNodes, d => d.row) + 1;
  const cols = d3.max(landNodes, d => d.col) + 1;
  const cellWidth = mapWidth / cols;
  const cellHeight = mapHeight / rows;

  const minMargin = d3.min(landNodes, d => d.margin);
  const maxMargin = d3.max(landNodes, d => d.margin);
  const minV = d3.min(landNodes, d => d.voters);
  const maxV = d3.max(landNodes, d => d.voters);

  marginScale = d3.scaleLinear().domain([minMargin, maxMargin]).range([WIDTH * 0.15, WIDTH * 0.85]);
  radiusScale = d3.scaleSqrt().domain([minV, maxV]).range([6, 28]);

  const regions = Array.from(new Set(landNodes.map(d => d.region)));
  regionScale = d3.scalePoint().domain(regions).range([HEIGHT * 0.2, HEIGHT * 0.8]).padding(0.5);

  const regionLabels = regionLabelLayer
    .selectAll("text")
    .data(regions)
    .enter()
    .append("text")
    .attr("x", WIDTH * 0.12)
    .attr("y", d => regionScale(d))
    .attr("fill", "#e0d0f0")
    .attr("font-size", 13)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .style("opacity", 0)
    .text(d => d);

  landNodes.forEach(d => {
    d.cx0 = mapX0 + (d.col + 0.5) * cellWidth;
    d.cy0 = mapY0 + (d.row + 0.5) * cellHeight;
  });

  const landSel = landLayer
    .selectAll("rect.district")
    .data(landNodes)
    .enter()
    .append("rect")
    .attr("class", "district")
    .attr("x", d => (d.cx0 - (cellWidth * (d.landAreaScale || 1)) / 2))
    .attr("y", d => (d.cy0 - (cellHeight * (d.landAreaScale || 1)) / 2))
    .attr("width", d => cellWidth * (d.landAreaScale || 1))
    .attr("height", d => cellHeight * (d.landAreaScale || 1))
    .attr("stroke", "#77767f")
    .attr("stroke-width", 0.7)
    .attr("fill", d => (d.winner === "A" ? PARTY_A_BASE : PARTY_B_BASE));

  landSel.append("title").text(d => {
    const winnerName = d.winner === "A" ? PARTY_A_NAME : PARTY_B_NAME;
    const sign = d.margin >= 0 ? "+" : "";
    return `${d.name}\nWinner: ${winnerName}\nMargin: ${sign}${d.margin.toFixed(1)} pts\nVoters: ${Math.round(d.voters).toLocaleString()}`;
  });

  const circleSel = circleLayer
    .selectAll("circle.district-circle")
    .data(landNodes)
    .enter()
    .append("circle")
    .attr("class", "district-circle")
    .attr("cx", d => d.cx0)
    .attr("cy", d => d.cy0)
    .attr("r", 0)
    .attr("fill", d => (d.winner === "A" ? PARTY_A_BASE : PARTY_B_BASE))
    .attr("fill-opacity", 0.9)
    .attr("stroke", "rgba(255,255,255,0.7)")
    .attr("stroke-width", 0.8);

  circleSel.append("title").text(d => {
    const winnerName = d.winner === "A" ? PARTY_A_NAME : PARTY_B_NAME;
    const sign = d.margin >= 0 ? "+" : "";
    return `${d.name}\nWinner: ${winnerName}\nMargin: ${sign}${d.margin.toFixed(1)} pts\nVoters: ${Math.round(d.voters).toLocaleString()}`;
  });

  // Legend
  const legend = map3Svg.append("g").attr("class", "party-legend");
  const lx = WIDTH - 270;
  const ly = 40;
  legend.append("circle").attr("cx", lx).attr("cy", ly).attr("r", 6).attr("fill", PARTY_A_BASE);
  legend.append("text").attr("x", lx + 12).attr("y", ly + 1).attr("fill", "#f4edf8").attr("font-size", 12).text(PARTY_A_NAME);
  legend.append("circle").attr("cx", lx).attr("cy", ly + 20).attr("r", 6).attr("fill", PARTY_B_BASE);
  legend.append("text").attr("x", lx + 12).attr("y", ly + 21).attr("fill", "#f4edf8").attr("font-size", 12).text(PARTY_B_NAME);

  computeBeeswarmPositions(landNodes);

  function renderMode(mode, animate = true) {
    window.S3_MODE = mode;
    modeLabel.textContent = MODE_LABELS[mode];

    const duration = animate ? 600 : 0;
    const ease = d3.easeCubicInOut;

    const landT = landSel.transition().duration(duration).ease(ease);
    const circleT = circleSel.transition().duration(duration).ease(ease);
    const regionT = regionLabels.transition().duration(duration).ease(ease);

    landT.style("opacity", 1);
    circleT.style("opacity", 0);
    regionT.style("opacity", 0);

    if (mode === 0) return;

    if (mode === 1) {
      landT.style("opacity", 0.25);
      circleT.style("opacity", 1).attr("cx", d => d.cx0).attr("cy", d => d.cy0).attr("r", 10).attr("fill", d => (d.winner === "A" ? PARTY_A_BASE : PARTY_B_BASE));
      return;
    }

    if (mode === 2) {
      landT.style("opacity", 0.2);
      circleT.style("opacity", 1).attr("cx", d => d.cx0).attr("cy", d => d.cy0).attr("r", d => radiusScale(d.voters)).attr("fill", d => colorByWinnerAndMargin(d.winner, d.margin));
      return;
    }

    if (mode === 3) {
      landT.style("opacity", 0.1);
      circleT.style("opacity", 1).attr("cx", d => d.xMarginSwarm).attr("cy", d => d.yMarginSwarm).attr("r", d => radiusScale(d.voters)).attr("fill", d => colorByWinnerAndMargin(d.winner, d.margin));
      return;
    }

    if (mode === 4) {
      landT.style("opacity", 0.1);
      regionT.style("opacity", 1);
      circleT.style("opacity", 1).attr("cx", d => d.xRegionSwarm).attr("cy", d => d.yRegionSwarm).attr("r", d => radiusScale(d.voters)).attr("fill", d => colorByWinnerAndMargin(d.winner, d.margin));
      return;
    }
  }

  modeSlider.addEventListener("input", () => renderMode(Number(modeSlider.value), true));
  currentMode = Number(modeSlider.value);
    renderMode(currentMode, false);
}

window.initPage3 = initPage3;


// Expose current mode for the game shell
window.getScenario3State = () => ({ mode: currentMode });

