// js/app_scene2_callrace.js (v3)
// 60s autoplay live map. BBT calls at 20s, ABG calls at 40s.
// Districts flip as they "report". Early: grey -> party color.

window.TRUE_FINAL_S2 = "Purple Party"; // ground truth for this scene

const PARTY_PURPLE = "#8E6C8A";
const PARTY_GREEN  = "#45A27D";
const GREY = "#cfcfd6";

function hexToRgb(hex){
  const m = hex.replace("#","").match(/.{1,2}/g).map(x=>parseInt(x,16));
  return {r:m[0], g:m[1], b:m[2]};
}
function mix(hexA, hexB, t){
  const a=hexToRgb(hexA), b=hexToRgb(hexB);
  const r=Math.round(a.r + (b.r-a.r)*t);
  const g=Math.round(a.g + (b.g-a.g)*t);
  const b2=Math.round(a.b + (b.b-a.b)*t);
  return `rgb(${r},${g},${b2})`;
}

function makeDistrictModel(){
  // Use landNodes grid (4x8) as the basis for districts.
  // Each district has a reportAt threshold and a leaning.
  const prng = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  return landNodes.map(d => {
    const r1 = prng(d.id * 13.7);
    const r2 = prng(d.id * 91.3);
    const reportAt = 15 + r1 * 75; // 15% .. 90%
    // define underlying winner: use d.winner but invert some to create drama
    const trueWinner = d.winner === "A" ? "Purple Party" : "Green Party";
    return {
      id: d.id,
      row: d.row,
      col: d.col,
      reportAt,
      trueWinner,
      lastShown: null,
      noise: r2
    };
  });
}

function buildLiveSeries(){
  // Curated series where early returns lean green, later purple catches up.
  const steps = [];
  for (let t=0; t<=60; t+=1){
    const pct = 20 + (80 * (t/60)); // 20% -> 100%
    // vote shares: start with Green Party lead, then shift to Purple Party win
    const jenny = 44 + 10 * (t/60);      // 44 -> 54
    const matt  = 56 - 10 * (t/60);      // 56 -> 46
    steps.push({ t, pct, jenny, matt });
  }
  return steps;
}

function createGridSvg(container){
  const width = 520;
  const height = 360;
  const rows = 4;
  const cols = 8;

  const svg = d3.select(container).append("svg")
    .attr("class","s2-map-svg")
    .attr("width", width)
    .attr("height", height);

  const pad = 18;
  const gridW = width - pad*2;
  const gridH = height - pad*2;
  const cellW = gridW/cols;
  const cellH = gridH/rows;

  const g = svg.append("g").attr("transform", `translate(${pad},${pad})`);

  return { svg, g, rows, cols, cellW, cellH };
}

function initScene2(){
  const host = document.getElementById("scene2-map");
  if (!host) return;

  // Clear if re-enter
  host.innerHTML = "";
  if (window.S2 && window.S2.timerId) clearTimeout(window.S2.timerId);

  const model = makeDistrictModel();
  const series = buildLiveSeries();
  const { g, cellW, cellH } = createGridSvg(host);

  // Rects
  const rects = g.selectAll("rect")
    .data(model, d=>d.id)
    .enter()
    .append("rect")
    .attr("x", d => d.col * cellW + 2)
    .attr("y", d => d.row * cellH + 2)
    .attr("width", cellW - 4)
    .attr("height", cellH - 4)
    .attr("rx", 8)
    .attr("fill", GREY)
    .attr("stroke", "#ffffff")
    .attr("stroke-opacity", 0.7);

  rects.append("title").text(d => `District ${d.id}`);

  // State holder
  const S2 = {
    called: false,
    didCall: false,
    picked: null,
    timeSec: 60,
    pct: 100,
    running: false,
    timerId: null,
    snapshot(){
      return { didCall: this.didCall, picked: this.picked, timeSec: this.timeSec, pct: this.pct };
    }
  };
  window.S2 = S2;

  // Controls
  const btnM = document.getElementById("s2-call-matthew");
  const btnJ = document.getElementById("s2-call-jenny");
  const btnHold = document.getElementById("s2-hold");

  function setCallButtonsEnabled(on){
    [btnM, btnJ, btnHold].forEach(b => { if (b) b.disabled = !on; });
  }
  function lockCallButtons(){
    [btnM, btnJ, btnHold].forEach(b => { if (b) b.disabled = true; });
  }

  function call(picked){
    if (S2.called) return;
    S2.called = true;
    S2.didCall = true;
    S2.picked = picked;
    lockCallButtons();

    const status = document.getElementById("s2-status");
    if (status) status.textContent = `You called: ${picked} at ${Math.round(S2.timeSec)}s`;

    window.dispatchEvent(new CustomEvent("scene2:called"));
  }

  if (btnM) btnM.onclick = () => call("Green Party");
  if (btnJ) btnJ.onclick = () => call("Purple Party");
  if (btnHold) btnHold.onclick = () => {
    const status = document.getElementById("s2-status");
    if (status) status.textContent = "You're ready. Call a winner when you decide.";
  };

  // Overlay start
  const overlay = document.getElementById("s2-overlay");
  const startBtn = document.getElementById("s2-start");
  if (overlay) overlay.classList.remove("hidden");
  setCallButtonsEnabled(false);

  // Announcers
  const bbt = document.getElementById("s2-bbt");
  const abg = document.getElementById("s2-abg");
  function pop(el){
    if (!el) return;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 5000);
  }

  // Timer loop
  let idx = 0;
  const tickMs = 1000;

  function render(step){
    S2.timeSec = step.t;
    S2.pct = step.pct;

    const timer = document.getElementById("s2-timer");
    const pctEl = document.getElementById("s2-pct");
    const splitEl = document.getElementById("s2-live-split");
    const leaderEl = document.getElementById("s2-live-leader");

    if (timer){
      const mm = String(Math.floor(step.t / 60)).padStart(2,"0");
      const ss = String(step.t % 60).padStart(2,"0");
      timer.textContent = `${mm}:${ss} / 01:00`;
    }
    if (pctEl) pctEl.textContent = `${Math.round(step.pct)}%`;
    if (splitEl) splitEl.textContent = `Purple Party ${step.jenny.toFixed(1)}% · Green Party ${step.matt.toFixed(1)}%`;

    const leader = (step.jenny >= step.matt) ? "Purple Party leads" : "Green Party leads";
    if (leaderEl) leaderEl.textContent = leader;

    // update districts: before reportAt -> grey.
    // after reportAt -> grey->party ramp intensity based on how far into reporting.
    model.forEach(d => {
      if (step.pct < d.reportAt) {
        d.lastShown = null;
        return;
      }
      const partyColor = (d.trueWinner === "Purple Party") ? PARTY_PURPLE : PARTY_GREEN;
      const t = (step.pct - d.reportAt) / (100 - d.reportAt);
      const ramp = mix(GREY, partyColor, Math.max(0.15, Math.min(1, t)));
      d.lastShown = ramp;
    });

    rects.attr("fill", d => d.lastShown || GREY);

    // announcers at 20s and 40s
    if (step.t === 20) pop(bbt);
    if (step.t === 40) pop(abg);
  }

  function loop(){
    if (!S2.running) return;
    if (idx >= series.length){
      // ended
      lockCallButtons();
      if (!S2.called){
        const status = document.getElementById("s2-status");
        if (status) status.textContent = "Time's up  -  you didn't call.";
      }
      window.dispatchEvent(new CustomEvent("scene2:ended"));
      return;
    }
    render(series[idx]);
    idx++;
    S2.timerId = setTimeout(loop, tickMs);
  }

  function startScene(){
    if (S2.running) return;
    S2.running = true;
    idx = 0;
    if (overlay) overlay.classList.add("hidden");
    if (bbt) bbt.classList.add("hidden");
    if (abg) abg.classList.add("hidden");
    const status = document.getElementById("s2-status");
    if (status) status.textContent = "";
    setCallButtonsEnabled(true);
    loop();
  }

  if (startBtn) startBtn.onclick = startScene;
}

window.initScene2 = initScene2;
