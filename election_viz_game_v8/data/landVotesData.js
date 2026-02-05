// data/landVotesData.js
// Synthetic "land doesn't vote" data for 32 districts in a 4x8 grid.

function landPRNG(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const landNodes = (() => {
  const rows = 4;
  const cols = 8;
  const nodes = [];
  let id = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const normX = (c + 0.5) / cols;
      const normY = (r + 0.5) / rows;

      const distFromCenter = Math.hypot(normX - 0.5, normY - 0.5);

      const rand1 = landPRNG(id * 17.3);
      const rand2 = landPRNG(id * 41.7);
      const rand3 = landPRNG(id * 11.1);

      let margin;
      let winner;
      let voters;
      let landAreaScale;

      if (distFromCenter < 0.18) {
        const baseMargin = 12 + rand1 * 10;
        margin = baseMargin;
        winner = "A";
        voters = 36000 + rand2 * 16000;
        landAreaScale = 0.4 + rand3 * 0.3;
      } else if (distFromCenter < 0.35) {
        const leanA = rand1 < 0.4;
        const absMargin = 6 + rand2 * 8;
        margin = (leanA ? 1 : -1) * absMargin;
        winner = margin >= 0 ? "A" : "B";
        voters = 20000 + rand3 * 12000;
        landAreaScale = 0.6 + rand3 * 0.25;
      } else {
        const absMargin = 8 + rand2 * 10;
        margin = -absMargin;
        winner = "B";
        voters = 6000 + rand3 * 7000;
        landAreaScale = 0.75 + rand3 * 0.15;
      }

      const region =
        r === 0 ? "North" :
        r === 1 ? "East"  :
        r === 2 ? "South" : "West";

      nodes.push({
        id,
        name: `District ${id}`,
        row: r,
        col: c,
        normX,
        normY,
        margin,
        winner,
        voters,
        region,
        landAreaScale
      });

      id++;
    }
  }

  return nodes;
})();
