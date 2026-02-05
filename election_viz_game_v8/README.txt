VizTown Election Viz Game ' Prototype (single slide container)

How to run locally
1) Open a terminal in this folder.
2) Start a local server:
   - python3 -m http.server 8000
3) Open:
   - http://localhost:8000/index.html

What changed
- Replaced per-page navigation with a single slide container controlled by js/game.js
- Scene order: Poll framing ' Call race ' Land doesn't vote ' Binning
- 'Delayed consequence' shows at the start of the next scene
- Uses your stick-figure PNGs (cropped from your reference sheet) under assets/characters/
- End screen shows a dashboard summarizing your decisions + lessons

Where to edit content quickly
- Editor / Wizard lines, social posts, thresholds: js/game.js
- Scene 2 live-count behavior: js/app_scene2_callrace.js
- Scene 1 axis interaction: js/app_page1.js
- Scene 3 map interaction: js/app_page3.js
- Scene 4 binning interaction: js/app_page2.js

