# Liquid JavaScript Drop

<img width="2560" height="1408" alt="Screenshot From 2026-03-09 21-57-27" src="https://github.com/user-attachments/assets/184ba9f7-9113-42f3-ae94-59e8c03cf2d4" />
<img width="2560" height="1408" alt="Screenshot From 2026-03-09 21-58-18" src="https://github.com/user-attachments/assets/e29ac116-5f26-416b-a3b0-605c5597f2ad" />
<img width="2560" height="1408" alt="Screenshot From 2026-03-09 21-58-07" src="https://github.com/user-attachments/assets/5052fa57-a397-46e9-8183-48aeed00674f" />
<img width="2560" height="1408" alt="Screenshot From 2026-03-09 21-57-42" src="https://github.com/user-attachments/assets/07391709-4d25-4aef-af84-3857c3d4ddb1" />


WebGL 2.0 browser version of the puzzle game.

## Run the game

Because the game loads image assets from `data/`, run it from a local web server (not `file://`).

### Option 1: Python

From the project folder:

`python3 -m http.server 8080`

Then open:

`http://localhost:8080/`

### Option 2: Any static server

You can use any static web server as long as `index.html` and `data/` stay together.

## How to play

You control a 3-block piece and try to make matches to clear blocks and score points.

- Move: place pieces to form matching lines
- Match: horizontal, vertical, or diagonal sets of matching colors clear
- Gravity: floating blocks fall after clears
- Lose condition: when new blocks can no longer spawn

## Controls

### Keyboard (desktop)

- `Arrow Left` / `Arrow Right`: move piece
- `Arrow Down`: soft drop
- `Arrow Up`: shift block colors forward
- `Z`: shift block colors backward
- `Space`: rotate piece
- `D`: hard drop
- `P`: pause
- `Enter`: confirm/select on menus
- `Escape`: back to main menu (or cancel where applicable)

### Touch / Mouse (mobile + desktop)

- Bottom controls in game:
	- `◀ ▼ ▶` move
	- `Rotate` rotates
	- `↻ Color` shifts color
	- `Drop` hard drops
- Top menu bar:
	- `OK / Enter` select/continue
	- `▲` / `▼` navigate menu
	- On Options screen, `◀` / `▶` appear for changing values
- `Hide Touch` hides overlays; a small floating button restores them

## High scores

- Stored in browser `localStorage`
- Key: `jsDropScores`
- Scores are local to that browser/profile and origin

## Mobile notes

- The game requests landscape orientation when supported
- On high-score name entry, mobile keyboard is supported via hidden input focus

## Files

- `index.html`: full game code (WebGL + UI + input)
- `data/`: textures and shader files
