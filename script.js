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
    DOOR: '田',
    SWORD: '†',
    ARMOR: '🛡'
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
    GOLD_FLIGHT: () => playSound(900, 'sine', 0.05, 0.05),
    CRITICAL: () => {
        playSound(800, 'square', 0.05, 0.2);
        setTimeout(() => playSound(1200, 'square', 0.1, 0.2), 50);
    },
    FATAL: () => {
        playSound(100, 'sawtooth', 0.4, 0.3);
        playSound(50, 'sawtooth', 0.4, 0.3);
    },
    TRAGIC_DEATH: () => {
        playSound(100, 'sawtooth', 1.0, 0.4);
        playSound(50, 'sawtooth', 1.5, 0.4);
    },
    TRAGIC_MELODY: () => {
        playMelody([
            { f: 196.00, d: 0.4 }, { f: 185.00, d: 0.4 }, { f: 174.61, d: 0.4 }, { f: 155.56, d: 0.8 }
        ]);
    }
};

// ゲーム状態
let gameState = 'TITLE';
let titleSelection = 0;
let map = [];
let player = {
    x: 0, y: 0, hp: 20, maxHp: 20, level: 1, exp: 0, nextExp: 10,
    stamina: 100,
    hasKey: false,
    hasSword: false,
    armorCount: 0,
    flashUntil: 0, offsetX: 0, offsetY: 0,
    totalKills: 0
};
let enemies = [];
let floorLevel = 1;
let damageTexts = [];
let attackLines = [];
let isProcessing = false;
let turnCount = 0;
let isPlayerVisible = true;
let gameOverAlpha = 0;

let transition = { active: false, text: "", alpha: 0 };
let screenShake = { x: 0, y: 0, until: 0 };

function setScreenShake(intensity, duration) {
    const end = performance.now() + duration;
    function shake() {
        const now = performance.now();
        if (now < end) {
            screenShake.x = (Math.random() - 0.5) * intensity;
            screenShake.y = (Math.random() - 0.5) * intensity;
            requestAnimationFrame(shake);
        } else {
            screenShake.x = 0; screenShake.y = 0;
        }
    }
    shake();
}

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
        player.hasSword = data.hasSword || false;
        player.armorCount = data.armorCount || 0;
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
        totalKills: player.totalKills,
        hasSword: player.hasSword,
        armorCount: player.armorCount
    };
    localStorage.setItem('minimal_rogue_save', JSON.stringify(data));
    SOUNDS.SAVE();
    addLog("✨ Game Progress Saved! ✨");
    spawnFloatingText(player.x, player.y, "SAVED", "#4ade80");
}

function updateUI() {
    hpElement.innerText = `${player.hp}/${player.maxHp}`;
    hpElement.style.color = '#ffffff';

    staminaElement.innerText = player.stamina;
    staminaElement.style.color = '#ffffff';

    lvElement.innerText = player.level;
    lvElement.style.color = '#ffffff';
    floorElement.innerText = floorLevel;

    // 剣の所持状態をUIに追加（もしhtml側の準備がなくてもコンソールなりで見れるようにするか、既存要素に追記）
    if (!document.getElementById('sword-status')) {
        const span = document.createElement('span');
        span.id = 'sword-status';
        lvElement.parentElement.appendChild(span);
    }
    document.getElementById('sword-status').innerText = player.hasSword ? " 🔥SWORD" : "";

    if (!document.getElementById('armor-status')) {
        const span = document.createElement('span');
        span.id = 'armor-status';
        lvElement.parentElement.appendChild(span);
    }
    document.getElementById('armor-status').innerText = player.armorCount > 0 ? ` 🛡x${player.armorCount}` : "";
}

function initMap() {
    map = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
    enemies = [];
    damageTexts = [];
    attackLines = [];
    player.hasKey = false;

    const rooms = [];
    const roomCount = Math.floor(Math.random() * 4) + 8; // 8〜11 rooms

    for (let i = 0; i < roomCount; i++) {
        const w = Math.floor(Math.random() * 6) + 4;
        const h = Math.floor(Math.random() * 4) + 4;
        const x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
        const y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;

        // Dig room
        for (let ry = y; ry < y + h; ry++) {
            for (let rx = x; rx < x + w; rx++) { map[ry][rx] = SYMBOLS.FLOOR; }
        }

        // Add internal obstacles (pillars or rubble) to larger rooms
        if (w >= 5 && h >= 5) {
            const pattern = Math.random();
            const cx = Math.floor(x + w / 2);
            const cy = Math.floor(y + h / 2);
            if (pattern < 0.3) {
                // Center pillar
                map[cy][cx] = SYMBOLS.WALL;
            } else if (pattern < 0.5) {
                // Four corners pillars
                map[y + 1][x + 1] = SYMBOLS.WALL;
                map[y + 1][x + w - 2] = SYMBOLS.WALL;
                map[y + h - 2][x + 1] = SYMBOLS.WALL;
                map[y + h - 2][x + w - 2] = SYMBOLS.WALL;
            } else if (pattern < 0.6) {
                // Scatter rubble (non-blocking decorative walls)
                for (let j = 0; j < 3; j++) {
                    const rx = x + Math.floor(Math.random() * (w - 2)) + 1;
                    const ry = y + Math.floor(Math.random() * (h - 2)) + 1;
                    map[ry][rx] = SYMBOLS.WALL;
                }
            }
        }

        rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
    }

    // Connect rooms with winding corridors
    for (let i = 0; i < rooms.length - 1; i++) {
        let cur = rooms[i];
        let next = rooms[i + 1];

        let cx = cur.cx;
        let cy = cur.cy;
        const tx = next.cx;
        const ty = next.cy;

        // Simple random walk toward target
        while (cx !== tx || cy !== ty) {
            if (cx !== tx && (cy === ty || Math.random() < 0.5)) {
                cx += (tx > cx ? 1 : -1);
            } else {
                cy += (ty > cy ? 1 : -1);
            }
            if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
                map[cy][cx] = SYMBOLS.FLOOR;
                // Occasionally make double-wide corridor
                if (Math.random() < 0.1) {
                    if (cy + 1 < ROWS) map[cy + 1][cx] = SYMBOLS.FLOOR;
                    if (cx + 1 < COLS) map[cy][cx + 1] = SYMBOLS.FLOOR;
                }
            }
        }
    }

    // Add some random extra connections to create loops
    for (let k = 0; k < 3; k++) {
        const r1 = rooms[Math.floor(Math.random() * rooms.length)];
        const r2 = rooms[Math.floor(Math.random() * rooms.length)];
        if (r1 !== r2) {
            let cx = r1.cx; let cy = r1.cy;
            while (cx !== r2.cx || cy !== r2.cy) {
                if (cx !== r2.cx && (cy === r2.cy || Math.random() < 0.5)) cx += (r2.cx > cx ? 1 : -1);
                else cy += (r2.cy > cy ? 1 : -1);
                map[cy][cx] = SYMBOLS.FLOOR;
            }
        }
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
        const midRoom = rooms[Math.floor(rooms.length / 2)];
        if (map[midRoom.cy][midRoom.cx] === SYMBOLS.FLOOR) {
            map[midRoom.cy][midRoom.cx] = SYMBOLS.SAVE;
            addLog("A Save Point (S) is on this floor!");
        }
    }

    // 5階以降で剣が出現する可能性がある
    if (floorLevel >= 5 && !player.hasSword && Math.random() < 0.3) {
        const swordRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
        if (map[swordRoom.cy][swordRoom.cx] === SYMBOLS.FLOOR) {
            map[swordRoom.cy][swordRoom.cx] = SYMBOLS.SWORD;
            addLog("A legendary SWORD (†) is hidden here!");
        }
    }

    // 防具もたまに出現
    if (Math.random() < 0.2) {
        const armorRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
        if (map[armorRoom.cy][armorRoom.cx] === SYMBOLS.FLOOR) {
            map[armorRoom.cy][armorRoom.cx] = SYMBOLS.ARMOR;
        }
    }

    // Spawn enemies
    for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];

        // 最初の3階は敵の数を減らす
        if (floorLevel <= 3 && Math.random() < 0.4) continue; // 40%の確率でその部屋には敵を出さない

        const rand = Math.random();
        if (rand < 0.04) {
            enemies.push({
                type: 'GOLD', x: room.cx, y: room.cy, hp: 4, maxHp: 4,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 500
            });
            addLog("!! A Golden Shiny Enemy appeared !!");
        } else if (rand < (floorLevel <= 3 ? 0.03 : 0.10)) { // 序盤は大蛇の率も下げる
            enemies.push({
                type: 'SNAKE', x: room.cx, y: room.cy,
                body: [{ x: room.cx, y: room.cy }, { x: room.cx, y: room.cy }, { x: room.cx, y: room.cy }, { x: room.cx, y: room.cy }],
                symbols: ['E', 'N', 'E', 'M', 'Y'],
                hp: 15 + floorLevel * 5, maxHp: 15 + floorLevel * 5,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30
            });
            addLog("!! A huge ENEMY appeared !!");
        } else {
            // 最初の3階は1部屋最大1体、それ以降は最大2体
            const maxPerRoom = floorLevel <= 3 ? 1 : 2;
            const numEnemies = Math.floor(Math.random() * maxPerRoom) + 1;
            for (let j = 0; j < numEnemies; j++) {
                const ex = room.x + Math.floor(Math.random() * room.w);
                const ey = room.y + Math.floor(Math.random() * room.h);
                if (map[ey][ex] === SYMBOLS.FLOOR) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey, hp: 5 + floorLevel, maxHp: 5 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5
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
    } else if (gameState === 'GAMEOVER') {
        drawGameOver();
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

function drawGameOver() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 48px Courier New';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#666';
    ctx.font = '18px Courier New';
    ctx.fillText('Your journey ends here...', canvas.width / 2, canvas.height / 2 + 30);

    ctx.fillStyle = '#444';
    ctx.font = '14px Courier New';
    ctx.fillText('Press [Enter] to Title', canvas.width / 2, canvas.height - 100);
}

function drawStatusScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('-- STATUS (ステータス) --', canvas.width / 2, 80);

    ctx.textAlign = 'left';
    ctx.font = '16px Courier New';
    const startX = 80;
    const startY = 120;
    const gap = 25;

    const stats = [
        { label: "CHARACTER [キャラ]", val: "@ (PLAYER)" },
        { label: "LEVEL     [レベル]", val: player.level },
        { label: "HP        [体力]", val: `${player.hp} / ${player.maxHp}` },
        { label: "ST        [スタミナ]", val: `${player.stamina} %`, desc: "※連続攻撃で低下し攻撃力減少。移動や待機で回復。" },
        { label: "EXP       [経験値]", val: `${player.exp} / ${player.nextExp}` },
        { label: "DEFENSE   [防御力]", val: player.armorCount },
        { label: "FLOOR     [階層]", val: `${floorLevel} F` },
        { label: "KILLS     [討伐数]", val: player.totalKills }
    ];

    stats.forEach((s, i) => {
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#888';
        ctx.fillText(s.label.padEnd(18, ' '), startX, startY + i * gap);
        ctx.fillStyle = '#fff';
        ctx.fillText(s.val, startX + 220, startY + i * gap);

        if (s.desc) {
            ctx.fillStyle = '#666';
            ctx.font = '11px "Meiryo", sans-serif';
            ctx.fillText(s.desc, startX + 310, startY + i * gap);
        }
    });

    // アイテム説明セクション
    ctx.fillStyle = '#444';
    ctx.fillRect(startX, startY + stats.length * gap + 10, canvas.width - 160, 2);

    ctx.font = 'bold 14px "Courier New", "Meiryo", sans-serif';
    ctx.fillStyle = '#aaa';
    const infoY = startY + stats.length * gap + 35;

    ctx.fillText('【装備アイテムの効果】', startX, infoY);

    ctx.font = '13px "Courier New", "Meiryo", sans-serif';
    ctx.fillStyle = player.hasSword ? '#38bdf8' : '#555';
    ctx.fillText(`† 三方向の剣: ${player.hasSword ? "所持中 (正面と左右を同時攻撃)" : "未所持 (5F以降に出現)"}`, startX, infoY + 25);

    ctx.fillStyle = player.armorCount > 0 ? '#94a3b8' : '#555';
    ctx.fillText(`🛡 アーマー  : ${player.armorCount > 0 ? `セットx${player.armorCount} (被弾ダメージを ${player.armorCount} 軽減)` : "未所持 (各部屋に低確率で出現)"}`, startX, infoY + 50);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.font = '13px "Courier New", "Meiryo", sans-serif';
    ctx.fillText('Press [X] or [I] to Close (閉じる)', canvas.width / 2, canvas.height - 65);
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
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    ctx.clearRect(-20, -20, canvas.width + 40, canvas.height + 40);
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
            } else if (char === SYMBOLS.SWORD) {
                ctx.fillStyle = '#38bdf8'; ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else if (char === SYMBOLS.ARMOR) {
                ctx.fillStyle = '#94a3b8'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
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
    if (isPlayerVisible) {
        ctx.fillStyle = pFlashing ? '#f87171' : '#fff';
        ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
        ctx.fillText(SYMBOLS.PLAYER, player.x * TILE_SIZE + TILE_SIZE / 2 + player.offsetX, player.y * TILE_SIZE + TILE_SIZE / 2 + player.offsetY);
    }

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

    if (gameOverAlpha > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${gameOverAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

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

    const targets = [];

    // 正面の敵
    const mainVictim = enemies.find(e => {
        if (e.x === nx && e.y === ny) return true;
        if (e.type === 'SNAKE') return e.body.some(seg => seg.x === nx && seg.y === ny);
        return false;
    });
    if (mainVictim) targets.push({ enemy: mainVictim, x: nx, y: ny });

    // 剣を持っている場合、左右斜めも攻撃
    if (player.hasSword) {
        const sideMoves = dx !== 0 ? [{ x: dx, y: -1 }, { x: dx, y: 1 }] : [{ x: -1, y: dy }, { x: 1, y: dy }];
        sideMoves.forEach(sm => {
            const sx = player.x + sm.x, sy = player.y + sm.y;
            const sideVictim = enemies.find(e => {
                if (e.x === sx && e.y === sy) return true;
                if (e.type === 'SNAKE') return e.body.some(seg => seg.x === sx && seg.y === sy);
                return false;
            });
            if (sideVictim) targets.push({ enemy: sideVictim, x: sx, y: sy });
        });
    }

    if (targets.length > 0) {
        player.offsetX = dx * 10; player.offsetY = dy * 10;
        for (const target of targets) {
            await attackEnemy(target.enemy, target.x - player.x, target.y - player.y, target === targets[0]);
        }
        player.stamina = Math.max(0, player.stamina - 20);
        await new Promise(r => setTimeout(r, 100));
        player.offsetX = 0; player.offsetY = 0;
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
            } else if (nextTile === SYMBOLS.SWORD) {
                player.hasSword = true; map[ny][nx] = SYMBOLS.FLOOR;
                SOUNDS.GET_ITEM(); addLog("🚨 You obtained the SWORD of THREE WAYS! 🚨");
                spawnFloatingText(nx, ny, "3-WAY ATTACK!", "#38bdf8");
                player.x = nx; player.y = ny;
            } else if (nextTile === SYMBOLS.ARMOR) {
                player.armorCount++; map[ny][nx] = SYMBOLS.FLOOR;
                SOUNDS.GET_ITEM(); addLog(`Found ARMOR piece! (Defense: ${player.armorCount})`);
                spawnFloatingText(nx, ny, "DEFENSE UP", "#94a3b8");
                player.x = nx; player.y = ny;
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

async function attackEnemy(enemy, dx, dy, isMain = true) {
    spawnSlash(player.x + dx, player.y + dy); if (isMain) SOUNDS.HIT();
    if (isMain) { player.offsetX = dx * 10; player.offsetY = dy * 10; }
    const staminaFactor = Math.max(0.3, player.stamina / 100);
    let damage = Math.max(1, Math.floor((2 + player.level) * staminaFactor));
    let isCritical = Math.random() < 0.10; // 10%のかいしんの一撃

    if (isCritical) {
        damage *= 3;
        SOUNDS.CRITICAL();
        setScreenShake(8, 200);
        addLog("✨ かいしんの一撃！ ✨");
        spawnFloatingText(player.x + dx, player.y + dy, "CRITICAL!!", "#fbbf24");
    }

    // 金色敵（メタルスライム風）はダメージを1に固定
    if (enemy.type === 'GOLD') damage = isCritical ? 3 : 1;

    enemy.hp -= damage; enemy.flashUntil = performance.now() + 200;
    spawnDamageText(player.x + dx, player.y + dy, damage, isCritical ? '#fbbf24' : '#f87171');
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
                // 完全に最適な行動ではなく、たまにミスをするように調整
                const rand = Math.random();
                let nextPos = { x: e.x, y: e.y };

                if (rand < 0.15) {
                    // 15%の確率でその場に立ち止まる（迷っている）
                    addLog("The Golden Enemy is hesitant!");
                } else if (rand < 0.3) {
                    // 15%の確率でランダムな方向に動く（パニック）
                    const moves = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
                    const m = moves[Math.floor(Math.random() * moves.length)];
                    if (canEnemyMove(e.x + m.x, e.y + m.y)) {
                        nextPos = { x: e.x + m.x, y: e.y + m.y };
                    }
                } else {
                    // 70%の確率で逃走AIを実行（従来通り）
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
                    nextPos = { x: bestMove.x, y: bestMove.y };
                }

                if (nextPos.x !== e.x || nextPos.y !== e.y) {
                    SOUNDS.GOLD_FLIGHT();
                    e.x = nextPos.x; e.y = nextPos.y;
                }
            }
            continue;
        }

        if (dist === 1) {
            spawnSlash(player.x, player.y);
            e.offsetX = dx * 10; e.offsetY = dy * 10;

            let damage = Math.max(1, Math.floor(floorLevel / 2) + (e.type === 'SNAKE' ? 5 : 0));
            const isFatal = Math.random() < 0.05; // 5%の致命的な一撃

            if (isFatal) {
                damage *= 3;
                SOUNDS.FATAL();
                setScreenShake(15, 400);
                addLog("💥 致命的な一撃を受けた！ 💥");
                spawnFloatingText(player.x, player.y, "FATAL BLOW!!", "#ff0000");
            } else {
                SOUNDS.DAMAGE();
            }

            // 防具によるダメージ軽減 (最低 1ダメージ)
            damage = Math.max(1, damage - player.armorCount);

            player.hp -= damage; player.flashUntil = performance.now() + 200;
            spawnDamageText(player.x, player.y, damage, isFatal ? '#ff0000' : '#ffffff');
            setTimeout(() => { animateBounce(player); }, 50);
            attackOccurred = true;
            await new Promise(r => setTimeout(r, 200));
            e.offsetX = 0; e.offsetY = 0;
            if (player.hp <= 0) { triggerGameOver(); return; }
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

async function triggerGameOver() {
    isProcessing = true;
    gameState = 'GAMEOVER_SEQ';
    SOUNDS.TRAGIC_DEATH();
    setScreenShake(25, 1500);

    // 赤い一撃のフラッシュ
    gameOverAlpha = 0.7;

    // プレイヤーの点滅と消失演出
    for (let i = 0; i < 12; i++) {
        isPlayerVisible = !isPlayerVisible;
        await new Promise(r => setTimeout(r, 120));
        gameOverAlpha *= 0.8; // 徐々に赤みを引かせる
    }
    isPlayerVisible = false;
    gameOverAlpha = 0;

    // 画面を真っ暗にするフェード
    transition.active = true;
    transition.text = "";
    for (let a = 0; a <= 1; a += 0.1) { transition.alpha = a; await new Promise(r => setTimeout(r, 50)); }

    gameState = 'GAMEOVER';
    SOUNDS.TRAGIC_MELODY();
    transition.active = false;
    isProcessing = false;
}

function startGame() {
    player = { x: 0, y: 0, hp: 20, maxHp: 20, level: 1, exp: 0, nextExp: 10, stamina: 100, hasKey: false, hasSword: false, armorCount: 0, flashUntil: 0, offsetX: 0, offsetY: 0, totalKills: 0 };
    isPlayerVisible = true; gameOverAlpha = 0;
    floorLevel = 1; turnCount = 0; initMap(); updateUI(); gameState = 'PLAYING'; addLog("Welcome to the Dungeon.");
}

function continueGame() {
    if (loadGame()) { turnCount = 0; initMap(); gameState = 'PLAYING'; addLog(`Resuming from floor ${floorLevel}...`); }
}

window.addEventListener('keydown', e => {
    if (gameState === 'GAMEOVER_SEQ') return; // 演出中は入力を受け付けない

    if (gameState === 'GAMEOVER') {
        if (e.key === 'Enter' || e.key === ' ') {
            gameState = 'TITLE';
            SOUNDS.SELECT();
        }
        return;
    }

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
            case ' ': handleAction(0, 0); break; // スペースキーでその場待機
        }
    }
});

updateUI();
requestAnimationFrame(gameLoop);
addLog("Game Ready.");
