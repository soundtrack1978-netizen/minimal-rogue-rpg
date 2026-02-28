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
canvas.height = ROWS * TILE_SIZE + 2; // +2: 描画オフセット分を確保

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
    STEALTH: '☵', // 隠身の魔導書
    SPEED: '»',
    TOME: '▤', // 描画用の統一文字（地面の魔導書はすべてこのアイコンで表示）
    WAND: '/',
    SNAKE: 'E',
    ORC: 'G',
    ICE: '▢',
    TURRET: 'T',
    CORE: '❂',
    LAVA: '~',
    DRAGON: 'D',
    ICICLE: '▲', // 岩の棘 (Rock Spike)
    FIRE_FLOOR: '*', // 期間限定の炎の床
    FAIRY: '🧚',
    EXPLOSION: '💥',
    GUARDIAN: '☲',
    ESCAPE: '🌀',
    TREE: '♣',
    GRASS: ',',
    HEAL_TOME: '☤'
};

// オープニング演出用データ
let openingData = {
    active: false,
    map: [],
    chars: [], // {x, y, symbol, color, facing}
    hole: { x: 0, y: 0 },
    timer: 0,
    messages: [] // {text, time}
};

let dragonTraps = []; // ドラゴンの召喚する罠 {x, y, stage: 'CIRCLE'|'READY'}
let fireFloors = []; // {x, y, life: 1} // 1ターンで消える炎の床
let tomeEffect = { active: false, x: 0, y: 0, range: 0, color: '', endTime: 0 };


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
    BANG: () => {
        // 低音の効いた衝撃音
        const duration = 2.0;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + duration);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
    },
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
    SCREEN_TRANSITION: () => {
        // 「ざっざっざっ」という3連足音
        const now = audioCtx.currentTime;
        for (let i = 0; i < 3; i++) {
            const t = now + i * 0.1;
            const bufferSize = Math.floor(audioCtx.sampleRate * 0.08);
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
            const noise = audioCtx.createBufferSource();
            noise.buffer = buffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 500 + i * 100;
            const gain = audioCtx.createGain();
            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            noise.start(t);
        }
    },
    SNAKE_MOVE: () => playSound(100, 'sine', 0.1, 0.05),
    GOLD_FLIGHT: () => playSound(900, 'sine', 0.05, 0.05),
    MOVE: () => {
        // 「ざっ」という砂を踏むような足音 (ノイズベース)
        const duration = 0.08;
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
        filter.frequency.value = 600; // 少し低めの「ざっ」という音
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noise.start();

        // 「とん」という低い歩行音を追加
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + duration);
        g.gain.setValueAtTime(0.04, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    },
    TOME_READ: () => {
        playMelody([
            { f: 523.25, d: 0.08 }, // C5
            { f: 659.25, d: 0.08 }, // E5
            { f: 783.99, d: 0.08 }, // G5
            { f: 1046.50, d: 0.2 }  // C6
        ]);
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
    SHAKIN: () => {
        // 「シャキーン」という鋭い金属音
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        playSound(1800, 'square', 0.1, 0.2); // 高い金属音
        setTimeout(() => playSound(1200, 'square', 0.05, 0.2), 40);
        setTimeout(() => playSound(2400, 'square', 0.03, 0.1), 80);
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
    },
    HEAL: () => {
        playMelody([{ f: 523.25, d: 0.1 }, { f: 659.25, d: 0.1 }, { f: 783.99, d: 0.1 }, { f: 1046.50, d: 0.3 }]);
    },
    RUMBLE: () => {
        playSound(40, 'sawtooth', 0.2, 0.3);
        playSound(30, 'sawtooth', 0.2, 0.3);
    },
    DRAGON_STEP: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playSound(35, 'sawtooth', 0.4, 0.5);
        playSound(25, 'sawtooth', 0.4, 0.4);
        playSound(15, 'sine', 0.6, 0.6); // 低音の効いた重み
    },
    TELEPORT: () => {
        const now = audioCtx.currentTime;
        const duration = 0.6;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + duration);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(now + duration);
    },
    START_ENDING_DRONE: () => {
        // 途切れのない、重厚な地震のような低周波ノイズ
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, audioCtx.currentTime); // 50 -> 80Hz (より聞こえやすく)
        filter.Q.setValueAtTime(20, audioCtx.currentTime); // 強い共振

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime); // 少し音量を上げる

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();

        return {
            gainNode: gain,
            stop: (fadeTime) => {
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + fadeTime);
                setTimeout(() => { try { noise.stop(); } catch (e) { } }, fadeTime * 1000 + 500);
            }
        };
    },
    ICE_SLIDE: () => {
        // ぴゅっという短い滑り音（高音サイン波の下降スウィープ）
        const t = audioCtx.currentTime;
        const duration = 0.12;
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2400, t);
        osc.frequency.exponentialRampToValueAtTime(1000, t + duration);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + duration);
    },
    LAVA_BURN: () => {
        // 低音で燃え上がる音
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(40, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(120, t);
        lp.frequency.linearRampToValueAtTime(400, t + 0.1);
        lp.frequency.linearRampToValueAtTime(150, t + 0.25);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.35, t);
        g.gain.linearRampToValueAtTime(0.45, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(lp); lp.connect(g); g.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.25);
        // 低域ノイズでゴッという空気感
        const bufferSize = audioCtx.sampleRate * 0.25;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const nf = audioCtx.createBiquadFilter();
        nf.type = 'lowpass'; nf.frequency.value = 250;
        const ng = audioCtx.createGain();
        ng.gain.setValueAtTime(0.15, t);
        ng.gain.linearRampToValueAtTime(0.2, t + 0.08);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        noise.connect(nf); nf.connect(ng); ng.connect(audioCtx.destination);
        noise.start(t); noise.stop(t + 0.25);
    },
    ENEMY_ATTACK: () => {
        // 短い鋭い攻撃音（低めのsquare波）
        playSound(300, 'square', 0.08, 0.15);
    },
    CHARM: () => {
        // キラキラした上昇音（高音メロディ）
        playMelody([{ f: 1047, d: 0.08 }, { f: 1319, d: 0.08 }, { f: 1568, d: 0.08 }, { f: 2093, d: 0.15 }]);
    },
    FREEZE: () => {
        // パキッという氷結音（高音短い）
        playSound(2000, 'square', 0.03, 0.1);
        setTimeout(() => playSound(2500, 'square', 0.02, 0.05), 30);
    },
    IGNITE: () => {
        // ボッという着火音（低音短い）
        playSound(80, 'sawtooth', 0.1, 0.2);
        setTimeout(() => playSound(120, 'sawtooth', 0.05, 0.1), 20);
    },
    START_INTENSE_RUMBLE: () => {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer; noise.loop = true;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, audioCtx.currentTime);
        filter.Q.setValueAtTime(25, audioCtx.currentTime);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(1.5, audioCtx.currentTime); // 激しい音量
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
        return {
            stop: (fadeTime) => {
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + fadeTime);
                setTimeout(() => { try { noise.stop(); } catch (e) { } }, fadeTime * 1000 + 500);
            }
        };
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
    x: 0, y: 0, hp: 30, maxHp: 30, level: 1, exp: 0, nextExp: 7,
    stamina: 100,
    hasKey: false,
    swordCount: 0,
    armorCount: 0,
    hasteTomes: 0,
    charmTomes: 0,
    stealthTomes: 0,
    healTomes: 0,
    isSpeeding: false,
    isStealth: false, // 姿を消しているか
    isExtraTurn: false,
    facing: 'LEFT',
    flashUntil: 0, offsetX: 0, offsetY: 0,
    totalKills: 0,
    hasSword: false,
    hasWand: false,
    itemInHand: null,
    fairyCount: 0,
    fairyRemainingCharms: 0,
    isInfiniteStamina: false
};
let enemies = [];
let wisps = []; // {x, y, dirIndex} - 無敵の障害物
let floorLevel = 1;
let damageTexts = [];
let attackLines = [];
let tempWalls = []; // {x, y, hp}
let isProcessing = false;
let bufferedInput = null; // { dx, dy } 次のターンの入力バッファ
let turnCount = 0;
let isPlayerVisible = true;
let tomeAuraParams = { active: false, x: 0, y: 0, radius: 0, alpha: 0, particles: [] };
let isSpacePressed = false;
let spaceUsedForBlock = false; // 今回のスペース押下でブロックを置いたかフラグ
let gameOverAlpha = 0;
let storyMessage = null; // { lines: [], alpha: 0, showNext: false }
let isTutorialInputActive = false; // チュートリアル入力待ちフラグ
let hasShownStage1Tut = false; // 1階スタミナチュートリアル済みフラグ
let hasShownGoldTut = false; // 黄色い敵의テキスト表示済みフラグ
let hasShownSaveTut = false; // はじめてのセーブ時のテキストフラグ
let hasShownFairyTut = false; // はじめての妖精との出会いフラグ
let hasShownTomeTut = false; // はじめての魔導書入手フラグ
let hasShownEquipTut = false; // はじめての装備品（剣・盾）入手フラグ
let dungeonCore = null; // {x, y, hp}
let hasSpawnedDragon = false; // ドラゴンが出現したか

let transition = { active: false, text: "", alpha: 0, mode: 'FADE', playerY: 0, particles: [], flashAlpha: 0 };
let screenShake = { x: 0, y: 0, until: 0 };

// マルチスクリーンマップ（90-99F ゼルダ式画面切替）
let multiScreenMode = false;
let screenGrid = null;               // { maps: [4][4], enemies: [4][4], wisps: [4][4] }
let currentScreen = { x: 0, y: 0 };
const SCREEN_GRID_SIZE = 2;

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
        player.maxHp = data.maxHp || (20 + (player.level * 10));
        player.hp = data.hp !== undefined ? data.hp : player.maxHp;
        player.exp = data.exp || 0;
        player.nextExp = data.nextExp || (player.level <= 5 ? player.level * 7 : player.level * 10);
        player.stamina = data.stamina !== undefined ? data.stamina : 100;
        player.hasKey = data.hasKey || false;
        player.hasSword = data.hasSword || false;
        player.swordCount = data.swordCount || 0;
        player.armorCount = data.armorCount || 0;
        player.hasteTomes = data.hasteTomes || 0;
        player.charmTomes = data.charmTomes || 0;
        player.stealthTomes = data.stealthTomes || 0;
        player.healTomes = data.healTomes || 0;
        player.explosionTomes = data.explosionTomes || 0;
        player.guardianTomes = data.guardianTomes || 0;
        player.escapeTomes = data.escapeTomes || 0;
        player.isSpeeding = data.isSpeeding || false;
        player.isShielded = data.isShielded || false;
        player.isExtraTurn = data.isExtraTurn || false;
        player.hasWand = data.hasWand || false;
        player.totalKills = data.totalKills || 0;
        player.fairyCount = data.fairyCount || 0;
        player.x = data.playerX || 0;
        player.y = data.playerY || 0;

        floorLevel = data.floorLevel || 1;

        // 階層の状態を復元
        if (data.map) map = data.map;
        if (data.enemies) enemies = data.enemies;
        if (data.wisps) wisps = data.wisps;
        if (data.tempWalls) tempWalls = data.tempWalls;

        // マルチスクリーン状態の復元
        multiScreenMode = data.multiScreenMode || false;
        if (data.currentScreen) currentScreen = data.currentScreen;
        if (data.screenGrid) screenGrid = data.screenGrid;

        updateUI();
        return true;
    }
    return false;
}

async function tryEscape() {
    // メニュー等を即座に閉じる
    if (gameState === 'MENU' || gameState === 'STATUS' || gameState === 'INVENTORY') {
        gameState = 'PLAYING';
    }

    const minFloor = 3;
    const maxFloor = 99;
    let targetFloor;
    do {
        targetFloor = Math.floor(Math.random() * (maxFloor - minFloor + 1)) + minFloor;
    } while (targetFloor === floorLevel);

    addLog("🌀 EMERGENCY EVACUATION! 🌀");
    SOUNDS.TELEPORT();
    spawnFloatingText(player.x, player.y, "WARP!!", "#c084fc");

    // --- 上昇アニメーション (DOMオーバーレイ方式でステータスバーを突き抜ける) ---
    // 1. 現在のプレイヤーのキャンバス上の座標をウィンドウ相対座標に変換
    const rect = canvas.getBoundingClientRect();
    const startX = rect.left + (player.x * TILE_SIZE + TILE_SIZE / 2 + player.offsetX);
    const startY = rect.top + (player.y * TILE_SIZE + TILE_SIZE / 2 + player.offsetY);

    // 2. 飛んでいくダミーのプレイヤー要素を作成
    const ghost = document.createElement('div');
    ghost.innerText = SYMBOLS.PLAYER;
    ghost.style.position = 'fixed';
    ghost.style.left = startX + 'px';
    ghost.style.top = startY + 'px';
    ghost.style.transform = `translate(-50%, -50%) ${player.facing === 'RIGHT' ? 'scaleX(-1)' : ''}`;
    ghost.style.font = `bold ${TILE_SIZE}px 'Courier New'`;
    ghost.style.color = '#fff';
    ghost.style.zIndex = '9999';
    ghost.style.pointerEvents = 'none';
    ghost.style.textShadow = '0 0 10px #fff, 0 0 20px #c084fc'; // 輝きを追加
    document.body.appendChild(ghost);

    // 3. キャンバス上の自機を隠してアニメーション開始
    isPlayerVisible = false;

    const ascendDuration = 1200;
    const startTimeAscend = performance.now();

    while (performance.now() - startTimeAscend < ascendDuration) {
        const elapsed = performance.now() - startTimeAscend;
        const progress = elapsed / ascendDuration;

        // 上に加速しながら大きく突き抜ける
        const currentY = startY - (progress * progress) * (startY + 200);
        ghost.style.top = currentY + 'px';

        // 速度に合わせて少し縦長に伸ばす演出
        const stretch = 1 + progress * 0.5;
        ghost.style.transform = `translate(-50%, -50%) ${player.facing === 'RIGHT' ? 'scaleX(-1)' : ''} scaleY(${stretch})`;
        ghost.style.opacity = 1 - (progress * 0.5); // 後半少し薄く

        draw();
        await new Promise(r => requestAnimationFrame(r));
    }

    // 4. ゴーストの削除
    if (ghost.parentNode) document.body.removeChild(ghost);

    // 画面を暗転させる
    transition.active = true;
    transition.mode = 'FADE';
    transition.text = "";
    for (let a = 0; a <= 1; a += 0.2) {
        transition.alpha = a;
        draw();
        await new Promise(r => setTimeout(r, 30));
    }
    transition.alpha = 1;

    // 位置と階層を更新
    player.offsetY = 0;
    floorLevel = targetFloor;
    addLog(`Dimensional shift... warping to Floor ${targetFloor}!`);

    // 通常の階層移動処理 (isPlayerVisibleはstartFloorTransition内の着地演出でtrueに戻る)
    await startFloorTransition();
    return true;
}

function saveGame() {
    // マルチスクリーンモード時、現在の画面データをグリッドに書き戻す
    if (multiScreenMode && screenGrid) {
        screenGrid.maps[currentScreen.y][currentScreen.x] = map;
        screenGrid.enemies[currentScreen.y][currentScreen.x] = enemies;
        screenGrid.wisps[currentScreen.y][currentScreen.x] = wisps;
    }
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
        stealthTomes: player.stealthTomes,
        healTomes: player.healTomes,
        explosionTomes: player.explosionTomes,
        guardianTomes: player.guardianTomes,
        escapeTomes: player.escapeTomes,
        isSpeeding: player.isSpeeding,
        isShielded: player.isShielded,
        isExtraTurn: player.isExtraTurn,
        hasWand: player.hasWand,
        totalKills: player.totalKills,
        fairyCount: player.fairyCount,

        // 階層情報
        floorLevel: floorLevel,
        map: map,
        enemies: enemies,
        wisps: wisps,
        tempWalls: tempWalls,

        // マルチスクリーン情報
        multiScreenMode: multiScreenMode,
        currentScreen: multiScreenMode ? currentScreen : null,
        screenGrid: multiScreenMode ? screenGrid : null
    };
    localStorage.setItem('minimal_rogue_save', JSON.stringify(data));
    SOUNDS.SAVE();
    addLog("✨ Game Progress Saved! ✨");
    addLog("State, items and floor layout stored.");
    spawnFloatingText(player.x, player.y, "SAVED", "#4ade80");
}

function updateUI() {
    isPlayerVisible = true; // 確実に表示状態にする
    hpElement.innerText = `${player.hp}/${player.maxHp}`;
    if (player.isShielded) {
        hpElement.style.color = '#4ade80'; // 守護状態は緑色に
    } else {
        hpElement.style.color = '#ffffff';
    }

    const bar = document.getElementById('stamina-bar');
    if (bar) {
        if (player.isInfiniteStamina) {
            bar.style.width = '100%';
            bar.style.backgroundColor = '#fbbf24'; // 金色
            bar.classList.add('stamina-glow-active');
        } else {
            bar.style.width = `${player.stamina}%`;
            bar.style.backgroundColor = player.stamina < 30 ? '#f87171' : '#38bdf8';
            bar.classList.remove('stamina-glow-active');
        }
    }

    lvElement.innerText = player.level;
    lvElement.style.color = '#ffffff';
    if (floorLevel === 100) {
        floorElement.innerText = "LAST FLOOR";
    } else if (multiScreenMode) {
        floorElement.innerText = `${floorLevel} [${currentScreen.x},${currentScreen.y}]`;
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

    // 妖精の表示 (所持している場合のみ)
    const fairyNode = document.getElementById('fairy-status');
    if (fairyNode) {
        if (player.fairyCount > 0) {
            fairyNode.innerHTML = `<span ${symbolStyle}>${SYMBOLS.FAIRY}</span>x${player.fairyCount}`;
        } else {
            fairyNode.innerHTML = "";
        }
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
    player.isInfiniteStamina = false; // フロア移動で解除
    player.fairyRemainingCharms = player.fairyCount;
    dungeonCore = null;
    hasSpawnedDragon = false;
    multiScreenMode = false;
    screenGrid = null;

    // --- MULTI-SCREEN FLOOR (Floor 90+: 99Fは確定、90-98Fは50%の確率) ---
    if (floorLevel >= 90 && floorLevel < 100 && (floorLevel === 99 || Math.random() < 0.5)) {
        multiScreenMode = true;
        addLog("⚠️ DANGER ZONE: Multi-screen labyrinth!");
        addLog("Explore 2x2 screens to find the KEY and EXIT.");

        // 4画面分のマップ・敵・ウィスプを格納するグリッドを初期化
        screenGrid = {
            maps: Array.from({ length: SCREEN_GRID_SIZE }, () =>
                Array.from({ length: SCREEN_GRID_SIZE }, () => null)),
            enemies: Array.from({ length: SCREEN_GRID_SIZE }, () =>
                Array.from({ length: SCREEN_GRID_SIZE }, () => [])),
            wisps: Array.from({ length: SCREEN_GRID_SIZE }, () =>
                Array.from({ length: SCREEN_GRID_SIZE }, () => []))
        };

        // ヘルパー: 1画面分のダンジョンを生成（isMaze: true=迷路型, false=通常ダンジョン型）
        function generateOneScreen(sx, sy, isMaze) {
            const sMap = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
            const sEnemies = [];
            const sWisps = [];
            const rooms = [];

            if (isMaze) {
                // === 迷路型（77階方式） ===
                // 全面を床にする
                for (let y = 1; y < ROWS - 1; y++) {
                    for (let x = 1; x < COLS - 1; x++) {
                        sMap[y][x] = SYMBOLS.FLOOR;
                    }
                }
                // 部屋の生成（迷路の中の開けた空間）
                const roomCount = Math.floor(Math.random() * 3) + 5;
                for (let i = 0; i < roomCount; i++) {
                    const w = Math.floor(Math.random() * 5) + 4;
                    const h = Math.floor(Math.random() * 3) + 4;
                    const rx = Math.floor(Math.random() * (COLS - w - 4)) + 2;
                    const ry = Math.floor(Math.random() * (ROWS - h - 4)) + 2;
                    rooms.push({ x: rx, y: ry, w, h, cx: Math.floor(rx + w / 2), cy: Math.floor(ry + h / 2) });
                }
                // 棒倒し法で迷路を生成
                for (let y = 3; y < ROWS - 3; y += 2) {
                    for (let x = 3; x < COLS - 3; x += 2) {
                        const inAnyRoom = rooms.some(r =>
                            x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h
                        );
                        if (inAnyRoom) continue;
                        const nearHPassage = (y >= 11 && y <= 13) && (x <= 4 || x >= COLS - 5);
                        const nearVPassage = (x >= 18 && x <= 21) && (y <= 4 || y >= ROWS - 5);
                        if (nearHPassage || nearVPassage) continue;
                        if (Math.random() < 0.15) continue;
                        sMap[y][x] = SYMBOLS.WALL;
                        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                        const d = dirs[Math.floor(Math.random() * (y === 3 ? 4 : 3))];
                        const ny = y + d[1], nx = x + d[0];
                        if (ny >= 1 && ny < ROWS - 1 && nx >= 1 && nx < COLS - 1) {
                            const destInRoom = rooms.some(r =>
                                nx >= r.x && nx < r.x + r.w && ny >= r.y && ny < r.y + r.h
                            );
                            if (!destInRoom) sMap[ny][nx] = SYMBOLS.WALL;
                        }
                    }
                }
            } else {
                // === 通常ダンジョン型（部屋+通路） ===
                const roomCount = Math.floor(Math.random() * 4) + 8;
                for (let i = 0; i < roomCount; i++) {
                    const w = Math.floor(Math.random() * 6) + 4;
                    const h = Math.floor(Math.random() * 4) + 4;
                    const rx = Math.floor(Math.random() * (COLS - w - 2)) + 1;
                    const ry = Math.floor(Math.random() * (ROWS - h - 2)) + 1;
                    for (let y = ry; y < ry + h; y++) {
                        for (let x = rx; x < rx + w; x++) { sMap[y][x] = SYMBOLS.FLOOR; }
                    }
                    if (w >= 5 && h >= 5) {
                        const pattern = Math.random();
                        const pcx = Math.floor(rx + w / 2);
                        const pcy = Math.floor(ry + h / 2);
                        if (pattern < 0.3) {
                            sMap[pcy][pcx] = SYMBOLS.WALL;
                        } else if (pattern < 0.5) {
                            sMap[ry + 1][rx + 1] = SYMBOLS.WALL;
                            sMap[ry + 1][rx + w - 2] = SYMBOLS.WALL;
                            sMap[ry + h - 2][rx + 1] = SYMBOLS.WALL;
                            sMap[ry + h - 2][rx + w - 2] = SYMBOLS.WALL;
                        }
                    }
                    rooms.push({ x: rx, y: ry, w, h, cx: Math.floor(rx + w / 2), cy: Math.floor(ry + h / 2) });
                }
                // 部屋同士を通路で接続
                for (let i = 0; i < rooms.length - 1; i++) {
                    let cx = rooms[i].cx, cy = rooms[i].cy;
                    const tx = rooms[i + 1].cx, ty = rooms[i + 1].cy;
                    while (cx !== tx || cy !== ty) {
                        if (cx !== tx && (cy === ty || Math.random() < 0.5)) cx += (tx > cx ? 1 : -1);
                        else cy += (ty > cy ? 1 : -1);
                        if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1) sMap[cy][cx] = SYMBOLS.FLOOR;
                    }
                }
                // ランダムな追加接続
                for (let k = 0; k < 3; k++) {
                    const r1 = rooms[Math.floor(Math.random() * rooms.length)];
                    const r2 = rooms[Math.floor(Math.random() * rooms.length)];
                    if (r1 !== r2) {
                        let cx = r1.cx, cy = r1.cy;
                        for (let step = 0; step < 15; step++) {
                            if (cx === r2.cx && cy === r2.cy) break;
                            if (cx !== r2.cx && (cy === r2.cy || Math.random() < 0.5)) cx += (r2.cx > cx ? 1 : -1);
                            else cy += (r2.cy > cy ? 1 : -1);
                            if (cy >= 1 && cy < ROWS - 1 && cx >= 1 && cx < COLS - 1) sMap[cy][cx] = SYMBOLS.FLOOR;
                        }
                    }
                }
            }

            // --- 地形の生成（毒沼・氷・溶岩） ---
            // 毒沼 (15%)
            if (Math.random() < 0.15) {
                const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
                let px = startRoom.cx, py = startRoom.cy;
                for (let i = 0; i < 20; i++) {
                    if (py >= 1 && py < ROWS - 1 && px >= 1 && px < COLS - 1) {
                        if (sMap[py][px] === SYMBOLS.FLOOR) sMap[py][px] = SYMBOLS.POISON;
                    }
                    px += Math.floor(Math.random() * 3) - 1;
                    py += Math.floor(Math.random() * 3) - 1;
                }
            }
            // 氷 (50%)
            if (Math.random() < 0.50) {
                const numPatches = Math.floor(Math.random() * 2) + 2;
                for (let p = 0; p < numPatches; p++) {
                    const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
                    let px = startRoom.cx, py = startRoom.cy;
                    for (let i = 0; i < 150; i++) {
                        if (py >= 1 && py < ROWS - 1 && px >= 1 && px < COLS - 1) {
                            if (sMap[py][px] === SYMBOLS.FLOOR) sMap[py][px] = SYMBOLS.ICE;
                        }
                        px += Math.floor(Math.random() * 3) - 1;
                        py += Math.floor(Math.random() * 3) - 1;
                    }
                }
            }
            // 溶岩 (80%)
            if (Math.random() < 0.80) {
                const numLava = Math.floor(Math.random() * 3) + 2;
                for (let s = 0; s < numLava; s++) {
                    const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
                    let px = startRoom.cx, py = startRoom.cy;
                    for (let i = 0; i < 60; i++) {
                        if (py >= 1 && py < ROWS - 1 && px >= 1 && px < COLS - 1) {
                            if (sMap[py][px] === SYMBOLS.FLOOR || sMap[py][px] === SYMBOLS.ICE) {
                                sMap[py][px] = SYMBOLS.LAVA;
                            }
                        }
                        px += Math.floor(Math.random() * 3) - 1;
                        py += Math.floor(Math.random() * 3) - 1;
                    }
                }
            }

            // --- 隣接画面への通路を開ける（外壁に穴を開ける） ---
            // 通路接続用ヘルパー: 指定座標から最寄りの部屋中心へ床を掘る
            const digPathToNearestRoom = (startX, startY) => {
                if (rooms.length === 0) return;
                let nearest = rooms[0];
                let minDist = Math.abs(rooms[0].cx - startX) + Math.abs(rooms[0].cy - startY);
                for (let i = 1; i < rooms.length; i++) {
                    const d = Math.abs(rooms[i].cx - startX) + Math.abs(rooms[i].cy - startY);
                    if (d < minDist) { minDist = d; nearest = rooms[i]; }
                }
                let cx = startX, cy = startY;
                while (cx !== nearest.cx || cy !== nearest.cy) {
                    if (cx !== nearest.cx && (cy === nearest.cy || Math.random() < 0.5)) cx += (nearest.cx > cx ? 1 : -1);
                    else cy += (nearest.cy > cy ? 1 : -1);
                    if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1) sMap[cy][cx] = SYMBOLS.FLOOR;
                }
            };
            // 右方向 (x=COLS-1, y=11〜13)
            if (sx < SCREEN_GRID_SIZE - 1) {
                for (let py = 11; py <= 13; py++) {
                    sMap[py][COLS - 1] = SYMBOLS.FLOOR;
                    sMap[py][COLS - 2] = SYMBOLS.FLOOR;
                }
                if (!isMaze) digPathToNearestRoom(COLS - 3, 12);
            }
            // 左方向 (x=0, y=11〜13)
            if (sx > 0) {
                for (let py = 11; py <= 13; py++) {
                    sMap[py][0] = SYMBOLS.FLOOR;
                    sMap[py][1] = SYMBOLS.FLOOR;
                }
                if (!isMaze) digPathToNearestRoom(2, 12);
            }
            // 下方向 (y=ROWS-1, x=18〜21)
            if (sy < SCREEN_GRID_SIZE - 1) {
                for (let px = 18; px <= 21; px++) {
                    sMap[ROWS - 1][px] = SYMBOLS.FLOOR;
                    sMap[ROWS - 2][px] = SYMBOLS.FLOOR;
                }
                if (!isMaze) digPathToNearestRoom(19, ROWS - 3);
            }
            // 上方向 (y=0, x=18〜21)
            if (sy > 0) {
                for (let px = 18; px <= 21; px++) {
                    sMap[0][px] = SYMBOLS.FLOOR;
                    sMap[1][px] = SYMBOLS.FLOOR;
                }
                if (!isMaze) digPathToNearestRoom(19, 2);
            }

            // --- 敵の配置（通常階と同じ敵種抽選ロジック） ---
            const findWalkableInScreen = (maxTries = 30) => {
                for (let t = 0; t < maxTries; t++) {
                    const tx = Math.floor(Math.random() * (COLS - 4)) + 2;
                    const ty = Math.floor(Math.random() * (ROWS - 4)) + 2;
                    const tile = sMap[ty][tx];
                    if (tile === SYMBOLS.FLOOR || tile === SYMBOLS.ICE || tile === SYMBOLS.LAVA || tile === SYMBOLS.POISON) {
                        if (!sEnemies.some(e => e.x === tx && e.y === ty)) return { x: tx, y: ty, tile };
                    }
                }
                return null;
            };

            for (let i = 1; i < rooms.length; i++) {
                if (Math.random() < 0.2) continue; // 一部の部屋はスキップ
                const numEnemies = Math.floor(Math.random() * 2) + 1;
                for (let j = 0; j < numEnemies; j++) {
                    const pos = findWalkableInScreen();
                    if (!pos) continue;
                    const { x: ex, y: ey, tile: tileAtPos } = pos;

                    if (tileAtPos === SYMBOLS.ICE) {
                        sEnemies.push({ type: 'FROST', x: ex, y: ey, hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15, stunTurns: 0 });
                    } else if (tileAtPos === SYMBOLS.LAVA) {
                        sEnemies.push({ type: 'BLAZE', x: ex, y: ey, hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15, stunTurns: 0 });
                    } else {
                        const enemyRoll = Math.random();
                        if (enemyRoll < 0.12) {
                            sEnemies.push({ type: 'TURRET', x: ex, y: ey, dir: Math.floor(Math.random() * 4), hp: 100 + floorLevel * 5, maxHp: 100 + floorLevel * 5, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0 });
                        } else if (enemyRoll < 0.25) {
                            sEnemies.push({ type: 'ORC', x: ex, y: ey, hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0 });
                        } else {
                            sEnemies.push({ type: 'NORMAL', x: ex, y: ey, hp: 3 + floorLevel, maxHp: 3 + floorLevel, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0 });
                        }
                    }
                }
            }

            // --- ウィスプの配置 ---
            const numWisps = Math.min(8, Math.max(1, Math.floor(floorLevel / 6)));
            for (let i = 0; i < numWisps; i++) {
                for (let retry = 0; retry < 200; retry++) {
                    const rx = Math.floor(Math.random() * (COLS - 2)) + 1;
                    const ry = Math.floor(Math.random() * (ROWS - 2)) + 1;
                    const tile = sMap[ry][rx];
                    if (tile === SYMBOLS.FLOOR || tile === SYMBOLS.POISON) {
                        sWisps.push({ x: rx, y: ry, dir: Math.floor(Math.random() * 4), mode: 'STRAIGHT' });
                        break;
                    }
                }
            }

            // --- アイテムの配置（通常階と同じ種類） ---
            // 魔導書を1つ配置
            const possibleTomes = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.ESCAPE, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.HEAL_TOME];
            const chosenTome = possibleTomes[Math.floor(Math.random() * possibleTomes.length)];
            for (let tries = 0; tries < 50; tries++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (sMap[iy][ix] === SYMBOLS.FLOOR) { sMap[iy][ix] = chosenTome; break; }
            }
            // 剣または防具をランダム配置
            if (Math.random() < 0.3) {
                const item = Math.random() < 0.5 ? SYMBOLS.SWORD : SYMBOLS.ARMOR;
                for (let tries = 0; tries < 50; tries++) {
                    const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                    const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                    if (sMap[iy][ix] === SYMBOLS.FLOOR) { sMap[iy][ix] = item; break; }
                }
            }

            // 1部屋あたりの魔導書を最大2個に制限
            const tomeSyms = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.ESCAPE];
            rooms.forEach(room => {
                let tomeCount = 0;
                for (let y = room.y; y < room.y + room.h; y++) {
                    for (let x = room.x; x < room.x + room.w; x++) {
                        if (tomeSyms.includes(sMap[y][x])) {
                            tomeCount++;
                            if (tomeCount > 2) sMap[y][x] = SYMBOLS.FLOOR;
                        }
                    }
                }
            });

            return { sMap, sEnemies, sWisps, rooms };
        }

        // 各画面を生成（迷路型と通常ダンジョン型をランダムに混合）
        const allRooms = {}; // 各画面の部屋情報を保持
        for (let sy = 0; sy < SCREEN_GRID_SIZE; sy++) {
            for (let sx = 0; sx < SCREEN_GRID_SIZE; sx++) {
                const useMaze = Math.random() < 0.5; // 50%で迷路型、50%で通常ダンジョン型
                const result = generateOneScreen(sx, sy, useMaze);
                screenGrid.maps[sy][sx] = result.sMap;
                screenGrid.enemies[sy][sx] = result.sEnemies;
                screenGrid.wisps[sy][sx] = result.sWisps;
                allRooms[`${sx},${sy}`] = result.rooms;
            }
        }

        // プレイヤーのスタート位置: 画面(0,0)の最初の部屋
        const startRooms = allRooms['0,0'];
        player.x = startRooms[0].cx;
        player.y = startRooms[0].cy;
        screenGrid.maps[0][0][player.y][player.x] = SYMBOLS.FLOOR;
        // スタート地点付近の敵を除去
        screenGrid.enemies[0][0] = screenGrid.enemies[0][0].filter(
            e => !(Math.abs(e.x - player.x) <= 3 && Math.abs(e.y - player.y) <= 3)
        );

        // カギ: 対角の画面(1,1)に配置
        const keyMap = screenGrid.maps[1][1];
        for (let y = ROWS - 3; y >= 2; y--) {
            let placed = false;
            for (let x = COLS - 3; x >= 2; x--) {
                if (keyMap[y][x] === SYMBOLS.FLOOR) { keyMap[y][x] = SYMBOLS.KEY; placed = true; break; }
            }
            if (placed) break;
        }

        // 階段(DOOR): 画面(1,0)に配置（カギとは別の画面）
        const doorMap = screenGrid.maps[0][1];
        const doorRooms = allRooms['1,0'];
        const doorRoom = doorRooms[doorRooms.length - 1];
        // 出口周辺を安全な床にしてからDOOR配置
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ty = doorRoom.cy + dy, tx = doorRoom.cx + dx;
                if (ty >= 1 && ty < ROWS - 1 && tx >= 1 && tx < COLS - 1) {
                    const t = doorMap[ty][tx];
                    if (t === SYMBOLS.ICE || t === SYMBOLS.POISON || t === SYMBOLS.LAVA || t === SYMBOLS.WALL) doorMap[ty][tx] = SYMBOLS.FLOOR;
                }
            }
        }
        doorMap[doorRoom.cy][doorRoom.cx] = SYMBOLS.DOOR;

        // セーブポイント: 画面(0,1)に配置
        const saveMap = screenGrid.maps[1][0];
        for (let tries = 0; tries < 50; tries++) {
            const sx2 = Math.floor(Math.random() * (COLS - 4)) + 2;
            const sy2 = Math.floor(Math.random() * (ROWS - 4)) + 2;
            if (saveMap[sy2][sx2] === SYMBOLS.FLOOR) { saveMap[sy2][sx2] = SYMBOLS.SAVE; break; }
        }

        // 現在の画面をグローバルにロード
        currentScreen = { x: 0, y: 0 };
        map = screenGrid.maps[0][0];
        enemies = screenGrid.enemies[0][0];
        wisps = screenGrid.wisps[0][0];

        return;
    }

    // --- LAST FLOOR (Floor 100) ---
    if (floorLevel === 100) {
        addLog("THE BOTTOM OF THE WORLD");
        // メッセージ表示は非同期で行われるため、ここではフラグ立てやaddLogのみにとどめるか、
        // あるいは initMap 自体を async にするか（既に多くの場所で呼ばれているので注意が必要）
        // ここでは initMap 終了後に呼び出される startFloorTransition 側で制御するのが安全。
        addLog("Find the Core.");

        // 周囲の壁を薄くし、空間を広げる
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y < 1 || y >= ROWS - 1 || x < 1 || x >= COLS - 1) {
                    map[y][x] = SYMBOLS.WALL;
                } else {
                    map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }

        // 四隅に溶岩の池を配置
        const corners = [
            { x: 3, y: 3 }, { x: COLS - 4, y: 3 },
            { x: 3, y: ROWS - 4 }, { x: COLS - 4, y: ROWS - 4 }
        ];
        corners.forEach(c => {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) <= 3) {
                        map[c.y + dy][c.x + dx] = SYMBOLS.LAVA;
                    }
                }
            }
        });

        // 画面左上の溶岩だまりの、左下の角の柱を設置
        const topLeftLava = corners[0];
        map[topLeftLava.y + 2][topLeftLava.x - 2] = SYMBOLS.WALL;

        // 画面右下の溶岩だまりの、左下の角の柱を設置
        const bottomRightLava = corners[3];
        map[bottomRightLava.y + 2][bottomRightLava.x - 2] = SYMBOLS.WALL;

        player.x = Math.floor(COLS / 2);
        player.y = ROWS - 5;

        // ダンジョンコアの配置
        const coreX = Math.floor(COLS / 2);
        const coreY = 6;
        map[coreY][coreX] = SYMBOLS.CORE;
        dungeonCore = { x: coreX, y: coreY, hp: 15 }; // 耐久力を5から15にアップ

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
                    tempWalls.push({ x: x, y: y, hp: 2, type: 'BLOCK' });
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

    if (floorLevel === 25) {
        addLog("EVENT: The Labyrinth Island.");
        addLog("Rescue the fairy 🧚 trapped on the island!");

        // 広い空間を作成
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                if (y <= 2 || y >= ROWS - 3 || x <= 2 || x >= COLS - 3) {
                    map[y][x] = SYMBOLS.LAVA;
                } else {
                    map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }

        player.x = 20; player.y = ROWS - 5;

        const fx = 20, fy = 7; // 妖精の位置

        // 妖精の周りと南側一帯を溶岩にする
        for (let y = fy - 5; y <= fy + 5; y++) {
            for (let x = fx - 10; x <= fx + 10; x++) {
                if (x >= 1 && x < COLS - 1 && y >= 1 && y < ROWS - 1) {
                    map[y][x] = SYMBOLS.LAVA;
                }
            }
        }

        // 複雑な入り組んだ迷路を生成 (下半分) 
        for (let y = 10; y < ROWS - 3; y += 2) {
            for (let x = 3; x < COLS - 3; x += 2) {
                // 主人公(20, ROWS-5)と出口(18, ROWS-4)の周辺は壁を作らない
                const isNearStart = Math.abs(x - 20) <= 1 && Math.abs(y - (ROWS - 5)) <= 1;
                const isNearExit = Math.abs(x - 18) <= 1 && Math.abs(y - (ROWS - 4)) <= 1;

                if (!isNearStart && !isNearExit) {
                    map[y][x] = SYMBOLS.WALL;
                    const d = [[0, 1], [0, -1], [1, 0], [-1, 0]][Math.floor(Math.random() * (y === 10 ? 4 : 3))];
                    map[y + d[1]][x + d[0]] = SYMBOLS.WALL;
                }
            }
        }

        // 主人公の足元と出口の座標を確実に床にする
        map[ROWS - 5][20] = SYMBOLS.FLOOR;
        map[ROWS - 4][18] = SYMBOLS.FLOOR;

        // 迷路の中に魔導書を2冊配置 (床を探す)
        for (let i = 0; i < 2; i++) {
            let tx, ty, tries = 0;
            do {
                tx = Math.floor(Math.random() * (COLS - 6)) + 3;
                ty = Math.floor(Math.random() * (ROWS - 13)) + 10;
                tries++;
            } while (map[ty][tx] !== SYMBOLS.FLOOR && tries < 100);
            if (map[ty][tx] === SYMBOLS.FLOOR) map[ty][tx] = SYMBOLS.TOME;
        }

        // 中央の5x5だけ床に戻して「大きめの浮島」にする
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                map[fy + dy][fx + dx] = SYMBOLS.FLOOR;
            }
        }

        // 浮島から左右に道を延ばす
        for (let x = 3; x < COLS - 3; x++) {
            map[fy][x] = SYMBOLS.FLOOR;
        }
        for (let y = fy; y <= 10; y++) {
            map[y][3] = SYMBOLS.FLOOR;
            map[y][COLS - 4] = SYMBOLS.FLOOR;
        }

        // --- 妖精の配置 ---
        map[fy][fx] = SYMBOLS.FAIRY;

        // エネミー配置
        // オークを2体追加
        for (let i = 0; i < 2; i++) {
            let ox, oy, tries = 0;
            do {
                ox = Math.floor(Math.random() * (COLS - 6)) + 3;
                oy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                tries++;
            } while ((map[oy][ox] !== SYMBOLS.FLOOR || Math.abs(ox - player.x) < 5) && tries < 100);

            enemies.push({
                type: 'ORC', x: ox, y: oy, hp: 40 + floorLevel * 2, maxHp: 40 + floorLevel * 2,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 100, stunTurns: 0
            });
        }

        // 周囲に大量のザコ敵を配置
        for (let i = 0; i < 15; i++) {
            const rx = Math.floor(Math.random() * (COLS - 6)) + 3;
            const ry = Math.floor(Math.random() * (ROWS - 6)) + 3;
            if (map[ry][rx] === SYMBOLS.FLOOR && Math.abs(rx - player.x) > 4) {
                enemies.push({
                    type: 'NORMAL', x: rx, y: ry, hp: 15 + floorLevel, maxHp: 15 + floorLevel,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 20, stunTurns: 0
                });
            }
        }

        // 大蛇も2体 (現在無効化中)
        /* for (let i = 0; i < 2; i++) {
            const sx = (i === 0) ? 5 : COLS - 6;
            const sy = 12;
            if (map[sy][sx] === SYMBOLS.FLOOR || map[sy][sx] === SYMBOLS.LAVA) {
                map[sy][sx] = SYMBOLS.FLOOR;
                enemies.push({
                    type: 'SNAKE', x: sx, y: sy,
                    body: [{ x: sx, y: sy }, { x: sx, y: sy }, { x: sx, y: sy }, { x: sx, y: sy }],
                    symbols: ['S', 'N', 'A', 'K', 'E'],
                    hp: 30 + floorLevel * 2, maxHp: 30 + floorLevel * 2,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50,
                    stunTurns: 0
                });
            }
        } */

        // ウィルを大量配置
        for (let i = 0; i < 10; i++) {
            let wx, wy;
            do {
                wx = Math.floor(Math.random() * (COLS - 4)) + 2;
                wy = Math.floor(Math.random() * (ROWS - 4)) + 2;
            } while (map[wy][wx] === SYMBOLS.WALL || (Math.abs(wx - player.x) + Math.abs(wy - player.y) < 6));

            wisps.push({ x: wx, y: wy, dir: Math.floor(Math.random() * 4), mode: 'FOLLOW' });
        }

        // 出口 
        map[ROWS - 4][18] = SYMBOLS.STAIRS;
        return;
    }

    if (floorLevel === 50) {
        addLog("EVENT: The Turret's Corridor.");
        addLog("WARNING: Enemy army is gathered in the deep hall...");

        // 全面を床にしつつ、壁に小さなでっぱりを作る
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.FLOOR;
                // 壁際にランダムにでっぱり
                if ((x === 1 || x === COLS - 2) && Math.random() < 0.15) {
                    map[y][x] = SYMBOLS.WALL;
                }
            }
        }

        player.x = 20; player.y = ROWS - 2;

        // タレットの下から3マス目付近に配置 (20, ROWS-4)、上向き (dir: 0)
        const turretY = ROWS - 4;
        const turretX = 20;
        enemies.push({
            type: 'TURRET', x: turretX, y: turretY, dir: 0,
            hp: 2000 + floorLevel * 10, maxHp: 2000 + floorLevel * 10, // 超耐久に変更
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 200, stunTurns: 0
        });

        // タレットの横に水平な氷の床をのばす (壁から4マスあける)
        for (let x = 4; x <= COLS - 5; x++) {
            if (x !== turretX) {
                map[turretY][x] = SYMBOLS.ICE;
            }
        }

        // 出口の周辺に氷の床を適当に広げる
        for (let i = 0; i < 60; i++) {
            const ix = 20 + Math.floor(Math.random() * 9) - 4;
            const iy = 3 + Math.floor(Math.random() * 7) - 3;
            if (iy >= 1 && iy < ROWS - 1 && ix >= 1 && ix < COLS - 1) {
                if (map[iy][ix] === SYMBOLS.FLOOR) map[iy][ix] = SYMBOLS.ICE;
            }
        }

        // 敵100匹を「タレットが滑って届く範囲内」にランダム配置
        // 壁際（レーザーが届かない場所）と、中心（初期位置の射線）を避ける
        let enemyCount = 0;
        while (enemyCount < 100) {
            const ex = Math.floor(Math.random() * (COLS - 12)) + 6; // x: 6〜33 くらいの範囲
            const ey = Math.floor(Math.random() * 12) + 1;

            // 中心(x=20)の射線は避ける（最初は当たらないようにする）
            if (ex >= 19 && ex <= 21) continue;

            // 重要な場所を避ける
            if (ey <= 5 && ex >= 18 && ex <= 22) continue; // 出口周辺
            if (ex <= 2 && ey <= 2) continue; // 左上アイテム
            if (ex >= COLS - 3 && ey <= 2) continue; // 右上アイテム
            if (map[ey][ex] !== SYMBOLS.FLOOR) continue;

            enemies.push({
                type: 'NORMAL', x: ex, y: ey, hp: 5, maxHp: 5,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 2, stunTurns: 0
            });
            enemyCount++;
        }

        // 重要アイテムの配置
        map[1][1] = SYMBOLS.KEY; // 左上隅に鍵
        map[1][COLS - 2] = SYMBOLS.FAIRY; // 右上隅に妖精

        // 出口を封印された扉に変更
        map[3][20] = SYMBOLS.DOOR;
        addLog("The exit is SEALED (⊗). Find the KEY (🗝) in the corner!");
        return;
    }

    if (floorLevel === 75) {
        addLog("EVENT: The Void Arena.");
        // 全面を床にしつつ、壁沿いに溶岩の枠を作る
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                if (x === 1 || x === COLS - 2 || y === 1 || y === ROWS - 2) {
                    map[y][x] = SYMBOLS.LAVA;
                } else {
                    map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }
        // 中心に出口（穴）を配置
        const centerX = Math.floor(COLS / 2);
        const centerY = Math.floor(ROWS / 2);
        map[centerY][centerX] = SYMBOLS.STAIRS;

        const corners = [
            { x: 3, y: 3 },
            { x: COLS - 4, y: 3 },
            { x: 3, y: ROWS - 4 },
            { x: COLS - 4, y: ROWS - 4 }
        ];
        const startIndex = Math.floor(Math.random() * corners.length);
        const startPos = corners[startIndex];
        player.x = startPos.x;
        player.y = startPos.y;

        // プレイヤーの対角の位置に妖精を配置
        // インデックス 0(左上)<->3(右下), 1(右上)<->2(左下)
        const fairyPos = corners[3 - startIndex];
        map[fairyPos.y][fairyPos.x] = SYMBOLS.FAIRY;
        addLog("A fairy 🧚 is trapped at the opposite corner!");

        // 迷路生成（棒倒し法をベースに、特殊な場所を避けて生成）
        for (let y = 2; y <= ROWS - 3; y += 2) {
            for (let x = 2; x <= COLS - 3; x += 2) {
                // 出口周辺(5x5)は避ける
                if (Math.abs(x - centerX) <= 2 && Math.abs(y - centerY) <= 2) continue;
                // 四隅(開始地点候補)の周辺(5x5)も避ける
                if (corners.some(c => Math.abs(x - c.x) <= 2 && Math.abs(y - c.y) <= 2)) continue;

                // 柱を立てる
                map[y][x] = SYMBOLS.WALL;

                // 棒を倒す
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const d = dirs[Math.floor(Math.random() * 4)];
                const nx = x + d[0], ny = y + d[1];

                // 溶岩や出口、スタート地点の通行路を破壊しない範囲で壁を置く
                if (ny >= 2 && ny <= ROWS - 3 && nx >= 2 && nx <= COLS - 3) {
                    // 出口や四隅の「周辺」に壁が倒れ込むのも防ぐ
                    if (Math.abs(nx - centerX) <= 1 && Math.abs(ny - centerY) <= 1) continue;
                    if (corners.some(c => Math.abs(nx - c.x) <= 1 && Math.abs(ny - c.y) <= 1)) continue;
                    map[ny][nx] = SYMBOLS.WALL;
                }
            }
        }

        // 強敵（オーク）を配置 (12 -> 6)
        for (let i = 0; i < 6; i++) {
            let ox, oy, tries = 0;
            do {
                ox = Math.floor(Math.random() * (COLS - 4)) + 2;
                oy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while ((map[oy][ox] !== SYMBOLS.FLOOR || (Math.abs(ox - player.x) + Math.abs(oy - player.y) < 8)) && tries < 100);

            if (map[oy][ox] === SYMBOLS.FLOOR) {
                enemies.push({
                    type: 'ORC', x: ox, y: oy, hp: 150 + floorLevel * 2, maxHp: 150 + floorLevel * 2,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0
                });
            }
        }

        // 通常の敵 (E) を多めに配置
        for (let i = 0; i < 15; i++) {
            let ex, ey, tries = 0;
            do {
                ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while ((map[ey][ex] !== SYMBOLS.FLOOR || (Math.abs(ex - player.x) + Math.abs(ey - player.y) < 5)) && tries < 100);

            if (map[ey][ex] === SYMBOLS.FLOOR) {
                enemies.push({
                    type: 'NORMAL', x: ex, y: ey, hp: 15 + floorLevel, maxHp: 15 + floorLevel,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 10, stunTurns: 0
                });
            }
        }

        // ウィル (※) を多めに配置
        for (let i = 0; i < 8; i++) {
            let wx, wy, tries = 0;
            do {
                wx = Math.floor(Math.random() * (COLS - 4)) + 2;
                wy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while (map[wy][wx] !== SYMBOLS.FLOOR && tries < 100);

            if (map[wy][wx] === SYMBOLS.FLOOR) {
                wisps.push({ x: wx, y: wy, dir: Math.floor(Math.random() * 4), mode: 'FOLLOW' });
            }
        }

        // アイテム配置 (武器・防具を増やし、魔導書を相対的に減らす)
        const itemPool = [
            SYMBOLS.SWORD, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.ARMOR,
            SYMBOLS.SPEED, SYMBOLS.TOME, SYMBOLS.ESCAPE, SYMBOLS.STEALTH, SYMBOLS.CHARM
        ];
        for (let i = 0; i < 15; i++) {
            let ix, iy, tries = 0;
            do {
                ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while (map[iy][ix] !== SYMBOLS.FLOOR && tries < 100);

            if (map[iy][ix] === SYMBOLS.FLOOR) {
                map[iy][ix] = itemPool[Math.floor(Math.random() * itemPool.length)];
            }
        }
        addLog("WARNING: The Arena is filled with wandering spirits and chaos...");

        return;
    }

    const layoutRoll = Math.random();
    let isDenseMazeFloor = layoutRoll < 0.05;
    let isMazeFloor = !isDenseMazeFloor && layoutRoll < 0.2;
    let isGreatHallFloor = !isDenseMazeFloor && !isMazeFloor && layoutRoll < 0.4;

    if (floorLevel === 77) {
        addLog("EVENT: The Forbidden Labyrinth.");
        // フロア全体を一旦床にして、迷路ロジックの土台を作る
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        isDenseMazeFloor = true; // 超高密度迷路ロジックを使用
        isMazeFloor = false;
        isGreatHallFloor = false;
    }
    const rooms = [];

    if (isDenseMazeFloor) addLog("⚠️ WARNING: Entering an extremely dense TWISTED LABYRINTH...");
    else if (isMazeFloor) addLog("Warning: This floor is a complex NARROW MAZE!");
    else if (isGreatHallFloor) addLog("This floor is a vast GREAT HALL.");

    // フロアタイプに応じて部屋数を決定
    const roomCount = isDenseMazeFloor ? 8 : (isMazeFloor ? 25 : (isGreatHallFloor ? 2 : (Math.floor(Math.random() * 4) + 8)));

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

        let x, y;
        if (isGreatHallFloor) {
            // 大部屋が2つの場合、1つ目は左寄りに、2つ目は右寄りに配置して重なりを最小限にする
            if (i === 0) {
                x = Math.floor(Math.random() * 3) + 1;
                y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;
            } else {
                x = Math.floor(Math.random() * 3) + (COLS - w - 4);
                y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;
            }
        } else {
            x = Math.floor(Math.random() * (COLS - w - 2)) + 1;
            y = Math.floor(Math.random() * (ROWS - h - 2)) + 1;
        }

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

    // --- 高密度迷路(Dense Maze)の生成ロジック ---
    if (isDenseMazeFloor) {
        // 部屋の内部を床に戻す
        rooms.forEach(r => {
            for (let ry = r.y; ry < r.y + r.h; ry++) {
                for (let rx = r.x; rx < r.x + r.w; rx++) { map[ry][rx] = SYMBOLS.FLOOR; }
            }
        });

        // 部屋の配置後、部屋以外の場所を埋めていく
        for (let y = 3; y < ROWS - 3; y += 2) {
            for (let x = 3; x < COLS - 3; x += 2) {
                // スタート地点とラストルーム周辺（3x3範囲）は避ける
                const isNearStart = Math.abs(x - rooms[0].cx) <= 2 && Math.abs(y - rooms[0].cy) <= 2;
                const lastR = rooms[rooms.length - 1];
                const isNearEnd = Math.abs(x - lastR.cx) <= 2 && Math.abs(y - lastR.cy) <= 2;
                if (isNearStart || isNearEnd) continue;

                // 25階と同じ「棒倒し」的なロジック
                if (map[y][x] === SYMBOLS.FLOOR) {
                    if (Math.random() < 0.15) continue; // ユーザ要望：密度をわずかに下げる
                    const inAnyRoom = rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
                    if (!inAnyRoom) {
                        map[y][x] = SYMBOLS.WALL;
                        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                        const d = dirs[Math.floor(Math.random() * (y === 3 ? 4 : 3))];
                        if (y + d[1] >= 1 && y + d[1] < ROWS - 1 && x + d[0] >= 1 && x + d[0] < COLS - 1) {
                            map[y + d[1]][x + d[0]] = SYMBOLS.WALL;
                        }
                    }
                }
            }
        }
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
    const extraConnCount = isDenseMazeFloor ? 25 : (isMazeFloor ? 20 : 3);
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

    // 氷の床の生成 (3階以降、50%の確率。50階以降は100%発生)
    isIceFloor = false;
    if (floorLevel >= 3 && (Math.random() < 0.50 || floorLevel >= 50)) {
        isIceFloor = true;
        const numPatches = Math.floor(Math.random() * 2) + 2;
        for (let p = 0; p < numPatches; p++) {
            const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
            let sx = startRoom.cx, sy = startRoom.cy;
            for (let i = 0; i < 150; i++) {
                if (sy >= 1 && sy < ROWS - 1 && sx >= 1 && sx < COLS - 1) {
                    if (map[sy][sx] === SYMBOLS.FLOOR) map[sy][sx] = SYMBOLS.ICE;
                }
                sx += Math.floor(Math.random() * 3) - 1;
                sy += Math.floor(Math.random() * 3) - 1;
            }
        }
    }
    if (isIceFloor && !isDenseMazeFloor) addLog(floorLevel >= 50 ? "🌌 CHAOS FLOOR: Ice and Lava collide!" : "❄️ WARNING: This floor is completely FROZEN! (Slippery)");


    // 溶岩の床の生成 (25階以降。50階以降は氷と常時共存、25-49階は氷がない場合のみ出現)
    const canSpawnLava = (floorLevel >= 50) || (floorLevel >= 25 && !isIceFloor);
    const lavaChance = (floorLevel >= 50) ? 1.0 : 0.8; // 50階以降はカオス演出として確定

    if (canSpawnLava && Math.random() < lavaChance) {
        const numLavaSwamps = Math.floor(Math.random() * 3) + 2;
        for (let s = 0; s < numLavaSwamps; s++) {
            const startRoom = rooms[Math.floor(Math.random() * rooms.length)];
            let sx = startRoom.cx, sy = startRoom.cy;
            for (let i = 0; i < 60; i++) {
                if (sy >= 1 && sy < ROWS - 1 && sx >= 1 && sx < COLS - 1) {
                    if (map[sy][sx] === SYMBOLS.FLOOR || map[sy][sx] === SYMBOLS.ICE) {
                        map[sy][sx] = SYMBOLS.LAVA;
                    }
                }
                sx += Math.floor(Math.random() * 3) - 1;
                sy += Math.floor(Math.random() * 3) - 1;
            }
        }
        if (floorLevel < 50) addLog("🔥 WARNING: Intense Lava activity (≃) detected!");
    }

    // (タレットのレール生成は、タレット配置後に移動しました)

    // Ensure start point is ALWAYS floor and safe from lasers
    map[rooms[0].cy][rooms[0].cx] = SYMBOLS.FLOOR;
    player.x = rooms[0].cx;
    player.y = rooms[0].cy;

    // スタート地点がレーザー上なら安全な場所を探す
    let retryS = 0;
    while (isTileInLaser(player.x, player.y) && retryS < 50) {
        const rx = rooms[0].x + Math.floor(Math.random() * rooms[0].w);
        const ry = rooms[0].y + Math.floor(Math.random() * rooms[0].h);
        if (map[ry][rx] === SYMBOLS.FLOOR) {
            player.x = rx;
            player.y = ry;
        }
        retryS++;
    }

    // 万が一の保険：スタート地点を強制的に床にし、敵が存在する場合は消去する
    map[player.y][player.x] = SYMBOLS.FLOOR;
    enemies = enemies.filter(e => e.x !== player.x || e.y !== player.y);

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

    // --- 魔導書の出現設定 ---

    // 1. 各階層に最低1つは魔導書を配置 (4F〜99Fのランダム生成階層)
    if (floorLevel >= 4 && floorLevel < 100 && rooms.length > 1) {
        const possibleTomes = [SYMBOLS.SPEED, SYMBOLS.CHARM];
        if (floorLevel >= 8) possibleTomes.push(SYMBOLS.STEALTH);
        if (floorLevel >= 10) possibleTomes.push(SYMBOLS.ESCAPE);
        if (floorLevel >= 12) possibleTomes.push(SYMBOLS.EXPLOSION);
        if (floorLevel >= 15) possibleTomes.push(SYMBOLS.GUARDIAN);
        if (floorLevel >= 20) possibleTomes.push(SYMBOLS.HEAL_TOME);

        const chosenTome = possibleTomes[Math.floor(Math.random() * possibleTomes.length)];
        // スタート地点以外の部屋から選ぶ
        const roomsToUseTome = rooms.slice(1);
        const tomeRoom = roomsToUseTome[Math.floor(Math.random() * roomsToUseTome.length)];
        // 床または壁なら、床属性にして配置
        if (map[tomeRoom.cy][tomeRoom.cx] === SYMBOLS.FLOOR || map[tomeRoom.cy][tomeRoom.cx] === SYMBOLS.WALL) {
            map[tomeRoom.cy][tomeRoom.cx] = chosenTome;
        }
    }

    // 2. 追加のランダム出現 (既存の確率ベース)

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

    // 隠身の魔導書の出現 (8階以降、10%の確率)
    if (floorLevel >= 8 && Math.random() < 0.10) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const stealthRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[stealthRoom.cy][stealthRoom.cx] === SYMBOLS.FLOOR) {
                map[stealthRoom.cy][stealthRoom.cx] = SYMBOLS.STEALTH;
            }
        }
    }

    // 爆発魔法の出現 (12階以降、7%の確率)
    if (floorLevel >= 12 && Math.random() < 0.07) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const expRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[expRoom.cy][expRoom.cx] === SYMBOLS.FLOOR) {
                map[expRoom.cy][expRoom.cx] = SYMBOLS.EXPLOSION;
            }
        }
    }

    // 守護の魔導書（地形＆レーザー無効化）の出現 (15階以降、6%の確率)
    if (floorLevel >= 15 && Math.random() < 0.06) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const guardRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[guardRoom.cy][guardRoom.cx] === SYMBOLS.FLOOR) {
                map[guardRoom.cy][guardRoom.cx] = SYMBOLS.GUARDIAN;
            }
        }
    }

    // 緊急避難の魔導書 (10階以降、8%の確率)
    if (floorLevel >= 10 && Math.random() < 0.08) {
        const roomsToUse = rooms.slice(1);
        if (roomsToUse.length > 0) {
            const escRoom = roomsToUse[Math.floor(Math.random() * roomsToUse.length)];
            if (map[escRoom.cy][escRoom.cx] === SYMBOLS.FLOOR) {
                map[escRoom.cy][escRoom.cx] = SYMBOLS.ESCAPE;
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
                if (t === SYMBOLS.ICE || t === SYMBOLS.POISON || t === SYMBOLS.LAVA || t === SYMBOLS.WALL) map[ty][tx] = SYMBOLS.FLOOR;
            }
        }
    }

    // 出口は確実に接続済みの床タイル中央に置く (上書きを厭わない)
    let ex = lastRoom.cx, ey = lastRoom.cy;

    // もしスタート地点（プレイヤー位置）と同じなら、部屋の四隅のどこかにずらす
    if (ex === player.x && ey === player.y) {
        if (ex + 2 < lastRoom.x + lastRoom.w - 1) ex += 2;
        else if (ex - 2 > lastRoom.x) ex -= 2;
        if (ey + 2 < lastRoom.y + lastRoom.h - 1) ey += 2;
        else if (ey - 2 > lastRoom.y) ey -= 2;
    }
    map[ey][ex] = isLockedFloor ? SYMBOLS.DOOR : SYMBOLS.STAIRS;

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

    // --- 序盤ボーナス: 4-10Fにはアイテムを確定配置（チュートリアル補助） ---
    if (floorLevel >= 4 && floorLevel <= 10 && rooms.length > 1) {
        const bonusItems = [];
        // 毎階: 回復の魔導書
        bonusItems.push(SYMBOLS.HEAL_TOME);
        // 剣または防具を1つ
        bonusItems.push(Math.random() < 0.5 ? SYMBOLS.SWORD : SYMBOLS.ARMOR);
        // 階に応じて追加アイテム
        if (floorLevel >= 5) bonusItems.push(SYMBOLS.SPEED); // 加速
        if (floorLevel >= 6) bonusItems.push(SYMBOLS.EXPLOSION); // 爆発
        if (floorLevel >= 7) bonusItems.push(SYMBOLS.CHARM); // 魅了
        if (floorLevel >= 8) bonusItems.push(SYMBOLS.STEALTH); // 隠身
        if (floorLevel >= 9) bonusItems.push(SYMBOLS.GUARDIAN); // 守護

        const availableRooms = rooms.slice(1);
        const tomeSymsBonus = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.ESCAPE];
        // 部屋ごとの魔導書配置数を記録
        const roomTomeCounts = new Map();
        bonusItems.forEach(item => {
            const isTomeItem = tomeSymsBonus.includes(item);
            // 魔導書なら、まだ2個未満の部屋を優先的に選ぶ
            let candidates = availableRooms;
            if (isTomeItem) {
                const under2 = availableRooms.filter(r => (roomTomeCounts.get(r) || 0) < 2);
                if (under2.length > 0) candidates = under2;
            }
            const room = candidates[Math.floor(Math.random() * candidates.length)];
            for (let tries = 0; tries < 30; tries++) {
                const ix = room.x + Math.floor(Math.random() * room.w);
                const iy = room.y + Math.floor(Math.random() * room.h);
                if (map[iy][ix] === SYMBOLS.FLOOR) {
                    map[iy][ix] = item;
                    if (isTomeItem) roomTomeCounts.set(room, (roomTomeCounts.get(room) || 0) + 1);
                    break;
                }
            }
        });
    }

    // Spawn enemies
    // 序盤(4-10F)は敵の総数を制限
    const earlyFloorEnemyLimit = (floorLevel <= 10) ? Math.min(floorLevel, 6) : Infinity;
    for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];

        // 序盤は敵数上限に達したらスキップ
        if (enemies.length >= earlyFloorEnemyLimit) break;

        // 最初の10階までは敵の出現をスキップする確率を上げる
        if (floorLevel <= 10 && Math.random() < 0.5) continue;

        // 部屋の中の空き地(FLOOR)を探すヘルパー
        const findFloorInRoom = (r, maxTries = 20) => {
            for (let t = 0; t < maxTries; t++) {
                const tx = r.x + Math.floor(Math.random() * r.w);
                const ty = r.y + Math.floor(Math.random() * r.h);
                if (map[ty][tx] === SYMBOLS.FLOOR) return { x: tx, y: ty };
            }
            return null;
        };

        // 氷や溶岩も含めた歩行可能地点を探す
        const findWalkableInRoom = (r, maxTries = 30) => {
            for (let t = 0; t < maxTries; t++) {
                const tx = r.x + Math.floor(Math.random() * r.w);
                const ty = r.y + Math.floor(Math.random() * r.h);
                const tile = map[ty][tx];
                if (tile === SYMBOLS.FLOOR || tile === SYMBOLS.ICE || tile === SYMBOLS.LAVA || tile === SYMBOLS.POISON) {
                    // 既に敵がいる座標には配置しない
                    if (enemies.some(e => e.x === tx && e.y === ty)) continue;
                    return { x: tx, y: ty, tile };
                }
            }
            return null;
        };

        const rand = Math.random();
        if (rand < 0.04) {
            const pos = findFloorInRoom(room);
            if (pos) {
                enemies.push({
                    type: 'GOLD', x: pos.x, y: pos.y, hp: 4, maxHp: 4,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 500 + (floorLevel * 100)
                });
                addLog("!! A Golden Shiny Enemy appeared !!");
            }
        /* } else if (rand < (floorLevel <= 10 ? 0.02 : 0.10)) { // 大蛇(SNAKE) 現在無効化中
            const pos = findFloorInRoom(room);
            if (pos) {
                enemies.push({
                    type: 'SNAKE', x: pos.x, y: pos.y,
                    body: [{ x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }, { x: pos.x, y: pos.y }],
                    symbols: ['S', 'N', 'A', 'K', 'E'],
                    hp: 15 + floorLevel * 5, maxHp: 15 + floorLevel * 5,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
                    stunTurns: 0
                });
                addLog("!! A huge ENEMY appeared !!");
            } */
        } else {
            // 大部屋(Great Hall)の場合は広さに合わせて多めに出す。通常は1部屋1〜2体
            let minE = 1;
            let maxE = floorLevel <= 10 ? 1 : 2;
            if (isGreatHallFloor) {
                minE = 5;
                maxE = 10;
            }

            const numEnemies = Math.floor(Math.random() * (maxE - minE + 1)) + minE;
            for (let j = 0; j < numEnemies; j++) {
                const pos = findWalkableInRoom(room);
                if (pos) {
                    const ex = pos.x;
                    const ey = pos.y;
                    const tileAtPos = pos.tile;

                    if (tileAtPos === SYMBOLS.ICE && floorLevel >= 50) {
                        // 氷にはフロストが生息
                        enemies.push({
                            type: 'FROST', x: ex, y: ey,
                            hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2,
                            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15,
                            stunTurns: 0
                        });
                    } else if (tileAtPos === SYMBOLS.LAVA && floorLevel >= 50) {
                        // 溶岩にはブレイズが生息
                        enemies.push({
                            type: 'BLAZE', x: ex, y: ey,
                            hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2,
                            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15,
                            stunTurns: 0
                        });
                    } else if (tileAtPos === SYMBOLS.FLOOR) {
                        // 通常の床での抽選
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
                                hp: 100 + floorLevel * 5, maxHp: 100 + floorLevel * 5,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                                dir: bestDir, stunTurns: 0
                            });
                        } else if (floorLevel >= 8 && enemyRoll < 0.25) {
                            enemies.push({
                                type: 'ORC', x: ex, y: ey,
                                hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                                stunTurns: 0
                            });
                        } else {
                            enemies.push({
                                type: 'NORMAL', x: ex, y: ey,
                                hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                                stunTurns: 0
                            });
                        }
                    } else {
                        // 毒沼などの上
                        enemies.push({
                            type: 'NORMAL', x: ex, y: ey,
                            hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                            stunTurns: 0
                        });
                    }
                }
            }
        }
    }

    // --- 最低敵数保証：敵ゼロの階をなくす ---
    const minEnemies = floorLevel <= 10 ? 2 : 3;
    if (enemies.length < minEnemies) {
        const availRooms = rooms.slice(1);
        for (let attempt = 0; enemies.length < minEnemies && attempt < 100; attempt++) {
            const room = availRooms[Math.floor(Math.random() * availRooms.length)];
            const tx = room.x + Math.floor(Math.random() * room.w);
            const ty = room.y + Math.floor(Math.random() * room.h);
            const tile = map[ty][tx];
            if ((tile === SYMBOLS.FLOOR || tile === SYMBOLS.ICE || tile === SYMBOLS.POISON) &&
                !(tx === player.x && ty === player.y) &&
                !enemies.some(e => e.x === tx && e.y === ty)) {
                enemies.push({
                    type: 'NORMAL', x: tx, y: ty,
                    hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0
                });
            }
        }
    }

    // --- タレット周辺に「滑る射線」パズルを生成 (敵配置後に行う) ---
    if (floorLevel >= 3) {
        enemies.filter(e => e.type === 'TURRET').forEach(turret => {
            if (Math.random() < 0.01) {
                const roadLen = Math.floor(Math.random() * 6) + 3;
                for (let dx = -roadLen; dx <= roadLen; dx++) {
                    const ix = turret.x + dx, iy = turret.y;
                    if (ix === turret.x) continue;
                    if (ix >= 1 && ix < COLS - 1 && iy >= 1 && iy < ROWS - 1) {
                        // 床であれば氷に変える。出口や他の中立物は上書きしない
                        if (map[iy][ix] === SYMBOLS.FLOOR || map[iy][ix] === SYMBOLS.LAVA || map[iy][ix] === SYMBOLS.POISON) {
                            map[iy][ix] = SYMBOLS.ICE;
                        }
                    }
                }
            }
        });
    }

    // --- 1部屋あたりの魔導書を最大2個に制限 ---
    const tomeSymbols = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.ESCAPE];
    rooms.forEach(room => {
        let tomeCount = 0;
        for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
                if (tomeSymbols.includes(map[y][x])) {
                    tomeCount++;
                    if (tomeCount > 2) map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }
    });

    // --- 最終セーフティ：出口が消えていないかチェック ---
    let hasExit = false;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] === SYMBOLS.STAIRS || map[y][x] === SYMBOLS.DOOR || map[y][x] === SYMBOLS.CORE) {
                hasExit = true; break;
            }
        }
        if (hasExit) break;
    }
    if (!hasExit && floorLevel < 100) {
        const fallback = rooms[rooms.length - 1];
        let fx = fallback.cx, fy = fallback.cy;
        // プレイヤーと重なる場合は、部屋の角にずらす
        if (fx === player.x && fy === player.y) {
            fx = fallback.x + 1; fy = fallback.y + 1;
            if (fx === player.x && fy === player.y) { fx += 2; fy += 2; }
        }
        map[fy][fx] = SYMBOLS.STAIRS;
        addLog("DEBUG: Recovery hole generated.");
    }
    // ウィル・オ・ウィスプの生成 (4階以降)
    if (floorLevel >= 4) {
        let actualSpawned = 0;
        // 数を以前より控えめに（6階につき1体追加）、かつ最大8体までに制限
        const numWisps = Math.min(8, Math.max(1, Math.floor(floorLevel / 6)));
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

    // 50階以降：NORMAL敵に溶岩/氷サブタイプを付与
    if (floorLevel >= 50) {
        enemies.forEach(e => {
            if (e.type !== 'NORMAL') return;
            const tile = map[e.y][e.x];
            if (tile === SYMBOLS.LAVA) e.type = 'BLAZE';
            else if (tile === SYMBOLS.ICE) e.type = 'FROST';
        });
    }

}

function isWallAt(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    const tile = map[y][x];
    if (tile === SYMBOLS.WALL || tile === SYMBOLS.DOOR || tile === SYMBOLS.CORE || tile === SYMBOLS.BLOCK || tile === SYMBOLS.BLOCK_CRACKED) return true;
    if (tempWalls.some(w => w.x === x && w.y === y)) return true;
    return false;
}

async function startFloorTransition() {
    isProcessing = true;
    isPlayerVisible = false; // 遷移開始時に即座に隠す
    SOUNDS.DESCEND();
    transition.active = true;
    transition.mode = 'FALLING';
    transition.text = `FLOOR ${floorLevel}`;
    transition.textColor = '#fff';
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
    // 階段降下時にHP全回復
    player.hp = player.maxHp;
    player.isSpeeding = false;
    player.isExtraTurn = false;
    player.isShielded = false;
    updateUI();
    isPlayerVisible = false; // 着地アニメーションまで非表示を維持

    if (floorLevel > 1) {
        transition.mode = 'FADE';
        await new Promise(r => setTimeout(r, 800));
        for (let a = 1; a >= 0; a -= 0.1) { transition.alpha = a; await new Promise(r => setTimeout(r, 50)); }
    }

    transition.active = false;
    transition.alpha = 0;
    transition.text = ""; // 確実にテキストを消去

    // 着地アニメーションを実行
    await animateLanding();
    isPlayerVisible = true; // 確実に表示状態にする
    isProcessing = false; // 確実に操作可能にする

    // 階層ごとのストーリー演出
    if (floorLevel === 100) {
        isProcessing = true;
        await new Promise(r => setTimeout(r, 600));
        await showStoryPages([
            ["Before your eyes lies a sphere of light.", "", "あなたの目の前に、光の球体がある"],
            ["It is the Dungeon Core.", "", "ダンジョンコアだ"],
            ["You once read of it in ancient scrolls.", "", "古い文献で、読んだことがある"],
            ["Destroy this, and the dungeon", "will vanish into nothingness.", "", "これを破壊すれば、ダンジョンは消え去るのだ"],
            ["And then, you may finally", "return to the surface.", "", "そしてあなたは、地上へ帰還することが", "できるだろう"]
        ], true);
    }
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
        } else if (item.symbol === SYMBOLS.FAIRY) {
            await animateItemGet(SYMBOLS.FAIRY);
            player.fairyCount++;
            player.fairyRemainingCharms++;
            addLog("✨ You were joined by a FAIRY! ✨");
            addLog("The fairy will charm enemies you encounter on each floor.");
            spawnFloatingText(item.x, item.y, "FAIRY JOINED", "#f472b6");
        }
        updateUI();
    }
}

async function animateEnemyFall(e) {
    const fallHeight = 400;
    e.offsetY = -fallHeight;
    const fallDuration = 600;
    const startTime = performance.now();

    SOUNDS.FALL_WHIZ();
    while (performance.now() - startTime < fallDuration) {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / fallDuration;
        e.offsetY = -fallHeight * (1 - progress);
        draw();
        await new Promise(r => requestAnimationFrame(r));
    }
    e.offsetY = 0;
    SOUNDS.LANDING_THUD();
    setScreenShake(8, 150);
}

async function triggerDragonSpawn() {
    isProcessing = true;
    hasSpawnedDragon = true;

    addLog("!!!!!");
    setScreenShake(20, 1000);
    SOUNDS.EXPLODE();

    await new Promise(r => setTimeout(r, 800));

    const centerX = Math.floor(COLS / 2);
    const dragonY = dungeonCore.y + 1;

    // 二行構成: "Dragonlord" と "   of the Dungeon"
    const line1 = "Dragonlord";
    const line2 = "   of the Dungeon";
    const spacing = 0.85; // 字間を少し狭める


    // まずは先頭の 'D' だけを生成
    const dragon = {
        type: 'DRAGON', x: centerX - 4, y: dragonY,
        baseY: dragonY, // 初期位置を保存
        body: [],
        hp: 3000, maxHp: 3000,
        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 20000,
        isFalling: true, fireCooldown: 0,
        battleTurns: 0, breathState: null,
        tackleCooldown: 0, chargingTackle: false,
        moveDir: 0 // 自動追跡になるため初期値は0でOK
    };
    enemies.push(dragon);

    // 'D' が一文字落下してくる演出
    await animateEnemyFall(dragon);
    dragon.isFalling = false;
    SOUNDS.LANDING_THUD();
    setScreenShake(30, 400);

    // 一拍置く
    await new Promise(r => setTimeout(r, 1000));

    // 残りの文字を一気に生成する準備
    addLog("The name of the true ruler appears...");
    SOUNDS.RUMBLE();
    setScreenShake(40, 1500);

    // Line 1 の残り (D 以降) を一気に追加
    for (let i = 1; i < line1.length; i++) {
        if (line1[i] !== ' ') {
            dragon.body.push({ x: dragon.x + i * spacing, y: dragonY, char: line1[i] });
        }
    }

    // Line 2 を一気に追加
    for (let i = 0; i < line2.length; i++) {
        if (line2[i] !== ' ') {
            dragon.body.push({ x: dragon.x + i * spacing, y: dragonY + 1, char: line2[i] });
        }
    }

    // 少しの間、激しく震えながら文字が実体化する演出
    for (let i = 0; i < 20; i++) {
        dragon.offsetX = (Math.random() - 0.5) * 4;
        dragon.offsetY = (Math.random() - 0.5) * 4;
        draw();
        if (i % 5 === 0) SOUNDS.SELECT();
        await new Promise(r => setTimeout(r, 50));
    }
    dragon.offsetX = 0; dragon.offsetY = 0;

    await new Promise(r => setTimeout(r, 500));

    // 咆哮と突き飛ばし演出
    addLog("DRAGONLORD: 'You have come far, mortal. The Core belongs to me.'");
    SOUNDS.FATAL();
    setScreenShake(60, 1500);

    // プレイヤーを反対側の壁まで突き飛ばす (ダメージなし)
    const targetY = ROWS - 3;
    const startY = player.y;
    const pushDuration = 500;
    const startTime = performance.now();

    while (performance.now() - startTime < pushDuration) {
        const elapsed = performance.now() - startTime;
        const p = Math.min(1, elapsed / pushDuration);
        // イージング（最初は速く、徐々に減速）
        player.y = Math.floor(startY + (targetY - startY) * (1 - Math.pow(1 - p, 3)));
        draw();
        await new Promise(r => requestAnimationFrame(r));
    }
    player.y = targetY;

    SOUNDS.LANDING_THUD();
    addLog("You were blown away by the dragon's roar!");

    // 近くの敵も吹き飛ばす
    enemies.forEach(otherE => {
        if (otherE.type === 'DRAGON') return;
        if (otherE.hp > 0) {
            otherE.y = Math.min(ROWS - 3, otherE.y + 10);
            spawnDamageText(otherE.x, otherE.y, 0, '#fff'); // ダメージなしの吹き飛ばし演出
        }
    });

    await new Promise(r => setTimeout(r, 500));
    isProcessing = false;
}

async function animateEnemyFallOld(e) {
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

async function showStoryPages(pages, useMiddlePos = false) {
    for (let i = 0; i < pages.length; i++) {
        const isLastPage = (i === pages.length - 1);
        storyMessage = {
            lines: pages[i],
            alpha: 0,
            showNext: !isLastPage,
            useMiddlePos: useMiddlePos
        };
        isTutorialInputActive = true;

        // フェードイン
        for (let a = 0; a <= 1; a += 0.05) {
            storyMessage.alpha = a;
            await new Promise(r => setTimeout(r, 20));
        }

        while (isTutorialInputActive) {
            await new Promise(r => setTimeout(r, 20));
        }

        // フェードアウト
        for (let a = 1; a >= 0; a -= 0.05) {
            storyMessage.alpha = a;
            await new Promise(r => setTimeout(r, 20));
        }
        storyMessage = null;
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function triggerStage1StaminaTutorial() {
    isProcessing = true;
    hasShownStage1Tut = true;
    await showStoryPages([
        [
            "Continuous attacks cause fatigue,",
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
            "Defend yourself with [Space].",
            "",
            "【スペースキー】：防御"
        ]
    ]);
    isProcessing = false;
}

async function triggerStage1StartStory() {
    isProcessing = true;
    await showStoryPages([
        [
            "This dungeon is said to have",
            "one hundred floors.",
            "",
            "このダンジョンは",
            "地下100階まであるらしい"
        ],
        [
            "The town's prophet",
            "spoke of it so.",
            "",
            "町の予言者が",
            "そう話していた"
        ],
        [
            "The adventurers who descended",
            "into its depths...",
            "",
            "探索におりた",
            "冒険者たちは"
        ],
        [
            "Never returned.",
            "",
            "もどってこなかった"
        ]
    ]);
    isProcessing = false;
}

async function triggerWandEvent() {
    isProcessing = true;
    await new Promise(r => setTimeout(r, 600)); // 杖を取った後の余韻

    await showStoryPages([
        [
            "You picked up the Magic Wand.",
            "",
            "魔法の杖を拾った"
        ],
        [
            "Likely a relic of an adventurer",
            "who never returned.",
            "",
            "もどってこなかった冒険者の遺品だろう"
        ],
        [
            "It seems to have the power",
            "to create walls.",
            "",
            "壁づくりの効果があるようだ"
        ],
        [
            "[Space] + [Arrows]: Create Wall",
            "",
            "【スペースキー】＋【矢印キー】：壁づくり"
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

async function triggerKeyLogStory() {
    isProcessing = true;
    await new Promise(r => setTimeout(r, 600));

    await showStoryPages([
        [
            "You obtained the Key.",
            "",
            "鍵を入手した"
        ],
        [
            "With this, you should be able to",
            "pass through the sealed areas.",
            "",
            "これがあれば、閉ざされた場所を通れるはず"
        ]
    ]);
    isProcessing = false;
}

async function triggerGoldLogStory() {
    isProcessing = true;
    hasShownGoldTut = true;
    await new Promise(r => setTimeout(r, 600));

    await showStoryPages([
        [
            "Defeated a monster of a different color.",
            "",
            "色違いの敵を倒した"
        ],
        [
            "Power is surging through you.",
            "",
            "力が、みなぎってくる"
        ]
    ]);
    isProcessing = false;
}

async function triggerSaveEvent() {
    isProcessing = true;
    hasShownSaveTut = true;
    await new Promise(r => setTimeout(r, 400));

    await showStoryPages([
        [
            "Somewhere, a voice spoke.",
            "",
            "どこかから、声が聞こえた"
        ],
        [
            "\"If your strength should fade...\"",
            "\"You shall return here.\"",
            "",
            "「力つきた時、おまえはここへ戻るだろう」と…"
        ]
    ]);
    isProcessing = false;
}

async function triggerFairyEvent() {
    isProcessing = true;
    hasShownFairyTut = true;
    await new Promise(r => setTimeout(r, 600));

    await showStoryPages([
        [
            "The fairy is trembling.",
            "",
            "妖精が怯えている"
        ],
        [
            "As you reach out your hand...",
            "",
            "あなたが手を差し出すと"
        ],
        [
            "It timidly brushes",
            "against your palm.",
            "",
            "おそるおそる、その手に触れた"
        ],
        [
            "It seems she will charm the first",
            "monster you meet on each floor.",
            "",
            "各階層で最初に遭遇したモンスターを、",
            "仲間にしてくれるようだ"
        ]
    ]);
    isProcessing = false;
}

async function triggerTomeEvent() {
    isProcessing = true;
    hasShownTomeTut = true;
    await new Promise(r => setTimeout(r, 600));

    await showStoryPages([
        [
            "You picked up a magic tome.",
            "",
            "魔導書を拾った"
        ],
        [
            "Likely a relic of an adventurer",
            "who never returned.",
            "",
            "もどってこなかった冒険者の遺品だろうか"
        ],
        [
            "It grants various effects",
            "when used.",
            "",
            "使用することで様々な効果を発揮する"
        ],
        [
            "Press [X] key to open Inventory,",
            "then select [ITEM] to use Tomes.",
            "",
            "【Xキー】→【ITEM】：魔導書の使用"
        ]
    ]);
    isProcessing = false;
}

async function triggerEquipEvent() {
    isProcessing = true;
    hasShownEquipTut = true;
    await new Promise(r => setTimeout(r, 600));

    await showStoryPages([
        [
            "What you have found...",
            "",
            "あなたが入手したのは"
        ],
        [
            "Equipment of the adventurers",
            "who never returned.",
            "",
            "もどってこなかった冒険者たちの装備だ"
        ],
        [
            "By gathering these fragments,",
            "",
            "それらを拾い集めることで"
        ],
        [
            "You can make their strength",
            "your own.",
            "",
            "自らの力にすることができる"
        ]
    ]);
    isProcessing = false;
}

async function playOpeningSequence() {
    gameState = 'OPENING';
    openingData.active = true;
    openingData.currentLine = null;
    openingData.alpha = 0;

    // 1. スタート直後の1秒間の静寂
    await new Promise(r => setTimeout(r, 1000));

    // シーン1: 裏切り
    const betrayalScene = [
        { en: "One day, you...", jp: "ある日、あなたは…" },
        { en: "Were betrayed by your fellow adventurers.", jp: "冒険者パーティの仲間たちに裏切られた" },
        { en: "You were called out to the outskirts of town...", jp: "町はずれに呼び出されて" },
        { en: "And pushed into...", jp: "あたらしくできたダンジョンの穴に、" },
        { en: "...a newly discovered dungeon hole.", jp: "突き落とされたのである" }
    ];

    // シーン2: 復讐の誓い
    const revengeScene = [
        { en: "You fall deep into the dark pit.", jp: "あなたは、深い穴を、落ちていく" },
        { en: "Their laughter fades away far above your head.", jp: "仲間たちの笑う声が、頭上へ遠ざかっていく" },
        { en: "In that infinite darkness, you swore revenge.", jp: "あなたは復讐をちかった" },
        { en: "I will survive and escape this dungeon...", jp: "かならずこのダンジョンを出て" },
        { en: "And I will KILL them all.", jp: "あいつらを、殺すと" }
    ];

    const waitInput = async () => {
        isTutorialInputActive = true;
        while (isTutorialInputActive) {
            await new Promise(r => setTimeout(r, 20));
        }
    };

    const showLine = async (line) => {
        openingData.currentLine = line;
        // フェードイン
        for (let a = 0; a <= 1; a += 0.02) {
            openingData.alpha = a;
            await new Promise(r => requestAnimationFrame(r));
        }
        openingData.alpha = 1;
        await waitInput();
        // フェードアウト
        for (let a = 1; a >= 0; a -= 0.05) {
            openingData.alpha = a;
            await new Promise(r => requestAnimationFrame(r));
        }
        openingData.alpha = 0;
        openingData.currentLine = null;
        await new Promise(r => setTimeout(r, 1000));
    };

    // 前半
    for (const line of betrayalScene) {
        await showLine(line);
    }

    // 2. 沈黙の1秒
    openingData.currentLine = null;
    await new Promise(r => setTimeout(r, 1000));

    // 後半
    for (const line of revengeScene) {
        await showLine(line);
    }

    // 最終暗転
    transition.active = true;
    transition.mode = 'FADE';
    transition.alpha = 0;
    for (let a = 0; a <= 1; a += 0.05) {
        transition.alpha = a;
        await new Promise(r => setTimeout(r, 30));
    }

    openingData.active = false;
    await startGame(1);
}

function drawOpening(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (openingData.currentLine) {
        ctx.textAlign = 'center';
        const bottomY = canvas.height - 100;
        const alpha = openingData.alpha || 0;

        // 英語テキスト (データ/ログ風のグレー)
        ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
        ctx.font = '16px "Courier New"';

        // 改行対応
        const enLines = openingData.currentLine.en.split('\n');
        enLines.forEach((l, i) => {
            ctx.fillText(l, canvas.width / 2, bottomY + (i * 20));
        });

        // 日本語テキスト
        ctx.fillStyle = `rgba(136, 136, 136, ${alpha})`;
        ctx.font = '14px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
        const jpLines = openingData.currentLine.jp.split('\n');
        jpLines.forEach((l, i) => {
            ctx.fillText(l, canvas.width / 2, bottomY + 30 + (enLines.length > 1 ? 15 : 0) + (i * 20));
        });
    }

    if (transition.active) {
        ctx.fillStyle = `rgba(0, 0, 0, ${transition.alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
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
    } else if (gameState === 'CONFIRM_ESCAPE') {
        draw(now);
        drawConfirmEscape();
    } else if (gameState === 'GAMEOVER') {
        drawGameOver();
    } else if (gameState === 'OPENING') {
        drawOpening(now);
    } else if (gameState === 'ENDING_SEQ') {
        draw(now);
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
    ctx.font = "bold 40px 'Courier New', Courier, monospace";
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

    ctx.fillStyle = '#ff0000';
    ctx.font = "bold 48px 'Courier New', Courier, monospace";
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
            ctx.fillText(String(s.val), startX + 220, startY + i * gap);
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

        ctx.font = '14px Courier New';
        ctx.fillText(`  Holy Sword (Lv${player.swordCount})`, startX, infoY);

        // --- Holy Armor ---
        const armorY = infoY + 90;
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${TILE_SIZE * 0.7}px 'Courier New'`;
        ctx.fillText(SYMBOLS.ARMOR, startX + 2, armorY - 2); // 微調整

        ctx.font = '14px Courier New';
        ctx.fillText(`  Holy Armor (Lv${player.armorCount})`, startX, armorY);

        // --- Fairy ---
        if (player.fairyCount > 0) {
            const fairyY = armorY + 90;
            ctx.fillStyle = '#f472b6';
            ctx.font = `bold ${TILE_SIZE}px 'Courier New'`;
            ctx.fillText(SYMBOLS.FAIRY, startX, fairyY);

            ctx.font = '14px Courier New';
            ctx.fillText(`  Fairy Companion (x${player.fairyCount})`, startX, fairyY);
        }
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('-- INVENTORY --', canvas.width / 2, 80);

    const fullItems = [
        { name: `${SYMBOLS.SPEED} Haste Tome`, count: player.hasteTomes, desc: "Recite to accelerate time." },
        { name: `${SYMBOLS.CHARM} Charm Tome`, count: player.charmTomes, desc: "Tame nearby enemies for this floor." },
        { name: `${SYMBOLS.STEALTH} Stealth Tome`, count: player.stealthTomes, desc: "Recite to vanish from sight." },
        { name: `${SYMBOLS.EXPLOSION} Explosion Tome`, count: player.explosionTomes, desc: "Release a powerful blast around you." },
        { name: `${SYMBOLS.GUARDIAN} Guardian Tome`, count: player.guardianTomes, desc: "Nullify terrain & laser dmg for this floor." },
        { name: `${SYMBOLS.ESCAPE} Escape Tome`, count: player.escapeTomes, desc: "Warp to a random floor (3F-99F)." },
        { name: `${SYMBOLS.HEAL_TOME} Heal Tome`, count: player.healTomes, desc: "Fully restore HP." }
    ];
    const items = fullItems.filter(it => it.count > 0);

    if (items.length === 0) {
        ctx.textAlign = 'center';
        ctx.font = '16px Courier New';
        ctx.fillText('(Empty)', canvas.width / 2, canvas.height / 2);
    } else {
        // レイアウト設定
        const listX = 60;
        const listY = 120;
        const listW = 340;
        const itemH = 45;
        const maxVisible = 6;

        // スクロール制御
        let startIdx = 0;
        if (inventorySelection >= maxVisible) {
            startIdx = inventorySelection - maxVisible + 1;
        }

        // リスト表示
        for (let i = 0; i < maxVisible; i++) {
            const idx = startIdx + i;
            if (idx >= items.length) break;
            const item = items[idx];
            const iy = listY + i * itemH;

            if (idx === inventorySelection) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fillRect(listX, iy, listW, itemH - 5);
                ctx.strokeStyle = '#fbbf24';
                ctx.strokeRect(listX, iy, listW, itemH - 5);
            }

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'left';
            ctx.font = '18px Courier New';
            ctx.fillText(`${item.name} x${item.count}`, listX + 10, iy + 28);
        }

        // スクロールインジケータ
        if (startIdx > 0) ctx.fillText('▲', listX + listW / 2, listY - 10);
        if (startIdx + maxVisible < items.length) ctx.fillText('▼', listX + listW / 2, listY + maxVisible * itemH);

        // 説明エリア (右側)
        const descX = 430;
        const descY = 120;
        const descW = 310;
        const descH = 265;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(descX, descY, descW, descH);

        const selected = items[inventorySelection];
        if (selected) {
            // 日本語訳データ
            const translations = {
                "Haste Tome": "加速の魔導書。唱えると時間の流れが加速する。",
                "Charm Tome": "魅了の魔導書。この階の間、周囲の敵をすべて仲間にする。",
                "Stealth Tome": "隠身の魔導書。唱えると姿を消し、敵から見えなくなる。",
                "Explosion Tome": "爆発の魔導書。自分の周囲に強力な爆発を引き起こす。",
                "Guardian Tome": "守護の魔導書。この階の間、地形とレーザーのダメージを無効化する。",
                "Escape Tome": "脱出の魔導書。ランダムな階層(3F-99F)へワープする。"
            };
            const itemName = selected.name.split(' ').slice(1).join(' ');

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px Courier New';
            ctx.fillText(itemName, descX + 20, descY + 40);

            ctx.font = '14px Courier New';
            ctx.fillStyle = '#aaa';

            // 英語説明のワードラップ
            const words = selected.desc.split(' ');
            let line = '';
            let lineY = descY + 80;
            const maxWidth = descW - 40;

            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, descX + 20, lineY);
                    line = words[n] + ' ';
                    lineY += 20;
                } else {
                    line = testLine;
                }
            }
            ctx.fillText(line, descX + 20, lineY);

            // 日本語訳の表示
            const jpDescArray = translations[itemName] ? translations[itemName].split('。') : [];
            if (jpDescArray.length > 0) {
                ctx.fillStyle = '#aaa'; // 英字（#aaa）に合わせる
                ctx.font = '12px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
                let jpY = descY + 180;
                jpDescArray.forEach(sentence => {
                    if (sentence.trim() === '') return;
                    ctx.fillText(sentence + '。', descX + 20, jpY);
                    jpY += 20; // 改行
                });
            }
        }
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '13px Courier New';
    ctx.fillText('Press [Enter] to Use / [X] to Back', canvas.width / 2, canvas.height - 65);
}

function drawConfirmEscape() {
    const w = 320, h = 160;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('REALLY USE ESCAPE TOME?', canvas.width / 2, y + 50);

    ctx.font = '14px "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
    ctx.fillText('本当に脱出の魔導書を使いますか？', canvas.width / 2, y + 80);

    ctx.font = '16px Courier New';
    ctx.fillStyle = (menuSelection === 0) ? '#fbbf24' : '#666';
    ctx.fillText(menuSelection === 0 ? '> YES <' : '  YES  ', canvas.width / 2 - 60, y + 120);
    ctx.fillStyle = (menuSelection === 1) ? '#fbbf24' : '#666';
    ctx.fillText(menuSelection === 1 ? '> NO <' : '  NO  ', canvas.width / 2 + 60, y + 120);
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

function drawTraps(now) {
    // ドラゴントラップの描画
    dragonTraps.forEach(t => {
        const px = t.x * TILE_SIZE + TILE_SIZE / 2;
        const py = t.y * TILE_SIZE + TILE_SIZE / 2;
        if (t.stage === 'CIRCLE') {
            ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(px, py, TILE_SIZE * 0.4, 0, Math.PI * 2); ctx.stroke();
        } else if (t.stage === 'READY') {
            const flash = Math.floor(now / 100) % 2 === 0;
            ctx.fillStyle = flash ? '#ef4444' : '#991b1b';
            ctx.beginPath(); ctx.arc(px, py, TILE_SIZE * 0.4, 0, Math.PI * 2); ctx.fill();
        }
    });
}

function drawExplosions(now) {
    // 爆発エフェクト（damageTextsで処理済み）
}

function drawAuras(now) {
    // トームオーラの描画
    if (tomeEffect.active && now < tomeEffect.endTime) {
        const alpha = 0.2 * (1 - (now - (tomeEffect.endTime - 500)) / 500);
        if (alpha > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = tomeEffect.color;
            ctx.beginPath();
            ctx.arc(tomeEffect.x * TILE_SIZE + TILE_SIZE / 2, tomeEffect.y * TILE_SIZE + TILE_SIZE / 2, tomeEffect.range * TILE_SIZE, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

function drawFloatingParticles() {
    // フローティングパーティクル（damageTextsで処理済み）
}

function draw(now) {
    if (!now) now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.translate(Math.round(screenShake.x), Math.round(screenShake.y) + 2);
    ctx.font = `${TILE_SIZE - 2}px 'Courier New'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // エンディング演出中（ENDING_SEQ）: transition.activeが有効ならオーバーレイ画面、無効なら通常画面を描画
    if (gameState === 'ENDING_SEQ' && transition.active) {
        const isWhite = (transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT');
        if (isWhite && transition.darken) {
            const v = Math.round(255 * (1 - transition.darken));
            ctx.fillStyle = `rgb(${v},${v},${v})`;
        } else {
            ctx.fillStyle = isWhite ? '#fff' : transition.mode === 'RED_OUT' ? '#b00' : '#000';
        }
        ctx.fillRect(-screenShake.x, -screenShake.y, canvas.width, canvas.height);
    } else {
        // --- 通常のゲーム画面描画 ---
        // 1. マップ
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                let char = map[y][x];
                if (fireFloors.some(f => f.x === x && f.y === y)) char = SYMBOLS.FIRE_FLOOR;
                const px = x * TILE_SIZE; const py = y * TILE_SIZE;

                // Tome effect flash
                if (tomeEffect.active && now < tomeEffect.endTime) {
                    const dist = Math.abs(x - tomeEffect.x) + Math.abs(y - tomeEffect.y);
                    if (dist <= tomeEffect.range && Math.floor(now / 100) % 2 === 0) {
                        ctx.save(); ctx.fillStyle = tomeEffect.color; ctx.globalAlpha = 0.4;
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.restore();
                    }
                }

                if (char === SYMBOLS.WALL) {
                    ctx.fillStyle = '#222'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.beginPath();
                    if (y === 0 || map[y - 1][x] !== SYMBOLS.WALL) { ctx.moveTo(px, py + 1); ctx.lineTo(px + TILE_SIZE, py + 1); }
                    if (y === ROWS - 1 || map[y + 1][x] !== SYMBOLS.WALL) { ctx.moveTo(px, py + TILE_SIZE - 1); ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE - 1); }
                    if (x === 0 || map[y][x - 1] !== SYMBOLS.WALL) { ctx.moveTo(px + 1, py); ctx.lineTo(px + 1, py + TILE_SIZE); }
                    if (x === COLS - 1 || map[y][x + 1] !== SYMBOLS.WALL) { ctx.moveTo(px + TILE_SIZE - 1, py); ctx.lineTo(px + TILE_SIZE - 1, py + TILE_SIZE); }
                    ctx.stroke();
                } else if (char === SYMBOLS.CORE) {
                    ctx.save();
                    const pulse = Math.sin(now / 300) * 0.5 + 0.5;
                    const color = `rgb(255,255,${255 - Math.round(pulse * 55)})`;
                    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15;
                    ctx.beginPath(); ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE * 0.4, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                } else if (char === SYMBOLS.STAIRS || char === SYMBOLS.DOOR) {
                    ctx.fillStyle = '#fff'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px + 2, py + TILE_SIZE - 4, TILE_SIZE - 4, 2);
                } else if (char === SYMBOLS.SAVE) {
                    ctx.fillStyle = '#38bdf8'; ctx.fillText(SYMBOLS.SAVE, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                } else if (char === SYMBOLS.POISON || char === SYMBOLS.LAVA || char === SYMBOLS.FIRE_FLOOR) {
                    if (char === SYMBOLS.POISON) {
                        ctx.fillStyle = '#a855f7'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                    } else {
                        ctx.save(); ctx.beginPath(); ctx.rect(px, py, TILE_SIZE, TILE_SIZE); ctx.clip();
                        const swirl = Math.sin(now / 200 + (x + y) * 0.5) * 3;
                        ctx.fillStyle = '#991b1b'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#ef4444'; ctx.fillText(SYMBOLS.LAVA, px + TILE_SIZE / 2 + swirl, py + TILE_SIZE / 2);
                        ctx.restore();
                    }
                } else if (char === SYMBOLS.ICE) {
                    ctx.fillStyle = '#0c4a6e'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.save(); ctx.beginPath(); ctx.rect(px, py, TILE_SIZE, TILE_SIZE); ctx.clip();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; ctx.lineWidth = 1;
                    const stripe = 6;
                    for (let s = -TILE_SIZE; s < TILE_SIZE * 2; s += stripe) {
                        ctx.beginPath(); ctx.moveTo(px + s, py); ctx.lineTo(px + s + TILE_SIZE, py + TILE_SIZE); ctx.stroke();
                    }
                    ctx.restore();
                } else if ([SYMBOLS.WAND, SYMBOLS.KEY, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.ESCAPE].includes(char)) {
                    // 魔導書系アイテムはすべて統一アイコンで表示（拾うまで種類不明）
                    const isTome = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.ESCAPE].includes(char);
                    const displayChar = isTome ? SYMBOLS.TOME : char;
                    ctx.fillStyle = '#fbbf24'; ctx.fillText(displayChar, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                } else {
                    ctx.fillStyle = '#444'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                }
            }
        }

        // 2. 設置ブロック
        tempWalls.forEach(w => {
            const wx = w.x * TILE_SIZE;
            const wy = w.y * TILE_SIZE;
            if (w.type === 'ICICLE') {
                // 岩の棘：三角形を描画
                ctx.save();
                ctx.fillStyle = (w.hp === 1) ? '#777' : '#a8a29e';
                ctx.beginPath();
                ctx.moveTo(wx + TILE_SIZE / 2, wy + 2);           // 頂点
                ctx.lineTo(wx + 3, wy + TILE_SIZE - 1);           // 左下
                ctx.lineTo(wx + TILE_SIZE - 3, wy + TILE_SIZE - 1); // 右下
                ctx.closePath();
                ctx.fill();
                // ハイライト（左辺に明るい線）
                ctx.strokeStyle = (w.hp === 1) ? '#999' : '#d6d3d1';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(wx + TILE_SIZE / 2, wy + 2);
                ctx.lineTo(wx + 3, wy + TILE_SIZE - 1);
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.fillStyle = (w.hp === 1) ? '#aaa' : '#fff';
                ctx.fillText((w.hp === 1) ? SYMBOLS.BLOCK_CRACKED : SYMBOLS.BLOCK, wx + TILE_SIZE / 2, wy + TILE_SIZE / 2);
            }
        });

        // 3. エネミー
        enemies.forEach(e => {
            if (e.hp <= 0) return;
            const px = e.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0);
            const py = e.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0);
            const isFlashing = now < e.flashUntil || (e.stunTurns > 0 && Math.floor(now / 150) % 2 === 0);
            ctx.save();
            ctx.globalAlpha = e.alpha !== undefined ? e.alpha : 1.0;
            if (e.type === 'DRAGON') {
                let color = (e.hp <= e.maxHp / 2) ? `rgb(255, ${50 + Math.round((Math.sin(now / 150) * 0.5 + 0.5) * 100)}, 0)` : `rgb(255, 255, ${255 - Math.round((Math.sin(now / 300) * 0.5 + 0.5) * 55)})`;
                ctx.fillStyle = isFlashing ? '#fff' : color;
                ctx.shadowColor = color; ctx.shadowBlur = 15;
                ctx.fillText('D', px, py);
                if (e.body) e.body.forEach(seg => ctx.fillText(seg.char || 'D', seg.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0), seg.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0)));
            } else {
                let eColor = '#f87171';
                let eChar = SYMBOLS.ENEMY;
                if (e.type === 'GOLD') { eColor = '#fbbf24'; }
                else if (e.type === 'ORC') { eColor = '#f87171'; eChar = SYMBOLS.ORC; }
                else if (e.type === 'SNAKE') { eColor = '#4ade80'; eChar = SYMBOLS.SNAKE; }
                else if (e.type === 'WISP_ENEMY') { eColor = '#818cf8'; eChar = SYMBOLS.WISP; }
                else if (e.type === 'TURRET') { eColor = '#ef4444'; eChar = SYMBOLS.TURRET; }
                else if (e.type === 'BLAZE') { eColor = '#fb923c'; eChar = 'F'; }
                else if (e.type === 'FROST') { eColor = '#ffffff'; eChar = 'I'; }
                if (e.isAlly) eColor = '#60a5fa';
                ctx.fillStyle = isFlashing ? '#fff' : eColor;
                ctx.fillText(eChar, px, py);
            }
            ctx.restore();
        });

        // 3.5. タレットのレーザー光線
        enemies.forEach(e => {
            if (e.type !== 'TURRET' || e.hp <= 0 || e.isFalling) return;
            const dx = [0, 1, 0, -1][e.dir];
            const dy = [-1, 0, 1, 0][e.dir];
            let lx = e.x + dx, ly = e.y + dy;
            const startX = e.x * TILE_SIZE + TILE_SIZE / 2;
            const startY = e.y * TILE_SIZE + TILE_SIZE / 2;
            let endX = startX, endY = startY;
            while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS) {
                if (isWallAt(lx, ly)) {
                    // 壁にぶつかるまで描画（壁の手前の端まで伸ばす）
                    endX = lx * TILE_SIZE + TILE_SIZE / 2 - dx * TILE_SIZE / 2;
                    endY = ly * TILE_SIZE + TILE_SIZE / 2 - dy * TILE_SIZE / 2;
                    break;
                }
                endX = lx * TILE_SIZE + TILE_SIZE / 2;
                endY = ly * TILE_SIZE + TILE_SIZE / 2;
                lx += dx; ly += dy;
            }
            if (endX !== startX || endY !== startY) {
                ctx.save();
                // グロー（太い半透明の線）
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.lineWidth = 6;
                ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                // コア（細い明るい線）
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                ctx.restore();
            }
        });

        // 4. ウィスプ
        wisps.forEach(w => {
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
            ctx.fillText(SYMBOLS.WISP, w.x * TILE_SIZE + TILE_SIZE / 2, w.y * TILE_SIZE + TILE_SIZE / 2);
            ctx.shadowBlur = 0;
        });

        // 5. プレイヤー
        if (isPlayerVisible) {
            ctx.save();
            const px = player.x * TILE_SIZE + TILE_SIZE / 2 + player.offsetX;
            const py = player.y * TILE_SIZE + TILE_SIZE / 2 + player.offsetY;
            const pFlashing = now < player.flashUntil;
            if (player.isStealth) ctx.globalAlpha = 0.5;

            if (tomeAuraParams.active) {
                const colors = ['#fff', '#fbbf24', '#4ade80', '#38bdf8'];
                ctx.fillStyle = colors[Math.floor(now / 40) % colors.length]; ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
            } else {
                ctx.fillStyle = pFlashing ? '#f87171' : '#fff';
            }

            if (player.facing === 'RIGHT') {
                ctx.save(); ctx.translate(px, py); ctx.scale(-1, 1); ctx.fillText(SYMBOLS.PLAYER, 0, 0); ctx.restore();
            } else {
                ctx.fillText(SYMBOLS.PLAYER, px, py);
            }
            if (player.itemInHand) {
                ctx.fillStyle = '#fbbf24'; ctx.fillText(player.itemInHand, px, py - TILE_SIZE - 5);
            }
            ctx.restore();
        }

        // 6. エフェクト類
        drawTraps(now);
        drawExplosions(now);
        drawAuras(now);
        drawFloatingParticles();
    }
    ctx.restore(); // (shake restore)

    // --- 以降は画面の揺れ等に影響されないUIエフェクト等 ---

    // 攻撃線、ダメージテキスト
    attackLines.forEach(l => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); });
    damageTexts.forEach(d => {
        const elapsed = (now - d.startTime) / 1000;
        ctx.save(); ctx.globalAlpha = 1 - elapsed; ctx.fillStyle = d.color;
        ctx.fillText(d.text, d.x * TILE_SIZE + TILE_SIZE, d.y * TILE_SIZE - (elapsed * 30)); ctx.restore();
    });

    // ゲームオーバーの赤色オーバーレイ
    if (gameOverAlpha > 0) { ctx.fillStyle = `rgba(255, 0, 0, ${gameOverAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    // トランジション（ホワイトアウト、暗転、星空、落下）
    if (transition.active) {
        ctx.save(); ctx.globalAlpha = transition.alpha;
        const isWhiteTr = (transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT');
        if (isWhiteTr && transition.darken) {
            const v = Math.round(255 * (1 - transition.darken));
            ctx.fillStyle = `rgb(${v},${v},${v})`;
        } else {
            ctx.fillStyle = isWhiteTr ? '#fff' : transition.mode === 'RED_OUT' ? '#b00' : '#000';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (transition.mode === 'FALLING') {
            transition.particles.forEach(p => { ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill(); });
            ctx.fillStyle = '#fff'; ctx.font = `bold ${TILE_SIZE * 1.5}px 'Courier New'`; ctx.fillText(SYMBOLS.PLAYER, canvas.width / 2, transition.playerY);
        } else if ((transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT') && transition.particles) {
            transition.particles.forEach(p => {
                p.y += p.speed * (1 + (transition.accel || 0) * 4); if (p.y > canvas.height) p.y = -20;
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
            });
        } else if (transition.mode === 'STARS' && transition.particles) {
            ctx.fillStyle = '#fff'; transition.particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 1, 0, Math.PI * 2); ctx.fill(); });
        }

        // トランジションテキスト（FLOOR 100 等）
        if (transition.text) {
            ctx.fillStyle = transition.textColor || ((transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT') ? '#000' : '#fff');
            ctx.font = (transition.mode === 'BLACK_OUT' || transition.mode === 'STARS' || transition.mode === 'RED_OUT') ? "bold 48px 'Courier New', Courier, monospace" : "bold 32px 'Courier New', Courier, monospace";
            ctx.fillText(transition.text, canvas.width / 2, canvas.height / 2);
        }
        ctx.restore();
    }

    // エンディング中のフラッシュオーバーレイ
    if (transition.flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = transition.flashAlpha;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // 物語のメッセージ（storyMessage）
    if (storyMessage) {
        const lines = storyMessage.lines;
        let totalH = 0;
        lines.forEach(line => {
            if (typeof line === 'object') {
                const enLines = line.en.split('\n'); const jpLines = line.jp.split('\n');
                totalH += (enLines.length * 20) + 10 + (jpLines.length * 20) + 10;
            } else { totalH += 20; }
        });

        // ▼マークが画面下端の少し上に来るよう配置
        let currentY = canvas.height - totalH - 45;
        if (storyMessage.useMiddlePos && dungeonCore) {
            currentY = (player.y * TILE_SIZE + dungeonCore.y * TILE_SIZE) / 2 - totalH / 2;
        }

        ctx.save(); ctx.globalAlpha = storyMessage.alpha; ctx.textAlign = 'center';
        const isWhiteBG = transition.active && (transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT');

        lines.forEach(line => {
            if (typeof line === 'object') {
                const enLines = line.en.split('\n'); const jpLines = line.jp.split('\n');
                ctx.fillStyle = isWhiteBG ? '#000' : '#fff'; ctx.font = '16px "Courier New"';
                enLines.forEach(l => { ctx.fillText(l, canvas.width / 2, currentY + 16); currentY += 20; });
                currentY += 10;
                ctx.fillStyle = isWhiteBG ? '#333' : '#888'; ctx.font = '14px "Meiryo", sans-serif';
                jpLines.forEach(l => { ctx.fillText(l, canvas.width / 2, currentY + 14); currentY += 20; });
                currentY += 10;
            } else {
                ctx.fillStyle = isWhiteBG ? '#000' : '#fff'; ctx.fillText(line, canvas.width / 2, currentY + 16); currentY += 20;
            }
        });

        // ▼ 記号：テキストの最終描画位置（currentY）より少し下に表示し、重なりを防止
        if (storyMessage.showNext) {
            ctx.fillStyle = isWhiteBG ? '#000' : '#fff'; ctx.font = "bold 16px 'Courier New'";
            ctx.fillText("▼", canvas.width / 2, currentY + 20);
        }
        ctx.restore();
    }

    // エンドクレジット画面
    if (gameState === 'ENDING') {
        ctx.save(); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const credits = ["STAFF", "", "GAME DESIGN", "HIROTAKA ADACHI", "", "PROGRAMMING", "HIROTAKA ADACHI", "", "GRAPHICS", "HIROTAKA ADACHI", "", "MUSIC", "SUNO AI", "", "SPECIAL THANKS", "YOU", "", "THANK YOU FOR PLAYING!", "", "THE END"];
        credits.forEach((txt, i) => {
            ctx.fillStyle = (i === 0 || txt === "THE END") ? '#fff' : '#ccc';
            ctx.font = (i === 0) ? "bold 20px 'Courier New'" : (txt === "THE END" ? "bold 24px 'Courier New'" : "14px 'Courier New'");
            ctx.fillText(txt, canvas.width / 2, canvas.height / 2 - 180 + i * 20);
        });
        ctx.fillStyle = '#888'; ctx.font = "12px 'Courier New'"; ctx.fillText("Press [Enter] to return to Title", canvas.width / 2, canvas.height / 2 + 220);
        ctx.restore();
    }
}

function addLog(msg) {
    const div = document.createElement('div'); div.innerText = msg; logElement.appendChild(div);
    while (logElement.childNodes.length > 10) { logElement.removeChild(logElement.firstChild); } // 消息履歴を10行に増加
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
        if (e.type === 'SNAKE' && e.body) return e.body.some(seg => seg.x === bx && seg.y === by);
        return false;
    }) && !wisps.some(w => w.x === bx && w.y === by) && !tempWalls.some(w => w.x === bx && w.y === by)) {
        tempWalls.push({ x: bx, y: by, hp: 2, type: 'BLOCK' });
        addLog("Constructed a block!");
        SOUNDS.SELECT();
        SOUNDS.MOVE();
        return true;
    }
    return false;
}

async function slidePlayer(dx, dy) {
    let pickedDuringSlide = [];
    while (map[player.y][player.x] === SYMBOLS.ICE) {
        nextSlideAction = null;
        SOUNDS.ICE_SLIDE();
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
        const hasEnemy = enemies.some(e => e.x === nx && e.y === ny && e.hp > 0);
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || isWallAt(nx, ny) || hasEnemy) {
            SOUNDS.MOVE(); // 壁や敵に当たった
            break;
        }

        // 通過タイトルのアイテム回収判定
        const nextTile = map[ny][nx];
        const itemSymbols = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.KEY, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.WAND, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN];
        if (itemSymbols.includes(nextTile)) {
            pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
            map[ny][nx] = SYMBOLS.FLOOR; // 即座に消す
        }

        player.x = nx; player.y = ny;
        updateUI();
        draw();
        await applyLaserDamage(); // メインタレットなどが滑っている最中もレーザーが追従して焼くように

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
            player.hp -= 1;
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 5);
            player.flashUntil = performance.now() + 200;
            if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
            spawnDamageText(player.x, player.y, 1, '#a855f7');
            SOUNDS.DAMAGE();
            if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
        }
    }
    if (pickedDuringSlide.length > 0) await processPickedItems(pickedDuringSlide);
}

// エンディングへの遷移
async function triggerEnding() {
    isProcessing = true;
    gameState = 'ENDING_SEQ';
    transition.text = ""; // 階層テキストなどを消去
    attackLines = [];     // 攻撃線を即座にクリア
    damageTexts = [];     // ダメージテキストもクリア

    // ドラゴンをスタン（崩壊で動揺）
    enemies.forEach(e => { if (e.type === 'DRAGON') e.stunTurns = 99; });

    addLog("THE CORE IS SHATTERED!");
    player.offsetX = 0; player.offsetY = 0;

    // コアの位置を記録
    const coreX = dungeonCore ? dungeonCore.x : Math.floor(COLS / 2);
    const coreY = dungeonCore ? dungeonCore.y : 6;
    const corePxX = coreX * TILE_SIZE + TILE_SIZE / 2;
    const corePxY = coreY * TILE_SIZE + TILE_SIZE / 2;

    // ガラスが砕けるような音
    const playShattering = () => {
        const duration = 1.5;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3000, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + duration);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        noise.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
        noise.start();
        // 高音のキラキラ成分
        for (let i = 0; i < 5; i++) {
            const t = audioCtx.currentTime + i * 0.05;
            const osc = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000 + Math.random() * 4000, t);
            g.gain.setValueAtTime(0.15, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc.connect(g); g.connect(audioCtx.destination);
            osc.start(t); osc.stop(t + 0.3);
        }
    };

    // --- フェーズ0a: 破壊の瞬間の長めのフラッシュ (0.5秒白 → 0.3秒戻り) ---
    SOUNDS.EXPLODE();
    transition.flashAlpha = 1.0;
    await new Promise(r => setTimeout(r, 500)); // 0.5秒間 真っ白
    // フラッシュから戻る（フェードアウト）
    for (let i = 0; i < 20; i++) {
        transition.flashAlpha = 1 - i / 20;
        await new Promise(r => setTimeout(r, 16));
    }
    transition.flashAlpha = 0;

    // --- フェーズ0b: 時間停止（コア表示のまま） + 1.5秒 ---
    draw(performance.now());
    await new Promise(r => setTimeout(r, 1500));

    // --- フェーズ0b2: 点滅前のフラッシュ（3回） ---
    for (let f = 0; f < 3; f++) {
        transition.flashAlpha = 1.0;
        await new Promise(r => setTimeout(r, 130)); // 白フラッシュ
        // フェードアウト
        for (let i = 0; i < 12; i++) {
            transition.flashAlpha = 1 - i / 12;
            await new Promise(r => setTimeout(r, 16));
        }
        transition.flashAlpha = 0;
        await new Promise(r => setTimeout(r, 200));
    }

    // --- フェーズ0c: コアが点滅して消えていく (4秒) ---
    const blinkStart = performance.now();
    const blinkDuration = 4000;
    let coreVisible = true;
    let blinkInterval = 300;
    let lastBlinkTime = 0;

    while (performance.now() - blinkStart < blinkDuration) {
        const elapsed = performance.now() - blinkStart;
        const p = elapsed / blinkDuration; // 0→1

        // 点滅速度が徐々に速くなる
        blinkInterval = Math.max(40, 300 - p * 280);
        if (elapsed - lastBlinkTime > blinkInterval) {
            coreVisible = !coreVisible;
            lastBlinkTime = elapsed;
        }

        // 微かな揺れ（徐々に強く）
        const shakeI = p * 5;
        screenShake.x = (Math.random() - 0.5) * shakeI * 2;
        screenShake.y = (Math.random() - 0.5) * shakeI * 2;
        screenShake.until = performance.now() + 50;

        // コアの表示/非表示をマップで切り替え
        if (dungeonCore) {
            map[dungeonCore.y][dungeonCore.x] = coreVisible ? SYMBOLS.CORE : SYMBOLS.FLOOR;
        }

        // 通常描画
        draw(performance.now());

        await new Promise(r => setTimeout(r, 16));
    }

    // コアを完全に消す
    if (dungeonCore) map[dungeonCore.y][dungeonCore.x] = SYMBOLS.FLOOR;
    playShattering();

    // 消えた直後のフラッシュ
    transition.flashAlpha = 0.9;
    for (let fi = 0; fi < 10; fi++) {
        transition.flashAlpha = 0.9 - fi * 0.09;
        await new Promise(r => setTimeout(r, 16));
    }
    transition.flashAlpha = 0;

    // --- 連続フラッシュ + 地響き + 震動 (5秒) ---
    // 重低音の開始
    const deepRumbleOsc1 = audioCtx.createOscillator();
    const deepRumbleOsc2 = audioCtx.createOscillator();
    const deepRumbleGain = audioCtx.createGain();
    deepRumbleOsc1.type = 'sawtooth';
    deepRumbleOsc1.frequency.value = 25;
    deepRumbleOsc2.type = 'sine';
    deepRumbleOsc2.frequency.value = 18;
    deepRumbleGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    deepRumbleGain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 5);
    deepRumbleOsc1.connect(deepRumbleGain);
    deepRumbleOsc2.connect(deepRumbleGain);
    deepRumbleGain.connect(audioCtx.destination);
    deepRumbleOsc1.start();
    deepRumbleOsc2.start();

    const flashStart = performance.now();
    const flashDuration = 5000;
    let nextFlashTime = 0;
    let flashAlpha = 0;
    let whiteOverlay = 0; // 徐々にホワイトアウトへ

    while (performance.now() - flashStart < flashDuration) {
        const elapsed = performance.now() - flashStart;
        const p = elapsed / flashDuration;

        // 画面揺れ: 徐々に強く
        const shakeIntensity = 5 + p * 25;
        screenShake.x = (Math.random() - 0.5) * shakeIntensity * 2;
        screenShake.y = (Math.random() - 0.5) * shakeIntensity * 2;
        screenShake.until = performance.now() + 50;

        // フラッシュ（頻度が徐々に上がる）
        if (elapsed > nextFlashTime) {
            flashAlpha = 0.7 + Math.random() * 0.3;
            nextFlashTime = elapsed + 300 - p * 200 + Math.random() * 200;
            SOUNDS.RUMBLE();
            if (Math.random() < 0.3) playShattering();
        }
        flashAlpha *= 0.92; // フラッシュ減衰

        // 白いオーバーレイが徐々に濃く
        whiteOverlay = p * p * 0.8; // 二次曲線で後半急上昇

        // フラッシュ + ホワイトアウトオーバーレイ（draw()経由で描画）
        transition.flashAlpha = Math.min(1, flashAlpha + whiteOverlay);

        await new Promise(r => setTimeout(r, 16));
    }

    // 重低音を止める
    deepRumbleGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    setTimeout(() => { deepRumbleOsc1.stop(); deepRumbleOsc2.stop(); }, 600);

    // --- フェーズ1: 完全ホワイトアウト ---
    SOUNDS.EXPLODE();
    setScreenShake(50, 2000);
    addLog("The dungeon starts to collapse!");

    const dragon = enemies.find(e => e.type === 'DRAGON');
    if (dragon) {
        addLog("The Dragonlord roars in agony...");
    }

    // 即座に真っ白に
    transition.active = true;
    transition.mode = 'WHITE_OUT';
    transition.alpha = 1.0;
    transition.particles = [];
    transition.flashAlpha = 0;

    // ドラゴン消滅（ホワイトアウト中に処理）
    if (dragon) {
        enemies = enemies.filter(e => e !== dragon);
        addLog("The ancient DRAGONLORD has vanished...");
    }

    await new Promise(r => setTimeout(r, 1500));

    const intenseRumble = SOUNDS.START_INTENSE_RUMBLE();
    for (let i = 0; i < 300; i++) { // 約5秒間
        setScreenShake(12, 100);
        draw(performance.now());
        await new Promise(r => setTimeout(r, 16));
    }
    if (intenseRumble) intenseRumble.stop(0.5);

    // 静かなドローンへの切り替え & 上昇開始 (20秒 + 5秒)
    transition.mode = 'WHITE_ASCENT';
    transition.accel = 0;
    transition.particles = [];
    for (let i = 0; i < 150; i++) {
        transition.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            speed: 1.5 + Math.random() * 3
        });
    }

    const drone = SOUNDS.START_ENDING_DRONE();
    if (drone && drone.gainNode) drone.gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // 最初は静かに

    const ascentStart = performance.now();
    const ascentIncreaseDuration = 20000;
    while (performance.now() - ascentStart < ascentIncreaseDuration) {
        const p = (performance.now() - ascentStart) / ascentIncreaseDuration;
        transition.accel = p;
        if (drone && drone.gainNode) {
            drone.gainNode.gain.setValueAtTime(0.1 + p * 2.5, audioCtx.currentTime);
        }
        draw(performance.now());
        await new Promise(r => setTimeout(r, 16));
    }

    // さらに5秒間維持（最初2秒は白のまま、最後3秒で徐々に暗くなる）
    transition.darken = 0;
    const holdFrames = 125;  // 約2秒間は白のまま
    const darkenFrames = 188; // 約3秒間で暗転
    for (let i = 0; i < holdFrames + darkenFrames; i++) {
        if (i >= holdFrames) {
            transition.darken = (i - holdFrames) / darkenFrames; // 0→1
        }
        draw(performance.now());
        await new Promise(r => setTimeout(r, 16));
    }

    // 黒い点が消え去る（もう背景は暗い）
    for (let i = 0; i < 60; i++) {
        transition.accel += 0.5;
        draw(performance.now());
        await new Promise(r => setTimeout(r, 16));
    }
    transition.particles = [];
    transition.darken = 1; // 完全に暗転

    // さらに2秒経過 (真っ暗なまま)
    await new Promise(r => setTimeout(r, 2000));

    // 音が消える
    if (drone) drone.stop(2);
    await new Promise(r => setTimeout(r, 2000)); // 無音の間

    // 暗転完了 → BLACK_OUTモードに切り替え
    transition.mode = 'BLACK_OUT';
    transition.darken = 0;

    // 真っ暗な画面を3秒間見せる
    await new Promise(r => setTimeout(r, 3000));

    // 3. テキスト表示 (目覚め - 日英)
    await showStoryPages([
        [{ en: "When you came to,", jp: "気づくとあなたは" }],
        [{ en: "You were lying on the ground.", jp: "地面に倒れていた" }],
        [{ en: "The night sky stretched out above you.", jp: "頭上に夜空が広がっている" }]
    ]);

    // 4. 星空の描画 (5秒間)
    transition.mode = 'STARS';
    transition.alpha = 0;
    transition.particles = [];
    for (let i = 0; i < 200; i++) {
        transition.particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5
        });
    }

    // フェードイン
    for (let a = 0; a <= 1; a += 0.02) {
        transition.alpha = a;
        draw(performance.now());
        await new Promise(r => setTimeout(r, 30));
    }
    await new Promise(r => setTimeout(r, 5000));

    // 5. 復讐の誓いテキスト (暗闇にて)
    await showStoryPages([
        [{ en: "You headed toward the town.", jp: "あなたは町へむかった" }],
        [{ en: "To the friends who betrayed you...", jp: "裏切った仲間たちを" }],
        [{ en: "To kill them.", jp: "殺すために" }]
    ]);

    // 5秒の溜め
    await new Promise(r => setTimeout(r, 5000));

    // 6. 衝撃音と共に Congratulations!
    SOUNDS.BANG();
    transition.mode = 'RED_OUT';
    transition.text = "Congratulations!";
    transition.textColor = "#000"; // 黒文字
    draw(performance.now());
    await new Promise(r => setTimeout(r, 5000));
    transition.text = "";

    // 7. エンディング画面 (クレジット)
    gameState = 'ENDING';
    transition.active = false;
    isProcessing = false;
}

async function handleAction(dx, dy) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlayerVisible = true; // 操作時は確実に表示する
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
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
        }
        return;
    }

    isProcessing = true;
    player.isDefending = false; // アクション開始時に防御状態を解除

    // ドラゴン出現チェック
    if (floorLevel === 100 && !hasSpawnedDragon && dungeonCore) {
        const dist = Math.abs(player.x - dungeonCore.x) + Math.abs(player.y - dungeonCore.y);
        if (dist <= 8) {
            await triggerDragonSpawn();
            isProcessing = false;
            return;
        }
    }

    const nx = player.x + dx; const ny = player.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        // マルチスクリーンモード: 画面端の通路判定
        if (multiScreenMode) {
            let newScreenX = currentScreen.x;
            let newScreenY = currentScreen.y;
            let newPlayerX = player.x;
            let newPlayerY = player.y;
            let canTransition = false;

            if (nx < 0 && currentScreen.x > 0 && player.y >= 11 && player.y <= 13) {
                // 左端 → 左の画面へ
                newScreenX = currentScreen.x - 1;
                newPlayerX = COLS - 1;
                newPlayerY = player.y;
                canTransition = true;
            } else if (nx >= COLS && currentScreen.x < SCREEN_GRID_SIZE - 1 && player.y >= 11 && player.y <= 13) {
                // 右端 → 右の画面へ
                newScreenX = currentScreen.x + 1;
                newPlayerX = 0;
                newPlayerY = player.y;
                canTransition = true;
            } else if (ny < 0 && currentScreen.y > 0 && player.x >= 18 && player.x <= 21) {
                // 上端 → 上の画面へ
                newScreenY = currentScreen.y - 1;
                newPlayerY = ROWS - 1;
                newPlayerX = player.x;
                canTransition = true;
            } else if (ny >= ROWS && currentScreen.y < SCREEN_GRID_SIZE - 1 && player.x >= 18 && player.x <= 21) {
                // 下端 → 下の画面へ
                newScreenY = currentScreen.y + 1;
                newPlayerY = 0;
                newPlayerX = player.x;
                canTransition = true;
            }

            if (canTransition) {
                // 現在の画面データを保存
                screenGrid.maps[currentScreen.y][currentScreen.x] = map;
                screenGrid.enemies[currentScreen.y][currentScreen.x] = enemies;
                screenGrid.wisps[currentScreen.y][currentScreen.x] = wisps;

                // フェード演出
                transition.active = true;
                transition.mode = 'FADE';
                transition.text = "";
                for (let a = 0; a <= 1; a += 0.25) {
                    transition.alpha = a;
                    draw();
                    await new Promise(r => setTimeout(r, 40));
                }

                // 隣の画面データをロード
                currentScreen.x = newScreenX;
                currentScreen.y = newScreenY;
                map = screenGrid.maps[newScreenY][newScreenX];
                enemies = screenGrid.enemies[newScreenY][newScreenX];
                wisps = screenGrid.wisps[newScreenY][newScreenX];
                tempWalls = [];

                player.x = newPlayerX;
                player.y = newPlayerY;

                // 出現位置周辺の敵・ウィスプを排除
                enemies = enemies.filter(e => !(Math.abs(e.x - newPlayerX) <= 1 && Math.abs(e.y - newPlayerY) <= 1));
                wisps = wisps.filter(w => !(Math.abs(w.x - newPlayerX) <= 1 && Math.abs(w.y - newPlayerY) <= 1));
                screenGrid.enemies[newScreenY][newScreenX] = enemies;
                screenGrid.wisps[newScreenY][newScreenX] = wisps;

                // 出現位置が壁や障害物なら床にする
                if (map[newPlayerY][newPlayerX] !== SYMBOLS.FLOOR) {
                    map[newPlayerY][newPlayerX] = SYMBOLS.FLOOR;
                }

                // フェードイン
                for (let a = 1; a >= 0; a -= 0.25) {
                    transition.alpha = a;
                    draw();
                    await new Promise(r => setTimeout(r, 40));
                }
                transition.active = false;
                transition.alpha = 0;

                updateUI();
                SOUNDS.SCREEN_TRANSITION();
                addLog(`Screen [${newScreenX},${newScreenY}]`);

                // 遷移直後は敵ターンをスキップ
                isProcessing = false;
                return;
            }
        }
        isProcessing = false; return;
    }

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

        // コアへの攻撃に対するドラゴンの反撃
        const dragon = enemies.find(e => e.type === 'DRAGON');
        if (dragon) {
            addLog("The Dragon ROARS in fury as the Core is struck!");
            SOUNDS.FATAL();
            setScreenShake(20, 400);
            // 周囲に火花（スラッシュ演出）
            for (let i = 0; i < 8; i++) {
                const rx = dungeonCore.x + (Math.floor(Math.random() * 5) - 2);
                const ry = dungeonCore.y + (Math.floor(Math.random() * 5) - 2);
                spawnSlash(rx, ry);
            }
        }

        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
        await new Promise(r => setTimeout(r, 200));
        player.offsetX = 0; player.offsetY = 0;

        if (!transition.active) {
            turnCount++;
            updateUI();
            await enemyTurn();
            isProcessing = false;
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
        }
        return;
    }

    const victim = enemies.find(e => {
        if (e.x === nx && e.y === ny) return true;
        if (e.type === 'SNAKE' || e.type === 'DRAGON') return (e.body && e.body.some(seg => seg.x === nx && seg.y === ny));
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

        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
        await new Promise(r => setTimeout(r, 200));
        player.offsetX = 0; player.offsetY = 0;

        if (!transition.active) {
            turnCount++;
            updateUI();
            // ブロックが壊れた瞬間にレーザーが通る可能性があるので判定
            await applyLaserDamage();
            await enemyTurn();
            isProcessing = false;
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
        }
        return;
    }

    if (victim && victim.isAlly && victim.type !== 'TURRET') {
        // 味方とは攻撃せず位置を入れ替える（タレットは固定なので除外）
        const oldX = player.x, oldY = player.y;
        player.x = victim.x; player.y = victim.y;
        victim.x = oldX; victim.y = oldY;
        if (victim.type === 'SNAKE' && victim.body) {
            victim.body.unshift({ x: oldX, y: oldY });
            victim.body.pop();
        }
        SOUNDS.MOVE();
        player.stamina = Math.min(100, player.stamina + 20);
    } else if (victim && victim.isAlly && victim.type === 'TURRET') {
        // 味方タレットには何もしない（攻撃も入れ替わりもしない）
        player.offsetX = dx * 5; player.offsetY = dy * 5;
        await new Promise(r => setTimeout(r, 50));
        player.offsetX = 0; player.offsetY = 0;
    } else if (victim) {
        if (player.isStealth) {
            player.isStealth = false;
            addLog("Stealth broken by attack!");
        }
        player.offsetX = dx * 10; player.offsetY = dy * 10;
        await attackEnemy(victim, nx - player.x, ny - player.y, true);
        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
        player.offsetX = 0; player.offsetY = 0;
    } else {
        player.stamina = Math.min(100, player.stamina + 20);
        const isBlockedByWall = map[ny][nx] === SYMBOLS.WALL;
        const isBlockedByTempWall = tempWalls.some(w => w.x === nx && w.y === ny);

        if (isBlockedByWall || isBlockedByTempWall) {
            player.offsetX = dx * 5; player.offsetY = dy * 5;
            await new Promise(r => setTimeout(r, 50));
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
                    if (!transition.active) { turnCount++; updateUI(); await enemyTurn(); await moveWisps(); isProcessing = false; if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); } }
                    return;
                } else {
                    addLog("The door is locked.");
                    player.offsetX = dx * 5; player.offsetY = dy * 5;
                    await new Promise(r => setTimeout(r, 50));
                    player.offsetX = 0; player.offsetY = 0;
                    if (!transition.active) { turnCount++; updateUI(); await enemyTurn(); await moveWisps(); isProcessing = false; if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); } }
                    return;
                }
            } else if (nextTile === SYMBOLS.SWORD) {
                map[ny][nx] = SYMBOLS.FLOOR; // 先に消す
                player.x = nx; player.y = ny;
                updateUI();
                await animateItemGet(SYMBOLS.SWORD);
                SOUNDS.GET_ITEM();
                player.swordCount++;
                if (!hasShownEquipTut) {
                    await triggerEquipEvent();
                } else {
                    addLog(`🚨 You obtained a SWORD! (Attack: +3) 🚨`);
                }
                spawnFloatingText(nx, ny, "ATTACK UP", "#38bdf8");
            } else if (nextTile === SYMBOLS.ARMOR) {
                map[ny][nx] = SYMBOLS.FLOOR;
                player.x = nx; player.y = ny;
                updateUI();
                await animateItemGet(SYMBOLS.ARMOR);
                SOUNDS.GET_ITEM();
                player.armorCount++;
                if (!hasShownEquipTut) {
                    await triggerEquipEvent();
                } else {
                    addLog(`Found ARMOR piece! (Defense: ${player.armorCount})`);
                }
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
                    SOUNDS.GET_ITEM();
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
                    SOUNDS.GET_ITEM();
                    player.hasKey = true;
                    if (floorLevel === 3) {
                        await triggerKeyLogStory();
                    } else {
                        addLog("Picked up the KEY!");
                        spawnFloatingText(nx, ny, "GOT KEY", "#fbbf24");
                    }
                } else if (nextTile === SYMBOLS.SPEED) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.hasteTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Haste Tome'! (Press [E] to recite)");
                    }
                    spawnFloatingText(nx, ny, "HASTE TOME IDENTIFIED", "#38bdf8");
                } else if (nextTile === SYMBOLS.CHARM) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.charmTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Charm Tome'! (Press [C] to recite)");
                    }
                    spawnFloatingText(nx, ny, "CHARM TOME IDENTIFIED", "#60a5fa");
                } else if (nextTile === SYMBOLS.STEALTH) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.stealthTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Stealth Tome'! (Inventory to recite)");
                    }
                    spawnFloatingText(nx, ny, "STEALTH TOME IDENTIFIED", "#94a3b8");
                } else if (nextTile === SYMBOLS.EXPLOSION) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.explosionTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Explosion Tome'! (Key [3] to detonate)");
                    }
                    spawnFloatingText(nx, ny, "EXPLOSION TOME IDENTIFIED", "#ef4444");
                } else if (nextTile === SYMBOLS.GUARDIAN) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.guardianTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Guardian Tome'! (Key [4] to protect)");
                    }
                    spawnFloatingText(nx, ny, "GUARDIAN TOME IDENTIFIED", "#4ade80");
                } else if (nextTile === SYMBOLS.ESCAPE) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.escapeTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Escape Tome'! (Key [5] to teleport)");
                    }
                    spawnFloatingText(nx, ny, "ESCAPE TOME IDENTIFIED", "#c084fc");
                } else if (nextTile === SYMBOLS.HEAL_TOME) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.healTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Heal Tome'! (Key [6] to heal)");
                    }
                    spawnFloatingText(nx, ny, "HEAL TOME IDENTIFIED", "#4ade80");
                } else if (nextTile === SYMBOLS.FAIRY) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.FAIRY);
                    SOUNDS.GET_ITEM();
                    player.fairyCount++;
                    player.fairyRemainingCharms++;
                    if (!hasShownFairyTut) {
                        await triggerFairyEvent();
                    } else {
                        addLog("✨ You were joined by a FAIRY! ✨");
                        addLog("The fairy will charm enemies you encounter on each floor.");
                    }
                    spawnFloatingText(nx, ny, "FAIRY JOINED", "#f472b6");
                } else if (nextTile === SYMBOLS.SAVE) {
                    saveGame();
                    if (!hasShownSaveTut) {
                        await triggerSaveEvent();
                    }
                }
            }
            // 移動音
            player.x = nx; player.y = ny;
            if (dx !== 0 || dy !== 0) {
                SOUNDS.MOVE();
            }

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
    if (map[player.y][player.x] === SYMBOLS.POISON && !player.isShielded) {
        player.hp -= 1;
        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 5);
        player.flashUntil = performance.now() + 200;
        if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
        spawnDamageText(player.x, player.y, 1, '#a855f7');
        SOUNDS.DAMAGE();
        if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
    }

    // 溶岩ダメージ（プレイヤー）
    if (map[player.y][player.x] === SYMBOLS.LAVA && !player.isShielded) {
        player.hp -= 5;
        player.flashUntil = performance.now() + 200;
        if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
        spawnDamageText(player.x, player.y, 5, '#ef4444');
        SOUNDS.LAVA_BURN();
        if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
    }

    // ステージ1の中央部屋進入チェック
    if (floorLevel === 1 && !hasShownStage1Tut && player.x >= 18 && player.x <= 25 && player.y >= 10 && player.y <= 14) {
        await triggerStage1StaminaTutorial();
    }

    // 炎の床（溶岩）ダメージと寿命管理
    for (let i = fireFloors.length - 1; i >= 0; i--) {
        const floor = fireFloors[i];
        if (floor.x === player.x && floor.y === player.y && !player.isShielded) {
            player.hp -= 5; // 溶岩と同じ5ダメージ
            player.flashUntil = performance.now() + 150;
            if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
            spawnDamageText(player.x, player.y, 5, '#ef4444');
            SOUNDS.DAMAGE();
            if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
        }
    }

    if (!transition.active) {
        if (player.isSpeeding && !player.isExtraTurn) {
            // 加速時は、1回目の行動の後は敵のターンを無視する
            player.isExtraTurn = true;
            updateUI();
            addLog("Time accelerates! (Extra Action)");
            isProcessing = false;
            // バッファされた入力があれば即座に実行
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            return; // 敵のターンを呼ばずに終了（次の入力を待つ）
        }
        player.isExtraTurn = false; // 2回行動終了または通常時

        turnCount++;
        updateUI();
        await enemyTurn();
        // 敵の移動後に再度妖精のチャームをチェック（近づいてきた敵を即座に仲間にする）
        // enemyTurnの最後で呼ぶのも良いが、ここでは個別の処理を完結させる
        await moveWisps();
        isProcessing = false;
        // バッファされた入力があれば即座に次のターンを実行
        if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
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
        await checkWispDamage(w);

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
        await checkWispDamage(w);
    }

    // 死亡判定とクリーンアップを一括で行う
    // filterは非同期関数を待てないため、ループで処理する
    const aliveEnemies = [];
    for (const e of enemies) {
        if (e.hp <= 0) {
            await handleEnemyDeath(e);
        } else {
            aliveEnemies.push(e);
        }
    }
    enemies = aliveEnemies;
}

// ウィルとの接触ダメージ判定
async function checkWispDamage(w) {
    // プレイヤーとの接触
    if (player.x === w.x && player.y === w.y) {
        const dmg = 10;
        player.hp -= dmg;
        player.flashUntil = performance.now() + 200;
        if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
        spawnDamageText(player.x, player.y, dmg, '#fff');
        SOUNDS.DAMAGE();
        addLog("ZAP! Touched a Wisp!");
        if (player.hp <= 0) triggerGameOver();
    }

    // 敵との接触
    for (const e of enemies) {
        let hit = (e.x === w.x && e.y === w.y);
        if (!hit && e.type === 'SNAKE' && e.body) {
            hit = e.body.some(b => b.x === w.x && b.y === w.y);
        }
        if (hit) {
            const dmg = 20;
            e.hp -= dmg;
            e.flashUntil = performance.now() + 200;
            spawnDamageText(w.x, w.y, dmg, '#fff');
            if (e.hp <= 0) {
                await handleEnemyDeath(e, false); // Wisps are not the protagonist
            }
        }
    }
}

// 敵の落下処理を非同期で実行（ターン進行をブロックしない）
function scheduleEnemyFall(enemy, msg, killedByPlayer = false) {
    enemy.isFalling = true;
    addLog(msg);
    SOUNDS.FALL_WHIZ();
    setTimeout(() => { handleEnemyDeath(enemy, killedByPlayer); }, 400);
}

async function handleEnemyDeath(enemy, killedByPlayer = false) {
    if (enemy._dead) return; // 二重処理防止
    enemy._dead = true;

    SOUNDS.DEFEAT();
    enemies = enemies.filter(e => e !== enemy);

    if (killedByPlayer) {
        player.totalKills++;
        gainExp(enemy.expValue || 5);

        if (enemy.type === 'GOLD') {
            player.hp = player.maxHp; // HP全快
            player.stamina = 100; // せっかくなので現在の値もMAXに
            player.isInfiniteStamina = true; // スタミナ減らなくなる
            SOUNDS.SHAKIN(); // シャキーン！
            updateUI();
            spawnFloatingText(player.x, player.y, "MAX HP & STAMINA!!", "#fbbf24");

            if (!hasShownGoldTut) {
                await triggerGoldLogStory();
            } else {
                addLog("Defeated a Golden E! HP restored & Infinite Stamina for this floor!");
            }
        }
    } else {
        if (enemy.type === 'GOLD') {
            addLog("The Golden E escaped or was lost...");
        }
    }

    if (enemy.type === 'SNAKE') {
        addLog("The giant ENEMY was defeated!");
        // (SNAKE drop logic remains same as it's environmental drop from its body)
        const count = Math.floor(Math.random() * 3) + 1;
        const potentialTiles = [];
        for (let dy2 = -1; dy2 <= 1; dy2++) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
                const tx = enemy.x + dx2;
                const ty = enemy.y + dy2;
                if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS) {
                    const t = map[ty][tx];
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
    if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);

    // タレットのノックバック・スライド処理
    if (enemy.type === 'TURRET' && enemy.hp > 0) {
        const kx = dx, ky = dy;
        const nx = enemy.x + kx, ny = enemy.y + ky;

        // 1マスノックバック (移動可能なら)
        if (canEnemyMove(nx, ny, enemy)) {
            enemy.x = nx;
            enemy.y = ny;
            addLog("The Turret was pushed back!");
            draw(); // 位置変更を即座に反映
            await applyLaserDamage(); // ノックバック直後の位置でレーザーダメージを即座に適用
            await new Promise(r => setTimeout(r, 60)); // 1マス移動の視認性を高める

            // 氷の上なら滑る
            while (map[enemy.y][enemy.x] === SYMBOLS.ICE) {
                const sx = enemy.x + kx, sy = enemy.y + ky;
                // canEnemyMove は壁だけでなく他の「敵」もチェックするため、手前で止まる
                if (!canEnemyMove(sx, sy, enemy)) break;
                enemy.x = sx;
                enemy.y = sy;
                SOUNDS.ICE_SLIDE();
                draw();
                await applyLaserDamage(); // 滑っている最中もレーザーダメージを更新

                if (map[enemy.y][enemy.x] === SYMBOLS.STAIRS) {
                    scheduleEnemyFall(enemy, "The Turret slid into the HOLE!");
                    break;
                }
                await new Promise(r => setTimeout(r, 40));
            }

            // 移動後の落下チェック
            if (!enemy._dead && map[enemy.y][enemy.x] === SYMBOLS.STAIRS) {
                scheduleEnemyFall(enemy, "The Turret fell into the HOLE!");
            }
        }
    }

    setTimeout(() => { animateBounce(enemy); }, 50);
    await new Promise(r => setTimeout(r, 100));
    player.offsetX = 0; player.offsetY = 0;
    if (enemy.hp <= 0) {
        await handleEnemyDeath(enemy, true); // DIRECT PROTAGONIST ATTACK
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
    await new Promise(r => setTimeout(r, 20));
    isPlayerVisible = true;

    // 落下フェーズ (加速)
    const fallDuration = 450;
    const startFall = performance.now();
    while (performance.now() - startFall < fallDuration) {
        const elapsed = performance.now() - startFall;
        const p = Math.min(1, elapsed / fallDuration);
        player.offsetY = -fallHeight * (1 - p * p);
        await new Promise(r => setTimeout(r, 20));
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
        await new Promise(r => setTimeout(r, 20));
    }
    player.offsetY = 0;
    isProcessing = false;
    isPlayerVisible = true;
}

// ドラゴンの行動AI (左右への歩行と地響き)
async function handleDragonTurn(e) {
    if (e.stunTurns > 0) return;

    const isPhase2 = e.hp <= e.maxHp / 2;
    if (!e.battleTurns) e.battleTurns = 0;
    e.battleTurns++;

    const target = player;
    const dist = Math.abs(e.x - target.x) + Math.abs(e.y - target.y);

    // 移動基本設定
    const leftLimit = 5;
    const rightLimit = COLS - 15;
    const topLimit = e.baseY || 6;
    const bottomLimit = topLimit + 5; // 初期位置から下に5マスまで(前進範囲)

    let dx = 0;
    let dy = 0;

    // 主人公を追跡して近づくロジック (ランダムで逸れることもある)
    if (Math.random() < 0.7) {
        // 水平方向: ドラゴンの中心(e.x + 5)を主人公に合わせようとする
        const dragonMidX = e.x + 5;
        if (dragonMidX < target.x) dx = 1;
        else if (dragonMidX > target.x) dx = -1;

        // 垂直方向: 主人公に向かって前進、または後退(範囲内)
        if (target.y > e.y && e.y < bottomLimit) dy = 1;
        else if (target.y < e.y && e.y > topLimit) dy = -1;
    } else {
        // 30%の確率でランダムにふらつく
        dx = Math.floor(Math.random() * 3) - 1;
        dy = Math.floor(Math.random() * 3) - 1;

        // 垂直方向の範囲制限
        if (e.y + dy < topLimit || e.y + dy > bottomLimit) dy = 0;
    }

    // 移動実行
    let nextX = e.x + dx;
    let nextY = e.y + dy;

    // 左右端の制限
    if (nextX < leftLimit) nextX = leftLimit;
    if (nextX > rightLimit) nextX = rightLimit;

    dx = nextX - e.x;
    dy = nextY - e.y;
    e.x = nextX;
    e.y = nextY;
    if (e.body) {
        e.body.forEach(seg => {
            seg.x += dx;
            seg.y += dy;
        });
    }

    // 地響きと足音 (画面は揺らさないよう要望に基づき修正)
    addLog("BUM... The chamber trembles under the Dragonlord's weight.");
    SOUNDS.DRAGON_STEP();
    draw();

    // 進路上の障害物 (設置ブロック・つらら) を破壊
    let destroyed = false;
    const bodySegs = [{ x: e.x, y: e.y }, ...(e.body || [])];
    bodySegs.forEach(seg => {
        // 判定には遊びを持たせる (浮動小数点座標の文字に対応)
        for (let i = tempWalls.length - 1; i >= 0; i--) {
            const w = tempWalls[i];
            if (Math.abs(w.x - seg.x) < 0.8 && Math.abs(w.y - seg.y) < 0.8) {
                tempWalls.splice(i, 1);
                destroyed = true;
            }
        }
        // 重なっている敵にもダメージを与える
        for (let i = enemies.length - 1; i >= 0; i--) {
            const ee = enemies[i];
            if (ee === e) continue; // 自分自身は除外
            if (Math.abs(ee.x - seg.x) < 0.8 && Math.abs(ee.y - seg.y) < 0.8) {
                const crushDmg = 50;
                ee.hp -= crushDmg;
                ee.flashUntil = performance.now() + 200;
                spawnDamageText(ee.x, ee.y, crushDmg, '#ef4444');
                addLog(`The Dragonlord tramples the ${ee.type}!`);
                if (ee.hp <= 0) handleEnemyDeath(ee);
                destroyed = true;
            }
        }
    });

    if (destroyed) {
        addLog("The Dragonlord's massive body crushes the obstacles in its path!");
        SOUNDS.EXPLODE();
    }

    // 移動後の処理
    if (isPhase2 && Math.random() < 0.25) {
        addLog("The Dragonlord's presence melts the floor!");
        for (let i = 0; i < 8; i++) {
            const tx = Math.floor(Math.random() * (COLS - 2)) + 1;
            const ty = Math.floor(Math.random() * (ROWS - 2)) + 1;
            if (map[ty][tx] === SYMBOLS.FLOOR) {
                map[ty][tx] = SYMBOLS.LAVA;
                spawnSlash(tx, ty);
            }
        }
    }

    // 以前のように、数ターンおきに魔法陣を召喚する方式に戻す
    if (!e.fireCooldown) e.fireCooldown = 0;
    if (e.fireCooldown > 0) {
        e.fireCooldown--;
    } else {
        // つららの直接召喚 (READYステージで即座に出現)
        await summonDragonTraps(e, isPhase2 ? 4 : 2, 'READY');
        e.fireCooldown = isPhase2 ? 2 : 3;
    }

    // 新攻撃：配下の召喚 (Summon Minions) - 20ターン目以降
    if (e.battleTurns >= 20) {
        if (!e.spawnCooldown) e.spawnCooldown = 0;
        if (e.spawnCooldown > 0) {
            e.spawnCooldown--;
        } else {
            // オークの数を制限 (最大15体)
            const orcCount = enemies.filter(ee => ee.type === 'ORC').length;
            if (orcCount >= 15) {
                e.spawnCooldown = 2; // 少し待機
                return;
            }

            const summonRoll = Math.random();
            let spawnPos = null;
            // 四隅の溶岩溜まりから出現させる
            for (let attempt = 0; attempt < 20; attempt++) {
                const cornerRoll = Math.random();
                let base;
                if (cornerRoll < 0.25) base = { x: 3, y: 3 }; // 左上
                else if (cornerRoll < 0.5) base = { x: COLS - 4, y: 3 }; // 右上
                else if (cornerRoll < 0.75) base = { x: 3, y: ROWS - 4 }; // 左下
                else base = { x: COLS - 4, y: ROWS - 4 }; // 右下

                // 溶岩の周辺の床を優先的に探す
                const tx = base.x + (Math.floor(Math.random() * 5) - 2);
                const ty = base.y + (Math.floor(Math.random() * 5) - 2);

                if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS &&
                    map[ty][tx] === SYMBOLS.FLOOR &&
                    !enemies.some(ee => ee.x === tx && ee.y === ty) &&
                    !(player.x === tx && player.y === ty)) {
                    spawnPos = { x: tx, y: ty };
                    break;
                }
            }

            if (spawnPos) {
                if (summonRoll < 0.6) {
                    // オークの召喚
                    addLog("Dragonlord: 'Go, my heavy infantry! Crush them!'");
                    enemies.push({
                        type: 'ORC', x: spawnPos.x, y: spawnPos.y,
                        hp: 50 + floorLevel * 5, maxHp: 50 + floorLevel * 5,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0
                    });
                    SOUNDS.LANDING_THUD();
                } else {
                    // ウィルの召喚
                    addLog("Dragonlord calls upon the lingering souls...");
                    wisps.push({ x: spawnPos.x, y: spawnPos.y, dir: Math.floor(Math.random() * 4), mode: 'STRAIGHT' });
                    SOUNDS.SPEED_UP(); // 魔法っぽい音
                }
                spawnSlash(spawnPos.x, spawnPos.y);
                e.spawnCooldown = isPhase2 ? 4 : 6; // フェーズ2は召喚間隔が短い
            }
        }
    }

    // 新攻撃：大地の咆哮 (EARTH SPIKES)
    if (dist > 6 && Math.random() < (isPhase2 ? 0.4 : 0.2)) {
        addLog("Dragonlord chants an ancient spell... EARTH SPIKES!");
        await summonDragonTraps(e, isPhase2 ? 12 : 6, 'READY');
        e.fireCooldown = 2;
        return;
    }

    // 炎の息や以前の攻撃は全て削除
}

// spreadLavaBreath was removed as requested.

async function summonDragonTraps(e, count = 1, stage = 'CIRCLE') {
    let spawned = 0;
    for (let attempt = 0; attempt < 50 && spawned < count; attempt++) {
        const tx = Math.floor(Math.random() * (COLS - 2)) + 1;
        const ty = Math.floor(Math.random() * (ROWS - 2)) + 1;

        if (map[ty][tx] !== SYMBOLS.FLOOR) continue;
        if (dragonTraps.some(t => t.x === tx && t.y === ty)) continue;
        if (tempWalls.some(w => w.x === tx && w.y === ty)) continue;
        // コア周辺(半径3)は避ける
        if (dungeonCore && Math.abs(tx - dungeonCore.x) <= 3 && Math.abs(ty - dungeonCore.y) <= 3) continue;
        // ドラゴンの胴体周辺は避ける
        if (Math.abs(tx - e.x) <= 8 && Math.abs(ty - e.y) <= 3) continue;

        dragonTraps.push({ x: tx, y: ty, stage: stage });
        spawned++;
    }
    if (spawned > 0) {
        if (stage === 'READY') {
            addLog("地面から岩の棘が突き出した！");
        }
        SOUNDS.SELECT();
    }
}

async function knockbackPlayer(kx, ky, baseDamage, destroyIcicles = false) {
    let damage = Math.max(1, baseDamage - player.armorCount);
    if (player.isDefending) damage = Math.max(1, Math.floor(damage * 0.4));

    player.hp -= damage;
    player.flashUntil = performance.now() + 200;
    if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
    spawnDamageText(player.x, player.y, damage, '#ffffff');
    if (player.hp <= 0) { player.hp = 0; updateUI(); return; }

    const isRealWall = (tx, ty) => {
        if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
        return (map[ty][tx] === SYMBOLS.WALL || map[ty][tx] === SYMBOLS.DOOR || map[ty][tx] === SYMBOLS.CORE);
    };

    // 背後が壁の場合、空いている方向をランダムに探して吹き飛ぶ
    if (isRealWall(player.x + kx, player.y + ky)) {
        const candidates = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        // ランダムにシャッフル
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        for (const c of candidates) {
            if (!isRealWall(player.x + c.x, player.y + c.y)) {
                kx = c.x; ky = c.y;
                break;
            }
        }
    }

    let slideSteps = 0;
    let pickedDuringSlide = [];
    while (slideSteps < 100) {
        const nx = player.x + kx;
        const ny = player.y + ky;

        if (isRealWall(nx, ny)) {
            SOUNDS.EXPLODE();
            setScreenShake(10, 200);
            break;
        }

        const nextTile = map[ny][nx];
        const itemSymbols = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.KEY, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.WAND, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN];
        if (itemSymbols.includes(nextTile)) {
            pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
            map[ny][nx] = SYMBOLS.FLOOR;
        }

        const blockIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
        if (blockIdx !== -1) {
            const block = tempWalls[blockIdx];
            if (block.type === 'ICICLE') {
                if (destroyIcicles) {
                    tempWalls.splice(blockIdx, 1);
                    addLog("CRASH! You smashed the rock spike!");
                    SOUNDS.EXPLODE();
                    setScreenShake(10, 200);
                } else {
                    // つららを壁として扱う（停止する）
                    SOUNDS.HIT();
                    setScreenShake(5, 100);
                    break;
                }
            } else {
                // 通常のブロックは常に破壊して突き進む
                tempWalls.splice(blockIdx, 1);
                addLog("CRASH! Your flying body SMASHED the block!");
                SOUNDS.EXPLODE();
                setScreenShake(20, 300);
            }
        }

        player.x = nx;
        player.y = ny;
        slideSteps++;

        const hitEnemies = enemies.filter(targetE => (targetE.x === nx && targetE.y === ny) || (targetE.type === 'SNAKE' && targetE.body && targetE.body.some(b => b.x === nx && b.y === ny)));
        for (const targetE of hitEnemies) {
            const colDmg = 10 + Math.floor(floorLevel / 2);
            targetE.hp -= colDmg;
            targetE.flashUntil = performance.now() + 150;
            spawnDamageText(targetE.x, targetE.y, colDmg, '#ef4444');
            SOUNDS.DAMAGE();
            if (targetE.hp <= 0) handleEnemyDeath(targetE);
        }

        draw();
        await new Promise(r => setTimeout(r, 40));

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
}

// 敵用の吹き飛ばし処理
async function knockbackEnemy(e, kx, ky, damage) {
    if (!e || e.hp <= 0) return;
    if (e.type === 'DRAGON') {
        // ドラゴンはダメージのみ受け、吹き飛ばされない
        e.hp -= damage;
        e.flashUntil = performance.now() + 200;
        spawnDamageText(e.x, e.y, damage, '#ef4444');
        SOUNDS.DAMAGE();
        if (e.hp <= 0) handleEnemyDeath(e);
        return;
    }
    e.hp -= damage;
    e.flashUntil = performance.now() + 200;
    spawnDamageText(e.x, e.y, damage, '#ef4444');
    SOUNDS.DAMAGE();

    let steps = 0;
    while (steps < 4) {
        const nx = e.x + kx, ny = e.y + ky;
        if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) break;
        if (isWallAt(nx, ny)) break;

        const oldPos = { x: e.x, y: e.y };
        e.x = nx; e.y = ny;
        if (e.type === 'SNAKE') {
            for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
            e.body[0] = oldPos;
        }

        steps++;
        draw();

        // 穴チェック
        if (map[e.y][e.x] === SYMBOLS.STAIRS) {
            scheduleEnemyFall(e, "The enemy was knocked into the HOLE!");
            return;
        }

        await new Promise(r => setTimeout(r, 30));
    }
    if (e.hp <= 0) handleEnemyDeath(e);
}

async function enemyTurn() {
    // 妖精の効果：隣接した敵を1体ずつ仲間にする
    const processFairyCharm = () => {
        if (player.fairyCount > 0 && player.fairyRemainingCharms > 0) {
            const adjacentEnemy = enemies.find(e => {
                if (e.isAlly || e.hp <= 0) return false;
                if (e.type === 'DRAGON' || e.type === 'TURRET') return false;

                const dx = Math.abs(e.x - player.x);
                const dy = Math.abs(e.y - player.y);
                const isNear = dx <= 1 && dy <= 1;
                if (isNear) return true;

                if (e.type === 'SNAKE' && e.body) {
                    return e.body.some(b => Math.abs(b.x - player.x) <= 1 && Math.abs(b.y - player.y) <= 1);
                }
                return false;
            });

            if (adjacentEnemy) {
                adjacentEnemy.isAlly = true;
                player.fairyRemainingCharms--;
                addLog(`✨ The Fairy's blessing charmed an adjacent enemy! (Remaining: ${player.fairyRemainingCharms}) ✨`);
                spawnFloatingText(adjacentEnemy.x, adjacentEnemy.y, "CHARMED!!", "#f472b6");
                SOUNDS.CHARM();
                updateUI();
                if (player.fairyRemainingCharms === 0) {
                    addLog("The Fairy is exhausted for this floor...");
                }
            }
        }
    };

    // 自分のターン開始時にチェック
    processFairyCharm();

    let attackOccurred = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.hp <= 0) continue;

        // 毒沼または溶岩
        const tile = map[e.y][e.x];
        if (tile === SYMBOLS.POISON || tile === SYMBOLS.LAVA) {
            // ブレイズは溶岩ダメージ無効、オークは軽減
            if (tile === SYMBOLS.LAVA) {
                if (e.type === 'BLAZE') {
                    // 無効
                } else {
                    const damage = (e.type === 'ORC') ? 2 : 10;
                    e.hp -= damage; e.flashUntil = performance.now() + 100;
                    spawnDamageText(e.x, e.y, damage, '#f97316');
                    SOUNDS.LAVA_BURN();
                    if (e.hp <= 0) { handleEnemyDeath(e); continue; }
                }
            } else if (tile === SYMBOLS.POISON) {
                const damage = 1;
                e.hp -= damage; e.flashUntil = performance.now() + 100;
                spawnDamageText(e.x, e.y, damage, '#a855f7');
                SOUNDS.DAMAGE();
                if (e.hp <= 0) { handleEnemyDeath(e); continue; }
            }
        }

        if (e.stunTurns > 0) {
            e.stunTurns--;
            addLog("Enemy is stunned...");
            continue;
        }

        // タレット・ドラゴンはその場を動かない
        if (e.type === 'TURRET') continue;
        if (e.type === 'DRAGON') {
            // 近接攻撃の判定（頭部または胴体の隣接マス）
            const segments = [{ x: e.x, y: e.y }, ...(e.body || [])];
            const nearestSeg = segments.reduce((prev, curr) => {
                const prevDist = Math.abs(prev.x - player.x) + Math.abs(prev.y - player.y);
                const currDist = Math.abs(curr.x - player.x) + Math.abs(curr.y - player.y);
                return prevDist < currDist ? prev : curr;
            });

            // 四方向（上下左右）の隣接判定
            const dx = Math.abs(nearestSeg.x - player.x);
            const dy = Math.abs(nearestSeg.y - player.y);
            const isTargetAdjacentCardinal = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            const isTargetAdjacent = dx <= 1 && dy <= 1; // 斜め含む

            if (e.chargingTackle) {
                // タックルの実行
                e.chargingTackle = false;
                e.tackleCooldown = 4; // 実行後のクールダウン

                if (isTargetAdjacentCardinal && !player.isStealth) {
                    addLog("The Dragonlord TACKLES you with immense force!");
                    SOUNDS.FATAL();
                    setScreenShake(30, 600);
                    spawnSlash(player.x, player.y);

                    // 突き飛ばし方向の決定 (必ず上下左右)
                    let kx = 0, ky = 0;
                    if (player.x > nearestSeg.x) kx = 1;
                    else if (player.x < nearestSeg.x) kx = -1;
                    else if (player.y > nearestSeg.y) ky = 1;
                    else if (player.y < nearestSeg.y) ky = -1;

                    await knockbackPlayer(kx, ky, 25, true); // ダメージ25

                    // 周囲の敵も巻き込む
                    for (let ei = enemies.length - 1; ei >= 0; ei--) {
                        const otherE = enemies[ei];
                        if (otherE === e || otherE.hp <= 0) continue;
                        const distToImpact = Math.abs(otherE.x - player.x) + Math.abs(otherE.y - player.y);
                        if (distToImpact <= 2) {
                            addLog("The impact of the tackle blows an enemy away!");
                            await knockbackEnemy(otherE, kx, ky, 20);
                        }
                    }
                    attackOccurred = true;
                } else {
                    addLog("The Dragonlord's tackle missed!");
                }
                e.offsetX = 0; e.offsetY = 0;
            } else if (isTargetAdjacentCardinal && !player.isStealth && e.tackleCooldown <= 0) {
                // タックルの溜め
                addLog("The Dragonlord is shaking... it's charging for a TACKLE!");
                e.chargingTackle = true;
                SOUNDS.SELECT();

                // 主人公と反対側に体を引く演出 (Wind-up)
                let backX = 0, backY = 0;
                if (player.x > nearestSeg.x) backX = -12;
                else if (player.x < nearestSeg.x) backX = 12;
                else if (player.y > nearestSeg.y) backY = -12;
                else if (player.y < nearestSeg.y) backY = 12;

                // 1ターンかけて溜める演出
                for (let i = 0; i < 10; i++) {
                    e.offsetX = backX + (Math.random() - 0.5) * 6;
                    e.offsetY = backY + (Math.random() - 0.5) * 6;
                    draw();
                    await new Promise(r => setTimeout(r, 60));
                }
                attackOccurred = true; // 溜め動作でターンを消費
            } else if (isTargetAdjacent && !player.isStealth) {
                // 斜めなどの場合やクールダウン中はシッポなぎ払い（または何もせず handleDragonTurn へ）
                addLog("The Dragon's massive tail SWEEPS the area!");
                SOUNDS.FATAL();
                setScreenShake(20, 300);
                spawnSlash(player.x, player.y);

                let damage = Math.max(5, 20 - player.armorCount);
                if (player.isDefending) damage = Math.max(1, Math.floor(damage * 0.4));
                player.hp -= damage;
                player.flashUntil = performance.now() + 200;
                if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
                spawnDamageText(player.x, player.y, damage, '#ef4444');

                // 軽い吹き飛ばし (龍体から遠ざかる方向へ、軸を統一)
                let pkx = 0, pky = 0;
                if (Math.abs(player.y - nearestSeg.y) >= Math.abs(player.x - nearestSeg.x)) {
                    pky = (player.y < nearestSeg.y) ? -1 : 1;
                } else {
                    pkx = (player.x > nearestSeg.x) ? 1 : -1;
                }

                await knockbackPlayer(pkx, pky, 15, true);
                addLog("You were knocked back!");

                // 周囲の敵をなぎ払う (Orcs and others)
                for (let ei = enemies.length - 1; ei >= 0; ei--) {
                    const otherE = enemies[ei];
                    if (otherE === e || otherE.hp <= 0) continue;
                    const isAdjacentToBody = segments.some(seg => Math.abs(seg.x - otherE.x) <= 1 && Math.abs(seg.y - otherE.y) <= 1);
                    if (isAdjacentToBody) {
                        const ekx = (otherE.x > nearestSeg.x) ? 1 : -1;
                        const eky = (otherE.y < nearestSeg.y) ? -1 : 1;
                        addLog("The tail sweep hits an enemy!");
                        await knockbackEnemy(otherE, ekx, eky, 20);
                    }
                }

                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                attackOccurred = true;
            }

            if (e.tackleCooldown > 0) e.tackleCooldown--;

            if (!attackOccurred) {
                await handleDragonTurn(e);
            }
            continue;
        }

        if (e.isAlly && e.type === 'TURRET') {
            // 味方タレット：移動しない、レーザーで自動攻撃（通常のタレットAIに任せる）
            continue;
        }
        if (e.isAlly) {
            // 味方：近くに敵がいれば攻撃・追従、いなければプレイヤーを追いかける
            const allyTargets = enemies.filter(target => !target.isAlly && target.hp > 0);
            let allyBestTarget = null;
            let allyMinDist = 999;

            allyTargets.forEach(t => {
                const d = Math.abs(t.x - e.x) + Math.abs(t.y - e.y);
                if (d < allyMinDist) { allyMinDist = d; allyBestTarget = t; }
            });

            if (allyBestTarget && allyMinDist <= 8) {
                // 敵を優先して行動
                if (allyMinDist === 1) {
                    // 攻撃
                    spawnSlash(allyBestTarget.x, allyBestTarget.y);
                    e.offsetX = (allyBestTarget.x - e.x) * 10; e.offsetY = (allyBestTarget.y - e.y) * 10;

                    // 味方の攻撃力計算 (オークなら強い)
                    let dmg = (e.type === 'ORC' ? 15 : (e.type === 'SNAKE' ? 10 : 5)) + Math.floor(floorLevel / 2);
                    allyBestTarget.hp -= dmg;
                    allyBestTarget.flashUntil = performance.now() + 100;
                    spawnDamageText(allyBestTarget.x, allyBestTarget.y, dmg, '#fff');
                    SOUNDS.HIT();
                    attackOccurred = true;

                    if (allyBestTarget.hp <= 0) handleEnemyDeath(allyBestTarget);
                    else if (e.type === 'ORC' && allyBestTarget.type !== 'DRAGON') {
                        // 味方オークによる突き飛ばし（ドラゴンは吹き飛ばせない）
                        addLog("Ally Orc's mighty blow sends the enemy flying!");
                        SOUNDS.FATAL();
                        let kx = allyBestTarget.x - e.x, ky = allyBestTarget.y - e.y;
                        const isRealWall = (tx, ty) => {
                            if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
                            return (map[ty][tx] === SYMBOLS.WALL || map[ty][tx] === SYMBOLS.DOOR || map[ty][tx] === SYMBOLS.CORE);
                        };
                        // 背後が真の壁なら別の方向へ（ブロックは破壊できるので無視）
                        if (isRealWall(allyBestTarget.x + kx, allyBestTarget.y + ky)) {
                            const cands = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
                            // ランダムにシャッフル
                            for (let i = cands.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [cands[i], cands[j]] = [cands[j], cands[i]];
                            }
                            for (const c of cands) {
                                if (allyBestTarget.x + c.x === e.x && allyBestTarget.y + c.y === e.y) continue;
                                if (!isRealWall(allyBestTarget.x + c.x, allyBestTarget.y + c.y)) { kx = c.x; ky = c.y; break; }
                            }
                        }

                        let slideSteps = 0;
                        while (slideSteps < 10) {
                            const nx = allyBestTarget.x + kx, ny = allyBestTarget.y + ky;
                            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || map[ny][nx] === SYMBOLS.WALL || map[ny][nx] === SYMBOLS.DOOR || map[ny][nx] === SYMBOLS.CORE) {
                                SOUNDS.EXPLODE(); break;
                            }
                            const bwIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
                            if (bwIdx !== -1) {
                                tempWalls.splice(bwIdx, 1);
                                addLog("CRASH! The enemy smashed the block!");
                                SOUNDS.EXPLODE(); setScreenShake(10, 200);
                            }

                            if (allyBestTarget.type === 'SNAKE') {
                                for (let i = allyBestTarget.body.length - 1; i > 0; i--) {
                                    allyBestTarget.body[i].x = allyBestTarget.body[i - 1].x;
                                    allyBestTarget.body[i].y = allyBestTarget.body[i - 1].y;
                                }
                                allyBestTarget.body[0].x = nx; allyBestTarget.body[0].y = ny;
                            }
                            allyBestTarget.x = nx; allyBestTarget.y = ny;
                            slideSteps++;
                            draw();
                            await new Promise(r => setTimeout(r, 40));
                            if (map[allyBestTarget.y][allyBestTarget.x] === SYMBOLS.STAIRS) {
                                addLog("The enemy was knocked into the hole!");
                                allyBestTarget.hp = 0; break;
                            }
                        }
                        if (allyBestTarget.hp <= 0) handleEnemyDeath(allyBestTarget);
                    }
                    await new Promise(r => setTimeout(r, 100)); // わずかに短縮
                    e.offsetX = 0; e.offsetY = 0;
                } else {
                    // 敵に接近
                    const oldPos = { x: e.x, y: e.y };
                    const dx = allyBestTarget.x - e.x, dy = allyBestTarget.y - e.y;
                    let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);

                    let moved = false;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; moved = true; }
                        else if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; moved = true; }
                    } else {
                        if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; moved = true; }
                        else if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; moved = true; }
                    }
                    if (moved) {
                        if (e.type === 'SNAKE') {
                            SOUNDS.SNAKE_MOVE();
                            for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                            e.body[0] = oldPos;
                        } else {
                            SOUNDS.MOVE();
                        }

                        // 地形変化とスライド防止（味方用）
                        let esx = e.x - oldPos.x, esy = e.y - oldPos.y;
                        while (e.type !== 'FROST' && e.type !== 'BLAZE' && map[e.y][e.x] === SYMBOLS.ICE) {
                            const nx = e.x + esx, ny = e.y + esy;
                            if (nx === e.x && ny === e.y) break;
                            if (!canEnemyMove(nx, ny, e)) break;
                            const oldEPos = { x: e.x, y: e.y };
                            e.x = nx; e.y = ny;
                            SOUNDS.ICE_SLIDE();
                            if (e.type === 'SNAKE') {
                                for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                                e.body[0] = oldEPos;
                            }
                            draw();
                            if (map[e.y][e.x] === SYMBOLS.STAIRS) {
                                scheduleEnemyFall(e, "An ally slid into the HOLE!");
                                break;
                            }
                            await new Promise(r => setTimeout(r, 40));
                        }

                        if (!e._dead) {
                            if (e.type === 'FROST') {
                                if (map[e.y][e.x] === SYMBOLS.FLOOR || map[e.y][e.x] === SYMBOLS.POISON || map[e.y][e.x] === SYMBOLS.LAVA) {
                                    map[e.y][e.x] = SYMBOLS.ICE;
                                    SOUNDS.FREEZE();
                                }
                            } else if (e.type === 'BLAZE') {
                                if (map[e.y][e.x] === SYMBOLS.FLOOR || map[e.y][e.x] === SYMBOLS.POISON || map[e.y][e.x] === SYMBOLS.ICE) {
                                    map[e.y][e.x] = SYMBOLS.LAVA;
                                    SOUNDS.IGNITE();
                                }
                            }
                        }
                    }
                }
            } else {
                // 敵がいないのでプレイヤーを追いかける
                const dP = Math.abs(player.x - e.x) + Math.abs(player.y - e.y);
                if (dP > 1) { // 隣接していなければ近づく
                    const oldPos = { x: e.x, y: e.y };
                    const dx = player.x - e.x, dy = player.y - e.y;
                    let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);
                    let moved = false;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; moved = true; }
                        else if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; moved = true; }
                    } else {
                        if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; moved = true; }
                        else if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; moved = true; }
                    }

                    if (moved) {
                        if (e.type === 'SNAKE') {
                            SOUNDS.SNAKE_MOVE();
                            for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                            e.body[0] = oldPos;
                        } else {
                            SOUNDS.MOVE();
                        }

                        // 地形変化とスライド防止（味方用）
                        let esx = e.x - oldPos.x, esy = e.y - oldPos.y;
                        while (e.type !== 'FROST' && e.type !== 'BLAZE' && map[e.y][e.x] === SYMBOLS.ICE) {
                            const nx = e.x + esx, ny = e.y + esy;
                            if (nx === e.x && ny === e.y) break;
                            if (!canEnemyMove(nx, ny, e)) break;
                            const oldEPos = { x: e.x, y: e.y };
                            e.x = nx; e.y = ny;
                            SOUNDS.ICE_SLIDE();
                            if (e.type === 'SNAKE') {
                                for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                                e.body[0] = oldEPos;
                            }
                            draw();
                            if (map[e.y][e.x] === SYMBOLS.STAIRS) {
                                scheduleEnemyFall(e, "An ally slid into the HOLE!");
                                break;
                            }
                            await new Promise(r => setTimeout(r, 40));
                        }

                        if (!e._dead) {
                            if (e.type === 'FROST') {
                                if (map[e.y][e.x] === SYMBOLS.FLOOR || map[e.y][e.x] === SYMBOLS.POISON || map[e.y][e.x] === SYMBOLS.LAVA) {
                                    map[e.y][e.x] = SYMBOLS.ICE;
                                    SOUNDS.FREEZE();
                                }
                            } else if (e.type === 'BLAZE') {
                                if (map[e.y][e.x] === SYMBOLS.FLOOR || map[e.y][e.x] === SYMBOLS.POISON || map[e.y][e.x] === SYMBOLS.ICE) {
                                    map[e.y][e.x] = SYMBOLS.LAVA;
                                    SOUNDS.IGNITE();
                                }
                            }
                        }
                    }
                }
            }

            // 穴チェック
            if (map[e.y][e.x] === SYMBOLS.STAIRS) {
                scheduleEnemyFall(e, "An ally fell into the HOLE!");
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

        // オークは距離に関係なく探知する
        const detectRange = (e.type === 'ORC') ? 999 : 8;

        if (e.type === 'GOLD' && minDist <= detectRange) {
            // GOLDは逃走のみ
            const moves = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            let bestMove = { x: e.x, y: e.y, score: minDist };
            moves.forEach(m => {
                if (canEnemyMove(e.x + m.x, e.y + m.y, e)) {
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
            SOUNDS.ENEMY_ATTACK();

            if (bestTarget.isPlayer) {

                // プレイヤーへの攻撃（既存ロジック）
                let damage = Math.max(1, (Math.floor(floorLevel / 2) + (e.type === 'SNAKE' ? 5 : (e.type === 'ORC' ? 10 : 1))) - player.armorCount);
                if (player.isDefending) {
                    if (Math.random() < 0.03) { SOUNDS.PARRY(); spawnFloatingText(player.x, player.y, "PARRY!", "#fff"); damage = 0; }
                    else damage = Math.max(1, Math.floor(damage * 0.4));
                }
                if (damage > 0) {
                    if (e.type === 'ORC') {
                        addLog("The Orc's mighty blow sends you flying!");
                        await knockbackPlayer(player.x - e.x, player.y - e.y, 10 + Math.floor(floorLevel / 2), true);
                    } else {
                        const fatal = Math.random() < 0.05;
                        if (fatal) { damage *= 3; SOUNDS.FATAL(); setScreenShake(15, 400); addLog("💥 FATAL BLOW! 💥"); }
                        else SOUNDS.DAMAGE();
                        player.hp -= damage; player.flashUntil = performance.now() + 200;
                        if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
                        spawnDamageText(player.x, player.y, damage, fatal ? '#ff0000' : '#ffffff');
                        if (player.hp <= 0) { player.hp = 0; updateUI(); }
                    }
                }
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
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
        } else if (minDist <= detectRange) {
            // 接近
            const oldPos = { x: e.x, y: e.y };
            const dx = bestTarget.x - e.x, dy = bestTarget.y - e.y;
            let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);
            let moved = false;

            // 通常の移動
            if (Math.abs(dx) > Math.abs(dy)) {
                if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; moved = true; }
                else if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; moved = true; }
            } else {
                if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; moved = true; }
                else if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; moved = true; }
            }

            if (moved) {
                if (e.type === 'SNAKE') {
                    SOUNDS.SNAKE_MOVE();
                    for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                    e.body[0] = oldPos;
                }

                // 敵の氷スライド (フロストとブレイズは滑らない)
                let esx = e.x - oldPos.x, esy = e.y - oldPos.y;
                while (e.type !== 'FROST' && e.type !== 'BLAZE' && map[e.y][e.x] === SYMBOLS.ICE) {
                    const nx = e.x + esx, ny = e.y + esy;
                    if (nx === e.x && ny === e.y) break;
                    if (!canEnemyMove(nx, ny, e)) break;
                    const oldEPos = { x: e.x, y: e.y };
                    e.x = nx; e.y = ny;
                    SOUNDS.ICE_SLIDE();
                    if (e.type === 'SNAKE') {
                        for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                        e.body[0] = oldEPos;
                    }
                    draw();
                    // 穴に落ちるなどのチェック
                    if (map[e.y][e.x] === SYMBOLS.STAIRS) {
                        scheduleEnemyFall(e, "An enemy slid into the HOLE!");
                        break;
                    }
                    await new Promise(r => setTimeout(r, 40));
                }

                if (!e._dead && moved) {
                    if (e.type === 'FROST') {
                        if (map[e.y][e.x] === SYMBOLS.FLOOR || map[e.y][e.x] === SYMBOLS.POISON || map[e.y][e.x] === SYMBOLS.LAVA) {
                            map[e.y][e.x] = SYMBOLS.ICE;
                            SOUNDS.FREEZE();
                        }
                    } else if (e.type === 'BLAZE') {
                        if (map[e.y][e.x] === SYMBOLS.FLOOR || map[e.y][e.x] === SYMBOLS.POISON || map[e.y][e.x] === SYMBOLS.ICE) {
                            map[e.y][e.x] = SYMBOLS.LAVA;
                            SOUNDS.IGNITE();
                        }
                    }
                }

                // 通常移動後の穴チェック (氷以外でも)
                if (!e._dead && map[e.y][e.x] === SYMBOLS.STAIRS) {
                    scheduleEnemyFall(e, "An enemy fell into the HOLE!");
                }
            }
        }
    }

    if (!attackOccurred && enemies.length > 0) await new Promise(r => setTimeout(r, 50));

    // ターンの最後にレーザー判定
    await applyLaserDamage();

    // 炎の床の寿命を更新
    for (let i = fireFloors.length - 1; i >= 0; i--) {
        fireFloors[i].life--;
        if (fireFloors[i].life < 0) fireFloors.splice(i, 1);
    }

    // 罠の進行処理
    for (let i = dragonTraps.length - 1; i >= 0; i--) {
        const trap = dragonTraps[i];
        if (trap.stage === 'CIRCLE') {
            trap.stage = 'READY';
        } else if (trap.stage === 'READY') {
            dragonTraps.splice(i, 1);

            let hitTarget = false;
            if (player.x === trap.x && player.y === trap.y) {
                const dmg = 25;
                player.hp -= dmg;
                player.flashUntil = performance.now() + 200;
                if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
                spawnDamageText(player.x, player.y, dmg, '#38bdf8');
                SOUNDS.DAMAGE();
                addLog("地面から岩の棘が突き出た！鋭い岩が体を貫く！");
                setScreenShake(15, 300);
                hitTarget = true;
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
            }

            // 敵も棘のダメージを受ける
            for (let ei = enemies.length - 1; ei >= 0; ei--) {
                const otherE = enemies[ei];
                if (otherE.hp > 0 && otherE.x === trap.x && otherE.y === trap.y) {
                    addLog("An enemy was skewered by the rock spike!");
                    await knockbackEnemy(otherE, (Math.random() < 0.5 ? 1 : -1), (Math.random() < 0.5 ? 1 : -1), 30);
                    hitTarget = true;
                }
            }

            if (!hitTarget) {
                addLog("地面から岩の棘が突き出した！");
                SOUNDS.EXPLODE();
                setScreenShake(10, 200);
            }
            // つららを耐久度2の障害物として配置
            tempWalls.push({ x: trap.x, y: trap.y, hp: 2, type: 'ICICLE' });
        }
    }

    // ターンの最後にもチェック（近づいてきた敵を仲間にする）
    processFairyCharm();
}

async function applyLaserDamage() {
    for (const e of enemies) {
        if (e.type === 'TURRET' && e.hp > 0 && !e.isFalling) {
            const dx = [0, 1, 0, -1][e.dir];
            const dy = [-1, 0, 1, 0][e.dir];
            let lx = e.x + dx, ly = e.y + dy;
            while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS) {
                // プレイヤー判定
                if (player.x === lx && player.y === ly && !player.isShielded) {
                    const lDmg = 5 + Math.floor(floorLevel / 5);
                    player.hp -= lDmg; player.flashUntil = performance.now() + 200;
                    if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
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
                            SOUNDS.DAMAGE();
                            if (oe.hp <= 0) handleEnemyDeath(oe);
                        } else if (oe.type === 'SNAKE' && oe.body && oe.body.some(s => s.x === lx && s.y === ly)) {
                            oe.hp -= enemyLaserDmg; oe.flashUntil = performance.now() + 100;
                            spawnDamageText(lx, ly, enemyLaserDmg, '#f87171');
                            SOUNDS.DAMAGE();
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

function canEnemyMove(x, y, mover = null) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    const tile = map[y][x];
    const isObstacle = [
        SYMBOLS.WALL, SYMBOLS.DOOR, SYMBOLS.BLOCK, SYMBOLS.BLOCK_CRACKED, SYMBOLS.LAVA,
        SYMBOLS.KEY, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.WAND, SYMBOLS.FAIRY,
        SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.TOME
    ].includes(tile);
    // ブレイズとオークは溶岩を障害物と見なさない
    if (isObstacle) {
        if (tile === SYMBOLS.LAVA && mover && (mover.type === 'BLAZE' || mover.type === 'ORC')) {
            // 移動を許可
        } else {
            return false;
        }
    }
    if (tempWalls.some(w => w.x === x && w.y === y)) return false;
    if (player.x === x && player.y === y) return false;

    // レーザーの経路は避ける (移動する本人のレーザーは無視)
    if (isTileInLaser(x, y, mover)) return false;

    return !enemies.some(e => {
        if (e === mover) return false; // 自分自身は無視
        if (e.x === x && e.y === y) return true;
        if (e.type === 'SNAKE' || e.type === 'DRAGON') return (e.body && e.body.some(seg => seg.x === x && seg.y === y));
        return false;
    });
}

window.debugWin = triggerEnding; // コンソールからデバッグ可能に

function gainExp(amount) {
    player.exp += amount;
    if (player.exp >= player.nextExp) {
        player.level++; player.exp = 0; player.nextExp = player.level <= 5 ? player.level * 7 : player.level * 10;
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

function isTileInLaser(x, y, ignoreEnemy = null) {
    for (const e of enemies) {
        if (e === ignoreEnemy) continue; // 指定された敵は無視
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
    if (startFloor === 1 && gameState !== 'OPENING') {
        await playOpeningSequence();
        return;
    }
    // 画面の揺れと状態をリセット
    screenShake.x = 0; screenShake.y = 0; screenShake.until = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    player = {
        x: 0, y: 0, hp: 30, maxHp: 30, level: startFloor, exp: 0, nextExp: 10,
        stamina: 100, swordCount: 0, armorCount: 0,
        hasteTomes: 0, charmTomes: 0, stealthTomes: 0, healTomes: 0, explosionTomes: 0, guardianTomes: 0, escapeTomes: 0,
        isSpeeding: false, isStealth: false, isExtraTurn: false, isShielded: false,
        facing: 'LEFT',
        totalKills: 0, offsetX: 0, offsetY: 0, flashUntil: 0,
        hasSword: false, hasKey: false, isDefending: false,
        hasWand: (startFloor >= 2),
        itemInHand: null,
        fairyCount: 0,
        fairyRemainingCharms: 0,
        isInfiniteStamina: false
    };

    // レベルに合わせてステータスを補正
    player.maxHp = 20 + (player.level * 10);
    player.hp = player.maxHp;
    player.nextExp = player.level <= 5 ? player.level * 7 : player.level * 10;

    // テストプレイ(Floor 100)用のデバッグバフ
    if (startFloor === 100) {
        player.hp = 9999;
        player.maxHp = 9999;
        player.stamina = 999;
        player.swordCount = 30; // 圧倒的火力
        addLog("DEBUG: Invincibility & High Attack Power for testing Floor 100.");
    }

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
    await startFloorTransition();
    isProcessing = false; // 確実に操作可能にする

    if (startFloor === 1) {
        addLog("Betrayed and fallen... You survived the fall.");
        addLog("Goal: Reach B100F and destroy the Core.");
        await triggerStage1StartStory();
    } else {
        addLog(`🔧 TEST MODE: Started from Floor ${startFloor} (Lv ${player.level}) 🔧`);
        player.hasteTomes = 5;
        player.charmTomes = 5;
        player.stealthTomes = 5;
        player.healTomes = 5;
        player.explosionTomes = 5;
        player.guardianTomes = 5;
        player.escapeTomes = 5;
        addLog("TEST BUFF: 5 of each Tome added to inventory.");
        addLog("DEBUG HINT: Start at Floor 77 to force DENSE MAZE.");
    }

    isProcessing = false;
    isPlayerVisible = true;
    updateUI();
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

window.addEventListener('keydown', async e => {
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

    // デバッグ用：100階で 'k' を押すと即エンディング
    if (gameState === 'PLAYING' && floorLevel === 100 && e.key === 'k') {
        triggerEnding();
        return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        if (gameState === 'TITLE') { titleSelection = (titleSelection + 2) % 3; SOUNDS.SELECT(); return; }
        if (gameState === 'MENU') { menuSelection = (menuSelection + 1) % 2; SOUNDS.SELECT(); return; }
        if (gameState === 'INVENTORY') {
            const items = [player.hasteTomes, player.charmTomes, player.stealthTomes, player.healTomes, player.explosionTomes, player.guardianTomes, player.escapeTomes].filter(c => c > 0);
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
            const items = [player.hasteTomes, player.charmTomes, player.stealthTomes, player.healTomes, player.explosionTomes, player.guardianTomes, player.escapeTomes].filter(c => c > 0);
            const count = Math.max(1, items.length);
            inventorySelection = (inventorySelection + 1) % count;
            SOUNDS.SELECT(); return;
        }
    }
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (['TITLE', 'STATUS'].includes(gameState)) e.preventDefault();
        if (gameState === 'TITLE' && titleSelection === 2) {
            testFloor = (testFloor - 2 + 100) % 100 + 1; // 1から左で100へ
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'STATUS') { statusPage = (statusPage + 1) % 2; SOUNDS.SELECT(); return; }
    }
    if (e.key === 'ArrowRight' || e.key === 'd') {
        if (['TITLE', 'STATUS'].includes(gameState)) e.preventDefault();
        if (gameState === 'TITLE' && titleSelection === 2) {
            testFloor = (testFloor % 100) + 1; // 100から右で1へ
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'STATUS') { statusPage = (statusPage + 1) % 2; SOUNDS.SELECT(); return; }
    }

    // 数値直接入力 (STAGE SELECT時)
    // 数字を入力するたびに左にシフト（例: 1→12→23→34）、2桁を維持
    if (gameState === 'TITLE' && titleSelection === 2 && /^\d$/.test(e.key)) {
        e.preventDefault();
        const num = parseInt(e.key);
        let newFloor = (testFloor % 10) * 10 + num; // 1の位を10の位にシフトし、新しい数字を1の位に
        if (newFloor > 100) newFloor = 100;
        if (newFloor < 1) newFloor = 1;
        testFloor = newFloor;
        SOUNDS.SELECT();
        return;
    }

    if (gameState === 'CONFIRM_ESCAPE') {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            menuSelection = 0; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            menuSelection = 1; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'Enter') {
            if (menuSelection === 0) {
                // YES: 演出後に発動
                gameState = 'PLAYING';
                await useEscapeTome();
            } else {
                // NO: インベントリに戻る
                gameState = 'INVENTORY';
                SOUNDS.SELECT();
            }
            e.preventDefault();
        }
        if (e.key.toLowerCase() === 'x') {
            gameState = 'INVENTORY'; SOUNDS.SELECT(); e.preventDefault();
        }
        return;
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
                { id: 'STEALTH', count: player.stealthTomes },
                { id: 'EXPLOSION', count: player.explosionTomes },
                { id: 'GUARDIAN', count: player.guardianTomes },
                { id: 'ESCAPE', count: player.escapeTomes },
                { id: 'HEAL', count: player.healTomes }
            ];
            const items = fullItems.filter(it => it.count > 0);
            const selectedItem = items[inventorySelection];

            if (selectedItem) {
                if (selectedItem.id === 'HASTE' && !player.isSpeeding) {
                    gameState = 'PLAYING';
                    useHasteTome();
                } else if (selectedItem.id === 'CHARM') {
                    gameState = 'PLAYING';
                    useCharmTome();
                } else if (selectedItem.id === 'STEALTH' && !player.isStealth) {
                    gameState = 'PLAYING';
                    useStealthTome();
                } else if (selectedItem.id === 'EXPLOSION') {
                    gameState = 'PLAYING';
                    useExplosionTome();
                } else if (selectedItem.id === 'GUARDIAN' && !player.isShielded) {
                    gameState = 'PLAYING';
                    useGuardianTome();
                } else if (selectedItem.id === 'ESCAPE') {
                    gameState = 'CONFIRM_ESCAPE';
                    menuSelection = 1; // デフォルトはNO
                    SOUNDS.SELECT();
                } else if (selectedItem.id === 'HEAL') {
                    gameState = 'PLAYING';
                    useHealTome();
                }
            }
            return;
        }
    }

    if (e.key === '4' || e.key.toLowerCase() === 'g') {
        if (gameState === 'PLAYING' && !isProcessing && player.guardianTomes > 0 && !player.isShielded) {
            useGuardianTome();
        }
        return;
    }

    if (e.key === '5' || e.key.toLowerCase() === 'r') {
        if (gameState === 'PLAYING' && !isProcessing && player.escapeTomes > 0) {
            // ショートカットでも確認を出すか、即発動するか
            // 慎重を期すため確認gameStateへ
            gameState = 'CONFIRM_ESCAPE';
            menuSelection = 1;
            SOUNDS.SELECT();
        }
        return;
    }

    if (e.key === '6' || e.key.toLowerCase() === 'h') {
        if (gameState === 'PLAYING' && !isProcessing && player.healTomes > 0) {
            useHealTome();
        }
        return;
    }

    if (e.key === '3' || e.key.toLowerCase() === 'f') {
        if (gameState === 'PLAYING' && !isProcessing && player.explosionTomes > 0) {
            useExplosionTome();
        }
        return;
    }

    if (e.key.toLowerCase() === 'c' || e.key === '2' || e.key === 'c') { // 'c' を念のため追加
        if (gameState === 'PLAYING' && !isProcessing && player.charmTomes > 0) {
            useCharmTome();
        }
        return;
    }

    if (e.key.toLowerCase() === 'e' || e.key === '1') {
        if (gameState === 'PLAYING' && !isProcessing && player.hasteTomes > 0 && !player.isSpeeding) {
            useHasteTome();
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
    } else if (gameState === 'PLAYING' && isProcessing) {
        if (isSpacePressed) {
            // 滑っている最中のブロック設置予約
            if (['ArrowUp', 'w'].includes(e.key)) nextSlideAction = { dx: 0, dy: -1 };
            if (['ArrowDown', 's'].includes(e.key)) nextSlideAction = { dx: 0, dy: 1 };
            if (['ArrowLeft', 'a'].includes(e.key)) nextSlideAction = { dx: -1, dy: 0 };
            if (['ArrowRight', 'd'].includes(e.key)) nextSlideAction = { dx: 1, dy: 0 };
        } else {
            // 処理中の入力をバッファリング（次のターンへ即座に反映）
            switch (e.key) {
                case 'ArrowUp': case 'w': bufferedInput = { dx: 0, dy: -1 }; break;
                case 'ArrowDown': case 's': bufferedInput = { dx: 0, dy: 1 }; break;
                case 'ArrowLeft': case 'a': bufferedInput = { dx: -1, dy: 0 }; break;
                case 'ArrowRight': case 'd': bufferedInput = { dx: 1, dy: 0 }; break;
            }
        }
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

async function tryCharmEnemy() {
    // 演出：範囲をピンクに点滅させる
    tomeEffect = { active: true, x: player.x, y: player.y, range: 5, color: '#f472b6', endTime: performance.now() + 600 };
    // 演出が終わるまで待つ (同期的に draw が呼ばれるように draw() を呼びながら待機)
    const start = performance.now();
    while (performance.now() - start < 600) {
        draw();
        await new Promise(r => setTimeout(r, 50));
    }
    tomeEffect.active = false;

    let charmedCount = 0;
    const range = 5; // 以前の8から5に縮小
    const targets = new Set();

    // プレイヤーの周囲8マス以内の敵をすべてリストアップ
    enemies.forEach(e => {
        if (!e.isAlly && e.hp > 0) {
            let inRange = false;
            const distHead = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
            if (distHead <= range) {
                inRange = true;
            } else if (e.type === 'SNAKE' && e.body) {
                if (e.body.some(b => Math.abs(b.x - player.x) + Math.abs(b.y - player.y) <= range)) {
                    inRange = true;
                }
            }

            if (inRange) targets.add(e);
        }
    });

    if (targets.size > 0) {
        targets.forEach(enemy => {
            enemy.isAlly = true;
            spawnFloatingText(enemy.x, enemy.y, "CHARMED!!", "#60a5fa");
            charmedCount++;
        });
        addLog(`📜 Charmed ${charmedCount} enemies! They joined you!`);
        SOUNDS.CHARM();
        updateUI();
        return true;
    }

    addLog("No enemy in range to charm...");
    SOUNDS.DAMAGE(); // 失敗時の警告音
    setScreenShake(4, 100); // わずかに揺らす
    return false;
}

async function tryExplode() {
    // 演出：範囲を赤に点滅させる
    tomeEffect = { active: true, x: player.x, y: player.y, range: 5, color: '#ef4444', endTime: performance.now() + 600 };
    const start = performance.now();
    while (performance.now() - start < 600) {
        draw();
        await new Promise(r => setTimeout(r, 50));
    }
    tomeEffect.active = false;

    addLog("!!! EXPLOSION !!!");
    SOUNDS.EXPLODE();
    setScreenShake(20, 500);

    const range = 5;
    let hitCount = 0;

    // 範囲内の敵に大ダメージ
    for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dist = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
        if (dist <= range) {
            const dmg = 150 + (player.level * 10);
            e.hp -= dmg;
            e.flashUntil = performance.now() + 300;
            spawnDamageText(e.x, e.y, dmg, '#ef4444');
            hitCount++;
            if (e.hp <= 0) await handleEnemyDeath(e, true);
        }
    }

    // 設置ブロックも破壊
    for (let i = tempWalls.length - 1; i >= 0; i--) {
        const w = tempWalls[i];
        const dist = Math.abs(w.x - player.x) + Math.abs(w.y - player.y);
        if (dist <= range) {
            tempWalls.splice(i, 1);
        }
    }

    draw(); // 爆発結果（敵の消滅やブロック破壊）を即座に反映
    addLog(`The explosion caught ${hitCount} enemies!`);
    updateUI();
    return true;
}

function tryActivateShield() {
    player.isShielded = true;
    SOUNDS.SPEED_UP(); // 代用：上昇感のある音
    addLog("Recited the Guardian Tome! You are shielded from hazards!");
    spawnFloatingText(player.x, player.y, "SHIELD ACTIVE!!", "#4ade80");
    updateUI();
}

async function animateTomeRead() {
    isProcessing = true;
    SOUNDS.TOME_READ();
    const px = player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = player.y * TILE_SIZE + TILE_SIZE / 2;

    // まばゆい発光のためのパラメータ設定 (particlesは空にする)
    tomeAuraParams = { active: true, x: px, y: py, radius: 0, alpha: 1.0, particles: [] };

    const duration = 600; // まばゆく光る時間
    const startTime = performance.now();

    return new Promise(resolve => {
        function frame(now) {
            const elapsed = now - startTime;
            const p = Math.min(1, elapsed / duration);

            // alphaを滑らかに下げて消えていく
            tomeAuraParams.alpha = 1 - p;

            if (p < 1) {
                requestAnimationFrame(frame);
            } else {
                tomeAuraParams.active = false;
                isProcessing = false;
                resolve();
            }
        }
        requestAnimationFrame(frame);
    });
}

// 魔導書の使用コアロジックをリファクタリング（演出込み）
async function useHasteTome() {
    await animateTomeRead();
    player.hasteTomes--;
    player.isSpeeding = true;
    SOUNDS.SPEED_UP();
    addLog("Recited the Haste Tome! Your time accelerates!");
    spawnFloatingText(player.x, player.y, "ACCELERATED!!", "#38bdf8");
    updateUI();
}

async function useCharmTome() {
    await animateTomeRead();
    if (await tryCharmEnemy()) {
        player.charmTomes--;
        updateUI();
    }
}

async function useStealthTome() {
    await animateTomeRead();
    player.stealthTomes--;
    player.isStealth = true;
    SOUNDS.SPEED_UP();
    addLog("Recited the Stealth Tome! You vanished from sight!");
    spawnFloatingText(player.x, player.y, "INVISIBLE!!", "#94a3b8");
    updateUI();
}

async function useExplosionTome() {
    await animateTomeRead();
    if (await tryExplode()) {
        player.explosionTomes--;
        updateUI();
    }
}

async function useGuardianTome() {
    await animateTomeRead();
    player.guardianTomes--;
    tryActivateShield();
}

async function useHealTome() {
    await animateTomeRead();
    player.healTomes--;
    player.hp = player.maxHp;
    SOUNDS.HEAL();
    addLog("Recited the Heal Tome! HP fully restored!");
    spawnFloatingText(player.x, player.y, "FULL HEAL!!", "#4ade80");
    updateUI();
}

async function useEscapeTome() {
    await animateTomeRead();
    if (await tryEscape()) {
        player.escapeTomes--;
        updateUI();
    }
}

updateUI();
requestAnimationFrame(gameLoop);
addLog("Game Ready.");
