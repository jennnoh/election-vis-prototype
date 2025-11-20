// js/nav.js
document.addEventListener("DOMContentLoaded", () => {
    const page1 = document.getElementById("page-1");
    const page2 = document.getElementById("page-2");
    const page3 = document.getElementById("page3");

    const nextPageBtn = document.getElementById("next-page-btn");   // 1 → 2
    const backPageBtn = document.getElementById("back-page-btn");   // 2 → 1
    const nextToPage3 = document.getElementById("next-to-page3");   // 2 → 3
    const backToPage2 = document.getElementById("back-to-page2");   // 3 → 2

    function showPage(target) {
        [page1, page2, page3].forEach(p => {
            if (!p) return;
            if (p === target) p.classList.remove("hidden");
            else p.classList.add("hidden");
        });
    }

    // start on page 1
    if (page1) showPage(page1);

    // page 1 → 2
    if (nextPageBtn && page2) {
        nextPageBtn.addEventListener("click", () => {
            showPage(page2);
            if (typeof initPage2 === "function") initPage2();
        });
    }

    // page 2 → 1
    if (backPageBtn && page1) {
        backPageBtn.addEventListener("click", () => {
            showPage(page1);
        });
    }

    // page 2 → 3
    if (nextToPage3 && page3) {
        nextToPage3.addEventListener("click", () => {
            showPage(page3);
            if (typeof initPage3 === "function") initPage3();
        });
    }

    // page 3 → 2
    if (backToPage2 && page2) {
        backToPage2.addEventListener("click", () => {
            showPage(page2);
            if (typeof initPage2 === "function") initPage2();
        });
    }
});
