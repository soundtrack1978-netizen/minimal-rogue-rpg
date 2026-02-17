const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const logElement = document.getElementById('log');
const hpElement = document.getElementById('hp');
const lvElement = document.getElementById('lv');
const staminaElement = document.getElementById('stamina');
const floorElement = document.getElementById('floor');

// 設定
const TILE_SIZE = 20;
const ROWS = 25;
const COLS = 40;
canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

const SYMBOLS = {
    WALL: '█',
    FLOOR: '·',
    PLAYER: '@',
    ENEMY: 'E',
    STAIRS: '>',
    SAVE: 'S',
    KEY: 'k',
    DOOR: '田'
};

// サウンドシステム
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type, duration, vol = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playMelody(notes) {
    let time = audioCtx.currentTime;
    notes.forEach(note => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, time);
        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + note.d);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + note.d);
        time += note.d;
    });
}

const SOUNDS = {
    HIT: () => playSound(600, 'square', 0.1),
    DAMAGE: () => playSound(150, 'sawtooth', 0.2),
    DEFEAT: () => {
        playSound(400, 'square', 0.3);
        setTimeout(() => playSound(200, 'square', 0.2), 50);
    },
    LEVEL_UP: () => {
        playMelody([{ f: 523.25, d: 0.1 }, { f: 659.25, d: 0.1 }, { f: 783.99, d: 0.1 }, { f: 1046.50, d: 0.3 }]);
    },
    DESCEND: () => {
        playSound(200, 'sawtooth', 0.5, 0.2);
        playSound(100, 'sawtooth', 0.5, 0.2);
    },
    SAVE: () => {
        playMelody([{ f: 440.00, d: 0.15 }, { f: 554.37, d: 0.15 }, { f: 659.25, d: 0.3 }]);
    },
    SELECT: () => playSound(800, 'square', 0.05, 0.05),
    GET_ITEM: () => playMelody([{ f: 880, d: 0.1 }, { f: 1760, d: 0.1 }]),
    UNLOCK: () => playSound(300, 'square', 0.4),
    SNAKE_MOVE: () => playSound(100, 'sine', 0.1, 0.05),
    GOLD_FLIGHT: () => playSound(900, 'sine', 0.05, 0.05) // 金色敵の逃走音
};

// ゲーム状態
let gameState = 'TITLE';
let titleSelection = 0;
let map = [];
let player = {
    x: 0, y: 0, hp: 20, maxHp: 20, level: 1, exp: 0, nextExp: 10,
    stamina: 100,
    hasKey: false,
    flashUntil: 0, offsetX: 0, offsetY: 0,
    totalKills: 0
};
let enemies = [];
let floorLevel = 1;
let damageTexts = [];
let attackLines = [];
let isProcessing = false;
let turnCount = 0;

let transition = { active: false, text: "", alpha: 0 };

function loadGame() {
    const saved = localStorage.getItem('minimal_rogue_save');
    if (saved) {
        const data = JSON.parse(saved);
        player.level = data.level || 1;
        player.maxHp = 10 + (player.level * 10);
        player.hp = player.maxHp;
        player.exp = data.exp || 0;
        player.nextExp = player.level * 10;
        player.stamina = 100;
        player.hasKey = false;
        player.totalKills = data.totalKills || 0;
        floorLevel = data.floorLevel || 1;
        updateUI();
        return true;
    }
    return false;
}

function saveGame() {
    const data = {
        level: player.level,
        exp: player.exp,
        floorLevel: floorLevel,
        totalKills: player.totalKills
    };
    localStorage.setItem('minimal_rogue_save', JSON.stringify(data));
    SOUNDS.SAVE();
    addLog("✨ Game Progress Saved! ✨");
    spawnFloatingText(player.x, player.y, "SAVED", "#4ade80");
}

function updateUI() {
    hpElement.innerText = `${player.hp}/${player.maxHp}`;
    const hpRatio = player.hp / player.maxHp;
    if (hpRatio <= 0.25) hpElement.style.color = '#f87171';
    else if (hpRatio <= 0.5) hpElement.style.color = '#fbbf24';
    else hpElement.style.color = '#ffffff';

    staminaElement.innerText = player.stamina;
    const stRatio = player.stamina / 100;
    if (stRatio <= 0.25) staminaElement.style.color = '#f87171';
    else if (stRatio <= 0.5) staminaElement.style.color = '#fbbf24';
    else staminaElement.style.color = '#ffffff';

    lvElement.innerText = player.level;
    floorElement.innerText = floorLevel;
}

function initMap() {
    map = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
    enemies = [];
    damageTexts = [];
    attackLines = [];
    player.hasKey = false;

    const rooms = [];
    for (let i = 0; i < 6; i++) {
        const w = Math.floor(Math.random() * 6) + 4;
        const h = Math.floor(Math.random() * 4) + 4;
        const x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
        const y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;
        for (let ry = y; ry < y + h; ry++) {
            for (let rx = x; rx < x + w; rx++) { map[ry][rx] = SYMBOLS.FLOOR; }
        }
        rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
    }

    for (let i = 0; i < rooms.length - 1; i++) {
        let cur = rooms[i]; let next = rooms[i + 1];
        for (let x = Math.min(cur.cx, next.cx); x <= Math.max(cur.cx, next.cx); x++) { map[cur.cy][x] = SYMBOLS.FLOOR; }
        for (let y = Math.min(cur.cy, next.cy); y <= Math.max(cur.cy, next.cy); y++) { map[y][next.cx] = SYMBOLS.FLOOR; }
    }

    player.x = rooms[0].cx;
    player.y = rooms[0].cy;

    const lastRoom = rooms[rooms.length - 1];
    const isLockedFloor = Math.random() < 0.3;
    if (isLockedFloor) {
        map[lastRoom.cy][lastRoom.cx] = SYMBOLS.DOOR;
        const keyRoomIdx = Math.floor(Math.random() * (rooms.length - 2)) + 1;
        const keyRoom = rooms[keyRoomIdx];
        map[keyRoom.cy][keyRoom.cx] = SYMBOLS.KEY;
        addLog("This floor is locked. Find the KEY (k)!");
    } else {
        map[lastRoom.cy][lastRoom.cx] = SYMBOLS.STAIRS;
    }

    if (floorLevel % 10 === 0) {
        const midRoom = rooms[1];
        if (map[midRoom.cy][midRoom.cx] === SYMBOLS.FLOOR) {
            map[midRoom.cy][midRoom.cx] = SYMBOLS.SAVE;
            addLog("A Save Point (S) is on this floor!");
        }
    }

    for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];

        // 出現抽選
        const rand = Math.random();
        if (rand < 0.03) {
            // 3%の確率で「GOLD」敵（経験値10倍、逃走する）
            const ex = room.cx;
            const ey = room.cy;
            enemies.push({
                type: 'GOLD', x: ex, y: ey, hp: 4, maxHp: 4, // HPを少し低めに
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: 500 // 通常の100倍！
            });
            addLog("!! A Golden Shiny Enemy appeared !!");
        } else if (rand < 0.08) {
            // 5%の確率で「SNAKE」大蛇
            const ex = room.cx;
            const ey = room.cy;
            enemies.push({
                type: 'SNAKE', x: ex, y: ey,
                body: [{ x: ex, y: ey }, { x: ex, y: ey }, { x: ex, y: ey }, { x: ex, y: ey }],
                symbols: ['E', 'N', 'E', 'M', 'Y'],
                hp: 15 + floorLevel * 5, maxHp: 15 + floorLevel * 5,
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: 30
            });
            addLog("!! A huge ENEMY appeared !!");
        } else {
            const numEnemies = Math.floor(Math.random() * 2) + 1;
            for (let j = 0; j < numEnemies; j++) {
                const ex = room.x + Math.floor(Math.random() * room.w);
                const ey = room.y + Math.floor(Math.random() * room.h);
                if (map[ey][ex] === SYMBOLS.FLOOR) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey, hp: 5 + floorLevel, maxHp: 5 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0,
                        expValue: 5
                    });
                }
            }
        }
    }
}

async function startFloorTransition() {
    isProcessing = true;
    SOUNDS.DESCEND();
    transition.active = true;
    transition.text = `FLOOR ${floorLevel}`;
    for (let a = 0; a <= 1; a += 0.1) { transition.alpha = a; await new Promise(r => setTimeout(r, 50)); }
    transition.alpha = 1;
    initMap();
    player.hp = player.maxHp;
    updateUI();
    addLog("HP fully restored!");
    await new Promise(r => setTimeout(r, 1000));
    for (let a = 1; a >= 0; a -= 0.1) { transition.alpha = a; await new Promise(r => setTimeout(r, 50)); }
    transition.alpha = 0;
    transition.active = false;
    isProcessing = false;
}

function gameLoop(now) {
    if (gameState === 'TITLE') {
        drawTitle();
    } else if (gameState === 'STATUS') {
        draw(now);
        drawStatusScreen();
    } else {
        draw(now);
        damageTexts = damageTexts.filter(d => now - d.startTime < 1000);
        attackLines = attackLines.filter(l => now < l.until);
    }
    requestAnimationFrame(gameLoop);
}

function drawTitle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Courier New';
    ctx.fillText('MINIMAL ROGUE', canvas.width / 2, canvas.height / 3);
    ctx.font = '16px Courier New';
    ctx.fillStyle = '#888';
    ctx.fillText('Lines & Symbols RPG', canvas.width / 2, canvas.height / 3 + 40);
    const menuY = canvas.height / 2 + 50;
    ctx.font = '24px Courier New';
    const options = ['START NEW GAME', 'CONTINUE'];
    const hasSave = localStorage.getItem('minimal_rogue_save') !== null;
    options.forEach((opt, i) => {
        const isSelected = titleSelection === i;
        const isDisabled = i === 1 && !hasSave;
        ctx.fillStyle = isDisabled ? '#333' : (isSelected ? '#fff' : '#666');
        let text = opt;
        if (isSelected) text = `> ${text} <`;
        ctx.fillText(text, canvas.width / 2, menuY + i * 40);
    });
    ctx.font = '14px Courier New';
    ctx.fillStyle = '#444';
    ctx.fillText('[Arrows] to Select  [Enter] to Decide', canvas.width / 2, canvas.height - 40);
}

function drawStatusScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('-- STATUS --', canvas.width / 2, 90);
    ctx.textAlign = 'left';
    ctx.font = '18px Courier New';
    const startX = 100;
    const startY = 140;
    const gap = 30;
    const stats = [
        { label: "CHARACTER", val: "@ (PLAYER)" },
        { label: "LEVEL", val: player.level, color: '#fbbf24' },
        { label: "HP", val: `${player.hp} / ${player.maxHp}`, color: '#f87171' },
        { label: "STAMINA", val: `${player.stamina} %`, color: '#38bdf8' },
        { label: "EXPERIENCE", val: `${player.exp} / ${player.nextExp}`, color: '#fff' },
        { label: "", val: "" },
        { label: "CURRENT FLOOR", val: `${floorLevel} F` },
        { label: "TOTAL KILLS", val: player.totalKills },
        { label: "TOTAL TURNS", val: turnCount }
    ];
    stats.forEach((s, i) => {
        if (s.label) {
            ctx.fillStyle = '#888';
            ctx.fillText(s.label.padEnd(15, '.'), startX, startY + i * gap);
            ctx.fillStyle = s.color || '#fff';
            ctx.fillText(s.val, startX + 180, startY + i * gap);
        }
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.font = '14px Courier New';
    ctx.fillText('Press [X] or [I] to Close', canvas.width / 2, canvas.height - 80);
}

function spawnFloatingText(x, y, text, color) {
    damageTexts.push({ x, y, text, color, startTime: performance.now() });
}

function spawnDamageText(x, y, amount, color = '#f87171') {
    spawnFloatingText(x, y, `-${amount}`, color);
}

function spawnSlash(tx, ty) {
    const margin = 2;
    attackLines.push({
        x1: tx * TILE_SIZE + margin, y1: ty * TILE_SIZE + margin,
        x2: (tx + 1) * TILE_SIZE - margin, y2: (ty + 1) * TILE_SIZE - margin,
        until: performance.now() + 150
    });
}

function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const char = map[y][x];
            const px = x * TILE_SIZE; const py = y * TILE_SIZE;
            if (char === SYMBOLS.WALL) {
                ctx.fillStyle = '#1a1a1a'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#333'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            } else if (char === SYMBOLS.STAIRS) {
                ctx.fillStyle = '#fff'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            } else if (char === SYMBOLS.SAVE) {
                ctx.fillStyle = '#4ade80'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            } else if (char === SYMBOLS.KEY) {
                ctx.fillStyle = '#fbbf24'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            } else if (char === SYMBOLS.DOOR) {
                ctx.fillStyle = '#ffffff'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            } else {
                ctx.fillStyle = '#444'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            }
        }
    }

    enemies.forEach(e => {
        const isFlashing = now < e.flashUntil;
        if (e.type === 'SNAKE') {
            ctx.fillStyle = isFlashing ? '#fff' : '#ef4444';
            ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
            ctx.fillText(e.symbols[0], e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
            e.body.forEach((seg, i) => { ctx.fillText(e.symbols[i + 1], seg.x * TILE_SIZE + TILE_SIZE / 2, seg.y * TILE_SIZE + TILE_SIZE / 2); });
        } else if (e.type === 'GOLD') {
            ctx.fillStyle = isFlashing ? '#fff' : '#fbbf24'; // 金色
            ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
            ctx.fillText(SYMBOLS.ENEMY, e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = isFlashing ? '#fff' : '#f87171';
            if (isFlashing) { ctx.shadowColor = 'red'; ctx.shadowBlur = 10; }
            ctx.fillText(SYMBOLS.ENEMY, e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
            ctx.shadowBlur = 0;
        }
    });

    const pFlashing = now < player.flashUntil;
    ctx.fillStyle = pFlashing ? '#f87171' : '#fff';
    ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
    ctx.fillText(SYMBOLS.PLAYER, player.x * TILE_SIZE + TILE_SIZE / 2 + player.offsetX, player.y * TILE_SIZE + TILE_SIZE / 2 + player.offsetY);

    attackLines.forEach(l => {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    });

    damageTexts.forEach(d => {
        const elapsed = (now - d.startTime) / 1000;
        const opacity = 1 - elapsed;
        const slideY = elapsed * 30;
        ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = d.color;
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(d.text, d.x * TILE_SIZE + TILE_SIZE, d.y * TILE_SIZE - slideY); ctx.restore();
    });

    if (transition.active) {
        ctx.save(); ctx.globalAlpha = transition.alpha; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Courier New';
        ctx.fillText(transition.text, canvas.width / 2, canvas.height / 2); ctx.restore();
    }
}

function addLog(msg) {
    const div = document.createElement('div'); div.innerText = msg; logElement.appendChild(div);
    while (logElement.childNodes.length > 5) { logElement.removeChild(logElement.firstChild); }
    logElement.scrollTop = logElement.scrollHeight;
}

async function handleAction(dx, dy) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (isProcessing) return;
    isProcessing = true;

    const nx = player.x + dx; const ny = player.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { isProcessing = false; return; }

    const victim = enemies.find(e => {
        if (e.x === nx && e.y === ny) return true;
        if (e.type === 'SNAKE') return e.body.some(seg => seg.x === nx && seg.y === ny);
        return false;
    });

    if (victim) {
        await attackEnemy(victim, dx, dy);
    } else {
        player.stamina = Math.min(100, player.stamina + 20);
        if (map[ny][nx] === SYMBOLS.WALL) {
            player.offsetX = dx * 5; player.offsetY = dy * 5;
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
        } else {
            const nextTile = map[ny][nx];
            if (nextTile === SYMBOLS.DOOR) {
                if (player.hasKey) { SOUNDS.UNLOCK(); map[ny][nx] = SYMBOLS.STAIRS; addLog("The DOOR is unlocked!"); player.hasKey = false; }
                else { addLog("The door is locked."); player.offsetX = dx * 5; player.offsetY = dy * 5; await new Promise(r => setTimeout(r, 100)); player.offsetX = 0; player.offsetY = 0; }
            } else {
                player.x = nx; player.y = ny;
                if (nextTile === SYMBOLS.STAIRS) { floorLevel++; await startFloorTransition(); }
                else if (nextTile === SYMBOLS.SAVE) { saveGame(); }
                else if (nextTile === SYMBOLS.KEY) { player.hasKey = true; map[ny][nx] = SYMBOLS.FLOOR; SOUNDS.GET_ITEM(); addLog("Picked up the KEY!"); spawnFloatingText(player.x, player.y, "GOT KEY", "#fbbf24"); }
            }
        }
    }

    if (!transition.active) { turnCount++; updateUI(); await enemyTurn(); isProcessing = false; }
}

async function attackEnemy(enemy, dx, dy) {
    spawnSlash(player.x + dx, player.y + dy); SOUNDS.HIT();
    player.offsetX = dx * 10; player.offsetY = dy * 10;
    const staminaFactor = Math.max(0.3, player.stamina / 100);
    let damage = Math.max(1, Math.floor((2 + player.level) * staminaFactor));

    // 金色敵（メタルスライム風）はダメージを1に固定
    if (enemy.type === 'GOLD') damage = 1;

    enemy.hp -= damage; enemy.flashUntil = performance.now() + 200;
    spawnDamageText(player.x + dx, player.y + dy, damage, '#f87171');
    player.stamina = Math.max(0, player.stamina - 20);
    setTimeout(() => { animateBounce(enemy); }, 50);
    await new Promise(r => setTimeout(r, 200));
    player.offsetX = 0; player.offsetY = 0;
    if (enemy.hp <= 0) {
        SOUNDS.DEFEAT();
        enemies = enemies.filter(e => e !== enemy);
        player.totalKills++;
        gainExp(enemy.expValue || 5);
        if (enemy.type === 'SNAKE') addLog("The giant ENEMY was defeated!");
        if (enemy.type === 'GOLD') addLog("Caught the Golden Shiny!");
    }
}

function animateBounce(obj) {
    const start = performance.now(); const duration = 250; const jumpHeight = 12;
    function frame(now) {
        const elapsed = now - start;
        if (elapsed < duration) { const progress = elapsed / duration; obj.offsetY = 4 * jumpHeight * progress * (progress - 1); requestAnimationFrame(frame); }
        else { obj.offsetY = 0; }
    }
    requestAnimationFrame(frame);
}

async function enemyTurn() {
    let attackOccurred = false;
    for (const e of enemies) {
        if (e.hp <= 0) continue;

        if (e.type === 'SNAKE' && turnCount % 2 === 0) continue;

        const dx = player.x - e.x; const dy = player.y - e.y; const dist = Math.abs(dx) + Math.abs(dy);

        if (e.type === 'GOLD') {
            // 金色敵はプレイヤーから逃げる (距離が8以下の場合)
            if (dist <= 8) {
                SOUNDS.GOLD_FLIGHT();
                let bestMove = { x: e.x, y: e.y, score: dist };
                const moves = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
                moves.forEach(m => {
                    const nx = e.x + m.x, ny = e.y + m.y;
                    if (canEnemyMove(nx, ny)) {
                        const nDist = Math.abs(player.x - nx) + Math.abs(player.y - ny);
                        if (nDist > bestMove.score) {
                            bestMove = { x: nx, y: ny, score: nDist };
                        }
                    }
                });
                e.x = bestMove.x; e.y = bestMove.y;
            }
            continue;
        }

        if (dist === 1) {
            spawnSlash(player.x, player.y); SOUNDS.DAMAGE();
            e.offsetX = dx * 10; e.offsetY = dy * 10;
            const damage = Math.max(1, Math.floor(floorLevel / 2) + (e.type === 'SNAKE' ? 5 : 0));
            player.hp -= damage; player.flashUntil = performance.now() + 200;
            spawnDamageText(player.x, player.y, damage, '#ffffff');
            setTimeout(() => { animateBounce(player); }, 50);
            attackOccurred = true;
            await new Promise(r => setTimeout(r, 200));
            e.offsetX = 0; e.offsetY = 0;
            if (player.hp <= 0) { alert("Game Over."); gameState = 'TITLE'; return; }
        } else if (dist <= 8) {
            const oldPos = { x: e.x, y: e.y };
            let sx = dx === 0 ? 0 : dx / Math.abs(dx); let sy = dy === 0 ? 0 : dy / Math.abs(dy);
            let moved = false;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (canEnemyMove(e.x + sx, e.y)) { e.x += sx; moved = true; } else if (canEnemyMove(e.x, e.y + sy)) { e.y += sy; moved = true; }
            } else {
                if (canEnemyMove(e.x, e.y + sy)) { e.y += sy; moved = true; } else if (canEnemyMove(e.x + sx, e.y)) { e.x += sx; moved = true; }
            }
            if (moved && e.type === 'SNAKE') {
                SOUNDS.SNAKE_MOVE();
                for (let i = e.body.length - 1; i > 0; i--) { e.body[i] = { ...e.body[i - 1] }; }
                e.body[0] = oldPos;
            }
        }
    }
    if (!attackOccurred && enemies.length > 0) await new Promise(r => setTimeout(r, 50));
}

function canEnemyMove(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (map[y][x] === SYMBOLS.WALL) return false;
    if (player.x === x && player.y === y) return false;
    return !enemies.some(e => {
        if (e.x === x && e.y === y) return true;
        if (e.type === 'SNAKE') return e.body.some(seg => seg.x === x && seg.y === y);
        return false;
    });
}

function gainExp(amount) {
    player.exp += amount;
    if (player.exp >= player.nextExp) {
        player.level++; player.exp = 0; player.nextExp = player.level * 10;
        player.maxHp += 10; player.hp = player.maxHp;
        SOUNDS.LEVEL_UP(); addLog(`LEVEL UP! (Lv ${player.level})`);
        spawnFloatingText(player.x, player.y, `LV UP! ${player.level}`, "#fbbf24");
        updateUI();
    }
}

function startGame() {
    player = { x: 0, y: 0, hp: 20, maxHp: 20, level: 1, exp: 0, nextExp: 10, stamina: 100, hasKey: false, flashUntil: 0, offsetX: 0, offsetY: 0, totalKills: 0 };
    floorLevel = 1; turnCount = 0; initMap(); updateUI(); gameState = 'PLAYING'; addLog("Welcome to the Dungeon.");
}

function continueGame() {
    if (loadGame()) { turnCount = 0; initMap(); gameState = 'PLAYING'; addLog(`Resuming from floor ${floorLevel}...`); }
}

window.addEventListener('keydown', e => {
    if (gameState === 'TITLE') {
        const hasSave = localStorage.getItem('minimal_rogue_save') !== null;
        if (e.key === 'ArrowUp' || e.key === 'w') { titleSelection = 0; SOUNDS.SELECT(); }
        else if (e.key === 'ArrowDown' || e.key === 's') { if (hasSave) { titleSelection = 1; SOUNDS.SELECT(); } }
        else if (e.key === 'Enter' || e.key === ' ') { if (titleSelection === 0) startGame(); else if (titleSelection === 1 && hasSave) continueGame(); }
        return;
    }
    if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'i') {
        if (gameState === 'PLAYING') { gameState = 'STATUS'; SOUNDS.SELECT(); }
        else if (gameState === 'STATUS') { gameState = 'PLAYING'; SOUNDS.SELECT(); }
        return;
    }
    if (gameState === 'PLAYING') {
        switch (e.key) {
            case 'ArrowUp': case 'w': handleAction(0, -1); break;
            case 'ArrowDown': case 's': handleAction(0, 1); break;
            case 'ArrowLeft': case 'a': handleAction(-1, 0); break;
            case 'ArrowRight': case 'd': handleAction(1, 0); break;
        }
    }
});

updateUI();
requestAnimationFrame(gameLoop);
addLog("Game Ready.");
