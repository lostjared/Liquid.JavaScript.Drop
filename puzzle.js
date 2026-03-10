"use strict";
const STARTX = 368, STARTY = 92;
const GRID_WIDTH = 8, GRID_HEIGHT = 18;
const BLOCK_SIZE = 62, BLOCK_HEIGHT = 23, BLOCK_SPACING = 2;
const NEXT_PANEL_X = 900, NEXT_PANEL_Y = 270;
const FLASH_DURATION = 300;
const SHADER_LEVEL_LINES = 10, SHADER_LEVEL_COUNT = 4;

const BLOCK_BLACK=0, BLOCK_YELLOW=1, BLOCK_ORANGE=2, BLOCK_LTBLUE=3,
      BLOCK_DBLUE=4, BLOCK_PURPLE=5, BLOCK_PINK=6, BLOCK_GRAY=7,
      BLOCK_RED=8, BLOCK_GREEN=9, BLOCK_CLEAR=10, BLOCK_COUNT=11;

const SCREEN_INTRO=0, SCREEN_START=1, SCREEN_GAME=2, SCREEN_GAMEOVER=3,
      SCREEN_OPTIONS=4, SCREEN_CREDITS=5, SCREEN_SCORES=6;
const BLOCK_COLORS = [
    [20,20,20],
    [255,255,0],
    [255,165,0],
    [100,180,255],
    [0,50,200],
    [160,32,240],
    [255,105,180],
    [150,150,150],
    [255,0,0],
    [0,200,0],
    [200,200,200],
];
const canvas = document.getElementById("gameCanvas");
let W = 1280, H = 720;
canvas.width = W; canvas.height = H;

function resizeCanvas() {
    const r = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    W = Math.floor(1280 * r); H = Math.floor(720 * r);
    canvas.width = W; canvas.height = H;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, premultipliedAlpha: false });
if (!gl) { document.body.innerHTML = "<h1 style='color:#fff'>WebGL 2 not supported</h1>"; throw "No WebGL2"; }

function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(s), "\n", src.split('\n').map((l,i)=>`${i+1}: ${l}`).join('\n'));
        gl.deleteShader(s); return null;
    }
    return s;
}

function createProgram(vsId, fsId) {
    const vsSrc = document.getElementById(vsId).textContent;
    const fsSrc = document.getElementById(fsId).textContent;
    const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error("Link error:", gl.getProgramInfoLog(prog));
        return null;
    }
    return prog;
}
const quadVerts = new Float32Array([
    0,0, 0,0,  1,0, 1,0,  0,1, 0,1,
    1,0, 1,0,  1,1, 1,1,  0,1, 0,1
]);
const quadVAO = gl.createVertexArray();
const quadVBO = gl.createBuffer();
gl.bindVertexArray(quadVAO);
gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
gl.bindVertexArray(null);
function createPlaceholderTexture(r, g, b) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([r, g, b, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
}

function loadTexture(path, fallbackR, fallbackG, fallbackB) {
    const tex = createPlaceholderTexture(fallbackR || 0, fallbackG || 0, fallbackB || 0);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        console.log("Loaded:", path);
    };
    img.onerror = () => { console.warn("Could not load image:", path, "— using placeholder"); };
    img.src = path;
    return tex;
}
const blockFiles = [
    "block_black.jpg", "block_yellow.jpg", "block_orange.jpg", "block_ltblue.jpg",
    "block_dblue.jpg", "block_purple.jpg", "block_pink.jpg", "block_gray.jpg",
    "block_red.jpg", "block_green.jpg", "block_clear.jpg"
];
const blockTextures = blockFiles.map((f, i) =>
    loadTexture("data/" + f, BLOCK_COLORS[i][0], BLOCK_COLORS[i][1], BLOCK_COLORS[i][2])
);
const gameBgTex    = loadTexture("data/gamebg.jpg",    26, 0, 51);
const introTex     = loadTexture("data/intro.jpg",     255, 0, 102);
const universeTex  = loadTexture("data/universe.jpg",  34, 0, 68);
const logoTex      = loadTexture("data/logo.jpg",      10, 0, 32);
const scoresBgTex  = loadTexture("data/bg.jpg",        5, 0, 21);
const progPassthrough = createProgram("sprite-vs", "sprite-passthrough-fs");
const progKaleido1 = createProgram("sprite-vs", "kaleidoscope1-fs");
const progKaleido2 = createProgram("sprite-vs", "kaleidoscope2-fs");
const progKaleido3 = createProgram("sprite-vs", "kaleidoscope3-fs");
const progKaleido4 = createProgram("sprite-vs", "kaleidoscope4-fs");
const progBubble = createProgram("sprite-vs", "bubble-fs");
const progTimewarp = createProgram("sprite-vs", "timewarp-fs");

const kaleidoProgs = [progKaleido1, progKaleido2, progKaleido3, progKaleido4];
function getUniLoc(prog, name) { return gl.getUniformLocation(prog, name); }

function drawSprite(prog, tex, x, y, w, h, time, effectsOn) {
    gl.useProgram(prog);
    gl.uniform2f(getUniLoc(prog, "uScreenSize"), W, H);
    gl.uniform4f(getUniLoc(prog, "uSpriteRect"), x, y, w, h);
    gl.uniform2f(getUniLoc(prog, "uResolution"), W, H);
    const tLoc = getUniLoc(prog, "uTime");
    if (tLoc) gl.uniform1f(tLoc, time);
    const eLoc = getUniLoc(prog, "uEffectsOn");
    if (eLoc) gl.uniform1f(eLoc, effectsOn ? 1.0 : 0.0);
    const pLoc = getUniLoc(prog, "uParams");
    if (pLoc) gl.uniform4f(pLoc, time, 1.0, 0.8, 1.2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(getUniLoc(prog, "uTexture"), 0);
    gl.bindVertexArray(quadVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
const textCanvas = document.createElement("canvas");
textCanvas.width = W; textCanvas.height = H;
textCanvas.style.position = "absolute";
textCanvas.style.top = canvas.offsetTop + "px";
textCanvas.style.left = canvas.offsetLeft + "px";
textCanvas.style.pointerEvents = "none";
document.body.appendChild(textCanvas);
const textCtx = textCanvas.getContext("2d");
let fontSize = 20;

function updateTextCanvas() {
    textCanvas.width = W; textCanvas.height = H;
    const rect = canvas.getBoundingClientRect();
    textCanvas.style.width = rect.width + "px";
    textCanvas.style.height = rect.height + "px";
    textCanvas.style.position = "absolute";
    textCanvas.style.top = rect.top + "px";
    textCanvas.style.left = rect.left + "px";
    fontSize = Math.max(16, Math.min(128, Math.floor(20 * (H / 720))));
}

function clearText() { textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height); }

function drawText(text, x, y, color = "#fff") {
    textCtx.font = `bold ${fontSize}px monospace`;
    textCtx.fillStyle = color;
    textCtx.fillText(text, x, y + fontSize);
}

function measureText(text) {
    textCtx.font = `bold ${fontSize}px monospace`;
    return textCtx.measureText(text).width;
}

function centerX(text) { return W / 2 - measureText(text) / 2; }
function scaleYf(baseY) { return Math.floor(baseY * (H / 720)); }
function getMenuSpacing() { return Math.floor(40 * (H / 720)); }
const game = {
    score: 0, lines: 0, speed: 20, lineamt: 0,
    newgame() { this.score = 0; this.lines = 0; this.speed = 20; this.lineamt = 0; },
    addline() {
        this.lines++; this.score += 6; this.lineamt++;
        if (this.lineamt >= 10) { this.lineamt = 0; this.speed = Math.max(5, this.speed - 4); }
    }
};

function randColor() {
    let c1 = 1 + Math.floor(Math.random() * 9);
    let c2 = 1 + Math.floor(Math.random() * 9);
    let c3 = 1 + Math.floor(Math.random() * 9);
    if (c1 === c2 && c1 === c3) return randColor();
    return { c1, c2, c3 };
}

function shiftColor(color, dir) {
    const { c1, c2, c3 } = color;
    if (dir) return { c1: c3, c2: c1, c3: c2 };
    return { c1: c2, c2: c3, c3: c1 };
}

const grid = Array.from({length: GRID_WIDTH}, () => new Int32Array(GRID_HEIGHT));
let block = { color: randColor(), x: GRID_WIDTH >> 1, y: 1, horizontal: false };
let nextBlock = { color: randColor() };
let currentScreen = SCREEN_INTRO;
let lastTick = performance.now();
let cursorPos = 0;
let paused = false;
let optionsCursor = 0;
let difficultySetting = 1;
let shaderEffectsEnabled = true;
let enteringName = false;
let playerName = "";
let finalScore = 0;
let matchBonus = 0;
let flashActive = false;
let flashStartTime = 0;
const flashGrid = Array.from({length: GRID_WIDTH}, () => new Uint8Array(GRID_HEIGHT));
let shaderLevel = 0;
let lastMoveTime = 0;
let highScores = [];
function loadScores() {
    try {
        const data = localStorage.getItem("jsDropScores");
        if (data) { highScores = JSON.parse(data); }
        else initScores();
    } catch { initScores(); }
}
function initScores() {
    highScores = [];
    for (let i = 0; i < 10; i++) highScores.push({ name: "Anonymous", score: (10-i)*100 });
}
function saveScores() {
    try { localStorage.setItem("jsDropScores", JSON.stringify(highScores)); } catch {}
}
function addScore(name, score) {
    highScores.push({ name, score });
    highScores.sort((a, b) => b.score - a.score);
    if (highScores.length > 10) highScores.length = 10;
    saveScores();
}
function qualifiesForHighScore(score) {
    if (highScores.length < 10) return true;
    return score > highScores[highScores.length - 1].score;
}
loadScores();
function initMatrix() {
    for (let i = 0; i < GRID_WIDTH; i++) grid[i].fill(0);
    game.newgame();
    block.color = randColor();
    nextBlock.color = randColor();
    block.x = GRID_WIDTH >> 1;
    block.y = 1;
    block.horizontal = false;
}

function canMoveDown() {
    const { x: bx, y: by, horizontal } = block;
    if (horizontal) {
        if (by + 1 >= GRID_HEIGHT) return false;
        for (let i = 0; i < 3; i++)
            if (bx+i >= 0 && bx+i < GRID_WIDTH && grid[bx+i][by+1] > 0) return false;
    } else {
        if (by + 3 >= GRID_HEIGHT) return false;
        if (grid[bx][by+3] > 0) return false;
    }
    return true;
}

function canMoveLeft() {
    if (block.x <= 0) return false;
    const bx = block.x - 1, by = block.y;
    if (block.horizontal) {
        if (by >= 0 && by < GRID_HEIGHT && grid[bx][by] > 0) return false;
    } else {
        for (let dy = 0; dy < 3; dy++)
            if (by+dy >= 0 && by+dy < GRID_HEIGHT && grid[bx][by+dy] > 0) return false;
    }
    return true;
}

function canMoveRight() {
    const by = block.y;
    if (block.horizontal) {
        if (block.x + 3 >= GRID_WIDTH) return false;
        const bx = block.x + 3;
        if (by >= 0 && by < GRID_HEIGHT && grid[bx][by] > 0) return false;
    } else {
        if (block.x >= GRID_WIDTH - 1) return false;
        const bx = block.x + 1;
        for (let dy = 0; dy < 3; dy++)
            if (by+dy >= 0 && by+dy < GRID_HEIGHT && grid[bx][by+dy] > 0) return false;
    }
    return true;
}

function placeBlock() {
    const { x: bx, y: by, color, horizontal } = block;
    if (horizontal) {
        if (by >= 0 && by < GRID_HEIGHT) {
            if (bx >= 0 && bx < GRID_WIDTH) grid[bx][by] = color.c1;
            if (bx+1 >= 0 && bx+1 < GRID_WIDTH) grid[bx+1][by] = color.c2;
            if (bx+2 >= 0 && bx+2 < GRID_WIDTH) grid[bx+2][by] = color.c3;
        }
    } else {
        if (by >= 0 && by < GRID_HEIGHT) grid[bx][by] = color.c1;
        if (by+1 >= 0 && by+1 < GRID_HEIGHT) grid[bx][by+1] = color.c2;
        if (by+2 >= 0 && by+2 < GRID_HEIGHT) grid[bx][by+2] = color.c3;
    }
}

function findMatches() {
    for (let i = 0; i < GRID_WIDTH; i++) flashGrid[i].fill(0);
    let found = false;
    matchBonus = 0;
    for (let j = 0; j < GRID_HEIGHT; j++) {
        for (let i = 0; i < GRID_WIDTH; i++) {
            if (grid[i][j] > 0) {
                const c = grid[i][j]; let count = 1;
                while (i+count < GRID_WIDTH && grid[i+count][j] === c) count++;
                if (count >= 3) {
                    for (let k = 0; k < count; k++) flashGrid[i+k][j] = 1;
                    found = true;
                    if (count === 4) matchBonus += 25;
                    else if (count >= 5) matchBonus += 50;
                }
            }
        }
    }
    for (let i = 0; i < GRID_WIDTH; i++) {
        for (let j = 0; j < GRID_HEIGHT; j++) {
            if (grid[i][j] > 0) {
                const c = grid[i][j]; let count = 1;
                while (j+count < GRID_HEIGHT && grid[i][j+count] === c) count++;
                if (count >= 3) {
                    for (let k = 0; k < count; k++) flashGrid[i][j+k] = 1;
                    found = true;
                    if (count === 4) matchBonus += 25;
                    else if (count >= 5) matchBonus += 50;
                }
            }
        }
    }
    for (let i = 0; i < GRID_WIDTH; i++) {
        for (let j = 0; j < GRID_HEIGHT; j++) {
            if (grid[i][j] > 0) {
                const c = grid[i][j]; let count = 1;
                while (i+count < GRID_WIDTH && j+count < GRID_HEIGHT && grid[i+count][j+count] === c) count++;
                if (count >= 3) {
                    for (let k = 0; k < count; k++) flashGrid[i+k][j+k] = 1;
                    found = true;
                    if (count === 4) matchBonus += 35;
                    else if (count >= 5) matchBonus += 75;
                }
            }
        }
    }
    for (let i = 0; i < GRID_WIDTH; i++) {
        for (let j = 0; j < GRID_HEIGHT; j++) {
            if (grid[i][j] > 0) {
                const c = grid[i][j]; let count = 1;
                while (i-count >= 0 && j+count < GRID_HEIGHT && grid[i-count][j+count] === c) count++;
                if (count >= 3) {
                    for (let k = 0; k < count; k++) flashGrid[i-k][j+k] = 1;
                    found = true;
                    if (count === 4) matchBonus += 35;
                    else if (count >= 5) matchBonus += 75;
                }
            }
        }
    }
    return found;
}

function clearFlashedBlocks() {
    for (let i = 0; i < GRID_WIDTH; i++)
        for (let j = 0; j < GRID_HEIGHT; j++)
            if (flashGrid[i][j]) { grid[i][j] = 0; game.addline(); }
    game.score += matchBonus; matchBonus = 0;
    const newLevel = Math.min(SHADER_LEVEL_COUNT - 1, Math.floor(game.lines / SHADER_LEVEL_LINES));
    if (newLevel !== shaderLevel) shaderLevel = newLevel;
    for (let i = 0; i < GRID_WIDTH; i++) flashGrid[i].fill(0);
    spawnNewBlock();
    if (checkGameOver()) currentScreen = SCREEN_GAMEOVER;
}

function applyGravity() {
    let moved;
    do {
        moved = false;
        for (let i = 0; i < GRID_WIDTH; i++)
            for (let j = GRID_HEIGHT - 2; j >= 0; j--)
                if (grid[i][j] > 0 && grid[i][j+1] === 0) {
                    grid[i][j+1] = grid[i][j]; grid[i][j] = 0; moved = true;
                }
    } while (moved);
}

function spawnNewBlock() {
    block.color = nextBlock.color;
    nextBlock.color = randColor();
    block.x = GRID_WIDTH >> 1;
    block.y = 1;
    block.horizontal = false;
}

function checkGameOver() {
    for (let i = 0; i < GRID_WIDTH; i++) if (grid[i][1] > 0) return true;
    let full = true;
    for (let i = 0; i < GRID_WIDTH; i++)
        for (let j = 0; j < GRID_HEIGHT; j++)
            if (grid[i][j] === 0) full = false;
    return full;
}

function canRotate() {
    const { x: bx, y: by, horizontal } = block;
    if (horizontal) {
        if (by + 2 >= GRID_HEIGHT) return false;
        if (by+1 < GRID_HEIGHT && grid[bx][by+1] > 0) return false;
        if (by+2 < GRID_HEIGHT && grid[bx][by+2] > 0) return false;
    } else {
        if (bx + 2 >= GRID_WIDTH) return false;
        if (bx+1 < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT && grid[bx+1][by] > 0) return false;
        if (bx+2 < GRID_WIDTH && by >= 0 && by < GRID_HEIGHT && grid[bx+2][by] > 0) return false;
    }
    return true;
}

function applyDifficulty() {
    const baseSpeeds = [30, 20, 10];
    game.speed = baseSpeeds[difficultySetting];
}
function drawBackground(prog, tex, time) {
    drawSprite(prog, tex, 0, 0, W, H, time, shaderEffectsEnabled);
}

function drawBlockTile(blockType, x, y, w, h) {
    if (blockType > 0 && blockType < BLOCK_COUNT) {
        drawSprite(progPassthrough, blockTextures[blockType], x, y, w, h, 0, false);
    }
}

function drawMatrix() {
    const scX = W / 1280, scY = H / 720;
    const now = performance.now();
    const showFlash = flashActive && (Math.floor((now - flashStartTime) / 50) % 2 === 0);

    for (let i = 0; i < GRID_WIDTH; i++) {
        for (let j = 0; j < GRID_HEIGHT; j++) {
            const bt = grid[i][j];
            if (bt > 0 && bt < BLOCK_COUNT) {
                if (flashActive && flashGrid[i][j] && !showFlash) continue;
                const x = STARTX + i * (BLOCK_SIZE + BLOCK_SPACING);
                const y = STARTY + j * (BLOCK_HEIGHT + BLOCK_SPACING) + 10;
                drawBlockTile(bt, Math.floor(x * scX), Math.floor(y * scY) + 10,
                    Math.floor(BLOCK_SIZE * scX), Math.floor(BLOCK_HEIGHT * scY));
            }
        }
    }
}

function drawBlockPiece() {
    const scX = W / 1280, scY = H / 720;
    const { c1, c2, c3 } = block.color;
    if (block.horizontal) {
        const screenY = STARTY + block.y * (BLOCK_HEIGHT + BLOCK_SPACING) + 10;
        for (let i = 0; i < 3; i++) {
            const color = i === 0 ? c1 : i === 1 ? c2 : c3;
            const bx = STARTX + (block.x + i) * (BLOCK_SIZE + BLOCK_SPACING);
            if (block.x + i >= 0 && block.x + i < GRID_WIDTH && color > 0 && color < BLOCK_COUNT) {
                drawBlockTile(color, Math.floor(bx * scX), Math.floor(screenY * scY),
                    Math.floor(BLOCK_SIZE * scX), Math.floor(BLOCK_HEIGHT * scY));
            }
        }
    } else {
        const bx = STARTX + block.x * (BLOCK_SIZE + BLOCK_SPACING);
        for (let i = 0; i < 3; i++) {
            const color = i === 0 ? c1 : i === 1 ? c2 : c3;
            const y = block.y + i;
            if (y >= 0 && color > 0 && color < BLOCK_COUNT) {
                const screenY = STARTY + y * (BLOCK_HEIGHT + BLOCK_SPACING) + 10;
                drawBlockTile(color, Math.floor(bx * scX), Math.floor(screenY * scY),
                    Math.floor(BLOCK_SIZE * scX), Math.floor(BLOCK_HEIGHT * scY));
            }
        }
    }
}

function drawNext() {
    const scX = W / 1280, scY = H / 720;
    const bx = NEXT_PANEL_X + 70, by = NEXT_PANEL_Y + 15;
    const { c1, c2, c3 } = nextBlock.color;
    if (c1 > 0 && c1 < BLOCK_COUNT)
        drawBlockTile(c1, Math.floor(bx*scX), Math.floor(by*scY), Math.floor(BLOCK_SIZE*scX), Math.floor(BLOCK_HEIGHT*scY));
    if (c2 > 0 && c2 < BLOCK_COUNT)
        drawBlockTile(c2, Math.floor(bx*scX), Math.floor((by+BLOCK_HEIGHT+BLOCK_SPACING)*scY), Math.floor(BLOCK_SIZE*scX), Math.floor(BLOCK_HEIGHT*scY));
    if (c3 > 0 && c3 < BLOCK_COUNT)
        drawBlockTile(c3, Math.floor(bx*scX), Math.floor((by+(BLOCK_HEIGHT+BLOCK_SPACING)*2)*scY), Math.floor(BLOCK_SIZE*scX), Math.floor(BLOCK_HEIGHT*scY));
}
function updateIntro(time) {
    drawBackground(progBubble, introTex, time);
    const title = "LIQUID JAVASCRIPT DROP";
    drawText(title, centerX(title), scaleYf(200), "#ff00ff");
    const sub = "Press ENTER to Start";
    drawText(sub, centerX(sub), scaleYf(280), "#ffff00");

    if (performance.now() - lastTick > 5000) {
        currentScreen = SCREEN_START;
        lastTick = performance.now();
    }
}

function updateStart(time) {
    const prog = shaderEffectsEnabled ? (kaleidoProgs[0] || progPassthrough) : progPassthrough;
    drawBackground(prog, universeTex, time);
    const title = "Liquid JavaScript Drop";
    drawText(title, centerX(title), scaleYf(100), "#ffff00");
    const items = ["New Game", "High Scores", "Options", "Credits"];
    const startY = scaleYf(180), spacing = getMenuSpacing();
    for (let i = 0; i < items.length; i++) {
        const col = i === cursorPos ? "#ffff00" : "#ffffff";
        drawText(items[i], centerX(items[i]), startY + i * spacing, col);
    }
    drawText(">>", centerX(items[cursorPos]) - scaleYf(30), startY + cursorPos * spacing, "#ffff00");
}

function updateGame(time) {
    if (!paused) logic();
    const prog = shaderEffectsEnabled ? (kaleidoProgs[shaderLevel] || progPassthrough) : progPassthrough;
    drawBackground(prog, gameBgTex, time);
    drawMatrix();
    drawBlockPiece();
    drawNext();
    const scX = W / 1280, scY = H / 720;
    drawText("Score:" + game.score, Math.floor(400*scX), Math.floor(120*scY) - fontSize - Math.floor(fontSize/4), "#ffffff");
    drawText("Tabs:" + game.lines, Math.floor(620*scX), Math.floor(120*scY) - fontSize - Math.floor(fontSize/4), "#ffffff");
    if (paused) {
        const pt = "PAUSED - Press P to Continue";
        drawText(pt, centerX(pt), H/2, "#ffff00");
    }
}

function updateGameOver(time) {
    const prog = shaderEffectsEnabled ? (kaleidoProgs[shaderLevel] || progPassthrough) : progPassthrough;
    drawBackground(prog, gameBgTex, time);
    const go = "GAME OVER!";
    drawText(go, centerX(go), H/2 - 80, "#ff0000");
    const sc = "Final Score: " + game.score;
    drawText(sc, centerX(sc), H/2 - 20, "#ffffff");
    const ln = "Tabs: " + game.lines;
    drawText(ln, centerX(ln), H/2 + 40, "#ffffff");
    const rt = "Press ENTER to view High Scores";
    drawText(rt, centerX(rt), H/2 + 120, "#ffff00");
}

function updateOptions(time) {
    const prog = shaderEffectsEnabled ? (kaleidoProgs[0] || progPassthrough) : progPassthrough;
    drawBackground(prog, universeTex, time);
    drawText("OPTIONS", centerX("OPTIONS"), scaleYf(100), "#ffff00");
    const startY = scaleYf(180), spacing = getMenuSpacing();
    const diffLabels = ["Easy", "Normal", "Hard"];
    const diffText = "< Difficulty: " + diffLabels[difficultySetting] + " >";
    const fxText = "< Shader Effects: " + (shaderEffectsEnabled ? "On" : "Off") + " >";
    const backText = "Back";
    const optTexts = [diffText, fxText, backText];
    for (let i = 0; i < 3; i++) {
        const col = i === optionsCursor ? "#ffff00" : "#ffffff";
        drawText(optTexts[i], centerX(optTexts[i]), startY + i * spacing, col);
        if (i === optionsCursor)
            drawText(">>", centerX(optTexts[i]) - scaleYf(30), startY + i * spacing, "#ffff00");
    }
    const instr = "UP/DOWN: Select  LEFT/RIGHT: Change  ENTER: Confirm";
    drawText(instr, centerX(instr), scaleYf(350), "#c8c8c8");
}

function updateCredits(time) {
    const prog = shaderEffectsEnabled ? progTimewarp : progPassthrough;
    drawBackground(prog, logoTex, time);
    const rt = "Press Return to return";
    drawText(rt, centerX(rt), scaleYf(360), "#ffff00");
}

function updateScores(time) {
    const prog = shaderEffectsEnabled ? progTimewarp : progPassthrough;
    drawBackground(prog, scoresBgTex, time);
    const titleY = scaleYf(40), listStartY = scaleYf(90), lineHeight = scaleYf(32);
    drawText("HIGH SCORES", centerX("HIGH SCORES"), titleY, "#ffff00");
    for (let i = 0; i < Math.min(highScores.length, 10); i++) {
        const s = highScores[i];
        const txt = (i+1) + ". " + s.name + "  " + s.score;
        let color = "#ff0096";
        if (enteringName && finalScore > 0) {
            let rank = 0;
            for (let j = 0; j < highScores.length; j++) {
                if (finalScore > highScores[j].score) { rank = j; break; }
                rank = j + 1;
            }
            if (i === rank) color = "#00ff00";
        }
        drawText(txt, scaleYf(100), listStartY + i * lineHeight, color);
    }
    if (enteringName) {
        const entryY = scaleYf(420);
        const ys = "Your Score: " + finalScore;
        drawText(ys, centerX(ys), entryY - lineHeight * 2, "#ffff00");
        const prompt = "Enter your name:";
        drawText(prompt, centerX(prompt), entryY - lineHeight, "#ffffff");
        const dn = playerName + "_";
        drawText(dn, centerX(dn), entryY, "#00ffff");
        const instr = "Tap here or type name, ENTER to confirm";
        drawText(instr, centerX(instr), entryY + lineHeight, "#c80096");
        const mobileInput = document.getElementById('mobileNameInput');
        if (mobileInput && document.activeElement !== mobileInput) {
            mobileInput.value = playerName;
            mobileInput.focus({ preventScroll: true });
        }
    } else {
        const rt = "Press ENTER to return to menu";
        drawText(rt, centerX(rt), scaleYf(440), "#ff0000");
    }
}
function logic() {
    const now = performance.now();
    if (flashActive) {
        if (now - flashStartTime >= FLASH_DURATION) {
            clearFlashedBlocks();
            flashActive = false;
            applyGravity();
            if (findMatches()) startFlash();
        }
        return;
    }
    if (now - lastMoveTime > game.speed * 50) {
        lastMoveTime = now;
        if (canMoveDown()) {
            block.y++;
        } else {
            placeBlock();
            applyGravity();
            if (findMatches()) {
                startFlash();
            } else {
                spawnNewBlock();
                if (checkGameOver()) currentScreen = SCREEN_GAMEOVER;
            }
        }
    }
}

function startFlash() {
    flashActive = true;
    flashStartTime = performance.now();
}

function goToScoresScreen() {
    finalScore = game.score;
    playerName = "";
    enteringName = qualifiesForHighScore(finalScore);
    currentScreen = SCREEN_SCORES;
    const mobileInput = document.getElementById('mobileNameInput');
    if (mobileInput) {
        mobileInput.value = "";
        if (enteringName) {
            setTimeout(() => mobileInput.focus({ preventScroll: true }), 100);
        }
    }
}
document.addEventListener("keydown", (e) => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","Enter","Escape","Backspace"].includes(e.code)) {
        e.preventDefault();
    }

    switch (currentScreen) {
    case SCREEN_INTRO:
        if (e.code === "Enter") { currentScreen = SCREEN_START; lastTick = performance.now(); }
        break;
    case SCREEN_START:
        if (e.code === "ArrowUp") cursorPos = (cursorPos - 1 + 4) % 4;
        else if (e.code === "ArrowDown") cursorPos = (cursorPos + 1) % 4;
        else if (e.code === "Enter") {
            if (cursorPos === 0) {
                initMatrix(); shaderLevel = 0; applyDifficulty();
                block.x = GRID_WIDTH >> 1; block.y = 1; block.horizontal = false;
                currentScreen = SCREEN_GAME; lastMoveTime = performance.now();
            } else if (cursorPos === 1) { finalScore = 0; enteringName = false; currentScreen = SCREEN_SCORES; }
            else if (cursorPos === 2) currentScreen = SCREEN_OPTIONS;
            else if (cursorPos === 3) currentScreen = SCREEN_CREDITS;
        } else if (e.code === "Escape") {  }
        break;
    case SCREEN_GAME:
        if (e.code === "ArrowLeft") { if (canMoveLeft()) block.x--; }
        else if (e.code === "ArrowRight") { if (canMoveRight()) block.x++; }
        else if (e.code === "ArrowDown") { if (canMoveDown()) block.y++; }
        else if (e.code === "ArrowUp") block.color = shiftColor(block.color, true);
        else if (e.code === "Space") { if (canRotate()) block.horizontal = !block.horizontal; }
        else if (e.code === "KeyZ") block.color = shiftColor(block.color, false);
        else if (e.code === "KeyP") paused = !paused;
        else if (e.code === "KeyD") { while (canMoveDown()) block.y++; }
        else if (e.code === "Escape") currentScreen = SCREEN_START;
        break;
    case SCREEN_GAMEOVER:
        if (e.code === "Enter") goToScoresScreen();
        else if (e.code === "Escape") currentScreen = SCREEN_START;
        break;
    case SCREEN_OPTIONS:
        if (e.code === "ArrowUp") optionsCursor = (optionsCursor - 1 + 3) % 3;
        else if (e.code === "ArrowDown") optionsCursor = (optionsCursor + 1) % 3;
        else if (e.code === "ArrowLeft") {
            if (optionsCursor === 0) difficultySetting = (difficultySetting - 1 + 3) % 3;
            else if (optionsCursor === 1) shaderEffectsEnabled = !shaderEffectsEnabled;
        } else if (e.code === "ArrowRight") {
            if (optionsCursor === 0) difficultySetting = (difficultySetting + 1) % 3;
            else if (optionsCursor === 1) shaderEffectsEnabled = !shaderEffectsEnabled;
        } else if (e.code === "Enter") {
            if (optionsCursor === 2) currentScreen = SCREEN_START;
        }
        break;
    case SCREEN_CREDITS:
        if (e.code === "Enter") currentScreen = SCREEN_START;
        break;
    case SCREEN_SCORES:
        if (enteringName) {
            if (e.code === "Enter" && playerName.length > 0) {
                addScore(playerName, finalScore);
                enteringName = false;
                const mi = document.getElementById('mobileNameInput');
                if (mi) { mi.blur(); mi.value = ''; }
            } else if (e.code === "Backspace" && playerName.length > 0) {
                playerName = playerName.slice(0, -1);
                const mi = document.getElementById('mobileNameInput');
                if (mi) mi.value = playerName;
            } else if (e.code === "Escape") {
                enteringName = false;
                const mi = document.getElementById('mobileNameInput');
                if (mi) { mi.blur(); mi.value = ''; }
            } else if (e.key.length === 1 && playerName.length < 15) {
                if (document.activeElement !== document.getElementById('mobileNameInput')) {
                    playerName += e.key;
                }
            }
        } else {
            if (e.code === "Enter" || e.code === "Escape") currentScreen = SCREEN_START;
        }
        break;
    }
});
(function setupMobileInput() {
    const mobileInput = document.getElementById('mobileNameInput');
    if (!mobileInput) return;
    mobileInput.addEventListener('input', () => {
        if (enteringName) {
            playerName = mobileInput.value.slice(0, 15);
        }
    });
    mobileInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && enteringName && playerName.length > 0) {
            e.preventDefault();
            addScore(playerName, finalScore);
            enteringName = false;
            mobileInput.blur();
            mobileInput.value = '';
        }
    });
    document.getElementById('gameCanvas').addEventListener('click', () => {
        if (enteringName) {
            mobileInput.value = playerName;
            mobileInput.focus({ preventScroll: true });
        }
    });
})();
function frame(timestamp) {
    resizeCanvas();
    updateTextCanvas();
    clearText();

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const time = timestamp / 1000.0;

    switch (currentScreen) {
        case SCREEN_INTRO:    updateIntro(time); break;
        case SCREEN_START:    updateStart(time); break;
        case SCREEN_GAME:     updateGame(time); break;
        case SCREEN_GAMEOVER: updateGameOver(time); break;
        case SCREEN_OPTIONS:  updateOptions(time); break;
        case SCREEN_CREDITS:  updateCredits(time); break;
        case SCREEN_SCORES:   updateScores(time); break;
    }

    requestAnimationFrame(frame);
}

lastTick = performance.now();
requestAnimationFrame(frame);
const touchControls = document.getElementById("touchControls");
const touchMenuBar  = document.getElementById("touchMenuBar");
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function updateTouchUI() {
    const inGame = currentScreen === SCREEN_GAME;
    const inMenu = [SCREEN_START, SCREEN_OPTIONS, SCREEN_SCORES, SCREEN_GAMEOVER, SCREEN_CREDITS, SCREEN_INTRO].includes(currentScreen);
    touchControls.style.display = inGame ? "block" : "none";
    touchMenuBar.style.display  = inMenu ? "block" : "none";
    const actionBtn = document.getElementById("btnMenuAction");
    const upBtn = document.getElementById("btnMenuUp");
    const downBtn = document.getElementById("btnMenuDown");
    if (currentScreen === SCREEN_OPTIONS) {
        actionBtn.textContent = "OK";
        upBtn.style.display = "inline-block";
        downBtn.style.display = "inline-block";
    } else if (currentScreen === SCREEN_START) {
        actionBtn.textContent = "Select";
        upBtn.style.display = "inline-block";
        downBtn.style.display = "inline-block";
    } else {
        actionBtn.textContent = "Continue";
        upBtn.style.display = "none";
        downBtn.style.display = "none";
    }
}
document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
function fireKey(code, key) {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true }));
}

const TOUCH_TIMING = {
    syntheticMouseGuardMs: 700,
    holdDelayMs: 350,
    leftRightRepeatMs: 120,
    downRepeatMs: 80,
};

let lastTouchTime = 0;

function isSyntheticMouse() {
    return performance.now() - lastTouchTime < TOUCH_TIMING.syntheticMouseGuardMs;
}

function bindHold(btnId, code, key, repeatMs, holdDelayMs = TOUCH_TIMING.holdDelayMs) {
    const btn = document.getElementById(btnId);
    let interval = null;
    let holdTimeout = null;
    let pressed = false;
    let repeated = false;

    function start(e) {
        e.preventDefault();
        if (e.type.startsWith("touch")) lastTouchTime = performance.now();
        if (e.type.startsWith("mouse") && isSyntheticMouse()) return;
        if (pressed) return;
        pressed = true;
        repeated = false;

        if (repeatMs) {
            clearTimeout(holdTimeout);
            holdTimeout = setTimeout(() => {
                if (!pressed) return;
                repeated = true;
                fireKey(code, key);
                clearInterval(interval);
                interval = setInterval(() => fireKey(code, key), repeatMs);
            }, holdDelayMs);
        }
    }

    function stop(e) {
        e.preventDefault();
        if (e.type.startsWith("touch")) lastTouchTime = performance.now();
        if (e.type.startsWith("mouse") && isSyntheticMouse()) return;
        if (!pressed) return;

        pressed = false;
        clearTimeout(holdTimeout);
        holdTimeout = null;
        clearInterval(interval);
        interval = null;

        if (!repeated) {
            fireKey(code, key);
        }
    }

    btn.addEventListener("touchstart", start, { passive: false });
    btn.addEventListener("touchend", stop, { passive: false });
    btn.addEventListener("touchcancel", stop, { passive: false });
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", stop);
    btn.addEventListener("mouseleave", stop);
}
bindHold("btnLeft",  "ArrowLeft",  "ArrowLeft",  TOUCH_TIMING.leftRightRepeatMs);
bindHold("btnRight", "ArrowRight", "ArrowRight", TOUCH_TIMING.leftRightRepeatMs);
bindHold("btnDown",  "ArrowDown",  "ArrowDown",  TOUCH_TIMING.downRepeatMs);
function bindTap(btnId, code, key) {
    const btn = document.getElementById(btnId);

    function handler(e) {
        e.preventDefault();
        if (e.type.startsWith("touch")) lastTouchTime = performance.now();
        if (e.type.startsWith("mouse") && isSyntheticMouse()) return;
        fireKey(code, key);
    }

    btn.addEventListener("touchend", handler, { passive: false });
    btn.addEventListener("mouseup", handler);
}
bindTap("btnRotate",  "Space",    " ");
bindTap("btnShiftUp", "ArrowUp",  "ArrowUp");
bindTap("btnDrop",    "KeyD",     "d");
bindTap("btnMenuAction", "Enter",     "Enter");
bindTap("btnMenuUp",     "ArrowUp",   "ArrowUp");
bindTap("btnMenuDown",   "ArrowDown", "ArrowDown");
canvas.addEventListener("click", () => {
    if (currentScreen === SCREEN_INTRO) {
        currentScreen = SCREEN_START; lastTick = performance.now();
    }
});
(function addOptionsTouchButtons() {
    const bar = touchMenuBar;
    const leftBtn = document.createElement("button");
    leftBtn.id = "btnMenuLeft"; leftBtn.textContent = "\u25C0";
    leftBtn.tabIndex = -1;
    leftBtn.style.display = "none";
    const rightBtn = document.createElement("button");
    rightBtn.id = "btnMenuRight"; rightBtn.textContent = "\u25B6";
    rightBtn.tabIndex = -1;
    rightBtn.style.display = "none";
    bar.appendChild(leftBtn);
    bar.appendChild(rightBtn);
    bindTap("btnMenuLeft",  "ArrowLeft",  "ArrowLeft");
    bindTap("btnMenuRight", "ArrowRight", "ArrowRight");
})();
const _origUpdateTouchUI = updateTouchUI;
const realUpdateTouchUI = function() {
    _origUpdateTouchUI();
    const leftBtn = document.getElementById("btnMenuLeft");
    const rightBtn = document.getElementById("btnMenuRight");
    if (leftBtn && rightBtn) {
        const show = currentScreen === SCREEN_OPTIONS;
        leftBtn.style.display = show ? "inline-block" : "none";
        rightBtn.style.display = show ? "inline-block" : "none";
    }
};
let touchHidden = false;
const btnToggle = document.getElementById("btnToggleTouch");
function handleToggleTouch(e) {
    e.preventDefault();
    if (e.type.startsWith("touch")) lastTouchTime = performance.now();
    if (e.type.startsWith("mouse") && isSyntheticMouse()) return;
    touchHidden = !touchHidden;
    btnToggle.textContent = touchHidden ? "Show Touch" : "Hide Touch";
}
btnToggle.addEventListener("touchend", handleToggleTouch, { passive: false });
btnToggle.addEventListener("mouseup", handleToggleTouch);
const _origFrame = frame;
frame = function(timestamp) {
    if (touchHidden) {
        touchControls.style.display = "none";
        touchMenuBar.style.display = "none";
        if (!document.getElementById('touchToggleFloat')) {
            const floatBtn = document.createElement('button');
            floatBtn.id = 'touchToggleFloat';
            floatBtn.tabIndex = -1;
            floatBtn.textContent = '\u261B';
            floatBtn.title = 'Show Touch Controls';
            floatBtn.style.cssText = 'position:fixed;top:4px;right:4px;z-index:200;font-size:22px;width:36px;height:36px;border:1px solid rgba(255,255,255,0.25);border-radius:50%;background:rgba(60,0,120,0.4);color:#ff0;font-weight:bold;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;opacity:0.5;display:flex;align-items:center;justify-content:center;padding:0;';
            function showAgain(ev) {
                ev.preventDefault();
                if (ev.type.startsWith("touch")) lastTouchTime = performance.now();
                if (ev.type.startsWith("mouse") && isSyntheticMouse()) return;
                touchHidden = false;
                btnToggle.textContent = 'Hide Touch';
                floatBtn.remove();
            }
            floatBtn.addEventListener('touchend', showAgain, { passive: false });
            floatBtn.addEventListener('mouseup', showAgain);
            document.body.appendChild(floatBtn);
        }
    } else {
        const floatBtn = document.getElementById('touchToggleFloat');
        if (floatBtn) floatBtn.remove();
        realUpdateTouchUI();
    }
    _origFrame(timestamp);
};
requestAnimationFrame(frame);
