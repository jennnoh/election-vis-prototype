// js/app_page3.js
// "Land doesn't vote" – grid-based prototype using landNodes with smooth transitions

let page3Initialized = false;

let map3Svg = null;
let landLayer = null;
let circleLayer = null;
let regionLabelLayer = null;

const PARTY_A_NAME = "Boston Tea Party (Jenny)";
const PARTY_B_NAME = "Birthday Party (Matthew)";

const PARTY_A_BASE = "#8E6C8A";
const PARTY_B_BASE = "#45A27D";

const WIDTH = 900;
const HEIGHT = 500;

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// more dramatic shading: strong margins are clearly darker
function colorByWinnerAndMargin(winner, margin) {
    // assume typical margins are within ±25 pts
    const maxMargin = 25;
    let t = Math.abs(margin) / maxMargin; // 0..~1
    if (t > 1) t = 1;

    // exaggerate contrast a bit
    t = Math.pow(t, 0.7); // make mid margins darker too

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

// ---------------------------------------------------------------------------
// Init Page 3
// ---------------------------------------------------------------------------

function initPage3() {
    if (page3Initialized) return;
    page3Initialized = true;

    const container = document.getElementById("map3-container");
    const modeSlider = document.getElementById("mode3-slider");
    const modeLabel = document.getElementById("mode3-label");

    if (!container || !modeSlider || !modeLabel) {
        console.warn("Page 3 container or controls missing");
        return;
    }

    map3Svg = d3
        .select(container)
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT);

    landLayer = map3Svg.append("g").attr("class", "land-layer");
    circleLayer = map3Svg.append("g").attr("class", "circles-layer");
    regionLabelLayer = map3Svg.append("g").attr("class", "region-labels");

    // --- layout for grid ---
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

    // scales
    const minMargin = d3.min(landNodes, d => d.margin);
    const maxMargin = d3.max(landNodes, d => d.margin);
    const minV = d3.min(landNodes, d => d.voters);
    const maxV = d3.max(landNodes, d => d.voters);

    marginScale = d3
        .scaleLinear()
        .domain([minMargin, maxMargin])
        .range([WIDTH * 0.15, WIDTH * 0.85]);

    radiusScale = d3
        .scaleSqrt()
        .domain([minV, maxV])
        .range([6, 28]);

    const regions = Array.from(new Set(landNodes.map(d => d.region)));
    regionScale = d3
        .scalePoint()
        .domain(regions)
        .range([HEIGHT * 0.2, HEIGHT * 0.8])
        .padding(0.5);

    // region labels
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

    // land rectangles
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
        .attr("x", d => mapX0 + d.col * cellWidth)
        .attr("y", d => mapY0 + d.row * cellHeight)
        .attr("width", cellWidth - 1)
        .attr("height", cellHeight - 1)
        .attr("stroke", "#77767f")
        .attr("stroke-width", 0.7)
        .attr("fill", d =>
            d.winner === "A" ? PARTY_A_BASE : PARTY_B_BASE
        );

    landSel.append("title").text(d => {
        const winnerName =
            d.winner === "A" ? PARTY_A_NAME : PARTY_B_NAME;
        const sign = d.margin >= 0 ? "+" : "";
        return `${d.name}
Winner: ${winnerName}
Margin: ${sign}${d.margin.toFixed(1)} pts
Voters: ${Math.round(d.voters).toLocaleString()}`;
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
        .attr("fill", d =>
            d.winner === "A" ? PARTY_A_BASE : PARTY_B_BASE
        )
        .attr("fill-opacity", 0.9)
        .attr("stroke", "rgba(255,255,255,0.7)")
        .attr("stroke-width", 0.8);

    circleSel.append("title").text(d => {
        const winnerName =
            d.winner === "A" ? PARTY_A_NAME : PARTY_B_NAME;
        const sign = d.margin >= 0 ? "+" : "";
        return `${d.name}
Winner: ${winnerName}
Margin: ${sign}${d.margin.toFixed(1)} pts
Voters: ${Math.round(d.voters).toLocaleString()}`;
    });

    // legend
    const legend = map3Svg.append("g").attr("class", "party-legend");
    const lx = WIDTH - 260;
    const ly = 40;
    legend
        .append("circle")
        .attr("cx", lx)
        .attr("cy", ly)
        .attr("r", 6)
        .attr("fill", PARTY_A_BASE);
    legend
        .append("text")
        .attr("x", lx + 12)
        .attr("y", ly + 1)
        .attr("fill", "#f4edf8")
        .attr("font-size", 12)
        .text(PARTY_A_NAME);

    legend
        .append("circle")
        .attr("cx", lx)
        .attr("cy", ly + 20)
        .attr("r", 6)
        .attr("fill", PARTY_B_BASE);
    legend
        .append("text")
        .attr("x", lx + 12)
        .attr("y", ly + 21)
        .attr("fill", "#f4edf8")
        .attr("font-size", 12)
        .text(PARTY_B_NAME);

    // precompute swarm positions (fast with 32 nodes)
    computeBeeswarmPositions(landNodes);

    function renderMode(mode, animate = true) {
        modeLabel.textContent = MODE_LABELS[mode];

        const duration = animate ? 600 : 0;
        const ease = d3.easeCubicInOut;

        const landT = landSel.transition().duration(duration).ease(ease);
        const circleT = circleSel.transition().duration(duration).ease(ease);
        const regionT = regionLabels.transition().duration(duration).ease(ease);

        // base: hide circles, hide region labels, show land
        landT.style("opacity", 1);
        circleT.style("opacity", 0);
        regionT.style("opacity", 0);

        if (mode === 0) {
            // area-only, nothing else
            return;
        }

        if (mode === 1) {
            landT.style("opacity", 0.25);
            circleT
                .style("opacity", 1)
                .attr("cx", d => d.cx0)
                .attr("cy", d => d.cy0)
                .attr("r", 10)
                .attr("fill", d =>
                    d.winner === "A" ? PARTY_A_BASE : PARTY_B_BASE
                );
            return;
        }

        if (mode === 2) {
            landT.style("opacity", 0.2);
            circleT
                .style("opacity", 1)
                .attr("cx", d => d.cx0)
                .attr("cy", d => d.cy0)
                .attr("r", d => radiusScale(d.voters))
                .attr("fill", d =>
                    colorByWinnerAndMargin(d.winner, d.margin)
                );
            return;
        }

        if (mode === 3) {
            landT.style("opacity", 0.1);
            circleT
                .style("opacity", 1)
                .attr("cx", d => d.xMarginSwarm)
                .attr("cy", d => d.yMarginSwarm)
                .attr("r", d => radiusScale(d.voters))
                .attr("fill", d =>
                    colorByWinnerAndMargin(d.winner, d.margin)
                );
            return;
        }

        if (mode === 4) {
            landT.style("opacity", 0.1);
            regionT.style("opacity", 1);
            circleT
                .style("opacity", 1)
                .attr("cx", d => d.xRegionSwarm)
                .attr("cy", d => d.yRegionSwarm)
                .attr("r", d => radiusScale(d.voters))
                .attr("fill", d =>
                    colorByWinnerAndMargin(d.winner, d.margin)
                );
            return;
        }
    }

    // slider listener
    modeSlider.addEventListener("input", () => {
        const mode = Number(modeSlider.value);
        renderMode(mode, true);
    });

    // initial mode (no animation on first draw)
    renderMode(Number(modeSlider.value), false);
}
