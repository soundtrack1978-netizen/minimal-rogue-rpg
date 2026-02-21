const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const logElement = document.getElementById('log');
const hpElement = document.getElementById('hp');
const lvElement = document.getElementById('lv');
const staminaBar = document.getElementById('stamina-bar');
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
    PLAYER: '＠',
    ENEMY: 'E',
    STAIRS: '◯', // 大きな円に変更
    SAVE: 'S',
    KEY: 'k',
    DOOR: '⊗',
    SWORD: '†',
    ARMOR: '▼',
    POISON: '≈',
    BLOCK: '□',
    BLOCK_CRACKED: '▧',
    WISP: '※',
    CHARM: '☷', // 内部的な識別値としての文字
    STEALTH: '☷', // 隠身の魔導書
    SPEED: '▤',
    TOME: '▤', // 描画用の統一文字
    WAND: '/',
    ORC: 'O',
    ICE: '▢',
    TURRET: 'T',
    CORE: '❂'
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
        // ピューーーという下降音
        const duration = 1.5;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    SAVE: () => {
        playMelody([{ f: 440.00, d: 0.15 }, { f: 554.37, d: 0.15 }, { f: 659.25, d: 0.3 }]);
    },
    SELECT: () => playSound(800, 'square', 0.05, 0.05),
    GET_ITEM: () => playMelody([{ f: 880, d: 0.1 }, { f: 1760, d: 0.1 }]),
    UNLOCK: () => playSound(300, 'square', 0.4),
    SNAKE_MOVE: () => playSound(100, 'sine', 0.1, 0.05),
    GOLD_FLIGHT: () => playSound(900, 'sine', 0.05, 0.05),
    MOVE: () => {
        // 「ザッ」という砂を踏むような足音 (ノイズベース)
        const duration = 0.05;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.03, audioCtx.currentTime); // 小さめの音量
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start();
    },
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
    },
    DART_FIRE: () => { playSound(800, 'triangle', 0.05, 0.05); playSound(1200, 'sawtooth', 0.02, 0.03); },
    DART_HIT: () => { playSound(400, 'square', 0.05, 0.05); playSound(200, 'triangle', 0.1, 0.05); },
    DEFEND: () => {
        const duration = 0.15;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    PARRY: () => {
        const duration = 0.1;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    FALL_WHIZ: () => {
        const duration = 0.4;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    LANDING_THUD: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        playSound(100, 'triangle', 0.2, 0.3); // 100Hz
        playSound(50, 'sawtooth', 0.1, 0.15); // 低音の衝撃
    },
    SPEED_UP: () => {
        const duration = 0.5;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    },
    GET_WAND: () => {
        const now = audioCtx.currentTime;
        const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5 (Major Arpeggio)
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0.2, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.4);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.4);
        });
    },
    EXPLODE: () => {
        playSound(60, 'sawtooth', 0.4, 0.4);
        playSound(40, 'sawtooth', 0.4, 0.4);
        setTimeout(() => playSound(80, 'square', 0.2, 0.2), 30);
    }
};

// ゲーム状態
let gameState = 'TITLE';
let titleSelection = 0;
let menuSelection = 0; // 0: STATUS, 1: ITEMS
let inventorySelection = 0; // アイテム選択用
let statusPage = 0;
let nextSlideAction = null; // 氷の上で滑っている最中の入力を保持
let isIceFloor = false; // 現在のフロアが氷のフロアかどうか
let testFloor = 1; // テストプレイ用の開始階層
let map = [];
let player = {
    x: 0, y: 0, hp: 20, maxHp: 20, level: 1, exp: 0, nextExp: 10,
    stamina: 100,
    hasKey: false,
    swordCount: 0,
    armorCount: 0,
    hasteTomes: 0,
    charmTomes: 0,
    stealthTomes: 0, // 新アイテム
    isSpeeding: false,
    isStealth: false, // 姿を消しているか
    isExtraTurn: false,
    facing: 'LEFT',
    flashUntil: 0, offsetX: 0, offsetY: 0,
    totalKills: 0,
    hasWand: false,
    itemInHand: null
};
let enemies = [];
let wisps = []; // {x, y, dirIndex} - 無敵の障害物
let floorLevel = 1;
let damageTexts = [];
let attackLines = [];
let tempWalls = []; // {x, y, hp}
let isProcessing = false;
let turnCount = 0;
let isPlayerVisible = true;
let isSpacePressed = false;
let spaceUsedForBlock = false; // 今回のスペース押下でブロックを置いたかフラグ
let gameOverAlpha = 0;
let storyMessage = null; // { lines: [], alpha: 0, showNext: false }
let isTutorialInputActive = false; // チュートリアル入力待ちフラグ
let hasShownStage1Tut = false; // 1階スタミナチュートリアル済みフラグ
let dungeonCore = null; // {x, y, hp}

let transition = { active: false, text: "", alpha: 0, mode: 'FADE', playerY: 0, particles: [] };
let screenShake = { x: 0, y: 0, until: 0 };

function setScreenShake(intensity, duration) {
    const end = performance.now() + duration;
    screenShake.until = end; // 現在の揺れの終了時間を記録
    function shake() {
        const now = performance.now();
        // 新しい揺れが開始されたか、時間が過ぎた場合は停止
        if (screenShake.until !== end) return;
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
        player.maxHp = data.maxHp || (10 + (player.level * 10));
        player.hp = data.hp !== undefined ? data.hp : player.maxHp;
        player.exp = data.exp || 0;
        player.nextExp = data.nextExp || (player.level * 10);
        player.stamina = data.stamina !== undefined ? data.stamina : 100;
        player.hasKey = data.hasKey || false;
        player.hasSword = data.hasSword || false;
        player.swordCount = data.swordCount || 0;
        player.armorCount = data.armorCount || 0;
        player.hasteTomes = data.hasteTomes || 0;
        player.isSpeeding = data.isSpeeding || false;
        player.isExtraTurn = data.isExtraTurn || false;
        player.hasWand = data.hasWand || false;
        player.totalKills = data.totalKills || 0;
        player.x = data.playerX || 0;
        player.y = data.playerY || 0;

        floorLevel = data.floorLevel || 1;

        // 階層の状態を復元
        if (data.map) map = data.map;
        if (data.enemies) enemies = data.enemies;
        if (data.wisps) wisps = data.wisps;
        if (data.tempWalls) tempWalls = data.tempWalls;

        updateUI();
        return true;
    }
    return false;
}

function saveGame() {
    const data = {
        // プレイヤーの基本ステータス
        level: player.level,
        exp: player.exp,
        nextExp: player.nextExp,
        hp: player.hp,
        maxHp: player.maxHp,
        stamina: player.stamina,
        playerX: player.x,
        playerY: player.y,

        // 所持品・フラグ
        hasKey: player.hasKey,
        hasSword: player.hasSword,
        swordCount: player.swordCount,
        armorCount: player.armorCount,
        hasteTomes: player.hasteTomes,
        charmTomes: player.charmTomes,
        isSpeeding: player.isSpeeding,
        isExtraTurn: player.isExtraTurn,
        hasWand: player.hasWand,
        totalKills: player.totalKills,

        // 階層情報
        floorLevel: floorLevel,
        map: map,
        enemies: enemies,
        wisps: wisps,
        tempWalls: tempWalls
    };
    localStorage.setItem('minimal_rogue_save', JSON.stringify(data));
    SOUNDS.SAVE();
    addLog("✨ Game Progress Saved! ✨");
    addLog("State, items and floor layout stored.");
    spawnFloatingText(player.x, player.y, "SAVED", "#4ade80");
}

function updateUI() {
    hpElement.innerText = `${player.hp}/${player.maxHp}`;
    hpElement.style.color = '#ffffff';

    const bar = document.getElementById('stamina-bar');
    if (bar) {
        bar.style.width = `${player.stamina}%`;
        bar.style.backgroundColor = player.stamina < 30 ? '#f87171' : '#38bdf8';
    }

    lvElement.innerText = player.level;
    lvElement.style.color = '#ffffff';
    if (floorLevel === 100) {
        floorElement.innerText = "LAST FLOOR";
    } else {
        floorElement.innerText = `${floorLevel}/100`;
    }

    // スタイル定義 (記号用)
    const symbolStyle = 'style="color: #38bdf8; font-weight: bold;"';

    // 剣の表示 (常に表示)
    const swordNode = document.getElementById('sword-status');
    if (swordNode) {
        swordNode.innerHTML = `<span ${symbolStyle}>${SYMBOLS.SWORD}</span>x${player.swordCount}`;
    }

    // 防具の表示 (常に表示)
    const armorNode = document.getElementById('armor-status');
    if (armorNode) {
        armorNode.innerHTML = `<span ${symbolStyle}>${SYMBOLS.ARMOR}</span>x${player.armorCount}`;
    }
}

function initMap() {
    map = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
    enemies = [];
    damageTexts = [];
    attackLines = [];
    tempWalls = []; // 設置ブロックをリセット
    wisps = []; // ウィルをリセット
    player.hasKey = false;
    player.isStealth = false; // フロア移動で解除
    dungeonCore = null;

    // --- LAST FLOOR (Floor 100) ---
    if (floorLevel === 100) {
        addLog("THE BOTTOM OF THE WORLD");
        addLog("The Dungeon Core awaits...");

        // 広い空間を作成
        for (let y = 3; y < ROWS - 3; y++) {
            for (let x = 3; x < COLS - 3; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }

        // 柱の列を追加
        for (let y = 6; y < ROWS - 6; y += 4) {
            for (let x = 6; x < COLS - 6; x += 6) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        player.x = Math.floor(COLS / 2);
        player.y = ROWS - 5;

        // ダンジョンコアの配置
        const coreX = Math.floor(COLS / 2);
        const coreY = 6;
        map[coreY][coreX] = SYMBOLS.CORE;
        dungeonCore = { x: coreX, y: coreY, hp: 5 }; // 5回攻撃で破壊
        return;
    }

    // --- TUTORIAL STAGES (Floor 1-3) ---
    if (floorLevel === 1) {
        addLog("TUTORIAL 1: Attack obstacles with [Arrows].");
        addLog("Break the blocks (□) surrounding you and head to the hole (◯).");

        // 三つの小部屋 (左に2マスずらし、右端に壁を確保)
        const tr = [
            { x1: 3, y1: 9, x2: 13, y2: 15 }, // スタート地点
            { x1: 18, y1: 10, x2: 25, y2: 14 }, // 敵の部屋
            { x1: 30, y1: 9, x2: 37, y2: 15 }  // ゴールの部屋
        ];

        tr.forEach(r => {
            for (let y = r.y1; y <= r.y2; y++) {
                for (let x = r.x1; x <= r.x2; x++) { map[y][x] = SYMBOLS.FLOOR; }
            }
        });

        // 廊下でつなぐ
        for (let x = 13; x <= 18; x++) map[12][x] = SYMBOLS.FLOOR;
        for (let x = 25; x <= 30; x++) map[12][x] = SYMBOLS.FLOOR;

        // 主人公の開始位置 (1部屋目の中央、左へ)
        player.x = 8; player.y = 12;

        // 主人公から2マス離れた位置を四角く囲む (耐久2の接地ブロック)
        const d = 2;
        for (let y = player.y - d; y <= player.y + d; y++) {
            for (let x = player.x - d; x <= player.x + d; x++) {
                if (x === player.x - d || x === player.x + d || y === player.y - d || y === player.y + d) {
                    tempWalls.push({ x: x, y: y, hp: 2 });
                }
            }
        }

        // 二番目の部屋に敵を配置 (通路付近)
        enemies.push({
            type: 'NORMAL', x: 25, y: 12, hp: 5, maxHp: 5,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0
        });

        // ゴール (左へ。右端に壁を残す)
        map[12][34] = SYMBOLS.STAIRS;
        return;
    }

    if (floorLevel === 2) {
        addLog("TUTORIAL 2: Seek the wizard's remains.");
        addLog("Find the 'Magic Wand' to gain a new power.");

        // 三つの小部屋 (左に2マスずらし、右端に壁を確保)
        const tr = [
            { x1: 3, y1: 10, x2: 10, y2: 14 }, // スタート
            { x1: 15, y1: 10, x2: 22, y2: 14 }, // 杖の部屋
            { x1: 27, y1: 9, x2: 37, y2: 15 }  // ゴールの部屋
        ];
        tr.forEach(r => {
            for (let y = r.y1; y <= r.y2; y++) {
                for (let x = r.x1; x <= r.x2; x++) { map[y][x] = SYMBOLS.FLOOR; }
            }
        });
        // 廊下
        for (let x = 10; x <= 15; x++) map[12][x] = SYMBOLS.FLOOR;
        for (let x = 22; x <= 27; x++) map[12][x] = SYMBOLS.FLOOR;

        player.x = 6; player.y = 12;

        // 魔法使いの杖（小部屋の出口に配置して強制入手させる）
        map[12][22] = SYMBOLS.WAND;

        // ゴール
        map[12][33] = SYMBOLS.STAIRS;
        return;
    }

    if (floorLevel === 3) {
        addLog("TUTORIAL 3: Wisps (※) and the Sealed Hole.");
        addLog("Wisps are invincible and destroy everything they touch.");

        // 小部屋の構成
        const rooms = [
            { x1: 15, y1: 10, x2: 25, y2: 15 }, // メイン部屋 (中央)
            { x1: 3, y1: 10, x2: 9, y2: 14 },   // 鍵の部屋 (左)
            { x1: 32, y1: 11, x2: 38, y2: 13 }  // ゴールの部屋 (右)
        ];
        rooms.forEach(r => {
            for (let y = r.y1; y <= r.y2; y++) {
                for (let x = r.x1; x <= r.x2; x++) { map[y][x] = SYMBOLS.FLOOR; }
            }
        });

        // 廊下
        for (let x = 9; x <= 15; x++) map[12][x] = SYMBOLS.FLOOR; // 左廊下
        for (let x = 25; x <= 32; x++) map[12][x] = SYMBOLS.FLOOR; // 右廊下 (ウィルの巡回路)

        player.x = 20; player.y = 12;

        // 鍵を配置
        map[12][6] = SYMBOLS.KEY;
        addLog("The gold hole is SEALED (田). Find the KEY (🗝) in the side room.");

        // 右の細い廊下に敵とウィルを配置
        // 敵はウィルの通り道に立たせる
        enemies.push({
            type: 'NORMAL', x: 28, y: 12, hp: 5, maxHp: 5,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0
        });

        // ウィルを追加 (左右に往復するように壁にぶつかる設定)
        wisps.push({ x: 31, y: 12, dir: 2, mode: 'FOLLOW' }); // 左向きに巡回開始

        // ゴール (封印された扉)
        map[12][35] = SYMBOLS.DOOR;
        // 念のため、出口への道を一文字分広げて再確保 (32から35までを床に)
        for (let x = 32; x <= 35; x++) { if (map[12][x] === SYMBOLS.WALL) map[12][x] = SYMBOLS.FLOOR; }
        map[12][35] = SYMBOLS.DOOR;
        return;
    }

    const layoutRoll = Math.random();
    const isMazeFloor = layoutRoll < 0.2;
    const isGreatHallFloor = !isMazeFloor && layoutRoll < 0.4;
    const rooms = [];

    if (isMazeFloor) addLog("Warning: This floor is a complex NARROW MAZE!");
    else if (isGreatHallFloor) addLog("This floor is a vast GREAT HALL.");

    // フロアタイプに応じて部屋数を決定
    const roomCount = isMazeFloor ? 25 : (isGreatHallFloor ? 2 : (Math.floor(Math.random() * 4) + 8));

    for (let i = 0; i < roomCount; i++) {
        let w, h;
        if (isMazeFloor) {
            w = Math.floor(Math.random() * 2) + 2;
            h = Math.floor(Math.random() * 2) + 2;
        } else if (isGreatHallFloor) {
            w = Math.floor(Math.random() * 10) + 25; // 25-35
            h = Math.floor(Math.random() * 5) + 15;  // 15-20
        } else {
            w = Math.floor(Math.random() * 6) + 4;
            h = Math.floor(Math.random() * 4) + 4;
        }

        const x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
        const y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;

        // Dig room
        for (let ry = y; ry < y + h; ry++) {
            for (let rx = x; rx < x + w; rx++) { map[ry][rx] = SYMBOLS.FLOOR; }
        }

        // 大部屋や標準の部屋には柱や瓦礫を配置
        if (!isMazeFloor && w >= 5 && h >= 5) {
            const pattern = Math.random();
            const cx = Math.floor(x + w / 2);
            const cy = Math.floor(y + h / 2);

            if (isGreatHallFloor) {
                // 大部屋用の整列した柱パターン
                for (let py = y + 3; py < y + h - 3; py += 4) {
                    for (let px = x + 3; px < x + w - 3; px += 4) {
                        // 中央エリアには柱を置かない
                        if (Math.abs(px - cx) > 2 || Math.abs(py - cy) > 2) {
                            map[py][px] = SYMBOLS.WALL;
                        }
                    }
                }
            } else {
                if (pattern < 0.3) {
                    map[cy][cx] = SYMBOLS.WALL;
                } else if (pattern < 0.5) {
                    map[y + 1][x + 1] = SYMBOLS.WALL;
                    map[y + 1][x + w - 2] = SYMBOLS.WALL;
                    map[y + h - 2][x + 1] = SYMBOLS.WALL;
                    map[y + h - 2][x + w - 2] = SYMBOLS.WALL;
                }
            }
        }

        rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
    }

    // Connect rooms
    for (let i = 0; i < rooms.length - 1; i++) {
        let cur = rooms[i];
        let next = rooms[i + 1];

        let cx = cur.cx;
        let cy = cur.cy;
        const tx = next.cx;
        const ty = next.cy;

        while (cx !== tx || cy !== ty) {
            // 迷路フロアの場合、30%の確率でターゲットとは無関係な方向に寄り道する
            if (isMazeFloor && Math.random() < 0.3) {
                const randDir = Math.floor(Math.random() * 4);
                if (randDir === 0 && cx + 1 < COLS - 1) cx++;
                else if (randDir === 1 && cx - 1 > 0) cx--;
                else if (randDir === 2 && cy + 1 < ROWS - 1) cy++;
                else if (randDir === 3 && cy - 1 > 0) cy--;
            } else {
                if (cx !== tx && (cy === ty || Math.random() < 0.5)) {
                    cx += (tx > cx ? 1 : -1);
                } else {
                    cy += (ty > cy ? 1 : -1);
                }
            }
            if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS) {
                map[cy][cx] = SYMBOLS.FLOOR;
            }
        }
    }

    // Add random extra connections (Maze floors have MANY more)
    const extraConnCount = isMazeFloor ? 20 : 3;
    for (let k = 0; k < extraConnCount; k++) {
        const r1 = rooms[Math.floor(Math.random() * rooms.length)];
        const r2 = rooms[Math.floor(Math.random() * rooms.length)];
        if (r1 !== r2) {
            let cx = r1.cx; let cy = r1.cy;
            // Shorter path for extra connections
            for (let step = 0; step < 15; step++) {
                if (cx === r2.cx && cy === r2.cy) break;
                if (cx !== r2.cx && (cy === r2.cy || Math.random() < 0.5)) cx += (r2.cx > cx ? 1 : -1);
                else cy += (r2.cy > cy ? 1 : -1);
                map[cy][cx] = SYMBOLS.FLOOR;
            }
        }
    }

    // --- 地形地形(Terrain)の生成：アイテムや敵の配置より先に行う ---

    // 毒沼の生成 (5階以降、15%の確率)
    if (floorLevel >= 5 && Math.random() < 0.15) {
        const numSwamps = Math.floor(Math.random() * 2) + 1; // 1〜2つの沼
        for (let s = 0; s < numSwamps; s++) {
            const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
            let sx = startRoom.cx, sy = startRoom.cy;
            // ランダムウォークで沼を広げる
            for (let i = 0; i < 20; i++) {
                if (sy >= 0 && sy < ROWS && sx >= 0 && sx < COLS) {
                    if (map[sy][sx] === SYMBOLS.FLOOR) map[sy][sx] = SYMBOLS.POISON;
                }
                sx += Math.floor(Math.random() * 3) - 1;
                sy += Math.floor(Math.random() * 3) - 1;
            }
        }
        addLog("Caution: Poisonous swamps (≈) detected!");
    }

    // 氷の床の生成 (6階以降、50%の確率で広範囲に出現)
    isIceFloor = false;
    if (floorLevel >= 6 && Math.random() < 0.50) {
        isIceFloor = true;
        const numPatches = Math.floor(Math.random() * 2) + 2;
        for (let p = 0; p < numPatches; p++) {
            const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
            let sx = startRoom.cx, sy = startRoom.cy;
            // 広範囲にランダムウォークで広げる
            for (let i = 0; i < 150; i++) {
                if (sy >= 1 && sy < ROWS - 1 && sx >= 1 && sx < COLS - 1) {
                    // 床、または既に氷の場所を上書き・拡張
                    if (map[sy][sx] === SYMBOLS.FLOOR) map[sy][sx] = SYMBOLS.ICE;
                }
                sx += Math.floor(Math.random() * 3) - 1;
                sy += Math.floor(Math.random() * 3) - 1;
            }
        }
        addLog("❄️ WARNING: This floor is completely FROZEN! (Slippery)");
    }

    // Ensure start point is ALWAYS floor (important for avoiding spawning on pillars or ice)
    map[rooms[0].cy][rooms[0].cx] = SYMBOLS.FLOOR;
    player.x = rooms[0].cx;
    player.y = rooms[0].cy;

    // (出口と鍵は関数の最後で確実に配置されるようになりました)

    // 5階層に1回程度の確率（20%）でランダムにセーブポイントを配置
    if (Math.random() < 0.2) {
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

    // 加速アイテムの出現 (15%の確率)
    if (Math.random() < 0.15) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const speedRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[speedRoom.cy][speedRoom.cx] === SYMBOLS.FLOOR) {
                map[speedRoom.cy][speedRoom.cx] = SYMBOLS.SPEED;
            }
        }
    }

    // 魅了アイテムの出現 (10%の確率)
    if (Math.random() < 0.10) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const charmRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[charmRoom.cy][charmRoom.cx] === SYMBOLS.FLOOR) {
                map[charmRoom.cy][charmRoom.cx] = SYMBOLS.CHARM;
            }
        }
    }

    // 隠身アイテムの出現 (8.5%の確率)
    if (Math.random() < 0.085) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const stealthRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[stealthRoom.cy][stealthRoom.cx] === SYMBOLS.FLOOR) {
                map[stealthRoom.cy][stealthRoom.cx] = SYMBOLS.STEALTH;
            }
        }
    }

    // --- 出口(EXIT)と鍵(KEY)の最終配置 ---
    const lastRoom = rooms[rooms.length - 1];
    const isLockedFloor = floorLevel >= 3 && Math.random() < 0.3;

    // 出口周辺を通常の床に戻す（氷や毒沼での消失・滑りすぎ防止）
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const ty = lastRoom.cy + dy, tx = lastRoom.cx + dx;
            if (ty >= 1 && ty < ROWS - 1 && tx >= 1 && tx < COLS - 1) {
                const t = map[ty][tx];
                if (t === SYMBOLS.ICE || t === SYMBOLS.POISON || t === SYMBOLS.WALL) map[ty][tx] = SYMBOLS.FLOOR;
            }
        }
    }

    // 出口は確実に接続済みの床タイル中央に置く (上書きを厭わない)
    map[lastRoom.cy][lastRoom.cx] = isLockedFloor ? SYMBOLS.DOOR : SYMBOLS.STAIRS;

    if (isLockedFloor) {
        // 鍵の配置
        let keyRoomIdx = 1;
        if (rooms.length > 2) keyRoomIdx = Math.floor(Math.random() * (rooms.length - 2)) + 1;
        const keyRoom = rooms[keyRoomIdx];

        // 鍵の場所も氷や毒沼、壁なら床に戻す
        if (map[keyRoom.cy][keyRoom.cx] === SYMBOLS.ICE || map[keyRoom.cy][keyRoom.cx] === SYMBOLS.POISON || map[keyRoom.cy][keyRoom.cx] === SYMBOLS.WALL) {
            map[keyRoom.cy][keyRoom.cx] = SYMBOLS.FLOOR;
        }

        if (keyRoom.cx === lastRoom.cx && keyRoom.cy === lastRoom.cy) {
            // 出口と重なる場合はスタート地点の隣を床にして鍵を置く (念のためのフェイルセーフ)
            const kx = rooms[0].cx + 1, ky = rooms[0].cy;
            map[ky][kx] = SYMBOLS.FLOOR; // 確実に床にする
            map[ky][kx] = SYMBOLS.KEY;
        } else {
            // 鍵を配置。場所が壁などの場合は床属性を上書きする
            map[keyRoom.cy][keyRoom.cx] = SYMBOLS.KEY;
        }
        addLog("This floor is locked. Find the KEY (k)!");
    }

    // Spawn enemies
    for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];

        // 最初の10階までは敵の数を大幅に減らす
        if (floorLevel <= 10 && Math.random() < 0.6) continue; // 60%の確率でその部屋には敵を出さない

        const rand = Math.random();
        if (rand < 0.04) {
            if (map[room.cy][room.cx] === SYMBOLS.FLOOR) {
                enemies.push({
                    type: 'GOLD', x: room.cx, y: room.cy, hp: 4, maxHp: 4,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 500 + (floorLevel * 100)
                });
                addLog("!! A Golden Shiny Enemy appeared !!");
            }
        } else if (rand < (floorLevel <= 10 ? 0.02 : 0.10)) { // 10階までは大蛇(SNAKE)の出現率を大幅に下げる
            if (map[room.cy][room.cx] === SYMBOLS.FLOOR) {
                enemies.push({
                    type: 'SNAKE', x: room.cx, y: room.cy,
                    body: [{ x: room.cx, y: room.cy }, { x: room.cx, y: room.cy }, { x: room.cx, y: room.cy }, { x: room.cx, y: room.cy }],
                    symbols: ['S', 'N', 'A', 'K', 'E'],
                    hp: 15 + floorLevel * 5, maxHp: 15 + floorLevel * 5,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
                    stunTurns: 0
                });
                addLog("!! A huge ENEMY appeared !!");
            }
        } else {
            // 最初の10階は1部屋最大1体、それ以降は最大2体
            const maxPerRoom = floorLevel <= 10 ? 1 : 2;
            const numEnemies = Math.floor(Math.random() * maxPerRoom) + 1;
            for (let j = 0; j < numEnemies; j++) {
                const ex = room.x + Math.floor(Math.random() * room.w);
                const ey = room.y + Math.floor(Math.random() * room.h);
                if (map[ey][ex] === SYMBOLS.FLOOR) {
                    const enemyRoll = Math.random();
                    if (floorLevel >= 12 && enemyRoll < 0.12) {
                        let bestDir = 0;
                        let maxDist = -1;
                        for (let d = 0; d < 4; d++) {
                            const dx_c = [0, 1, 0, -1][d];
                            const dy_c = [-1, 0, 1, 0][d];
                            let dist = 0;
                            let tx = ex + dx_c, ty = ey + dy_c;
                            while (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && !isWallAt(tx, ty)) {
                                dist++;
                                tx += dx_c; ty += dy_c;
                            }
                            if (dist > maxDist) { maxDist = dist; bestDir = d; }
                        }
                        enemies.push({
                            type: 'TURRET', x: ex, y: ey,
                            hp: 15 + floorLevel, maxHp: 15 + floorLevel,
                            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15,
                            dir: bestDir, stunTurns: 0
                        });
                    } else if (floorLevel >= 5 && enemyRoll < 0.25) {
                        const orcCount = enemies.filter(e => e.type === 'ORC').length;
                        // 5〜7階の間は、ステージに最大1体まで
                        if (floorLevel < 8 && orcCount >= 1) {
                            enemies.push({
                                type: 'NORMAL', x: ex, y: ey,
                                hp: 5 + floorLevel, maxHp: 5 + floorLevel,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                                stunTurns: 0
                            });
                        } else {
                            enemies.push({
                                type: 'ORC', x: ex, y: ey,
                                hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                                stunTurns: 0
                            });
                        }
                    } else {
                        enemies.push({
                            type: 'NORMAL', x: ex, y: ey,
                            hp: 5 + floorLevel, maxHp: 5 + floorLevel,
                            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                            stunTurns: 0
                        });
                    }
                }
            }
        }
    }



    // ウィル・オ・ウィスプの生成 (4階以降)
    if (floorLevel >= 4) {
        let actualSpawned = 0;
        const numWisps = Math.max(1, Math.floor(floorLevel / 4));
        for (let i = 0; i < numWisps; i++) {
            // マップ全域から、確実に壁ではない場所を探す
            for (let retry = 0; retry < 200; retry++) {
                const rx = Math.floor(Math.random() * (COLS - 2)) + 1;
                const ry = Math.floor(Math.random() * (ROWS - 2)) + 1;
                // 床または毒沼であり、かつ isWallAt が false (移動可能) な場所
                const tile = map[ry][rx];
                if ((tile === SYMBOLS.FLOOR || tile === SYMBOLS.POISON) && !isWallAt(rx, ry)) {
                    const startDir = Math.floor(Math.random() * 4);
                    wisps.push({ x: rx, y: ry, dir: startDir, mode: 'STRAIGHT' });
                    actualSpawned++;
                    break;
                }
            }
        }
        if (actualSpawned > 0) addLog("Beware of the Wisps (※) following the walls!");
    }

}

function isWallAt(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    if (map[y][x] === SYMBOLS.WALL || map[y][x] === SYMBOLS.DOOR) return true;
    if (tempWalls.some(w => w.x === x && w.y === y)) return true;
    return false;
}

async function startFloorTransition() {
    isProcessing = true;
    SOUNDS.DESCEND();
    transition.active = true;
    transition.mode = 'FALLING';
    transition.text = `FLOOR ${floorLevel}`;
    transition.playerY = -50;
    transition.particles = [];
    for (let i = 0; i < 40; i++) {
        transition.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: 3 + Math.random() * 8
        });
    }

    // 暗転フェード (既に真っ暗でない場合のみ実行)
    if (transition.alpha < 1) {
        for (let a = 0; a <= 1; a += 0.2) { transition.alpha = a; await new Promise(r => setTimeout(r, 30)); }
    }
    transition.alpha = 1;

    // 落下アニメーションループ (約1.5秒)
    const startTime = performance.now();
    const duration = 1500;
    while (performance.now() - startTime < duration) {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;

        // 主人公のY座標 (上から下へ)
        transition.playerY = progress * (canvas.height + 150) - 75;

        // 粒子の移動 (下から上へ)
        transition.particles.forEach(p => {
            p.y -= p.speed;
            if (p.y < 0) p.y = canvas.height;
        });

        await new Promise(r => requestAnimationFrame(r));
    }

    initMap();
    player.hp = player.maxHp;
    player.isSpeeding = false; // 次のフロアに移動したら効果はきれる
    player.isExtraTurn = false;
    updateUI();

    if (floorLevel > 1) {
        transition.mode = 'FADE'; // 階層テキストを表示
        await new Promise(r => setTimeout(r, 800));
        for (let a = 1; a >= 0; a -= 0.1) { transition.alpha = a; await new Promise(r => setTimeout(r, 50)); }
    }

    transition.alpha = 0;
    transition.active = false;
    isPlayerVisible = false; // マップ表示後もアニメーション開始まで隠す

    // 着地アニメーションを実行
    await animateLanding();
    isProcessing = false;
}

async function animateItemGet(itemSymbol) {
    isProcessing = true;
    player.itemInHand = itemSymbol;
    SOUNDS.GET_WAND();

    // 演出時間 (800msに短縮：テンポ重視)
    await new Promise(r => setTimeout(r, 800));

    player.itemInHand = null;
    isProcessing = false;
}

async function processPickedItems(items) {
    for (const item of items) {
        if (item.symbol === SYMBOLS.WAND) {
            await animateItemGet(SYMBOLS.WAND);
            player.hasWand = true;
            if (floorLevel === 2) {
                await triggerWandEvent();
            } else {
                addLog("🚨 Obtained 'Magic Wand'! 🚨");
                addLog("TUTORIAL: You can now place blocks with [Space] + [Dir]!");
            }
        } else if (item.symbol === SYMBOLS.KEY) {
            await animateItemGet(SYMBOLS.KEY);
            player.hasKey = true;
            addLog("Picked up the KEY!");
            spawnFloatingText(item.x, item.y, "GOT KEY", "#fbbf24");
        } else if (item.symbol === SYMBOLS.SPEED) {
            await animateItemGet(SYMBOLS.TOME);
            player.hasteTomes++;
            addLog("📜 YOU DECIPHERED: 'Haste Tome'! (Press [E] to recite)");
            spawnFloatingText(item.x, item.y, "HASTE TOME IDENTIFIED", "#38bdf8");
        } else if (item.symbol === SYMBOLS.CHARM) {
            await animateItemGet(SYMBOLS.TOME);
            player.charmTomes++;
            addLog("📜 YOU DECIPHERED: 'Charm Tome'! (Press [C] to recite)");
            spawnFloatingText(item.x, item.y, "CHARM TOME IDENTIFIED", "#60a5fa");
        } else if (item.symbol === SYMBOLS.STEALTH) {
            await animateItemGet(SYMBOLS.TOME);
            player.stealthTomes++;
            addLog("📜 YOU DECIPHERED: 'Stealth Tome'! (Inventory to recite)");
            spawnFloatingText(item.x, item.y, "STEALTH TOME IDENTIFIED", "#94a3b8");
        } else if (item.symbol === SYMBOLS.SWORD) {
            await animateItemGet(SYMBOLS.SWORD);
            player.swordCount++;
            addLog(`🚨 You obtained a SWORD! (Attack: +3) 🚨`);
            spawnFloatingText(item.x, item.y, "ATTACK UP", "#38bdf8");
        } else if (item.symbol === SYMBOLS.ARMOR) {
            await animateItemGet(SYMBOLS.ARMOR);
            player.armorCount++;
            addLog(`Found ARMOR piece! (Defense: ${player.armorCount})`);
            spawnFloatingText(item.x, item.y, "DEFENSE UP", "#94a3b8");
        }
        updateUI();
    }
}

async function animateEnemyFall(e) {
    const fallHeight = 400;
    e.offsetY = -fallHeight;
    const fallDuration = 400;
    const startFall = performance.now();

    SOUNDS.FALL_WHIZ();
    while (performance.now() - startFall < fallDuration) {
        const elapsed = performance.now() - startFall;
        const p = Math.min(1, elapsed / fallDuration);
        e.offsetY = -fallHeight * (1 - p * p);
        await new Promise(r => requestAnimationFrame(r));
    }
    e.offsetY = 0;
    SOUNDS.LANDING_THUD();
    setScreenShake(8, 150);
}

async function showStoryPages(pages) {
    for (let i = 0; i < pages.length; i++) {
        const isLastPage = (i === pages.length - 1);
        storyMessage = {
            lines: pages[i],
            alpha: 0,
            showNext: !isLastPage
        };
        isTutorialInputActive = true;

        // フェードイン
        for (let a = 0; a <= 1; a += 0.05) {
            storyMessage.alpha = a;
            await new Promise(r => setTimeout(r, 20));
        }

        while (isTutorialInputActive) {
            await new Promise(r => requestAnimationFrame(r));
        }

        // フェードアウト
        for (let a = 1; a >= 0; a -= 0.05) {
            storyMessage.alpha = a;
            await new Promise(r => setTimeout(r, 20));
        }
        storyMessage = null;
        if (!isLastPage) await new Promise(r => setTimeout(r, 150));
    }
}

async function triggerStage1StaminaTutorial() {
    isProcessing = true;
    hasShownStage1Tut = true;
    await showStoryPages([
        [
            "Consecutive attacks cause fatigue,",
            "reducing your damage output.",
            "",
            "連続して攻撃すると",
            "腕が疲労して攻撃力が下がる。"
        ],
        [
            "It is wise to mix in movement or",
            "defense between your strikes.",
            "",
            "移動や防御をはさみながら",
            "攻撃したほうが良さそうだ。"
        ],
        [
            "Protect yourself with [Space].",
            "",
            "【スペースキー】で防御だ。"
        ]
    ]);
    isProcessing = false;
}

async function triggerWandEvent() {
    isProcessing = true;
    await new Promise(r => setTimeout(r, 600)); // 杖を取った後の余韻

    await showStoryPages([
        [
            "Obtained the Magic Wand.",
            "Use [Space] + [Arrows] to place blocks.",
            "",
            "魔法の杖を拾った。",
            "【スペースキー】＋【矢印キー】でブロックが置けるようだ。"
        ]
    ]);


    addLog("!!!? Something's falling from above!");

    // 敵を3体生成 (ばらけた位置に降らせる)
    const spawnPoints = [
        { x: 18, y: 10 }, // 上の方
        { x: 17, y: 13 }, // 下の方1
        { x: 20, y: 14 }  // 下の方2
    ];
    for (let i = 0; i < spawnPoints.length; i++) {
        const e = {
            type: 'NORMAL', x: spawnPoints[i].x, y: spawnPoints[i].y,
            hp: 5, maxHp: 5, flashUntil: 0, offsetX: 0, offsetY: -500, expValue: 5, stunTurns: 0
        };
        enemies.push(e);
        await animateEnemyFall(e);
        await new Promise(r => setTimeout(r, 200)); // どさどさとタイミングをずらす
    }

    await new Promise(r => setTimeout(r, 400));

    // 主人公がおどろいて跳ねる
    player.facing = 'LEFT'; // 左を向く
    addLog("Look out! Use the Wand's power!");
    animateBounce(player);
    SOUNDS.SELECT();
    await new Promise(r => setTimeout(r, 600));

    // 1ターン消費 (敵が近づいてくる)
    turnCount++;
    await enemyTurn();
    await new Promise(r => setTimeout(r, 600));

    // ブロックを上、左、下に設置
    addLog("Magic block! Protect yourself!");
    const blocks = [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }];
    for (const b of blocks) {
        const bx = player.x + b.dx; const by = player.y + b.dy;
        // マップの空き状況を確認 (稀に床以外に置こうとしないように)
        if (map[by][bx] === SYMBOLS.FLOOR || map[by][bx] === SYMBOLS.POISON) {
            tempWalls.push({ x: bx, y: by, hp: 2 });
            SOUNDS.SELECT();
            SOUNDS.MOVE();
            updateUI();
            await new Promise(r => setTimeout(r, 300));
        }
    }

    await new Promise(r => setTimeout(r, 500));
    isProcessing = false;
}

function gameLoop(now) {
    if (gameState === 'TITLE') {
        drawTitle();
    } else if (gameState === 'MENU') {
        draw(now);
        drawMenuScreen();
    } else if (gameState === 'STATUS') {
        draw(now);
        drawStatusScreen();
    } else if (gameState === 'INVENTORY') {
        draw(now);
        drawInventoryScreen();
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

    const menuY = canvas.height / 2 + 30;
    ctx.font = '24px Courier New';
    const options = ['START NEW GAME', 'CONTINUE', 'TEST PLAY'];
    const hasSave = localStorage.getItem('minimal_rogue_save') !== null;
    options.forEach((opt, i) => {
        const isSelected = titleSelection === i;
        const isDisabled = i === 1 && !hasSave;
        ctx.fillStyle = isDisabled ? '#333' : (isSelected ? '#fff' : '#666');
        let text = opt;
        if (i === 2) text = `TEST: FLOOR ${testFloor}`; // TEST PLAYの表示
        if (isSelected) {
            text = `> ${text} <`;
            if (i === 2) {
                // テストプレイ選択中のみ操作ガイドを出す
                ctx.font = '12px Courier New';
                ctx.fillStyle = '#888';
                ctx.fillText('Use [Left/Right] to change Floor', canvas.width / 2, menuY + i * 40 + 25);
                ctx.font = '24px Courier New';
            }
        }
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText(statusPage === 0 ? '-- STATUS (1/2) --' : '-- EQUIPMENT (2/2) --', canvas.width / 2, 80);

    ctx.textAlign = 'left';
    ctx.font = '16px Courier New';
    const startX = 80;
    const startY = 120;
    const gap = 25;

    if (statusPage === 0) {
        // Page 1: Base Stats
        const stats = [
            { label: "CHARACTER", val: "＠ (PLAYER)" },
            { label: "LEVEL", val: player.level },
            { label: "HP", val: `${player.hp} / ${player.maxHp}` },
            { label: "STAMINA", val: `${player.stamina} %`, desc: "攻撃で低下。移動や防御(Wait)で回復。" },
            { label: "EXP", val: `${player.exp} / ${player.nextExp}` },
            { label: "ATTACK", val: 2 + player.level + (player.swordCount * 3), desc: "レベル、剣、スタミナにより変動。" },
            { label: "DEFENSE", val: player.armorCount, desc: "鎧の補正値。防御(Wait)でさらに3軽減。" },
            { label: "FLOOR", val: `${floorLevel} F` },
            { label: "KILLS", val: player.totalKills },
            { label: "OBJECTIVE", val: "Destroy Core (B100F)" }
        ];

        stats.forEach((s, i) => {
            ctx.fillStyle = '#fff';
            ctx.font = '16px Courier New';
            ctx.fillText(s.label.padEnd(18, ' '), startX, startY + i * gap);
            ctx.fillText(s.val, startX + 220, startY + i * gap);
            if (s.desc) {
                // Mac/Windows 両対応の日本語フォントスタック
                ctx.font = '11px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
                ctx.fillText(s.desc, startX + 310, startY + i * gap);
            }
        });
    } else {
        // Page 2: Equipment Effects
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('EQUIPMENT EFFECTS', startX, startY);

        const jFont = '12px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
        const infoY = startY + 50;

        // --- Holy Sword ---
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
        ctx.fillText(SYMBOLS.SWORD, startX, infoY);

        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.fillText(`  Holy Sword (Lv${player.swordCount})`, startX, infoY);

        ctx.font = jFont;
        ctx.fillText(`  ・攻撃力が一振りにつき 3 上昇します。(現在: +${player.swordCount * 3})`, startX, infoY + 20);
        ctx.fillText(`  ・スタミナ満タン時は会心の一撃(ダメージ2倍)が出やすくなります。`, startX, infoY + 40);

        // --- Holy Armor ---
        const armorY = infoY + 90;
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${TILE_SIZE * 0.7}px 'Courier New'`;
        ctx.fillText(SYMBOLS.ARMOR, startX + 2, armorY - 2); // 微調整

        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.fillText(`  Holy Armor (Lv${player.armorCount})`, startX, armorY);

        ctx.font = jFont;
        ctx.fillText(`  ・受けるダメージを常に ${player.armorCount} 軽減します。`, startX, armorY + 20);
        ctx.fillText(`  ・防御(Wait)コマンド使用時は、さらにダメージを 30% 減少させます。`, startX, armorY + 40);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '13px Courier New';
    ctx.fillText('[Left/Right] Change Page  |  [X] or [I] to Back', canvas.width / 2, canvas.height - 65);
}

function drawMenuScreen() {
    const w = 240, h = 180;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Courier New';
    ctx.fillText('-- MENU --', canvas.width / 2, y + 40);

    const options = ["1. ITEMS", "2. STATUS"];
    ctx.textAlign = 'left';
    options.forEach((opt, i) => {
        ctx.font = '16px Courier New';
        ctx.fillStyle = '#fff';
        const textX = x + 60;
        const textY = y + 95 + i * 40;
        if (i === menuSelection) {
            ctx.fillText('>', textX - 25, textY);
        }
        ctx.fillText(opt, textX, textY);
    });
}

function drawInventoryScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('-- INVENTORY --', canvas.width / 2, 80);

    const fullItems = [
        { name: `${SYMBOLS.SPEED} Haste Tome`, count: player.hasteTomes, desc: "Recite the words to accelerate time." },
        { name: `${SYMBOLS.CHARM} Charm Tome`, count: player.charmTomes, desc: "Tame an adjacent enemy for this floor." }
    ];
    const items = fullItems.filter(it => it.count > 0);

    if (items.length === 0) {
        ctx.textAlign = 'center';
        ctx.font = '16px Courier New';
        ctx.fillText('(Empty)', canvas.width / 2, canvas.height / 2);
    } else {
        items.forEach((item, i) => {
            const iy = 140 + i * 60;
            if (i === inventorySelection) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(60, iy - 30, canvas.width - 120, 50);
            }
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.font = '18px Courier New';
            ctx.fillText(`${item.name}  x${item.count}`, 80, iy);

            ctx.font = '12px Courier New';
            ctx.fillStyle = '#fff';
            ctx.fillText(item.desc, 80, iy + 20);
        });
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '13px Courier New';
    ctx.fillText('Press [Enter] to Use / [X] to Back', canvas.width / 2, canvas.height - 65);
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
    ctx.shadowBlur = 0; // シャドウ設定を確実にリセット
    ctx.clearRect(-100, -100, canvas.width + 200, canvas.height + 200); // 余裕を持ってクリア
    ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y));
    ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const char = map[y][x];
            const px = x * TILE_SIZE; const py = y * TILE_SIZE;
            if (char === SYMBOLS.WALL) {
                // タイル全体を塗りつぶして「隙間」を消し、つながっている感を出す
                ctx.fillStyle = '#222';
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                // 壁の境界線（隣に壁がない方向のみ描画）を強調
                ctx.strokeStyle = '#888'; // より明るいグレー
                ctx.lineWidth = 2; // 太さを強調
                ctx.beginPath();
                // 上
                if (y === 0 || map[y - 1][x] !== SYMBOLS.WALL) { ctx.moveTo(px, py + 1); ctx.lineTo(px + TILE_SIZE, py + 1); }
                // 下
                if (y === ROWS - 1 || map[y + 1][x] !== SYMBOLS.WALL) { ctx.moveTo(px, py + TILE_SIZE - 1); ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE - 1); }
                // 左
                if (x === 0 || map[y][x - 1] !== SYMBOLS.WALL) { ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + TILE_SIZE); }
                // 右
                if (x === COLS - 1 || map[y][x + 1] !== SYMBOLS.WALL) { ctx.moveTo(px + TILE_SIZE - 1, py); ctx.lineTo(px + TILE_SIZE - 1, py + TILE_SIZE); }
                ctx.stroke();
            } else if (char === SYMBOLS.CORE) {
                // ダンジョンコア：光るオーブ
                ctx.save();
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 15 + Math.sin(now / 100) * 5;
                ctx.font = `bold ${TILE_SIZE * 1.2}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.restore();
            } else if (char === SYMBOLS.STAIRS || char === SYMBOLS.DOOR) {
                if (char === SYMBOLS.STAIRS) {
                    ctx.fillStyle = '#fff';
                    ctx.font = `bold ${TILE_SIZE * 1.05}px 'Courier New'`;
                    ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 1); // 1px下に微調整
                    ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
                } else {
                    // 鍵のかかった穴（DOOR）を強調
                    ctx.save();
                    ctx.fillStyle = '#fffbeb'; // ほんのり温かみのある白
                    ctx.shadowColor = '#fbbf24'; // 金色の光彩
                    ctx.shadowBlur = 10;
                    ctx.font = `bold ${TILE_SIZE * 1.05}px 'Courier New'`; // 通常の穴と同じサイズ感に
                    ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 1);
                    ctx.restore();
                }
            } else if (char === SYMBOLS.SAVE) {
                ctx.fillStyle = '#38bdf8'; ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else if (char === SYMBOLS.ARMOR) {
                ctx.fillStyle = '#38bdf8'; ctx.font = `bold ${TILE_SIZE * 0.7}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else if (char === SYMBOLS.WAND) {
                ctx.fillStyle = '#f472b6'; // ピンク（魔法の杖）
                ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else if (char === SYMBOLS.CHARM || char === SYMBOLS.SPEED) {
                ctx.fillStyle = '#fbbf24'; // 全ての魔導書を金色の同じ見た目にする
                ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
                ctx.fillText(SYMBOLS.TOME, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else if (char === SYMBOLS.POISON) {
                ctx.fillStyle = '#a855f7'; // 紫色を復旧
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            } else if (char === SYMBOLS.ICE) {
                // タイルをまたいで連続する斜線パターン
                ctx.save();
                ctx.beginPath();
                ctx.rect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.clip(); // タイル内に描画を制限

                // 背景：さらに深い青
                ctx.fillStyle = '#075985'; // Sky 800
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

                // 斜線：透明度を調整した水色
                ctx.strokeStyle = 'rgba(240, 249, 255, 0.3)'; // 透明度をさらに下げて背後に馴染ませる
                ctx.lineWidth = 1;
                ctx.beginPath();
                const spacing = 8;
                // px+pyの合計値を基準にオフセットを算出することで、全タイルで斜線の位置を同期させる
                const start = -((px + py) % spacing);
                for (let i = start; i <= TILE_SIZE * 2; i += spacing) {
                    ctx.moveTo(px + i, py);
                    ctx.lineTo(px + i - TILE_SIZE, py + TILE_SIZE);
                }
                ctx.stroke();
                ctx.restore();
            } else if (char === SYMBOLS.KEY) {
                ctx.fillStyle = '#fbbf24'; ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else if (char === SYMBOLS.SWORD) {
                ctx.fillStyle = '#38bdf8'; ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
                ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
            } else {
                ctx.fillStyle = '#444'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            }
        }
    }

    // 設置ブロックの描画
    tempWalls.forEach(w => {
        const px = w.x * TILE_SIZE; const py = w.y * TILE_SIZE;
        ctx.fillStyle = (w.hp === 1) ? '#aaa' : '#fff'; // 耐久度1なら少し暗く
        const char = (w.hp === 1) ? SYMBOLS.BLOCK_CRACKED : SYMBOLS.BLOCK;
        ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);

        // デバッグ用耐久度表示（必要ならコメントアウト解除）
        /*
        ctx.fillStyle = '#666';
        ctx.font = '10px Courier New';
        ctx.fillText(w.hp, px + TILE_SIZE - 5, py + TILE_SIZE - 5);
        ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
        */
    });

    enemies.forEach(e => {
        // 落下中の点滅処理 (100ms間隔)
        if (e.isFalling && Math.floor(now / 100) % 2 === 0) return;

        let isFlashing = now < e.flashUntil;
        if (e.stunTurns > 0) {
            isFlashing = Math.floor(now / 150) % 2 === 0;
        }

        // 味方と敵の共通色・スタイル設定
        let symbolColor = isFlashing ? '#fff' : (e.isAlly ? '#60a5fa' : '#f87171');
        let shadowColor = e.isAlly ? '#60a5fa' : (e.type === 'ORC' ? '#ef4444' : (e.type === 'GOLD' ? '#fbbf24' : 'red'));
        let shadowBlur = e.isAlly ? 10 : (e.type === 'ORC' ? 5 : (e.type === 'GOLD' ? 10 : (isFlashing ? 10 : 0)));

        ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
        ctx.fillStyle = symbolColor;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;

        if (e.type === 'SNAKE') {
            if (!e.isAlly) ctx.fillStyle = isFlashing ? '#fff' : '#ef4444';
            ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
            ctx.shadowBlur = e.isAlly ? 10 : 0;
            ctx.fillText(e.symbols[0], e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
            e.body.forEach((seg, i) => { ctx.fillText(e.symbols[i + 1], seg.x * TILE_SIZE + TILE_SIZE / 2, seg.y * TILE_SIZE + TILE_SIZE / 2); });
        } else if (e.type === 'GOLD') {
            if (!e.isAlly) ctx.fillStyle = isFlashing ? '#fff' : '#fbbf24';
            ctx.fillText(SYMBOLS.ENEMY, e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
        } else if (e.type === 'ORC') {
            if (!e.isAlly) ctx.fillStyle = isFlashing ? '#fff' : '#ef4444';
            ctx.font = `bold ${TILE_SIZE * 1.2}px 'Courier New'`;
            ctx.fillText(SYMBOLS.ORC, e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
        } else if (e.type === 'TURRET') {
            if (!e.isAlly) ctx.fillStyle = isFlashing ? '#fff' : '#ef4444';
            ctx.font = `bold ${TILE_SIZE * 1.2}px 'Courier New'`;
            ctx.fillText(SYMBOLS.TURRET, e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);

            // 方向インジケータ（小さな点）
            const range = TILE_SIZE * 0.4;
            const dx = [0, 1, 0, -1][e.dir];
            const dy = [-1, 0, 1, 0][e.dir];
            ctx.beginPath();
            ctx.arc(e.x * TILE_SIZE + TILE_SIZE / 2 + dx * range, e.y * TILE_SIZE + TILE_SIZE / 2 + dy * range, 2, 0, Math.PI * 2);
            ctx.fill();

            // レーザーの描画
            if (!e.isFalling && e.hp > 0) {
                const dx = [0, 1, 0, -1][e.dir];
                const dy = [-1, 0, 1, 0][e.dir];
                let lx = e.x + dx, ly = e.y + dy;
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 2 + Math.sin(now / 30) * 1;
                ctx.beginPath();
                ctx.moveTo(e.x * TILE_SIZE + TILE_SIZE / 2, e.y * TILE_SIZE + TILE_SIZE / 2);
                while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS) {
                    if (isWallAt(lx, ly)) {
                        ctx.lineTo(lx * TILE_SIZE + TILE_SIZE / 2, ly * TILE_SIZE + TILE_SIZE / 2);
                        break;
                    }
                    lx += dx; ly += dy;
                }
                if (lx < 0 || lx >= COLS || ly < 0 || ly >= ROWS) ctx.lineTo(lx * TILE_SIZE + TILE_SIZE / 2, ly * TILE_SIZE + TILE_SIZE / 2);
                ctx.stroke();
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
                ctx.restore();
            }
        } else {
            ctx.fillText(SYMBOLS.ENEMY, e.x * TILE_SIZE + TILE_SIZE / 2 + e.offsetX, e.y * TILE_SIZE + TILE_SIZE / 2 + e.offsetY);
        }
        ctx.shadowBlur = 0;
    });

    // ウィル・オ・ウィスプの描画
    wisps.forEach(w => {
        ctx.font = `${TILE_SIZE - 2}px 'Courier New'`; // フォントサイズを確実にリセット
        ctx.fillStyle = '#fff'; // 主人公と同じ白色
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.fillText(SYMBOLS.WISP, w.x * TILE_SIZE + TILE_SIZE / 2, w.y * TILE_SIZE + TILE_SIZE / 2);
        ctx.shadowBlur = 0;
    });

    const pFlashing = now < player.flashUntil;
    if (isPlayerVisible) {
        ctx.save();
        if (player.isStealth) ctx.globalAlpha = 0.5; // ステルス中は半透明
        ctx.fillStyle = pFlashing ? '#f87171' : '#fff';
        ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
        const px = player.x * TILE_SIZE + TILE_SIZE / 2 + player.offsetX;
        const py = player.y * TILE_SIZE + TILE_SIZE / 2 + player.offsetY;

        if (player.facing === 'RIGHT') {
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(-1, 1);
            ctx.fillText(SYMBOLS.PLAYER, 0, 0);
            ctx.restore();
        } else {
            ctx.fillText(SYMBOLS.PLAYER, px, py);
        }
        ctx.restore();

        // ゼルダ風アイテム持ち上げ描画
        if (player.itemInHand) {
            ctx.save();
            let itemColor = '#fff';
            if (player.itemInHand === SYMBOLS.SWORD || player.itemInHand === SYMBOLS.ARMOR) itemColor = '#38bdf8';
            else if (player.itemInHand === SYMBOLS.WAND) itemColor = '#f472b6';
            else if (player.itemInHand === SYMBOLS.KEY || player.itemInHand === SYMBOLS.TOME) itemColor = '#fbbf24';

            ctx.fillStyle = itemColor;
            ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
            ctx.fillText(player.itemInHand, px, py - TILE_SIZE - 5);
            ctx.restore();
        }
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
        ctx.save();
        ctx.globalAlpha = transition.alpha;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (transition.mode === 'FALLING') {
            // 背景の土の粒を描画
            ctx.fillStyle = '#444';
            transition.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // 落下する主人公
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${TILE_SIZE * 1.5}px 'Courier New'`;
            ctx.textAlign = 'center';
            ctx.fillText(SYMBOLS.PLAYER, canvas.width / 2, transition.playerY);
        } else {
            // 階層テキスト表示
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(transition.text, canvas.width / 2, canvas.height / 2);
        }
        ctx.restore();
    }
    ctx.restore(); // 冒頭の ctx.save() に対応

    // 物語のページのようなメッセージ表示
    if (storyMessage) {
        const lines = storyMessage.lines;
        const lineHeight = 20;
        const totalHeight = lines.length * lineHeight;
        const y = canvas.height - totalHeight - 25;

        ctx.save();
        ctx.globalAlpha = storyMessage.alpha;

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "italic 14px 'Courier New', sans-serif";

        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, y + i * lineHeight);
        });

        // 「次へ」の記号を表示
        if (storyMessage.showNext) {
            ctx.font = "bold 16px 'Courier New'";
            ctx.fillText("▼", canvas.width / 2, y + lines.length * lineHeight + 10);
        }

        ctx.restore();
    }

    // エンディング画面の描画
    if (gameState === 'ENDING') {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "italic 24px 'Courier New'";
        ctx.fillText("--- THE QUEST IS OVER ---", cx, cy - 60);

        ctx.font = "16px 'Courier New'";
        ctx.fillText("The core is silenced, the dungeon sleeps.", cx, cy - 20);
        ctx.fillText("You are the master of these depths.", cx, cy + 10);

        ctx.font = "bold 14px 'Courier New'";
        ctx.fillStyle = '#60a5fa';
        ctx.fillText("[ Placeholder Ending ]", cx, cy + 60);

        ctx.fillStyle = '#fff';
        ctx.font = "12px 'Courier New'";
        ctx.fillText("Press [Enter] to return to Title", cx, cy + 100);
    }
}

function addLog(msg) {
    const div = document.createElement('div'); div.innerText = msg; logElement.appendChild(div);
    while (logElement.childNodes.length > 5) { logElement.removeChild(logElement.firstChild); }
    logElement.scrollTop = logElement.scrollHeight;
}

function tryPlaceBlock(dx, dy) {
    if (!player.hasWand) return false;
    const bx = player.x + dx, by = player.y + dy;
    if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return false;

    // 床、毒沼、氷の上に設置可能
    const t = map[by][bx];
    const isPlaceable = (t === SYMBOLS.FLOOR || t === SYMBOLS.POISON || t === SYMBOLS.ICE);

    if (isPlaceable && !enemies.some(e => {
        if (e.x === bx && e.y === by) return true;
        if (e.type === 'SNAKE') return e.body.some(seg => seg.x === bx && seg.y === by);
        return false;
    }) && !wisps.some(w => w.x === bx && w.y === by) && !tempWalls.some(w => w.x === bx && w.y === by)) {
        tempWalls.push({ x: bx, y: by, hp: 2 });
        addLog("Constructed a block!");
        SOUNDS.SELECT();
        SOUNDS.MOVE();
        return true;
    }
    return false;
}

async function slidePlayer(dx, dy) {
    while (map[player.y][player.x] === SYMBOLS.ICE) {
        nextSlideAction = null;
        await new Promise(r => setTimeout(r, 60)); // スライド速度

        // 滑り中のアクションがあれば実行（ブロック設置）
        if (nextSlideAction) {
            const sdx = nextSlideAction.dx, sdy = nextSlideAction.dy;
            if (tryPlaceBlock(sdx, sdy)) {
                spaceUsedForBlock = true;
                // 進行方向に置いたら停止
                if (sdx === dx && sdy === dy) {
                    addLog("Stopped on ice by a block!");
                    break;
                }
            }
            nextSlideAction = null;
        }

        const nx = player.x + dx, ny = player.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || isWallAt(nx, ny)) {
            SOUNDS.MOVE(); // 壁に当たった
            break;
        }

        player.x = nx; player.y = ny;
        updateUI();
        draw();

        // 階段チェック
        if (map[player.y][player.x] === SYMBOLS.STAIRS) {
            addLog("You slid into the dark hole...");
            isPlayerVisible = false;
            floorLevel++;
            await startFloorTransition();
            break;
        }

        // 毒沼チェック
        if (map[player.y][player.x] === SYMBOLS.POISON) {
            player.hp -= 1; player.flashUntil = performance.now() + 200;
            spawnDamageText(player.x, player.y, 1, '#a855f7');
            SOUNDS.DAMAGE();
            if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
        }
    }
}

// エンディングへの遷移
async function triggerEnding() {
    isProcessing = true;
    gameState = 'ENDING_SEQ';
    SOUNDS.EXPLODE();
    setScreenShake(30, 2000);

    // コアが砕ける演出
    if (dungeonCore) map[dungeonCore.y][dungeonCore.x] = SYMBOLS.FLOOR;

    // ホワイトアウト
    transition.active = true;
    transition.mode = 'FADE';
    transition.text = "THE CORE IS DESTROYED";
    for (let a = 0; a <= 1; a += 0.05) {
        transition.alpha = a;
        await new Promise(r => setTimeout(r, 50));
    }

    gameState = 'ENDING';
    isProcessing = false;
}

async function handleAction(dx, dy) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (isProcessing) return;

    if (dx > 0) player.facing = 'RIGHT';
    else if (dx < 0) player.facing = 'LEFT';

    // ブロック設置モード
    if (isSpacePressed && (dx !== 0 || dy !== 0)) {
        if (tryPlaceBlock(dx, dy)) {
            spaceUsedForBlock = true;
            isProcessing = true;
            turnCount++;
            await enemyTurn();
            isProcessing = false;
        }
        return;
    }

    isProcessing = true;
    player.isDefending = false; // アクション開始時に防御状態を解除

    const nx = player.x + dx; const ny = player.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { isProcessing = false; return; }

    // ダンジョンコアへの攻撃チェック
    if (map[ny][nx] === SYMBOLS.CORE) {
        player.offsetX = dx * 10; player.offsetY = dy * 10;
        spawnSlash(nx, ny);
        SOUNDS.HIT();
        addLog("You struck the Dungeon Core!");

        dungeonCore.hp--;
        if (dungeonCore.hp <= 0) {
            await triggerEnding();
            return;
        }

        player.stamina = Math.max(0, player.stamina - 20);
        await new Promise(r => setTimeout(r, 200));
        player.offsetX = 0; player.offsetY = 0;

        if (!transition.active) {
            turnCount++;
            updateUI();
            await enemyTurn();
            isProcessing = false;
        }
        return;
    }

    const victim = enemies.find(e => {
        if (e.x === nx && e.y === ny) return true;
        if (e.type === 'SNAKE') return e.body.some(seg => seg.x === nx && seg.y === ny);
        return false;
    });

    // ブロックへの攻撃チェック
    const blockIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
    if (blockIdx !== -1 && !victim) {
        // 壁（ブロック）への攻撃
        const block = tempWalls[blockIdx];
        block.hp--;
        spawnSlash(nx, ny);
        SOUNDS.HIT();
        player.offsetX = dx * 10; player.offsetY = dy * 10;

        if (block.hp <= 0) {
            tempWalls.splice(blockIdx, 1);
            addLog("The block was broken!");
            SOUNDS.DEFEAT(); // 破壊音代わり
        } else {
            addLog("The block is cracked!");
        }

        player.stamina = Math.max(0, player.stamina - 20);
        await new Promise(r => setTimeout(r, 200));
        player.offsetX = 0; player.offsetY = 0;

        if (!transition.active) {
            turnCount++;
            updateUI();
            // ブロックが壊れた瞬間にレーザーが通る可能性があるので判定
            await applyLaserDamage();
            await enemyTurn();
            isProcessing = false;
        }
        return;
    }

    if (victim) {
        if (player.isStealth) {
            player.isStealth = false;
            addLog("Stealth broken by attack!");
        }
        player.offsetX = dx * 10; player.offsetY = dy * 10;
        await attackEnemy(victim, nx - player.x, ny - player.y, true);
        player.stamina = Math.max(0, player.stamina - 20);
        player.offsetX = 0; player.offsetY = 0;
    } else {
        player.stamina = Math.min(100, player.stamina + 20);
        const isBlockedByWall = map[ny][nx] === SYMBOLS.WALL;
        const isBlockedByTempWall = tempWalls.some(w => w.x === nx && w.y === ny);

        if (isBlockedByWall || isBlockedByTempWall) {
            player.offsetX = dx * 5; player.offsetY = dy * 5;
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
        } else {
            const nextTile = map[ny][nx];
            if (nextTile === SYMBOLS.DOOR) {
                if (player.hasKey) {
                    SOUNDS.UNLOCK();
                    map[ny][nx] = SYMBOLS.STAIRS;
                    addLog("The seal on the HOLE is broken!");
                    player.hasKey = false;
                    // 解錠演出として、その場にとどまる（nx, ny に移動しない）
                    player.offsetX = dx * 5; player.offsetY = dy * 5;
                    await new Promise(r => setTimeout(r, 200));
                    player.offsetX = 0; player.offsetY = 0;
                    // 以降の処理（player.x = nx など）をスキップして、敵のターンへ
                    if (!transition.active) { turnCount++; updateUI(); await moveWisps(); await enemyTurn(); isProcessing = false; }
                    return;
                } else {
                    addLog("The door is locked.");
                    player.offsetX = dx * 5; player.offsetY = dy * 5;
                    await new Promise(r => setTimeout(r, 100));
                    player.offsetX = 0; player.offsetY = 0;
                    if (!transition.active) { turnCount++; updateUI(); await moveWisps(); await enemyTurn(); isProcessing = false; }
                    return;
                }
            } else if (nextTile === SYMBOLS.SWORD) {
                map[ny][nx] = SYMBOLS.FLOOR; // 先に消す
                player.x = nx; player.y = ny;
                updateUI();
                await animateItemGet(SYMBOLS.SWORD);
                player.swordCount++;
                addLog(`🚨 You obtained a SWORD! (Attack: +3) 🚨`);
                spawnFloatingText(nx, ny, "ATTACK UP", "#38bdf8");
            } else if (nextTile === SYMBOLS.ARMOR) {
                map[ny][nx] = SYMBOLS.FLOOR;
                player.x = nx; player.y = ny;
                updateUI();
                await animateItemGet(SYMBOLS.ARMOR);
                player.armorCount++;
                addLog(`Found ARMOR piece! (Defense: ${player.armorCount})`);
                spawnFloatingText(nx, ny, "DEFENSE UP", "#94a3b8");
            } else {
                if (dx === 0 && dy === 0) {
                    player.isDefending = true;
                    SOUNDS.DEFEND();
                    addLog("🚨 DEFENSE MODE: Damage reduced! 🚨");
                }

                // Pick up items or interact
                if (nextTile === SYMBOLS.WAND) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.WAND);
                    player.hasWand = true;
                    if (floorLevel === 2) {
                        await triggerWandEvent();
                    } else {
                        addLog("🚨 Obtained 'Magic Wand'! 🚨");
                        addLog("TUTORIAL: You can now place blocks with [Space] + [Dir]!");
                    }
                } else if (nextTile === SYMBOLS.KEY) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.KEY);
                    player.hasKey = true;
                    addLog("Picked up the KEY!");
                    spawnFloatingText(nx, ny, "GOT KEY", "#fbbf24");
                } else if (nextTile === SYMBOLS.SPEED) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    player.hasteTomes++;
                    addLog("📜 YOU DECIPHERED: 'Haste Tome'! (Press [E] to recite)");
                    spawnFloatingText(nx, ny, "HASTE TOME IDENTIFIED", "#38bdf8");
                } else if (nextTile === SYMBOLS.CHARM) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    player.charmTomes++;
                    addLog("📜 YOU DECIPHERED: 'Charm Tome'! (Press [C] to recite)");
                    spawnFloatingText(nx, ny, "CHARM TOME IDENTIFIED", "#60a5fa");
                } else if (nextTile === SYMBOLS.STEALTH) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    player.stealthTomes++;
                    addLog("📜 YOU DECIPHERED: 'Stealth Tome'! (Inventory to recite)");
                    spawnFloatingText(nx, ny, "STEALTH TOME IDENTIFIED", "#94a3b8");
                } else if (nextTile === SYMBOLS.SAVE) {
                    saveGame();
                }
            }
            player.x = nx; player.y = ny;
            SOUNDS.MOVE();

            // 氷のスライド処理
            if (map[player.y][player.x] === SYMBOLS.ICE && (dx !== 0 || dy !== 0)) {
                await slidePlayer(dx, dy);
            }

            if (nextTile === SYMBOLS.STAIRS) {
                addLog("You fall into the dark hole...");
                isPlayerVisible = false;
                floorLevel++;
                await startFloorTransition();
            }
        }
    }

    // 毒沼ダメージ（プレイヤー）
    if (map[player.y][player.x] === SYMBOLS.POISON) {
        player.hp -= 1;
        player.flashUntil = performance.now() + 200;
        spawnDamageText(player.x, player.y, 1, '#a855f7');
        SOUNDS.DAMAGE();
        if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
    }

    // ステージ1の中央部屋進入チェック
    if (floorLevel === 1 && !hasShownStage1Tut && player.x >= 18 && player.x <= 25 && player.y >= 10 && player.y <= 14) {
        await triggerStage1StaminaTutorial();
    }

    if (!transition.active) {
        if (player.isSpeeding && !player.isExtraTurn) {
            // 加速時は、1回目の行動の後は敵のターンを無視する
            player.isExtraTurn = true;
            updateUI();
            addLog("Time accelerates! (Extra Action)");
            isProcessing = false;
            return; // 敵のターンを呼ばずに終了（次の入力を待つ）
        }
        player.isExtraTurn = false; // 2回行動終了または通常時

        turnCount++;
        updateUI();
        await moveWisps();
        await enemyTurn();
        isProcessing = false;
    }
}

async function moveWisps() {
    const dirs = [
        { x: 0, y: -1 }, // 北
        { x: 1, y: 0 },  // 東
        { x: 0, y: 1 },  // 南
        { x: -1, y: 0 }  // 西
    ];

    for (const w of wisps) {
        // 移動前の接触判定
        checkWispDamage(w);

        if (w.mode === 'STRAIGHT') {
            const nx = w.x + dirs[w.dir].x;
            const ny = w.y + dirs[w.dir].y;
            if (!isWallAt(nx, ny)) {
                w.x = nx;
                w.y = ny;
            } else {
                w.mode = 'FOLLOW';
                w.dir = (w.dir + 3) % 4;
                if (!isWallAt(w.x + dirs[w.dir].x, w.y + dirs[w.dir].y)) {
                    w.x += dirs[w.dir].x;
                    w.y += dirs[w.dir].y;
                }
            }
        } else {
            // FOLLOWモード（右手法）
            const hasWallNearby = [
                { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
                { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }
            ].some(d => isWallAt(w.x + d.x, w.y + d.y));

            if (!hasWallNearby) {
                w.mode = 'STRAIGHT';
                const nx = w.x + dirs[w.dir].x;
                const ny = w.y + dirs[w.dir].y;
                if (!isWallAt(nx, ny)) { w.x = nx; w.y = ny; }
            } else {
                const checkOrder = [1, 0, 3, 2];
                for (const offset of checkOrder) {
                    const nextDir = (w.dir + offset) % 4;
                    const cnx = w.x + dirs[nextDir].x;
                    const cny = w.y + dirs[nextDir].y;
                    if (!isWallAt(cnx, cny)) {
                        w.x = cnx;
                        w.y = cny;
                        w.dir = nextDir;
                        break;
                    }
                }
            }
        }
        // 移動後の接触判定
        checkWispDamage(w);
    }

    // 死亡判定とクリーンアップを一括で行う
    enemies = enemies.filter(e => {
        if (e.hp <= 0) {
            handleEnemyDeath(e);
            return false;
        }
        return true;
    });
}

// ウィルとの接触ダメージ判定
function checkWispDamage(w) {
    // プレイヤーとの接触
    if (player.x === w.x && player.y === w.y) {
        const dmg = 10;
        player.hp -= dmg;
        player.flashUntil = performance.now() + 200;
        spawnDamageText(player.x, player.y, dmg, '#fff');
        SOUNDS.DAMAGE();
        addLog("ZAP! Touched a Wisp!");
        if (player.hp <= 0) triggerGameOver();
    }

    // 敵との接触
    for (const e of enemies) {
        let hit = (e.x === w.x && e.y === w.y);
        if (!hit && e.type === 'SNAKE') {
            hit = e.body.some(b => b.x === w.x && b.y === w.y);
        }
        if (hit) {
            const dmg = 20;
            e.hp -= dmg;
            e.flashUntil = performance.now() + 200;
            spawnDamageText(w.x, w.y, dmg, '#fff');
            if (e.hp <= 0) {
                handleEnemyDeath(e);
            }
        }
    }
}

function handleEnemyDeath(enemy) {
    if (enemy._dead) return; // 二重処理防止
    enemy._dead = true;

    SOUNDS.DEFEAT();
    enemies = enemies.filter(e => e !== enemy);
    player.totalKills++;
    gainExp(enemy.expValue || 5);

    if (enemy.type === 'SNAKE') {
        addLog("The giant ENEMY was defeated!");
        // 1〜3つのアイテムをランダムにドロップ
        const count = Math.floor(Math.random() * 3) + 1;
        const potentialTiles = [];
        for (let dy2 = -1; dy2 <= 1; dy2++) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
                const tx = enemy.x + dx2;
                const ty = enemy.y + dy2;
                if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS) {
                    const t = map[ty][tx];
                    // 確実に床（または氷、毒沼）であり、穴や壁ではない場所を候補にする
                    if (t === SYMBOLS.FLOOR || t === SYMBOLS.ICE || t === SYMBOLS.POISON) {
                        potentialTiles.push({ x: tx, y: ty });
                    }
                }
            }
        }

        let droppedCount = 0;
        for (let i = 0; i < count && potentialTiles.length > 0; i++) {
            const idx = Math.floor(Math.random() * potentialTiles.length);
            const tile = potentialTiles.splice(idx, 1)[0];
            const drop = Math.random() < 0.5 ? SYMBOLS.SWORD : SYMBOLS.ARMOR;
            map[tile.y][tile.x] = drop;
            droppedCount++;
        }
        addLog(`The monster dropped ${droppedCount} item(s)!`);
        spawnFloatingText(enemy.x, enemy.y, "LUXURY DROP!!", "#fbbf24");
    }
    if (enemy.type === 'GOLD') addLog("Caught the Golden Shiny!");
}

async function attackEnemy(enemy, dx, dy, isMain = true) {
    spawnSlash(player.x + dx, player.y + dy); if (isMain) SOUNDS.HIT();
    if (isMain) { player.offsetX = dx * 10; player.offsetY = dy * 10; }
    const staminaFactor = Math.max(0.3, player.stamina / 100);
    let damage = Math.max(1, Math.floor((2 + player.level + (player.swordCount * 3)) * staminaFactor));
    let isCritical = Math.random() < 0.10; // 10%のかいしんの一撃

    const targetX = player.x + dx;
    const targetY = player.y + dy;
    if (enemy.type === 'SNAKE' && targetX === enemy.x && targetY === enemy.y) {
        const stun = Math.floor(Math.random() * 3) + 1;
        enemy.stunTurns = Math.max(enemy.stunTurns || 0, stun);
        addLog("Critical Hit to the HEAD! The Snake is stunned!");
        spawnFloatingText(enemy.x, enemy.y, `STUNNED ${stun}T`, "#fff");
    } else if (enemy.type !== 'SNAKE' && Math.random() < 0.15) {
        // 通常の敵も15%の確率で1ターンスタン
        enemy.stunTurns = Math.max(enemy.stunTurns || 0, 1);
        addLog("The enemy is stunned!");
        spawnFloatingText(enemy.x, enemy.y, "STUNNED!", "#fff");
    }

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
        handleEnemyDeath(enemy);
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

async function animateLanding() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isProcessing = true;
    isPlayerVisible = false;

    player.offsetX = 0;
    const fallHeight = 400;
    player.offsetY = -fallHeight;

    // 座標のセットが完了してから、次の描画フレームで表示されるようにする
    await new Promise(r => requestAnimationFrame(r));
    isPlayerVisible = true;

    // 落下フェーズ (加速)
    const fallDuration = 450;
    const startFall = performance.now();
    while (performance.now() - startFall < fallDuration) {
        const elapsed = performance.now() - startFall;
        const p = Math.min(1, elapsed / fallDuration);
        player.offsetY = -fallHeight * (1 - p * p);
        await new Promise(r => requestAnimationFrame(r));
    }

    player.offsetY = 0;
    SOUNDS.LANDING_THUD(); // 修正：正しい関数名を呼ぶ
    setScreenShake(12, 200);

    // バウンドフェーズ (どんっ、と跳ねる)
    const bounceDuration = 400;
    const startBounce = performance.now();
    while (performance.now() - startBounce < bounceDuration) {
        const elapsed = performance.now() - startBounce;
        const p = elapsed / bounceDuration;
        // 1回小さく跳ねる
        player.offsetY = -Math.sin(p * Math.PI) * 20 * (1 - p);
        await new Promise(r => requestAnimationFrame(r));
    }
    player.offsetY = 0;
    isProcessing = false;
}

async function enemyTurn() {
    let attackOccurred = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.hp <= 0) continue;

        // 毒沼
        if (map[e.y][e.x] === SYMBOLS.POISON) {
            e.hp -= 1; e.flashUntil = performance.now() + 100;
            spawnDamageText(e.x, e.y, 1, '#a855f7');
            if (e.hp <= 0) { handleEnemyDeath(e); continue; }
        }

        if (e.stunTurns > 0) {
            e.stunTurns--;
            addLog("Enemy is stunned...");
            continue;
        }

        // タレットは移動・通常攻撃をしない
        if (e.type === 'TURRET') continue;

        if (e.isAlly) {
            // 味方：近くに敵がいれば攻撃・追従、いなければプレイヤーを追いかける
            const targets = enemies.filter(target => !target.isAlly && target.hp > 0);
            let bestTarget = null;
            let minDist = 999;

            targets.forEach(t => {
                const d = Math.abs(t.x - e.x) + Math.abs(t.y - e.y);
                if (d < minDist) { minDist = d; bestTarget = t; }
            });

            if (bestTarget && minDist <= 8) {
                // 敵を優先して行動
                if (minDist === 1) {
                    // 攻撃
                    spawnSlash(bestTarget.x, bestTarget.y);
                    e.offsetX = (bestTarget.x - e.x) * 10; e.offsetY = (bestTarget.y - e.y) * 10;

                    // 味方の攻撃力計算 (オークなら強い)
                    let dmg = (e.type === 'ORC' ? 15 : (e.type === 'SNAKE' ? 10 : 5)) + Math.floor(floorLevel / 2);
                    bestTarget.hp -= dmg;
                    bestTarget.flashUntil = performance.now() + 100;
                    spawnDamageText(bestTarget.x, bestTarget.y, dmg, '#fff');
                    attackOccurred = true;

                    if (bestTarget.hp <= 0) handleEnemyDeath(bestTarget);
                    else if (e.type === 'ORC') {
                        // 味方オークによる突き飛ばし
                        addLog("Ally Orc's mighty blow sends the enemy flying!");
                        SOUNDS.FATAL();
                        let kx = bestTarget.x - e.x, ky = bestTarget.y - e.y;
                        const isRealWall = (tx, ty) => {
                            if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
                            return (map[ty][tx] === SYMBOLS.WALL || map[ty][tx] === SYMBOLS.DOOR);
                        };
                        // 背後が真の壁なら別の方向へ（ブロックは破壊できるので無視）
                        if (isRealWall(bestTarget.x + kx, bestTarget.y + ky)) {
                            const cands = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
                            for (const c of cands) {
                                if (bestTarget.x + c.x === e.x && bestTarget.y + c.y === e.y) continue;
                                if (!isRealWall(bestTarget.x + c.x, bestTarget.y + c.y)) { kx = c.x; ky = c.y; break; }
                            }
                        }

                        let slideSteps = 0;
                        while (slideSteps < 10) {
                            const nx = bestTarget.x + kx, ny = bestTarget.y + ky;
                            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || map[ny][nx] === SYMBOLS.WALL || map[ny][nx] === SYMBOLS.DOOR) {
                                SOUNDS.EXPLODE(); break;
                            }
                            const bwIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
                            if (bwIdx !== -1) {
                                tempWalls.splice(bwIdx, 1);
                                addLog("CRASH! The enemy smashed the block!");
                                SOUNDS.EXPLODE(); setScreenShake(10, 200);
                            }

                            if (bestTarget.type === 'SNAKE') {
                                for (let i = bestTarget.body.length - 1; i > 0; i--) {
                                    bestTarget.body[i].x = bestTarget.body[i - 1].x;
                                    bestTarget.body[i].y = bestTarget.body[i - 1].y;
                                }
                                bestTarget.body[0].x = nx; bestTarget.body[0].y = ny;
                            }
                            bestTarget.x = nx; bestTarget.y = ny;
                            slideSteps++;
                            draw();
                            await new Promise(r => setTimeout(r, 40));
                            if (map[bestTarget.y][bestTarget.x] === SYMBOLS.STAIRS) {
                                addLog("The enemy was knocked into the hole!");
                                bestTarget.hp = 0; break;
                            }
                        }
                        if (bestTarget.hp <= 0) handleEnemyDeath(bestTarget);
                    }
                    await new Promise(r => setTimeout(r, 100)); // わずかに短縮
                    e.offsetX = 0; e.offsetY = 0;
                } else {
                    // 敵に接近
                    const oldPos = { x: e.x, y: e.y };
                    const dx = bestTarget.x - e.x, dy = bestTarget.y - e.y;
                    let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);

                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (canEnemyMove(e.x + sx, e.y)) e.x += sx;
                        else if (canEnemyMove(e.x, e.y + sy)) e.y += sy;
                    } else {
                        if (canEnemyMove(e.x, e.y + sy)) e.y += sy;
                        else if (canEnemyMove(e.x + sx, e.y)) e.x += sx;
                    }
                    SOUNDS.MOVE();
                }
            } else {
                // 敵がいないのでプレイヤーを追いかける (距離1を保つ)
                const distToPlayer = Math.abs(player.x - e.x) + Math.abs(player.y - e.y);
                if (distToPlayer > 1) {
                    const dx = player.x - e.x, dy = player.y - e.y;
                    let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);
                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (canEnemyMove(e.x + sx, e.y)) e.x += sx;
                        else if (canEnemyMove(e.x, e.y + sy)) e.y += sy;
                    } else {
                        if (canEnemyMove(e.x, e.y + sy)) e.y += sy;
                        else if (canEnemyMove(e.x + sx, e.y)) e.x += sx;
                    }
                }
            }

            // 穴チェック (味方も落ちる)
            if (map[e.y][e.x] === SYMBOLS.STAIRS) {
                e.isFalling = true;
                addLog("An ally fell into the HOLE!");
                SOUNDS.FALL_WHIZ();
                await new Promise(r => setTimeout(r, 1000));
                handleEnemyDeath(e);
            }
            continue;
        }
        // 通常の敵：プレイヤー（姿が見えれば）または近くの味方を狙う
        const targets = [];
        if (!player.isStealth) targets.push({ x: player.x, y: player.y, isPlayer: true });
        enemies.filter(ally => ally.isAlly).forEach(ally => targets.push({ x: ally.x, y: ally.y, isAlly: true, obj: ally }));

        // ターゲットがいない（ステルス中かつ味方がいない）場合は待機
        if (targets.length === 0) {
            continue;
        }

        // 最も近いターゲットを探す
        let bestTarget = targets[0]; // デフォルトはプレイヤー
        let minDist = Math.abs(player.x - e.x) + Math.abs(player.y - e.y);

        targets.forEach(t => {
            const d = Math.abs(t.x - e.x) + Math.abs(t.y - e.y);
            if (d < minDist) { minDist = d; bestTarget = t; }
        });

        if (e.type === 'GOLD' && minDist <= 8) {
            // GOLDは逃走のみ
            const moves = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            let bestMove = { x: e.x, y: e.y, score: minDist };
            moves.forEach(m => {
                if (canEnemyMove(e.x + m.x, e.y + m.y)) {
                    const nDist = Math.abs(player.x - (e.x + m.x)) + Math.abs(player.y - (e.y + m.y));
                    if (nDist > bestMove.score) bestMove = { x: e.x + m.x, y: e.y + m.y, score: nDist };
                }
            });
            if (bestMove.x !== e.x || bestMove.y !== e.y) {
                SOUNDS.GOLD_FLIGHT(); e.x = bestMove.x; e.y = bestMove.y;
            }
        } else if (minDist === 1) {
            // 攻撃演出
            if (e.type === 'ORC') {
                // オーク専用：溜め演出を大幅に強化
                const kx = bestTarget.x - e.x, ky = bestTarget.y - e.y;
                const baseOX = -kx * 18, baseOY = -ky * 18; // 1マスの9割近く身を引く

                SOUNDS.SELECT(); // 溜め開始の合図

                // グッと身を引き、小刻みに震えて力を溜める
                for (let i = 0; i < 6; i++) {
                    e.offsetX = baseOX + (Math.random() - 0.5) * 4;
                    e.offsetY = baseOY + (Math.random() - 0.5) * 4;
                    draw();
                    await new Promise(r => setTimeout(r, 40));
                }

                // 限界まで溜めて赤く光る（フラッシュ演出）
                e.flashUntil = performance.now() + 150;
                e.offsetX = baseOX; e.offsetY = baseOY;
                draw();
                await new Promise(r => setTimeout(r, 100));

                // 勢いよくぶつかる
                e.offsetX = kx * 12; e.offsetY = ky * 12;
            } else {
                // 通常の攻撃演出
                e.offsetX = (bestTarget.x - e.x) * 10; e.offsetY = (bestTarget.y - e.y) * 10;
            }

            spawnSlash(bestTarget.x, bestTarget.y);

            if (bestTarget.isPlayer) {
                // プレイヤーへの攻撃（既存ロジック）
                let damage = Math.max(1, (Math.floor(floorLevel / 2) + (e.type === 'SNAKE' ? 5 : (e.type === 'ORC' ? 10 : 1))) - player.armorCount);
                if (player.isDefending) {
                    if (Math.random() < 0.03) { SOUNDS.PARRY(); spawnFloatingText(player.x, player.y, "PARRY!", "#fff"); damage = 0; }
                    else damage = Math.max(1, Math.floor(damage * 0.7));
                }
                if (damage > 0) {
                    const fatal = Math.random() < 0.05;
                    if (fatal) { damage *= 3; SOUNDS.FATAL(); setScreenShake(15, 400); addLog("💥 FATAL BLOW! 💥"); }
                    else SOUNDS.DAMAGE();
                    player.hp -= damage; player.flashUntil = performance.now() + 200;
                    spawnDamageText(player.x, player.y, damage, fatal ? '#ff0000' : '#ffffff');
                    if (player.hp <= 0) { player.hp = 0; updateUI(); }

                    // オークの吹き飛ばし攻撃
                    if (e.type === 'ORC') {
                        addLog("The Orc's mighty blow sends you flying!");
                        SOUNDS.FATAL(); // 重い音
                        setScreenShake(20, 500);

                        let kx = player.x - e.x;
                        let ky = player.y - e.y;

                        const isRealWall = (tx, ty) => {
                            if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
                            return (map[ty][tx] === SYMBOLS.WALL || map[ty][tx] === SYMBOLS.DOOR);
                        };

                        // 背後が真の壁がある場合のみ、逃げ道（ブロックがある道も含む）を探す
                        if (isRealWall(player.x + kx, player.y + ky)) {
                            const candidates = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
                            for (const c of candidates) {
                                if (player.x + c.x === e.x && player.y + c.y === e.y) continue;
                                if (!isRealWall(player.x + c.x, player.y + c.y)) {
                                    kx = c.x; ky = c.y; // 新しい突き飛ばし方向に決定
                                    break;
                                }
                            }
                        }

                        // 吹き飛ばしスライド
                        let slideSteps = 0;
                        let pickedDuringSlide = [];
                        while (slideSteps < 100) {
                            const nx = player.x + kx;
                            const ny = player.y + ky;

                            // 真の壁判定
                            const isRealWall = (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || map[ny][nx] === SYMBOLS.WALL || map[ny][nx] === SYMBOLS.DOOR);

                            if (isRealWall) {
                                SOUNDS.EXPLODE();
                                setScreenShake(10, 200);
                                break;
                            }

                            // 通過タイトルのアイテム回収判定
                            const nextTile = map[ny][nx];
                            const itemSymbols = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.KEY, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.WAND];
                            if (itemSymbols.includes(nextTile)) {
                                pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
                                map[ny][nx] = SYMBOLS.FLOOR; // 即座に消す
                            }

                            // 設置ブロックとの衝突判定：破壊して突き進む
                            const blockIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
                            if (blockIdx !== -1) {
                                tempWalls.splice(blockIdx, 1);
                                addLog("CRASH! Your flying body SMASHED the block and kept going!");
                                SOUNDS.EXPLODE();
                                setScreenShake(20, 300);
                                spawnFloatingText(nx, ny, "SMASH!!", "#ffffff");
                                // 停止せず継続（通り抜ける）
                            }

                            player.x = nx;
                            player.y = ny;
                            slideSteps++;

                            // 進路上の敵に衝突
                            const hitEnemies = enemies.filter(targetE => {
                                if (targetE === e) return false;
                                if (targetE.x === nx && targetE.y === ny) return true;
                                if (targetE.type === 'SNAKE' && targetE.body.some(b => b.x === nx && b.y === ny)) return true;
                                return false;
                            });

                            for (const targetE of hitEnemies) {
                                const colDmg = 8 + Math.floor(floorLevel / 2);
                                targetE.hp -= colDmg;
                                targetE.flashUntil = performance.now() + 150;
                                spawnDamageText(targetE.x, targetE.y, colDmg, '#ef4444');
                                SOUNDS.DAMAGE();
                                addLog("BUMP! An enemy was hit by your flying body!");

                                const adjs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
                                for (const adj of adjs) {
                                    const ax = targetE.x + adj.dx, ay = targetE.y + adj.dy;
                                    if (ax >= 0 && ax < COLS && ay >= 0 && ay < ROWS && map[ay][ax] === SYMBOLS.FLOOR && !enemies.some(ee => ee.x === ax && ee.y === ay)) {
                                        targetE.x = ax; targetE.y = ay;
                                        break;
                                    }
                                }
                                if (targetE.hp <= 0) handleEnemyDeath(targetE);
                            }

                            draw();
                            await new Promise(r => setTimeout(r, 40));

                            // 途中で穴に落ちたら即座に次のフロアへ
                            if (map[player.y][player.x] === SYMBOLS.STAIRS) {
                                addLog("You were knocked into the dark hole!");
                                isPlayerVisible = false;
                                floorLevel++;
                                if (pickedDuringSlide.length > 0) await processPickedItems(pickedDuringSlide);
                                await startFloorTransition();
                                return;
                            }
                        }
                        if (pickedDuringSlide.length > 0) await processPickedItems(pickedDuringSlide);
                        await new Promise(r => setTimeout(r, 200));
                    }

                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                }
            } else {
                // 味方への攻撃
                const dmg = 4 + floorLevel;
                bestTarget.obj.hp -= dmg;
                bestTarget.obj.flashUntil = performance.now() + 100;
                spawnDamageText(bestTarget.x, bestTarget.y, dmg, '#f87171');
                if (bestTarget.obj.hp <= 0) handleEnemyDeath(bestTarget.obj);
            }
            attackOccurred = true;
            await new Promise(r => setTimeout(r, 150));
            e.offsetX = 0; e.offsetY = 0;
        } else if (minDist <= 8) {
            // 接近
            const oldPos = { x: e.x, y: e.y };
            const dx = bestTarget.x - e.x, dy = bestTarget.y - e.y;
            let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);
            let moved = false;

            // 通常の移動
            if (Math.abs(dx) > Math.abs(dy)) {
                if (canEnemyMove(e.x + sx, e.y)) { e.x += sx; moved = true; }
                else if (canEnemyMove(e.x, e.y + sy)) { e.y += sy; moved = true; }
            } else {
                if (canEnemyMove(e.x, e.y + sy)) { e.y += sy; moved = true; }
                else if (canEnemyMove(e.x + sx, e.y)) { e.x += sx; moved = true; }
            }

            if (moved) {
                if (e.type === 'SNAKE') {
                    SOUNDS.SNAKE_MOVE();
                    for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                    e.body[0] = oldPos;
                }

                // 敵の氷スライド
                let esx = e.x - oldPos.x, esy = e.y - oldPos.y;
                while (map[e.y][e.x] === SYMBOLS.ICE) {
                    const nx = e.x + esx, ny = e.y + esy;
                    if (nx === e.x && ny === e.y) break; // 無限ループ回避
                    if (!canEnemyMove(nx, ny)) break;
                    const oldEPos = { x: e.x, y: e.y };
                    e.x = nx; e.y = ny;
                    if (e.type === 'SNAKE') {
                        for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                        e.body[0] = oldEPos;
                    }
                    draw();
                    // 穴に落ちるなどのチェック
                    if (map[e.y][e.x] === SYMBOLS.STAIRS) {
                        e.isFalling = true;
                        addLog("An enemy slid into the HOLE!");
                        break;
                    }
                    await new Promise(r => setTimeout(r, 40));
                }
            }
            wisps.forEach(w => checkWispDamage(w));
            if (map[e.y][e.x] === SYMBOLS.STAIRS || e.isFalling) {
                if (!e.isFalling) {
                    e.isFalling = true;
                    addLog("An enemy fell into the HOLE!");
                }
                SOUNDS.FALL_WHIZ();
                await new Promise(r => setTimeout(r, 800)); // 待機を少し短縮
                handleEnemyDeath(e);
                continue;
            }
        }
    }
    if (!attackOccurred && enemies.length > 0) await new Promise(r => setTimeout(r, 50));

    // ターンの最後にレーザー判定
    await applyLaserDamage();
}

async function applyLaserDamage() {
    for (const e of enemies) {
        if (e.type === 'TURRET' && e.hp > 0 && !e.isFalling) {
            const dx = [0, 1, 0, -1][e.dir];
            const dy = [-1, 0, 1, 0][e.dir];
            let lx = e.x + dx, ly = e.y + dy;
            while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS) {
                // プレイヤー判定
                if (player.x === lx && player.y === ly) {
                    const lDmg = 5 + Math.floor(floorLevel / 5);
                    player.hp -= lDmg; player.flashUntil = performance.now() + 200;
                    spawnDamageText(player.x, player.y, lDmg, '#f87171');
                    addLog("🚨 LASERED! Burn damage! 🚨");
                    SOUNDS.DAMAGE();
                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                }
                // 他の敵判定 (味方含む)
                enemies.forEach(oe => {
                    if (oe !== e && oe.hp > 0 && !oe._dead) {
                        const enemyLaserDmg = 50 + floorLevel * 5;
                        if (oe.x === lx && oe.y === ly) {
                            oe.hp -= enemyLaserDmg; oe.flashUntil = performance.now() + 100;
                            spawnDamageText(oe.x, oe.y, enemyLaserDmg, '#f87171');
                            if (oe.hp <= 0) handleEnemyDeath(oe);
                        } else if (oe.type === 'SNAKE' && oe.body.some(s => s.x === lx && s.y === ly)) {
                            oe.hp -= enemyLaserDmg; oe.flashUntil = performance.now() + 100;
                            spawnDamageText(lx, ly, enemyLaserDmg, '#f87171');
                            if (oe.hp <= 0) handleEnemyDeath(oe);
                        }
                    }
                });
                if (isWallAt(lx, ly)) break;
                // isWallAtは設置ブロックも含むので、ここで遮断される
                lx += dx; ly += dy;
            }
        }
    }
}

function canEnemyMove(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (map[y][x] === SYMBOLS.WALL || map[y][x] === SYMBOLS.DOOR) return false;
    if (tempWalls.some(w => w.x === x && w.y === y)) return false;
    if (player.x === x && player.y === y) return false;

    // レーザーの経路は避ける
    if (isTileInLaser(x, y)) return false;

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
    player.hp = 0; updateUI(); // HPを確実に0にしてUIへ反映
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

function isTileInLaser(x, y) {
    for (const e of enemies) {
        if (e.type === 'TURRET' && e.hp > 0 && !e.isFalling) {
            const dx = [0, 1, 0, -1][e.dir];
            const dy = [-1, 0, 1, 0][e.dir];
            let lx = e.x + dx, ly = e.y + dy;
            while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS) {
                if (lx === x && ly === y) return true;
                if (isWallAt(lx, ly)) break; // 壁や設置ブロックで遮断
                lx += dx; ly += dy;
            }
        }
    }
    return false;
}

async function startGame(startFloor = 1) {
    // 画面の揺れと状態をリセット
    screenShake.x = 0; screenShake.y = 0; screenShake.until = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    player = {
        x: 0, y: 0, hp: 30, maxHp: 30, level: startFloor, exp: 0, nextExp: 10,
        stamina: 100, swordCount: 0, armorCount: 0,
        hasteTomes: 0, charmTomes: 0, stealthTomes: 0, isSpeeding: false, isStealth: false, isExtraTurn: false,
        facing: 'LEFT',
        totalKills: 0, offsetX: 0, offsetY: 0, flashUntil: 0,
        hasSword: false, hasKey: false, isDefending: false,
        hasWand: (startFloor >= 2),
        itemInHand: null
    };

    // レベルに合わせてステータスを補正
    player.maxHp = 20 + (player.level * 10);
    player.hp = player.maxHp;
    player.nextExp = player.level * 10;

    isPlayerVisible = false; // 着地まで隠す
    gameOverAlpha = 0;
    floorLevel = startFloor; turnCount = 0; tempWalls = []; wisps = [];
    initMap(); // 描画エラーを防ぐため、先に構造だけ初期化しておく
    updateUI();

    // 演出の準備：最初から画面を真っ暗にしておく（一瞬のチラつき防止）
    transition.active = true;
    transition.alpha = 1;
    transition.mode = 'FALLING';

    gameState = 'PLAYING';
    await startFloorTransition(); // この中で再度 initMap, updateUI, animateLanding が呼ばれる

    if (startFloor === 1) {
        addLog("Betrayed and fallen... You survived the fall.");
        addLog("Goal: Reach B100F and destroy the Core.");
    } else {
        addLog(`🔧 TEST MODE: Started from Floor ${startFloor} (Lv ${player.level}) 🔧`);
    }
}

async function continueGame() {
    if (loadGame()) {
        turnCount = 0;
        // マップがロードされていない（古いセーブデータなど）場合のみ再生成
        if (!map || map.length === 0) {
            initMap();
        }
        gameState = 'PLAYING';
        addLog(`Resuming from floor ${floorLevel}...`);
        await animateLanding();
    }
}

window.addEventListener('keydown', e => {
    if (isTutorialInputActive) {
        isTutorialInputActive = false;
        e.preventDefault();
        return;
    }

    if (gameState === 'GAMEOVER_SEQ') return;

    if (e.key === ' ') {
        if (!isSpacePressed) {
            isSpacePressed = true;
            spaceUsedForBlock = false; // 新しいSpace押下の開始
        }
        e.preventDefault();
        return;
    }

    if (gameState === 'GAMEOVER' || gameState === 'ENDING') {
        if (e.key === 'Enter' || e.key === ' ') {
            gameState = 'TITLE';
            SOUNDS.SELECT();
        }
        return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        if (gameState === 'TITLE') { titleSelection = (titleSelection + 2) % 3; SOUNDS.SELECT(); return; }
        if (gameState === 'MENU') { menuSelection = (menuSelection + 1) % 2; SOUNDS.SELECT(); return; }
        if (gameState === 'INVENTORY') {
            const items = [player.hasteTomes, player.charmTomes, player.stealthTomes].filter(c => c > 0);
            const count = Math.max(1, items.length);
            inventorySelection = (inventorySelection + count - 1) % count;
            SOUNDS.SELECT(); return;
        }
    }
    if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        if (gameState === 'TITLE') { titleSelection = (titleSelection + 1) % 3; SOUNDS.SELECT(); return; }
        if (gameState === 'MENU') { menuSelection = (menuSelection + 1) % 2; SOUNDS.SELECT(); return; }
        if (gameState === 'INVENTORY') {
            const items = [player.hasteTomes, player.charmTomes, player.stealthTomes].filter(c => c > 0);
            const count = Math.max(1, items.length);
            inventorySelection = (inventorySelection + 1) % count;
            SOUNDS.SELECT(); return;
        }
    }
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (['TITLE', 'STATUS'].includes(gameState)) e.preventDefault();
        if (gameState === 'TITLE' && titleSelection === 2) { testFloor = Math.max(1, testFloor - 1); SOUNDS.SELECT(); return; }
        if (gameState === 'STATUS') { statusPage = (statusPage + 1) % 2; SOUNDS.SELECT(); return; }
    }
    if (e.key === 'ArrowRight' || e.key === 'd') {
        if (['TITLE', 'STATUS'].includes(gameState)) e.preventDefault();
        if (gameState === 'TITLE' && titleSelection === 2) { testFloor = Math.min(99, testFloor + 1); SOUNDS.SELECT(); return; }
        if (gameState === 'STATUS') { statusPage = (statusPage + 1) % 2; SOUNDS.SELECT(); return; }
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (gameState === 'TITLE') {
            const hasSave = localStorage.getItem('minimal_rogue_save') !== null;
            if (titleSelection === 0) startGame();
            else if (titleSelection === 1 && hasSave) continueGame();
            else if (titleSelection === 2) startGame(testFloor);
            SOUNDS.SELECT();
            return;
        } else if (gameState === 'MENU') {
            if (menuSelection === 0) gameState = 'INVENTORY';
            else if (menuSelection === 1) { gameState = 'STATUS'; statusPage = 0; }
            SOUNDS.SELECT();
            return;
        } else if (gameState === 'INVENTORY') {
            const fullItems = [
                { id: 'HASTE', count: player.hasteTomes },
                { id: 'CHARM', count: player.charmTomes },
                { id: 'STEALTH', count: player.stealthTomes }
            ];
            const items = fullItems.filter(it => it.count > 0);
            const selectedItem = items[inventorySelection];

            if (selectedItem) {
                if (selectedItem.id === 'HASTE' && !player.isSpeeding) {
                    player.hasteTomes--;
                    player.isSpeeding = true;
                    SOUNDS.SPEED_UP();
                    addLog("Recited the Haste Tome! Your time accelerates!");
                    spawnFloatingText(player.x, player.y, "ACCELERATED!!", "#38bdf8");
                    gameState = 'PLAYING';
                } else if (selectedItem.id === 'CHARM') {
                    if (tryCharmEnemy()) {
                        player.charmTomes--;
                        gameState = 'PLAYING';
                    }
                } else if (selectedItem.id === 'STEALTH' && !player.isStealth) {
                    player.stealthTomes--;
                    player.isStealth = true;
                    SOUNDS.SPEED_UP(); // 代用
                    addLog("Recited the Stealth Tome! You vanished from sight!");
                    spawnFloatingText(player.x, player.y, "INVISIBLE!!", "#94a3b8");
                    gameState = 'PLAYING';
                }
            }
            return;
        }
    }

    if (e.key.toLowerCase() === 'c' || e.key === '2' || e.key === 'c') { // 'c' を念のため追加
        if (gameState === 'PLAYING' && !isProcessing && player.charmTomes > 0) {
            if (tryCharmEnemy()) player.charmTomes--;
        }
        return;
    }

    if (e.key.toLowerCase() === 'e' || e.key === '1') {
        if (gameState === 'PLAYING' && !isProcessing && player.hasteTomes > 0 && !player.isSpeeding) {
            player.hasteTomes--;
            player.isSpeeding = true;
            SOUNDS.SPEED_UP();
            addLog("Recited the Haste Tome! Your time accelerates!");
            spawnFloatingText(player.x, player.y, "ACCELERATED!!", "#38bdf8");
            updateUI();
        }
        return;
    }
    if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'i') {
        if (gameState === 'PLAYING') { gameState = 'MENU'; menuSelection = 0; SOUNDS.SELECT(); }
        else if (gameState === 'MENU') { gameState = 'PLAYING'; SOUNDS.SELECT(); }
        else if (gameState === 'STATUS' || gameState === 'INVENTORY') { gameState = 'MENU'; SOUNDS.SELECT(); }
        return;
    }
    if (gameState === 'PLAYING' && !isProcessing) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 's', 'a', 'd'].includes(e.key.toLowerCase()) || e.key.startsWith('Arrow')) {
            e.preventDefault();
            switch (e.key) {
                case 'ArrowUp': case 'w': handleAction(0, -1); break;
                case 'ArrowDown': case 's': handleAction(0, 1); break;
                case 'ArrowLeft': case 'a': handleAction(-1, 0); break;
                case 'ArrowRight': case 'd': handleAction(1, 0); break;
            }
        }
    } else if (gameState === 'PLAYING' && isProcessing && isSpacePressed) {
        // 滑っている最中のブロック設置予約
        if (['ArrowUp', 'w'].includes(e.key)) nextSlideAction = { dx: 0, dy: -1 };
        if (['ArrowDown', 's'].includes(e.key)) nextSlideAction = { dx: 0, dy: 1 };
        if (['ArrowLeft', 'a'].includes(e.key)) nextSlideAction = { dx: -1, dy: 0 };
        if (['ArrowRight', 'd'].includes(e.key)) nextSlideAction = { dx: 1, dy: 0 };
    }
});

window.addEventListener('keyup', e => {
    if (e.key === ' ') {
        if (gameState === 'PLAYING' && !isProcessing && isSpacePressed) {
            // 一度もブロック設置に使用されずに離された場合、待機を実行
            if (!spaceUsedForBlock) {
                handleAction(0, 0);
            }
        }
        isSpacePressed = false;
        spaceUsedForBlock = false;
        e.preventDefault();
    }
});

function tryCharmEnemy() {
    let charmedCount = 0;
    const targets = new Set();

    // プレイヤーの周囲8マスにいる敵をすべてリストアップ
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const tx = player.x + dx, ty = player.y + dy;
            const enemy = enemies.find(e => {
                if (!e.isAlly && e.hp > 0) {
                    if (e.x === tx && e.y === ty) return true;
                    if (e.type === 'SNAKE') return e.body.some(b => b.x === tx && b.y === ty);
                }
                return false;
            });
            if (enemy) targets.add(enemy);
        }
    }

    if (targets.size > 0) {
        targets.forEach(enemy => {
            enemy.isAlly = true;
            spawnFloatingText(enemy.x, enemy.y, "CHARMED!!", "#60a5fa");
            charmedCount++;
        });
        addLog(`📜 Charmed ${charmedCount} enemies! They joined you!`);
        SOUNDS.GET_WAND();
        updateUI();
        return true;
    }

    addLog("No enemy nearby to charm...");
    SOUNDS.DAMAGE(); // 失敗時の警告音
    setScreenShake(4, 100); // わずかに揺らす
    return false;
}

updateUI();
requestAnimationFrame(gameLoop);
addLog("Game Ready.");
