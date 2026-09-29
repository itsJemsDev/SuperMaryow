# Pixel Arsenal

A small original side-scrolling platform shooter made with Canvas, CSS, and plain JavaScript. All game art and sound effects are drawn or synthesized locally; it has no external asset or service dependencies.

## Run it

Open `index.html` in a modern desktop browser. For a local server, run `python -m http.server 8000` from this folder and visit `http://localhost:8000`.

## Controls

- **A / D** or **← / →**: move
- **Space**: jump (hold briefly for a higher jump)
- **J**: fire; **K**: grenade
- **Q / E**: previous / next available weapon
- **Esc**: pause or resume
- **M**: mute or unmute sound
- **Enter**: confirm a menu choice / continue after a level

On touch devices, use the landscape on-screen controller; tapping **Play** requests fullscreen where the browser supports it. Use the top-right **FS** button to toggle fullscreen. The **SND/MUTE** button controls effects; its lower note controls music. Audio begins after your first input.

## Files

- `index.html`: game shell and canvas
- `style.css`: responsive 16:9 cabinet frame and crisp-pixel presentation
- `game.js`: game loop, physics, entities, three world layouts, combat, audio, interface, and saved progress

The canvas uses a fixed 480 × 270 logical resolution and scales up to the available screen while preserving its 16:9 shape. Landscape phones and tablets use the available height, with safe-area padding for notches; narrow portrait screens show a rotate-device prompt. The game uses a fixed-step simulation driven by `requestAnimationFrame`. Progress (best score and furthest unlocked world) is kept in browser `localStorage`.
