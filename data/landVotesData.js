// data/landVotesData.js
// Synthetic "district" data for land-doesn't-vote demo.
// 4 rows × 8 columns = 32 districts laid out in a grid,
// but margins + voters are more randomly mixed.

// simple deterministic pseudo-random based on seed
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
            const normX = (c + 0.5) / cols; // 0..1
            const normY = (r + 0.5) / rows; // 0..1

            // random-looking but deterministic
            const baseRand1 = landPRNG(id * 13.7);
            const baseRand2 = landPRNG(id * 29.1);

            // Margin: mostly around 0, but can go about ±25 points,
            // with a tiny bias so it's not perfectly symmetric.
            const margin = (baseRand1 - 0.5) * 50 + (normX - 0.5) * 10;
            const winner = margin >= 0 ? "A" : "B";

            // "Voters": between ~8k and ~36k, slightly more likely in the middle
            const distFromCenter = Math.hypot(normX - 0.5, normY - 0.5);
            const votersBase = 8000 + baseRand2 * 28000; // 8k–36k
            const voters = votersBase * (1.2 - distFromCenter * 0.5);

            // Simple regions by row (just for faceting in beeswarm)
            const region =
                r === 0 ? "North" :
                    r === 1 ? "East"  :
                        r === 2 ? "South" :
                            "West";

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
                region
            });
            id++;
        }
    }

    return nodes;
})();
