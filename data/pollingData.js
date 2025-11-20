// Polling data, not tied to any real country.
const pollingYears = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
const pollingParties = ["Boston Tea Party", "Birthday Party"];

// Interpret these as "millions of votes"
const pollingValues = {
    // Roughly follows the blue-bar pattern
    "Boston Tea Party": [
        47, // 1996
        50, // 2000
        58, // 2004
        68, // 2008
        65, // 2012
        66, // 2016
        80, // 2020
        72  // 2024
    ],

    // Roughly follows the red-bar pattern
    "Birthday Party": [
        38, // 1996
        49, // 2000
        61, // 2004
        59, // 2008
        60, // 2012
        62, // 2016
        73, // 2020
        76  // 2024
    ]
};
