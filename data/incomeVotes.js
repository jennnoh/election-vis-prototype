// data/incomeVotes.js
// Fixed, deterministic synthetic dataset for income vs vote share
// Each row: { income: number, jenny: %, matthew: % }

const incomeData = [];

(function buildIncomeData() {
  const SHARE_BP = [
    { x: 0,      y: 0.70 },
    { x: 40000,  y: 0.67 },
    { x: 50000,  y: 0.48 },
    { x: 100000, y: 0.46 },
    { x: 150000, y: 0.40 },
    { x: 250000, y: 0.60 },
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
    let shareJenny = trueShareJenny(income) + 0.03 * Math.sin(income / 5000);
    shareJenny = Math.min(0.98, Math.max(0.02, shareJenny));
    const shareMatthew = 1 - shareJenny;

    incomeData.push({
      income,
      jenny: shareJenny * 100,
      matthew: shareMatthew * 100
    });
  }

  for (let inc = 0; inc <= 50000; inc += 500) addPoint(inc);
  for (let inc = 50000; inc <= 150000; inc += 250) addPoint(inc);
  for (let inc = 150000; inc <= 300000; inc += 1000) addPoint(inc);
})();
