# Late Night Desk Exam

*A high-stakes, atmospheric trivia survival game.*

## Description
The Late Night Desk Exam is a highly polished, interactive single-page trivia application styled to resemble a physical desk during a late-night study session. Grounded in modern skeuomorphism, the game challenges users with web development trivia under intense time constraints. The atmospheric UI features dynamic 3D tilt interactions, floating dust particles, glassmorphic HUD elements, and ambient desk clutter for a rich, immersive experience. 

## Features
- **Survival Mechanics:** Start with 3 lives. Lose a life for every incorrect answer or timeout. The game features sudden death if all lives are lost.
- **Dynamic 20-Second Timer:** A strict countdown clock that flashes red as time runs low.
- **Rich Question Formats:** Test your knowledge with single-select, multi-select, fill-in-the-blank, and code-snippet questions.
- **3D Card Interactions:** The active question card features a smooth, JS-driven 3D tilt effect mapped to cursor movement, amplifying deep CSS drop shadows.
- **Atmospheric UI:** A central spotlight gradient fades into dark shadows, populated with animated floating dust particles, a coffee stain, and a yellow No. 2 pencil.
- **Persistent Leaderboard:** High scores, including time bonuses, are saved to `localStorage` and displayed on a sleek glassmorphic Grade Slip at the end of the run.

## Tech Stack
- **HTML5:** Semantic, accessible structure.
- **CSS3:** Heavy use of CSS variables, flexbox, glassmorphism (`backdrop-filter`), 3D transforms (`preserve-3d`), and keyframe animations.
- **Vanilla JavaScript (ES6+):** No frameworks or build tools. Handles game logic, 3D physics calculations, dust generation, and asynchronous data fetching.

## How to Run Locally
1. Clone this repository to your local machine.
2. Open the project folder.
3. Because the game uses `fetch()` to load the question bank (`data/questions.json`), you must serve it over a local HTTP server rather than opening the HTML file directly via `file://`.
   - If using Node.js: `npx serve`
   - If using Python: `python3 -m http.server`
   - Alternatively, use the "Live Server" extension in VS Code.
4. Open the provided localhost URL in your browser to begin the exam!
