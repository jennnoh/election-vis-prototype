// js/game.js (v4)
// UX:
// - Tap anywhere on reveal slides to advance bubbles.
// - Next button only appears when the slide has no more bubbles (or non-reveal slides).
// - Global side nav (Back/Next) instead of footer buttons.
// - Publish buttons advance immediately (no "Publish + Next" confusion).

const SLIDES = Array.from(document.querySelectorAll(".slide"));
let current = 0;

// Global state for dashboard
const STATE = { decisions: {}, flags: {} };

function byId(id){ return document.getElementById(id); }
function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
function slide(){ return SLIDES[current]; }

const btnPrev = byId("btnPrev") || byId("nav-prev");
const btnNext = byId("btnNext") || byId("nav-next");

let revealSteps = [];
let revealIndex = 0;
let revealActive = false;

function setPrevEnabled(on){ if(!btnPrev) return; btnPrev.disabled = !on; }
function setNextEnabled(on){ if(!btnNext) return; btnNext.disabled = !on; }
function showNext(on){ if(!btnNext) return; btnNext.style.display = on ? "inline-flex" : "none"; }
function setNextLabel(label){ if(!btnNext) return; btnNext.textContent = label || "Next \u25B6"; }

function initReveal(sl){
  revealSteps = Array.from(sl.querySelectorAll(".step"));
  revealSteps.forEach(s => s.classList.remove("show"));
  revealIndex = 0;
  revealActive = (["click","button","tap"].includes(sl.dataset.reveal)) && revealSteps.length > 0;

  if (revealActive){
    revealSteps[0].classList.add("show");
    revealIndex = 1;
    if (revealSteps.length <= 1){
      revealActive = false;
      showNext(true);
    } else {
      // hide Next until finished
      showNext(false);
    }
  } else {
    showNext(true);
  }
}

function revealNext(){
  if (!revealActive) return false;
  if (revealIndex < revealSteps.length){
    revealSteps[revealIndex].classList.add("show");
    revealIndex++;
    if (revealIndex >= revealSteps.length){
      revealActive = false;
      showNext(true);
    }
    return true;
  }
  revealActive = false;
  showNext(true);
  return false;
}

function showSlide(i){
  current = clamp(i, 0, SLIDES.length-1);
  SLIDES.forEach((s, idx) => s.classList.toggle("hidden", idx !== current));

  setPrevEnabled(current !== 0);

  // Default next label
  let label = slide().dataset.nextLabel || "Next \u25B6";
  if (slide().id === "start" || current === 0) label = "Start \u25B6";
  setNextLabel(label);

  // init reveal mode
  initReveal(slide());

  // Interaction slides: hide Next completely (publish advances)
  if (slide().dataset.nextDisabled === "true"){
    setNextEnabled(false);
    showNext(false);
  } else {
    setNextEnabled(true);
  }

  // Enter hooks for interactions
  if (slide().id === "s1-interact"){
    if (typeof window.initPage1 === "function") window.initPage1();
  }
  if (slide().id === "scene2-live"){
    // reset + start scene2 every time we enter
    showNext(false);
    setNextEnabled(false);
    if (window.S2) { window.S2.running = false; window.S2.called = false; }
    if (typeof window.initScene2 === "function") window.initScene2();
  }
  if (slide().id === "s3-interact"){
    if (typeof window.initPage3 === "function") window.initPage3();
  }
  if (slide().id === "s4-interact"){
    if (typeof window.initPage2 === "function") window.initPage2();
  }
  if (slide().id === "dashboard-slide"){
    renderFinalDashboard();
    showNext(false);
    setNextEnabled(false);
  }
}

function nextSlide(){
  // If reveal slide, tapping will handle it. Next button is only visible when reveal ends.
  showSlide(current + 1);
}

if (btnPrev) btnPrev.addEventListener("click", () => showSlide(current - 1));
if (btnNext) btnNext.addEventListener("click", () => nextSlide());
const btnRestart = byId("restart-game");
if (btnRestart) btnRestart.addEventListener("click", () => showSlide(0));

// Tap anywhere to reveal / advance on reveal slides
document.addEventListener("click", (e) => {
  // Ignore clicks on buttons/inputs
  if (e.target.closest("button") || e.target.closest("input") || e.target.closest("a")) return;

  if (revealActive){
    revealNext();
    return;
  }
}, true);

// Publish actions
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === "publish_s1"){
    evaluateScene1();
    showSlide(find("s1-immediate"));
  }
  if (action === "publish_s3"){
    evaluateScene3();
    showSlide(find("s3-immediate"));
  }
  if (action === "publish_s4"){
    evaluateScene4();
    showSlide(find("s4-immediate"));
  }
});

function find(id){ return SLIDES.findIndex(s => s.id === id); }

function safeNum(x, fallback){
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

// Feed renderer (X/Twitter-ish)
function renderFeed(panelId, posts){
  const host = byId(panelId);
  if (!host) return;
  host.innerHTML = `<div class="feed"></div>`;
  const feed = host.querySelector(".feed");

  posts.forEach((p, idx) => {
    const reply = (p.reply != null) ? p.reply : 8 + (idx * 7) % 17;
    const rt = (p.rt != null) ? p.rt : 34 + (idx * 11) % 41;
    const like = (p.like != null) ? p.like : 120 + (idx * 37) % 160;
    const card = document.createElement("div");
    card.className = "post step";
    card.innerHTML = `
      <div class="post-head">
        <div class="post-avatar">${p.icon || "\u{1F464}"}</div>
        <div class="post-meta">
          <div class="post-name">${p.name}</div>
          <div class="post-handle">@${p.handle}</div>
          <div class="post-time">- ${p.time || "now"}</div>
        </div>
      </div>
      <div class="post-text">${p.text}</div>
      <div class="post-actions">\u{1F4AC} Replies ${reply} | \u{1F501} Reposts ${rt} | \u{2764}\u{FE0F} Likes ${like}</div>
    `;
    feed.appendChild(card);
  });
}

// Simple bubble list renderer
function avatarForSpeaker(speaker){
  const s = String(speaker || "").toLowerCase();
  if (s.includes("editor")) return "assets/characters/editor/neutral.png";
  if (s.includes("wizard")) return "assets/characters/wizard/neutral.png";
  if (s.includes("journalist") || s.includes("player") || s.includes("you")) return "assets/characters/data_journalist/neutral.png";
  return null;
}

function renderBubbles(panelId, lines){
  const host = byId(panelId);
  if (!host) return;
  host.innerHTML = "";

  lines.forEach(item => {
    let speaker = "";
    let text = "";
    let side = "left";

    if (typeof item === "string") {
      text = item;
      const mm = item.match(/^(Editor|Wizard|Public|You)\s*[:(]/i);
      if (mm) {
        speaker = mm[1];
        text = text.replace(/^(Editor|Wizard|Public|You)\s*:\s*/i, "");
      }
    } else {
      speaker = item.speaker || "";
      text = item.text || "";
      side = item.side || "left";
    }

    const row = document.createElement("div");
    row.className = "scene-row " + (side === "right" ? "right" : "");

    const avatar = avatarForSpeaker(speaker);
    const img = avatar ? document.createElement("img") : null;
    if (img) {
      img.className = "avatar";
      img.src = avatar;
      img.alt = speaker || "speaker";
    }

    const bub = document.createElement("div");
    bub.className = "step bubble " + (side === "right" ? "right" : "left");
    bub.innerHTML = (speaker ? `<strong>${speaker}:</strong> ` : "") + text;

    // For player bubbles (right side), put the avatar on the right.
    if (side === "right") {
      row.appendChild(bub);
      if (img) row.appendChild(img);
    } else {
      if (img) row.appendChild(img);
      row.appendChild(bub);
    }
host.appendChild(row);
  });
}


// ---------------- Scene 1 ----------------
function evaluateScene1(){
  const s = (window.getScenario1State) ? window.getScenario1State() : { yMin:0, yMax:100 };
  const ySpan = safeNum(s.yMax, 100) - safeNum(s.yMin, 0);

  const exaggerated = ySpan <= 22;
  STATE.flags.flag_frame = exaggerated ? "exaggerated" : "balanced";

  STATE.decisions.scene1 = {
    title: "Scene 1  -  Framing the Polls",
    choice: exaggerated ? "Truncated y-axis range" : "Contextual y-axis range",
    detail: `Y span: ${Math.round(ySpan)}`,
    flags: { flag_frame: STATE.flags.flag_frame }
  };

  const immediate = exaggerated
    ? [
      {speaker:"Editor", side:"left", text:"That swing looks HUGE."},
      {speaker:"Editor", side:"left", text:"(quiet) This makes Green look like they're crashing."},
      {speaker:"Wizard", side:"left", text:"What does the axis measure  -  and what might readers assume?"}
    ]
    : [
      {speaker:"Editor", side:"left", text:"Not dramatic but it's honest."},
      {speaker:"Editor", side:"left", text:"We can still use it for comparison."},
      {speaker:"Wizard", side:"left", text:"How could you clarify change without distorting scale?"}
    ];

  const now = exaggerated
    ? [
      {icon:"📈", name:"pollwatcher", handle:"pollwatcher", time:"1m", text:"WAIT Purple is surging??"},
      {icon:"🟩", name:"greenstan", handle:"greenstan", time:"2m", text:"Green is collapsing. It's over."},
      {icon:"👀", name:"skeptic", handle:"skeptic", time:"4m", text:"This feels off. What's the axis?"}
    ]
    : [
      {icon:"🧠", name:"statguy", handle:"statguy", time:"2m", text:"Ok small change, but this is clear."},
      {icon:"📊", name:"chartnerd", handle:"chartnerd", time:"5m", text:"Scale makes it readable."},
      {icon:"💬", name:"policywonk", handle:"policywonk", time:"7m", text:"Cool. Now tell me <em>why</em> it moved."}
    ];

  const later = exaggerated
    ? [
      {icon:"🧵", name:"threadmaker", handle:"threadmaker", time:"3d", text:"They manipulated the y-axis. Here's the full scale."},
      {icon:"🕵️", name:"conspiracypost", handle:"conspiracypost", time:"4d", text:"Conspiracy: polls are being 'cooked'."}
    ]
    : [
      {icon:"✅", name:"localnews", handle:"localnews", time:"3d", text:"This chart aged well, baseline for later polls."},
      {icon:"📌", name:"researcher", handle:"researcher", time:"5d", text:"Nice example of showing change without drama."}
    ];

  renderBubbles("s1-immediate-panel", immediate);
  renderFeed("s1-feed-now-panel", now);
  renderFeed("s1-feed-later-panel", later);
}

// ---------------- Scene 2 ----------------
function evaluateScene2(){
  const snap = (window.S2 && typeof window.S2.snapshot === "function") ? window.S2.snapshot() : { didCall:false, timeSec:60, picked:null };
  const didCall = !!snap.didCall;
  const picked = snap.picked;
  const t = safeNum(snap.timeSec, 60);

  let band = "too_late";
  if (t < 20) band = "too_early";
  else if (t < 40) band = "ideal";
  else band = "too_late";

  const truth = window.TRUE_FINAL_S2 || "Purple Party (Jenny)";
  const correct = didCall && picked === truth;

  STATE.flags.flag_uncertainty = (band === "too_early") ? "rushed" : (band === "too_late") ? "late" : "timely";
  STATE.decisions.scene2 = {
    title: "Scene 2  -  Call the Race",
    choice: didCall ? `Called: ${picked}` : "Did not call",
    detail: didCall ? `Time: ${t.toFixed(1)}s` : "Time ran out",
    flags: { flag_uncertainty: STATE.flags.flag_uncertainty }
  };

  let immediate=[], now=[], later=[];

  if (!didCall){
    immediate = ["Editor: We missed the moment.","Wizard: No decision is still a decision."];
    now = [{icon:"📺", name:"livetv", handle:"livetv", time:"now", text:"ABG already called it."},
           {icon:"🙃", name:"viewer", handle:"viewer", time:"now", text:"Why so slow?"}];
    later = [{icon:"🗓️", name:"archive", handle:"archive", time:"3d", text:"Nobody remembers your broadcast. The story moved on."}];
  } else if (band === "too_late"){
    immediate = [`Editor: You called <strong>${picked}</strong> after the big broadcasts.`,
                "Wizard: Timing shapes impact."];
    now = [{icon:"😴", name:"scrolling", handle:"scrolling", time:"now", text:"Already saw this."},
           {icon:"📉", name:"metrics", handle:"metrics", time:"now", text:"Too late. Engagement tanks."}];
    later = [{icon:"🗓️", name:"archive", handle:"archive", time:"4d", text:"Even if you're right, your clip is buried."}];
  } else if (band === "too_early"){
    immediate = ["Editor: We're first, but this is risky.",
                "Wizard: What evidence did you have, and what didn't you have?"];
    now = [{icon:"🔥", name:"breaking", handle:"breaking", time:"now", text:"They called it already??"},
           {icon:"👀", name:"doubt", handle:"doubt", time:"now", text:"Risky, are they sure?"}];
    later = [correct
      ? {icon:"✅", name:"recap", handle:"recap", time:"3d", text:"You end up right, but people debate how reckless it felt."}
      : {icon:"✅", name:"recap", handle:"recap", time:"3d", text:"Your call was wrong. Trust takes a hit."}
    ];
  } else {
    immediate = ["Editor: Ok - we're taking a stance.",
                "Wizard: Nice timing. Now explain uncertainty clearly."];
    now = [{icon:"📢", name:"livetweet", handle:"livetweet", time:"now", text:"BBT says Green Party (Matthew), but this channel says Purple Party (Jenny)."},
           {icon:"🧠", name:"nerd", handle:"nerd", time:"now", text:"They waited for more data."}];
    later = [correct
      ? {icon:"✅", name:"finalcount", handle:"finalcount", time:"3d", text:"As the count finalizes, your call holds up."}
      : {icon:"✅", name:"finalcount", handle:"finalcount", time:"3d", text:"As the count finalizes, the call doesn't hold."}
    ];
  }

  renderBubbles("s2-immediate-panel", immediate);
  renderFeed("s2-feed-now-panel", now);
  renderFeed("s2-feed-later-panel", later);
}

window.addEventListener("scene2:called", () => {
  evaluateScene2();
  showSlide(find("s2-immediate"));
});
window.addEventListener("scene2:ended", () => {
  if (window.S2 && !window.S2.called){
    evaluateScene2();
    showSlide(find("s2-immediate"));
  }
});

// ---------------- Scene 3 ----------------
function evaluateScene3(){
  const s = (window.getScenario3State) ? window.getScenario3State() : { mode:0 };
  const mode = safeNum(s.mode, 0);
  const balanced = (mode >= 2);

  STATE.flags.flag_map = balanced ? "clarifying" : "misleading";
  STATE.decisions.scene3 = {
    title: "Scene 3  -  Land Doesn't Vote",
    choice: balanced ? "Population'aware view" : "Area'only map",
    detail: `View mode: ${mode}`,
    flags: { flag_map: STATE.flags.flag_map }
  };

  const immediate = balanced
    ? ["Editor: Nice, population is obvious now.","Wizard: Good. Name the gap between land and voters."]
    : ["Editor: This screams GREEN landslide.","Wizard: Does area equal voters?"];

  const now = balanced
    ? [{icon:"🧠", name:"citykid", handle:"citykid", time:"now", text:"Ohhh cities are smaller but heavier."},
       {icon:"📊", name:"mapreader", handle:"mapreader", time:"now", text:"First map was misleading."}]
    : [{icon:"🟩", name:"landslide", handle:"landslide", time:"now", text:"Green won everywhere."},
       {icon:"🧨", name:"rage", handle:"rage", time:"now", text:"Purple must've cheated."}];

  const later = balanced
    ? [{icon:"✅", name:"factcheck", handle:"factcheck", time:"4d", text:"Landslide narrative loses steam."}]
    : [{icon:"🧵", name:"threadmaker", handle:"threadmaker", time:"4d", text:"Conspiracy threads grow: 'Land = mandate.'"}];

  renderBubbles("s3-immediate-panel", immediate);
  renderFeed("s3-feed-now-panel", now);
  renderFeed("s3-feed-later-panel", later);
}

// ---------------- Scene 4 ----------------
function evaluateScene4(){
  const s = (window.getScenario4State) ? window.getScenario4State() : { binCount:3 };
  const k = safeNum(s.binCount, 3);

  const verdict = (k <= 2) ? "too_coarse" : (k >= 7) ? "too_noisy" : "good_balance";
  STATE.flags.flag_aggregation = verdict;

  STATE.decisions.scene4 = {
    title: "Scene 4  -  Aggregation",
    choice: `Bin count: ${k}`,
    detail: verdict === "too_coarse" ? "Too coarse: hides the mid'range reversal" :
            verdict === "too_noisy" ? "Too many bins: invites over'reading noise" :
            "Balanced: shows structure without overfitting",
    flags: { flag_aggregation: verdict }
  };

  const immediate = verdict==="good_balance"
    ? ["Editor: Nice. This actually explains the pattern.","Wizard: Good. Now describe what flips where."]
    : verdict==="too_coarse"
      ? ["Editor: Clean, but it feels like it's hiding something.","Wizard: Aggregation can erase turning points."]
      : ["Editor: This looks jumpy.","Wizard: When does detail become noise?"];

  const now = verdict==="good_balance"
    ? [{icon:"🧠", name:"reader", handle:"reader", time:"now", text:"Oh wow, the middle income group flips."}]
    : verdict==="too_coarse"
      ? [{icon:"😌", name:"simplifier", handle:"simplifier", time:"now", text:"So income predicts everything."}]
      : [{icon:"😵", name:"confused", handle:"confused", time:"now", text:"Why does it zig-zag?"}];

  const later = verdict==="good_balance"
    ? [{icon:"✅", name:"explainer", handle:"explainer", time:"5d", text:"People cite your chart in longer explainers."}]
    : verdict==="too_coarse"
      ? [{icon:"🧵", name:"threadmaker", handle:"threadmaker", time:"5d", text:"Over-generalizations spread: 'one rule explains voters.'"}]
      : [{icon:"📉", name:"dropoff", handle:"dropoff", time:"5d", text:"Readers stop trusting because it feels arbitrary."}];

  renderBubbles("s4-immediate-panel", immediate);
  renderFeed("s4-feed-now-panel", now);
  renderFeed("s4-feed-later-panel", later);
}

// ---------------- Dashboard ----------------
function renderFlags(flags){
  const keys = Object.keys(flags || {});
  if (keys.length === 0) return "";
  return keys.map(k => `<span><strong>${k}</strong>: ${flags[k]}</span>`).join(" · ");
}
function renderFinalDashboard(){
  const host = byId("dashboard");
  if (!host) return;
  host.innerHTML = "";

  const items = ["scene1","scene2","scene3","scene4"].map(k => STATE.decisions[k]).filter(Boolean);
  if (items.length === 0){
    host.innerHTML = `<div class="dash-card"><h3>No decisions recorded</h3><div class="dash-meta">Play through the scenes and publish to see your recap.</div></div>`;
    return;
  }
  items.forEach(d => {
    const card = document.createElement("div");
    card.className = "dash-card";
    card.innerHTML = `
      <h3>${d.title}</h3>
      <div class="dash-meta"><strong>You published:</strong> ${d.choice}</div>
      <div class="dash-meta">${d.detail || ""}</div>
      <div class="flag-row">${renderFlags(d.flags)}</div>
    `;
    host.appendChild(card);
  });
}

// Boot
showSlide(0);

