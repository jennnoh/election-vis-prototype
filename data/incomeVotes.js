// data/incomeVotes.js
// Fixed, deterministic synthetic dataset for income vs vote share

// Each row: { income: number, jenny: %, matthew: % }
const incomeData = [];

(function buildIncomeData() {
    // Same story as before:
    // - <50k: Jenny strong
    // - 50–150k: Matthew wins (Jenny ~48→40%)
    // - >150k: Jenny wins again

    const SHARE_BP = [
        { x: 0,      y: 0.70 },
        { x: 40000,  y: 0.67 }, // strong Jenny
        { x: 50000,  y: 0.48 }, // just at 50k: slight Matthew lead
        { x: 100000, y: 0.46 }, // 50–100k: Jenny < 50%
        { x: 150000, y: 0.40 }, // 100–150k: Matthew clearly ahead
        { x: 250000, y: 0.60 }, // >150k: Jenny comes back
        { x: 300000, y: 0.65 }
    ];

    function trueShareJenny(income) {
        if (income <= SHARE_BP[0].x) return SHARE_BP[0].y;
        if (income >= SHARE_BP[SHARE_BP.length - 1].x)
            return SHARE_BP[SHARE_BP.length - 1].y;

        for (let i = 0; i < SHARE_BP.length - 1; i++) {
            const p0 = SHARE_BP[i];
            const p1 = SHARE_BP[i + 1];
            if (income >= p0.x && income <= p1.x) {
                const t = (income - p0.x) / (p1.x - p0.x);
                return p0.y + t * (p1.y - p0.y);
            }
        }
        return 0.5;
    }

    function addPoint(income) {
        // small deterministic wiggle so it’s not perfectly flat
        let shareJenny = trueShareJenny(income) + 0.03 * Math.sin(income / 5000);
        shareJenny = Math.min(0.98, Math.max(0.02, shareJenny));
        const shareMatthew = 1 - shareJenny;

        incomeData.push({
            income: income,
            jenny: shareJenny * 100,      // store as percent
            matthew: shareMatthew * 100
        });
    }

    // Build a LARGE dataset, with more density in 50–150k

    // Low incomes: 0–50k, step 500  → ~101 points
    for (let inc = 0; inc <= 50000; inc += 500) {
        addPoint(inc);
    }

    // Middle incomes: 50–150k, step 250 → ~401 points (denser)
    for (let inc = 50000; inc <= 150000; inc += 250) {
        addPoint(inc);
    }

    // High incomes: 150–300k, step 1000 → ~151 points
    for (let inc = 150000; inc <= 300000; inc += 1000) {
        addPoint(inc);
    }

    // Total ≈ 650+ rows, fully deterministic.
})();
