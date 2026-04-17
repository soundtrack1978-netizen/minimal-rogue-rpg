const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const logElement = document.getElementById('log');
const hpElement = document.getElementById('hp');
const lvElement = document.getElementById('lv');
const staminaBar = document.getElementById('stamina-bar');
const floorElement = document.getElementById('floor');
const statsBar = document.querySelector('.stats-bar');
const logRow = document.querySelector('.log-row');
statsBar.style.display = 'none';
logRow.style.display = 'none';

// 設定
const TILE_SIZE = 20;
const ROWS = 25;
const COLS = 40;
const DEEP_ENDING_FLOOR = 1801439850948191; // Theoretical max floor (ORC HP formula overflow)
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
    HEAL_TOME: '☤',
    BREAKER: 'W',
    LAYER: 'L',
    BREAKER_TOME: '⛏',
    MERCHANT: '＠',  // 遭難した冒険者（主人公と同じ記号、色違いで描画）
    FIRE_BLOCK: '▩', // 炎ブロック（攻撃すると攻撃方向に炎を発射）
    RING: '◎'       // フロアに落ちた指輪
};

const RINGS = [
  { id: 'FIRE_RING',     name: 'Fire Ring',     nameJa: '炎の指輪',     desc: 'Nullify lava & fire damage',           descJa: '溶岩・炎床のダメージを無効化',       cost: 200, symbol: '◎' },
  { id: 'POISON_RING',   name: 'Poison Ring',   nameJa: '毒の指輪',     desc: 'Halve poison stamina drain',           descJa: '毒沼のスタミナ減少を緩和',           cost: 120, symbol: '◎' },
  { id: 'CRITICAL_RING', name: 'Critical Ring', nameJa: '会心の指輪',   desc: 'Critical hit chance 10% -> 20%',       descJa: '会心の一撃の確率が2倍に',             cost: 250, symbol: '◎' },
  { id: 'STAMINA_RING',  name: 'Stamina Ring',  nameJa: '活力の指輪',   desc: 'Attack stamina cost 20 -> 12',         descJa: '攻撃時のスタミナ消費を軽減',         cost: 150, symbol: '◎' },
  { id: 'KNOCKBACK_RING',name: 'Knockback Ring', nameJa: '突風の指輪',  desc: 'Attacks push enemies back 1 tile',     descJa: '攻撃で敵を1マス押し戻す',             cost: 500, symbol: '◎' },
  { id: 'LIFE_RING',     name: 'Life Ring',     nameJa: '生命の指輪',   desc: 'Recover 1 HP every turn',              descJa: '毎ターンHP1回復',                     cost: 200, symbol: '◎' },
  { id: 'TOUGH_RING',    name: 'Tough Ring',    nameJa: '堅守の指輪',   desc: '+1 armor (damage reduction)',           descJa: '防御力+1（被ダメージ軽減）',          cost: 180, symbol: '◎' },
  { id: 'BREAKER_RING',  name: 'Breaker Ring',  nameJa: '壁壊しの指輪', desc: 'Break 1 wall when stamina is full (costs all stamina)', descJa: 'スタミナ満タン時に壁を1マス破壊（スタミナ全消費）', cost: 300, symbol: '◎' },
  { id: 'BOMB_RING',     name: 'Bomb Ring',     nameJa: '爆弾の指輪',   desc: 'Place bombs instead of blocks (explode in 5 turns)', descJa: 'ブロックの代わりに爆弾を設置（5ターンで爆発）', cost: 350, symbol: '◎' },
  { id: 'STEALTH_RING',    name: 'Stealth Ring',    nameJa: '隠密の指輪',   desc: 'Reduces enemy detection range (8 -> 5)',                    descJa: '敵の探知範囲を狭める（8→5）',                      cost: 220, symbol: '◎' },
  { id: 'ICE_BLOCK_RING',  name: 'Ice Block Ring',  nameJa: '氷塊の指輪',   desc: 'Place ice blocks that slide when attacked',                 descJa: '攻撃で滑る氷ブロックを設置',                         cost: 260, symbol: '◎' },
  { id: 'STAR_RING',       name: 'Star Ring',       nameJa: '星の指輪',     desc: 'Place star blocks that shoot flames when attacked',         descJa: '攻撃で炎を発射する星ブロックを設置',                  cost: 400, symbol: '◎' },
  { id: 'GOLEM_RING',     name: 'Golem Ring',      nameJa: 'ゴーレムの指輪', desc: 'At full stamina, attacks knock back enemies (Golem Smash!)', descJa: 'スタミナ満タン時の攻撃で敵を強制的に押し飛ばす',       cost: 450, symbol: '◎' },
  { id: 'NECRO_RING',     name: 'Necro Ring',      nameJa: '死者活性の指輪', desc: 'Enemies you defeat are revived as your allies',              descJa: '倒した敵が仲間として蘇る',                             cost: 700, symbol: '◎' },
];

// オープニング演出用データ
let openingData = {
    active: false,
    map: [],
    chars: [], // {x, y, symbol, color, facing}
    hole: { x: 0, y: 0 },
    timer: 0,
    messages: [] // {text, time}
};

let ringDrops = []; // フロアに落ちた指輪 {x, y, ringId}
let keyDropUnderTile = null; // holdsKey敵撃破時のキードロップ：元タイルを保存
let dragonTraps = []; // ドラゴンの召喚する罠 {x, y, stage: 'CIRCLE'|'READY'}
let fireFloors = []; // {x, y, life: 1} // 1ターンで消える炎の床
let flameProjectiles = []; // {x, y, dx, dy, life} - 炎ブロックが発射する飛翔体
let bombProjectiles = []; // {x, y, dx, dy} - 爆弾星ブロックが発射する飛翔爆弾
let wallDropCount = 0; // 壁破壊アイテムドロップのフロア内カウンター
let isXWallStage = false; // 壁の中からXが出てくるステージフラグ（1%確率）
let merchantState = null; // { x, y, facing: 'LEFT'|'RIGHT', jumpUntil: 0, nextAction: 0 }
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
    PLACE_BLOCK: () => {
        // ブロック設置音：低めの「ドン」という重い音
        const duration = 0.18;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + duration);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
        noise.start();
        // 低音の「ドン」
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + duration);
        g.gain.setValueAtTime(0.25, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    },
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
    COLOR_CHANGE: () => {
        // 「ぴろりん」という軽やかなチャイム音
        const now = audioCtx.currentTime;
        const notes = [1047, 1319, 1568]; // C6, E6, G6
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);
            gain.gain.setValueAtTime(0.15, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.25);
        });
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
    WIND_GUST: () => {
        // 「ひゅー」という高音の風音
        const duration = 0.8;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + duration * 0.6);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
        // ノイズで風感を追加
        const bufSize = Math.floor(audioCtx.sampleRate * duration);
        const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3000, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + duration);
        filter.Q.value = 2;
        const nGain = audioCtx.createGain();
        nGain.gain.setValueAtTime(0.0, audioCtx.currentTime);
        nGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.1);
        nGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        noise.connect(filter); filter.connect(nGain); nGain.connect(audioCtx.destination);
        noise.start(); noise.stop(audioCtx.currentTime + duration);
    },
    EXPLODE: () => {
        playSound(60, 'sawtooth', 0.4, 0.4);
        playSound(40, 'sawtooth', 0.4, 0.4);
        setTimeout(() => playSound(80, 'square', 0.2, 0.2), 30);
    },
    WALL_BREAK: () => {
        playSound(50, 'sawtooth', 0.35, 0.3);
        playSound(30, 'sawtooth', 0.35, 0.4);
        setTimeout(() => playSound(70, 'square', 0.15, 0.2), 50);
        setTimeout(() => playSound(100, 'sawtooth', 0.1, 0.15), 100);
    },
    BLOCK_PLACE: () => {
        playSound(800, 'square', 0.18, 0.15);
        setTimeout(() => playSound(600, 'square', 0.13, 0.1), 40);
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
    MIMIC_REVEAL: () => {
        // 不気味な正体暴露音（低音→高音の不協和スウィープ）
        const t = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(150, t);
        osc1.frequency.exponentialRampToValueAtTime(800, t + 0.3);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(200, t);
        osc2.frequency.exponentialRampToValueAtTime(600, t + 0.3);
        g.gain.setValueAtTime(0.15, t);
        g.gain.linearRampToValueAtTime(0, t + 0.3);
        osc1.connect(g); osc2.connect(g); g.connect(audioCtx.destination);
        osc1.start(t); osc1.stop(t + 0.3);
        osc2.start(t); osc2.stop(t + 0.3);
    },
    MIMIC_DISGUISE: () => {
        // 擬態復帰音（高音→低音のフェードアウト、ぬるっと消える感じ）
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
        g.gain.setValueAtTime(0.12, t);
        g.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.4);
    },
    SUMMON: () => {
        // 低音の広がるような不気味な召喚音
        const t = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, t);
        osc1.frequency.exponentialRampToValueAtTime(200, t + 0.5);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(120, t);
        osc2.frequency.exponentialRampToValueAtTime(60, t + 0.5);
        g.gain.setValueAtTime(0.15, t);
        g.gain.setValueAtTime(0.15, t + 0.2);
        g.gain.linearRampToValueAtTime(0, t + 0.5);
        osc1.connect(g); osc2.connect(g); g.connect(audioCtx.destination);
        osc1.start(t); osc1.stop(t + 0.5);
        osc2.start(t); osc2.stop(t + 0.5);
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


// BGMシステム
let bgmEnabled = true;
let bgmActive = false;
let bgmFadeTimer = null;
let bgmFadeInterval = null;
let bgmLastTrack = -1;
const BGM_PLAY_DURATION = 120000;
const BGM_FADE_DURATION = 30000;
const BGM_BASE_VOLUME = 0.4;
const BGM_TRACKS = [
    'bgm_hollow_temple_sky.mp3',
    'bgm_sky_over_the_high_pass.mp3',
    'bgm_black_temple_sky.mp3',
];

const bgmAudio = new Audio();
bgmAudio.loop = true;
bgmAudio.volume = BGM_BASE_VOLUME;

function pickBGMTrack() {
    const candidates = BGM_TRACKS.map((_, i) => i).filter(i => i !== bgmLastTrack);
    const idx = candidates[Math.floor(Math.random() * candidates.length)];
    bgmLastTrack = idx;
    return BGM_TRACKS[idx];
}

function startBGMFadeOut() {
    if (bgmFadeInterval) { clearInterval(bgmFadeInterval); bgmFadeInterval = null; }
    const steps = 60;
    let step = 0;
    bgmFadeInterval = setInterval(() => {
        step++;
        bgmAudio.volume = Math.max(0, BGM_BASE_VOLUME * (1 - step / steps));
        if (step >= steps) {
            clearInterval(bgmFadeInterval);
            bgmFadeInterval = null;
            bgmAudio.pause();
            bgmAudio.volume = BGM_BASE_VOLUME;
            bgmActive = false;
        }
    }, BGM_FADE_DURATION / steps);
}

function startBGM() {
    if (!bgmEnabled || bgmActive) return;
    bgmActive = true;
    bgmAudio.src = pickBGMTrack();
    bgmAudio.volume = BGM_BASE_VOLUME;
    bgmAudio.currentTime = 0;
    bgmAudio.play().catch(() => { bgmActive = false; });
    if (bgmFadeTimer) { clearTimeout(bgmFadeTimer); bgmFadeTimer = null; }
    bgmFadeTimer = setTimeout(startBGMFadeOut, BGM_PLAY_DURATION);
}

function stopBGM() {
    bgmActive = false;
    if (bgmFadeTimer) { clearTimeout(bgmFadeTimer); bgmFadeTimer = null; }
    if (bgmFadeInterval) { clearInterval(bgmFadeInterval); bgmFadeInterval = null; }
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio.volume = BGM_BASE_VOLUME;
}

function changeBGMTrack() {
    if (!bgmEnabled) return;
    if (bgmFadeTimer) { clearTimeout(bgmFadeTimer); bgmFadeTimer = null; }
    if (bgmFadeInterval) { clearInterval(bgmFadeInterval); bgmFadeInterval = null; }
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmActive = true;
    bgmAudio.src = pickBGMTrack();
    bgmAudio.volume = BGM_BASE_VOLUME;
    bgmAudio.play().catch(() => { bgmActive = false; });
    bgmFadeTimer = setTimeout(startBGMFadeOut, BGM_PLAY_DURATION);
}

function playBossBGM(src) {
    if (!bgmEnabled) return;
    if (bgmFadeTimer) { clearTimeout(bgmFadeTimer); bgmFadeTimer = null; }
    if (bgmFadeInterval) { clearInterval(bgmFadeInterval); bgmFadeInterval = null; }
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmActive = true;
    bgmAudio.src = src;
    bgmAudio.volume = BGM_BASE_VOLUME;
    bgmAudio.play().catch(() => { bgmActive = false; });
}

function toggleBGM() {
    bgmEnabled = !bgmEnabled;
    SOUNDS.SELECT();
    if (bgmEnabled && gameState === 'PLAYING') startBGM();
    else stopBGM();
}

// プレイヤーカラー
const PLAYER_COLORS = ['#ededed', '#fbbf24', '#4ade80', '#38bdf8', '#f472b6'];
let playerColorIndex = 0;

// ゲーム状態
let gameState = 'TITLE';
let titleSelection = 0;
let newGameConfirmSelection = 0; // 0=NO, 1=YES (for new game confirmation)
let menuSelection = 0; // 0: STATUS, 1: ITEMS
let inventorySelection = 0; // アイテム選択用
let statusPage = 0;
let shopSelection = 0;
let shopTab = 'BUY'; // 'BUY' or 'EQUIP'
let shopStock = []; // 商人のランダム品揃え（RINGS配列のインデックス3つ）
let shopConfirmSelection = 0; // 購入確認のYES/NO選択
let hasPurchasedFromMerchant = false; // 商人から購入したかどうか
let lastMerchantFloor = -99; // 直前に商人が出現したフロア（連続出現防止）
let ringEquipSelection = 0; // RINGS menu in MENU screen
let ringEquipPhase = 'SLOT'; // 'SLOT' = スロット選択中, 'RING' = 指輪選択中
let ringSlotSelection = 0;   // 選択中のスロット (0 or 1)
let ringScrollOffset = 0; // 指輪リストのスクロールオフセット
let nextSlideAction = null; // 氷の上で滑っている最中の入力を保持
let isIceFloor = false; // 現在のフロアが氷のフロアかどうか
let isWindFloor = false; // 突風の間
let isSanctuaryFloor = false; // 深層：聖域の階（全敵が友好的）
let windTimer = 0;
let windGustEndTime = 0; // 突風エフェクト終了時刻
let testFloor = 1;    // テストプレイ用の開始階層
let deepTestFloor = 101; // ディープテスト用の開始階層（101〜999）
let testModeVisible = false; // テストメニューの表示フラグ（秘密キーで解除）
let titleSecretBuffer = []; // 秘密キーシーケンス入力バッファ
const TITLE_SECRET_SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown']; // ↑↑↓↓
let familyIdCounter = 0; // 敵ファミリーID採番用
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
    poisonStagger: false,
    isInfiniteStamina: false,
    breakerTomes: 0,
    isBreaker: false,
    gold: 0,
    ownedRings: [],
    equippedRings: [null, null]
};
let enemies = [];
let wisps = []; // {x, y, dirIndex} - 無敵の障害物
let movingFairies = []; // {x, y, screenX, screenY} - マルチスクリーン用自律移動妖精
let movingMadmen = []; // {x, y, screenX, screenY, hp, ...} - マルチスクリーン追跡狂人
let floorLevel = 1;
let maxReachedFloor = 1; // 最高到達階層
let pendingF4Tutorial = false;
let pendingF4BreakerTutorial = false; // 4FでBREAKERが壁を壊したら次のhandleActionで表示
let damageTexts = [];
let attackLines = [];
let tempWalls = []; // {x, y, hp}
let bombs = []; // {x, y, timer, hp}
let blastEffects = []; // {tiles: [{x,y}], endTime: number} - 爆風エフェクト
let isProcessing = false;
let bufferedInput = null; // { dx, dy } 次のターンの入力バッファ
let turnCount = 0;
let floorTurnCount = 0; // フロア内ターン数（フロア遷移ごとにリセット）
let isPlayerVisible = true;
let tomeAuraParams = { active: false, x: 0, y: 0, radius: 0, alpha: 0, particles: [] };
let isSpacePressed = false;
let spaceUsedForBlock = false; // 今回のスペース押下でブロックを置いたかフラグ
let gameOverAlpha = 0;
let storyMessage = null; // { lines: [], alpha: 0, showNext: false }
let isTutorialInputActive = false; // チュートリアル入力待ちフラグ
let endingSkipLock = false; // エンディング中のスキップ防止フラグ
let hasShownStage1Tut = false; // 1階スタミナチュートリアル済みフラグ
let hasShownGoldTut = false; // 黄色い敵의テキスト表示済みフラグ
let hasShownSaveTut = false; // はじめてのセーブ時のテキストフラグ
let hasShownFairyTut = false; // はじめての妖精との出会いフラグ
let hasShownTomeTut = false; // はじめての魔導書入手フラグ
let hasShownEquipTut = false; // はじめての装備品（剣・盾）入手フラグ
let hasShownGolemTut = false; // はじめてGに接近した時のチュートリアルフラグ
let hasShownMerchantEpilogue = false; // 10F商人の買い物後テキスト表示済みフラグ
let merchantPatternIndex = -1; // 10F商人の選択された会話パターン
const MERCHANT_PATTERNS = [
    { // パターン①
        intro: [
            ["傷ついた冒険者の男がいる。", "腹部を押さえ、血のにじむ手でこちらを見上げた。", "あなたに気づくと、弱々しく笑った。"],
            ["「……おまえも、迷ったのか？", "なあ、金をくれよ。", "これと交換だ……ちゃんとした品だぜ……」"]
        ],
        epilogue: [
            ["「ありがとうよ……", "これで、向こうに渡れる……」"],
            ["男はその金を、自分の亡骸に持たせるつもりらしい。"]
        ]
    },
    { // パターン②
        intro: [
            ["倒れ込んだ冒険者が、床を掻いている。", "何かを探すように、指先が震えている。", "あなたを見ると、必死に声を絞り出した。"],
            ["「金……持ってるだろ……？", "頼む……少しでいい……", "これ、やるから……だから……」"]
        ],
        epilogue: [
            ["「……間に合った……", "これで、置いていかれずにすむ……」"],
            ["死者の列に加わるには、支払いが必要だとされている。", "持たぬ者は、岸辺に取り残されるのだ。"]
        ]
    },
    { // パターン③
        intro: [
            ["壁にもたれた老いた冒険者がいる。", "呼吸は浅く、目だけがはっきりとあなたを捉えている。"],
            ["「……ひとつ、頼みがある。", "金を、いくらか分けてくれ。", "礼はする……これを持っていけ……」"]
        ],
        epilogue: [
            ["「助かった……これで、恥をかかずに済む……」"]
        ]
    },
    { // パターン④
        intro: [
            ["横たわる冒険者がいる。", "もう立ち上がる力も残っていないようだ。", "あなたの足音に、ゆっくりと目を開いた。"],
            ["「ああ、人だ……", "なあ、金をくれないか。", "代わりに、これを持っていけ……」"]
        ],
        epilogue: [
            ["「悪いな……", "これで、もう、準備はいい……」"],
            ["死を前にした者は、自らの旅支度を整えるという。", "金は、その最後の品のひとつだ。"]
        ]
    },
    { // パターン⑤
        intro: [
            ["笑っている冒険者がいる。", "しかしその目は焦点が合っていない。"],
            ["「はは……　来た来た……　客だ……", "なあ、金をくれよ。", "そうしないと……　渡れないんだ……」"]
        ],
        epilogue: [
            ["「はは……　これでいい……", "いつでも、あの世に行ける……」"],
            ["死者の国に入れなければ、アンデッドとして彷徨うことになるのだ。"]
        ]
    },
    { // パターン⑥
        intro: [
            ["若い冒険者が、壁に寄りかかって座っている。", "あなたを見ると、どこか安心したように息をついた。"],
            ["「……よかった、誰か来てくれた。", "少しだけ金を分けてくれないか。", "これ、置いていくからさ……」"]
        ],
        epilogue: [
            ["「ありがとう……", "これで、死者の国に行ける……」"],
            ["死者の国への船賃が無い場合、アンデッドとして彷徨うことになる。", "本当かどうかは、わからない。"]
        ]
    }
];
let dungeonCore = null; // {x, y, hp}
let hasSpawnedDragon = false; // ドラゴンが出現したか
let hasSpawnedGoldOn100 = false; // 100階でGOLDが出現したか

let transition = { active: false, text: "", alpha: 0, mode: 'FADE', playerY: 0, particles: [], flashAlpha: 0 };
let screenShake = { x: 0, y: 0, until: 0 };

// マルチスクリーンマップ（90-99F ゼルダ式画面切替）
let multiScreenMode = false;
let screenGrid = null;               // { maps: [N][N], enemies: [N][N], wisps: [N][N] }
let currentScreen = { x: 0, y: 0 };
let screenGridSize = 2;

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
        player.breakerTomes = data.breakerTomes || 0;
        player.isBreaker = data.isBreaker || false;
        player.isSpeeding = data.isSpeeding || false;
        player.isShielded = data.isShielded || false;
        player.isExtraTurn = data.isExtraTurn || false;
        player.hasWand = data.hasWand || false;
        player.totalKills = data.totalKills || 0;
        player.fairyCount = data.fairyCount || 0;
        player.gold = data.gold || 0;
        player.ownedRings = data.ownedRings || [];
        player.equippedRings = data.equippedRings || [null, null];
        floorLevel = data.floorLevel || 1;
        maxReachedFloor = data.maxReachedFloor || floorLevel;

        // チュートリアル表示済みフラグの復元
        if (data.hasShownStage1Tut) hasShownStage1Tut = true;
        if (data.hasShownGoldTut) hasShownGoldTut = true;
        if (data.hasShownSaveTut) hasShownSaveTut = true;
        if (data.hasShownFairyTut) hasShownFairyTut = true;
        if (data.hasShownTomeTut) hasShownTomeTut = true;
        if (data.hasShownEquipTut) hasShownEquipTut = true;
        if (data.hasShownGolemTut) hasShownGolemTut = true;

        // マップ・敵・フロア状態はコンティニュー時に再生成するためここでは復元しない
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

    // クリア済みの階層（1〜現在-1）からランダムに選ぶ
    const clearedFloors = [];
    for (let f = 1; f < floorLevel; f++) clearedFloors.push(f);
    if (clearedFloors.length === 0) {
        addLog("No cleared floors to escape to!");
        return false;
    }
    const targetFloor = clearedFloors[Math.floor(Math.random() * clearedFloors.length)];

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
    ghost.style.color = '#ededed';
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
    // オートセーブ：フロア開始時のプレイヤー状態のみ保存。
    // マップ・敵はコンティニュー時に再生成するので保存不要。
    const data = {
        // プレイヤーの基本ステータス
        level: player.level,
        exp: player.exp,
        nextExp: player.nextExp,
        hp: player.hp,
        maxHp: player.maxHp,
        stamina: player.stamina,

        // 所持品（フロア開始時点）
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
        breakerTomes: player.breakerTomes,
        hasWand: player.hasWand,
        totalKills: player.totalKills,
        fairyCount: player.fairyCount,
        gold: player.gold,
        ownedRings: player.ownedRings,
        equippedRings: player.equippedRings,

        // 開始階層
        floorLevel: floorLevel,
        maxReachedFloor: maxReachedFloor,

        // チュートリアル表示済みフラグ
        hasShownStage1Tut: hasShownStage1Tut,
        hasShownGoldTut: hasShownGoldTut,
        hasShownSaveTut: hasShownSaveTut,
        hasShownFairyTut: hasShownFairyTut,
        hasShownTomeTut: hasShownTomeTut,
        hasShownEquipTut: hasShownEquipTut,
        hasShownGolemTut: hasShownGolemTut,
    };
    localStorage.setItem('minimal_rogue_save', JSON.stringify(data));
    // オートセーブは無音・無表示で行う
}

function updateUI() {
    // LIFE_RING: 毎ターンHP+1回復
    if (hasRing('LIFE_RING') && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + 1);
    }
    // 爆弾のターン経過処理
    bombs.forEach(b => b.timer--);
    let hasDetonation = true;
    while (hasDetonation) {
        hasDetonation = false;
        const readyBombs = bombs.filter(b => b.timer <= 0);
        for (const bomb of readyBombs) {
            if (bombs.includes(bomb)) {
                detonateBomb(bomb);
                hasDetonation = true;
            }
        }
    }
    // 突風の間: windTimerのカウントのみ（実際のスライドはwindGustSlide()で行う）
    if (isWindFloor) {
        windTimer++;
        if (windTimer === 4) addLog("The wind is picking up...");
    }
    isPlayerVisible = true; // 確実に表示状態にする
    hpElement.innerText = `${player.hp}/${player.maxHp}`;
    if (player.isShielded) {
        hpElement.style.color = '#4ade80'; // 守護状態は緑色に
    } else if (player.isBreaker) {
        hpElement.style.color = '#f59e0b'; // 壁破壊状態はオレンジに
    } else {
        hpElement.style.color = '#ededed';
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
    lvElement.style.color = '#ededed';
    const bestFloorEl = document.getElementById('best-floor');
    if (bestFloorEl) bestFloorEl.innerText = `B${maxReachedFloor}F`;
    if (floorLevel === 100) {
        floorElement.innerText = "LAST FLOOR";
    } else if (floorLevel >= 101) {
        floorElement.innerText = `DEEP ${floorLevel} [${currentScreen.x},${currentScreen.y}]`;
    } else if (multiScreenMode) {
        floorElement.innerText = `${floorLevel}/100`;
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

    // 妖精はインベントリ表示に移動したためstats-barには表示しない
    const fairyNode = document.getElementById('fairy-status');
    if (fairyNode) fairyNode.innerHTML = "";

    // ゴールド表示
    const goldNode = document.getElementById('gold-status');
    if (goldNode) {
        goldNode.innerText = player.gold > 0 ? `${player.gold}G` : '';
    }
}

function initMap() {
    map = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
    enemies = [];
    damageTexts = [];
    attackLines = [];
    tempWalls = []; // 設置ブロックをリセット
    fireFloors = []; // 炎の床をリセット
    flameProjectiles = []; // 炎の飛翔体をリセット
    dragonTraps = []; // ドラゴントラップをリセット
    ringDrops = []; // フロアの指輪ドロップをリセット
    keyDropUnderTile = null; // キードロップ元タイルをリセット
    bombs = []; // 爆弾をリセット
    blastEffects = []; // 爆風エフェクトをリセット
    isWindFloor = false; windTimer = 0;
    isSanctuaryFloor = false;
    wisps = []; // ウィルをリセット
    movingFairies = []; // 妖精をリセット
    movingMadmen = []; // 狂人をリセット
    player.hasKey = false;
    player.isStealth = false; // フロア移動で解除
    player.isInfiniteStamina = false; // フロア移動で解除
    wallDropCount = 0; // 壁破壊ドロップカウンターリセット
    floorTurnCount = 0; // フロア内ターン数リセット
    isXWallStage = Math.random() < 0.01; // 1%の確率でXが壁から出るステージ
    shopStock = []; // 商人の品揃えリセット（次の商人接触時に生成）
    merchantState = null; // 商人状態リセット
    hasPurchasedFromMerchant = false; // 購入フラグリセット
    hasShownMerchantEpilogue = false; // エピローグ表示フラグリセット
    merchantPatternIndex = -1; // 会話パターンリセット
    player.isBreaker = false; // フロア移動で解除
    dungeonCore = null;
    hasSpawnedDragon = false;
    hasSpawnedGoldOn100 = false;
    multiScreenMode = false;
    screenGrid = null;

    // 商人出現判定 (約15階おき: 10F, 25F, 40F, 55F, 70F, 85F確定、±2Fは30%の確率)
    // ただし直前の商人出現から5F以内は出現しない
    const merchantBaseFloors = [10, 25, 40, 55, 70, 85];
    const isExactMerchantFloor = merchantBaseFloors.includes(floorLevel);
    const isNearMerchantFloor = !isExactMerchantFloor && merchantBaseFloors.some(mf => Math.abs(floorLevel - mf) <= 2);
    const merchantCooldownOk = (floorLevel - lastMerchantFloor) >= 5;
    const isMerchantFloor = floorLevel >= 10 && floorLevel < 100 && merchantCooldownOk && (isExactMerchantFloor || (isNearMerchantFloor && Math.random() < 0.3));

    // --- MULTI-SCREEN FLOOR (Floor 50+: 固定ステージ以外 / 101F+: DEEP TEST 10x10) ---
    const fixedStageFloors = [50, 53, 57, 63, 66, 70, 75, 77, 80, 83, 85, 86, 88, 93, 99, 100];
    if ((floorLevel >= 50 && floorLevel < 100 && !fixedStageFloors.includes(floorLevel)) || floorLevel >= 101) {
        multiScreenMode = true;
        if (floorLevel >= 101) {
            screenGridSize = 10;
            addLog("🌀 DEEP ZONE: 10x10 MEGA LABYRINTH!");
            addLog("KEY and EXIT are hidden somewhere in the 100 screens. Good luck.");
        } else {
            screenGridSize = (floorLevel === 99) ? 4 : (floorLevel >= 90) ? 3 : 2;
            addLog("⚠️ DANGER ZONE: Multi-screen labyrinth!");
            addLog(`Explore ${screenGridSize}x${screenGridSize} screens to find the KEY and EXIT.`);
        }

        // N×N画面分のマップ・敵・ウィスプを格納するグリッドを初期化
        screenGrid = {
            maps: Array.from({ length: screenGridSize }, () =>
                Array.from({ length: screenGridSize }, () => null)),
            enemies: Array.from({ length: screenGridSize }, () =>
                Array.from({ length: screenGridSize }, () => [])),
            wisps: Array.from({ length: screenGridSize }, () =>
                Array.from({ length: screenGridSize }, () => [])),
            tempWalls: Array.from({ length: screenGridSize }, () =>
                Array.from({ length: screenGridSize }, () => [])),
            wind: Array.from({ length: screenGridSize }, () =>
                Array.from({ length: screenGridSize }, () => false))
        };
        // 深層テーマ: 101F+でフロアごとにランダムに変化するパラメータセット
        let deepTheme = null;
        if (floorLevel >= 101) {
            const _tw = (() => {
                const r = Math.random();
                if (r < 0.18) return { maze: 0.70, dungeon: 0.10, castle: 0.10, breaker: 0.10 };
                if (r < 0.36) return { maze: 0.05, dungeon: 0.10, castle: 0.75, breaker: 0.10 };
                if (r < 0.52) return { maze: 0.05, dungeon: 0.05, castle: 0.10, breaker: 0.80 };
                if (r < 0.65) return { maze: 0.10, dungeon: 0.70, castle: 0.10, breaker: 0.10 };
                return { maze: 0.25, dungeon: 0.25, castle: 0.25, breaker: 0.25 };
            })();
            const _rs = Math.random(), _ss = Math.random();
            // 敵の出現比率（累積閾値: TURRET / TURRET+ORC / TURRET+ORC+BREAKER）
            const _eStyle = Math.floor(Math.random() * 5);
            const _eT = [
                [0.30, 0.60, 0.80], // 強敵混合
                [0.03, 0.08, 0.73], // BREAKER支配
                [0.50, 0.55, 0.60], // TURRET要塞
                [0.03, 0.68, 0.73], // ORC軍団
                [0.10, 0.30, 0.55], // バランス型
            ][_eStyle];
            // 迷路複雑度: 壁スキップ率（低いほど狭く複雑、高いほど広く単純）
            const _mc = Math.random();
            const _mazeWallSkip = _mc < 0.33 ? 0.04 + Math.random() * 0.06   // 0.04〜0.10: 高密度迷路
                                : _mc < 0.66 ? 0.12 + Math.random() * 0.08   // 0.12〜0.20: 標準
                                :              0.25 + Math.random() * 0.20;   // 0.25〜0.45: 開放的
            deepTheme = {
                screenTypeWeights: _tw,
                bizarreChance:     0.05 + Math.random() * 0.50,
                roomCountMin: _rs < 0.33 ? 3 : _rs < 0.66 ? 7 : 13,
                roomCountMax: _rs < 0.33 ? 6 : _rs < 0.66 ? 11 : 19,
                roomWMin: _ss < 0.33 ? 3 : _ss < 0.66 ? 4 : 7,
                roomWMax: _ss < 0.33 ? 6 : _ss < 0.66 ? 9 : 14,
                roomHMin: _ss < 0.33 ? 2 : _ss < 0.66 ? 4 : 5,
                roomHMax: _ss < 0.33 ? 4 : _ss < 0.66 ? 7 : 10,
                monsterRoomChance: 0.10 + Math.random() * 0.65,
                eT1: _eT[0], eT2: _eT[1], eT3: _eT[2],
                familyChance: 0.01 + Math.random() * 0.20,
                madmanChance: 0.05 + Math.random() * 0.85,
                windChance:   Math.random() * 0.12,
                mazeWallSkip: _mazeWallSkip,
                isSanctuaryFloor: Math.random() < 0.001, // 0.1%の確率で聖域フロア
            };
        }
        // 画面ごとに異なる生成パラメータ（4種類のバリエーション）を事前生成
        let screenThemes = null;
        if (deepTheme) {
            screenThemes = Array.from({ length: 4 }, () => {
                const _rs = Math.random(), _ss = Math.random();
                const _eStyle = Math.floor(Math.random() * 5);
                const _eT = [
                    [0.30, 0.60, 0.80], // 強敵混合
                    [0.03, 0.08, 0.73], // BREAKER支配
                    [0.50, 0.55, 0.60], // TURRET要塞
                    [0.03, 0.68, 0.73], // ORC軍団
                    [0.10, 0.30, 0.55], // バランス型
                ][_eStyle];
                const _mc = Math.random();
                const _mwSkip = _mc < 0.33 ? 0.04 + Math.random() * 0.06
                              : _mc < 0.66 ? 0.12 + Math.random() * 0.08
                              :              0.25 + Math.random() * 0.20;
                return Object.assign({}, deepTheme, {
                    bizarreChance:     0.05 + Math.random() * 0.50,
                    roomCountMin: _rs < 0.33 ? 3  : _rs < 0.66 ? 7  : 13,
                    roomCountMax: _rs < 0.33 ? 6  : _rs < 0.66 ? 11 : 19,
                    roomWMin: _ss < 0.33 ? 3 : _ss < 0.66 ? 4 : 7,
                    roomWMax: _ss < 0.33 ? 6 : _ss < 0.66 ? 9 : 14,
                    roomHMin: _ss < 0.33 ? 2 : _ss < 0.66 ? 4 : 5,
                    roomHMax: _ss < 0.33 ? 4 : _ss < 0.66 ? 7 : 10,
                    monsterRoomChance: 0.10 + Math.random() * 0.65,
                    eT1: _eT[0], eT2: _eT[1], eT3: _eT[2],
                    familyChance: 0.01 + Math.random() * 0.20,
                    mazeWallSkip: _mwSkip,
                });
            });
        }
        // 各画面ごとに突風を発生させる（60〜69階は75%、101F+はテーマで変動、それ以外は3%）
        const multiWindChance = (floorLevel >= 101 && deepTheme) ? deepTheme.windChance
            : (floorLevel >= 60 && floorLevel <= 69) ? 0.75 : 0.03;
        for (let sy = 0; sy < screenGridSize; sy++) {
            for (let sx = 0; sx < screenGridSize; sx++) {
                screenGrid.wind[sy][sx] = Math.random() < multiWindChance;
            }
        }
        // スタート画面(0,0)は通常風なし（60〜69階は高確率なので適用する）
        if (!(floorLevel >= 60 && floorLevel <= 69)) {
            screenGrid.wind[0][0] = false;
        }

        // ヘルパー: 1画面分のダンジョンを生成（screenType: 'maze'=迷路型, 'dungeon'=通常ダンジョン型, 'breaker'=壁掘り型）
        function generateOneScreen(sx, sy, screenType, screenTheme) {
            const sMap = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
            const sEnemies = [];
            const sWisps = [];
            const sTempWalls = [];
            const rooms = [];

            if (screenType === 'breaker') {
                // === 壁掘り型（80階方式）: 全面壁 + BREAKERが掘り進む ===

                // 通路入口付近に小さな床エリアを確保（3x3）
                const entryPoints = [];
                if (sx > 0) entryPoints.push({ x: 3, y: 12 }); // 左通路から
                if (sx < screenGridSize - 1) entryPoints.push({ x: COLS - 4, y: 12 }); // 右通路から
                if (sy > 0) entryPoints.push({ x: 19, y: 3 }); // 上通路から
                if (sy < screenGridSize - 1) entryPoints.push({ x: 19, y: ROWS - 4 }); // 下通路から
                // 通路がない場合のフォールバック
                if (entryPoints.length === 0) entryPoints.push({ x: 3, y: 3 });

                for (const ep of entryPoints) {
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ey = ep.y + dy, ex = ep.x + dx;
                            if (ey >= 1 && ey < ROWS - 1 && ex >= 1 && ex < COLS - 1) {
                                sMap[ey][ex] = SYMBOLS.FLOOR;
                            }
                        }
                    }
                    // roomsに登録（通路接続・到達性チェック用）
                    rooms.push({ x: ep.x - 1, y: ep.y - 1, w: 3, h: 3, cx: ep.x, cy: ep.y });
                }

                // 壁の中に1マス空間を作るヘルパー
                const findTrappedCell = (minDist) => {
                    for (let t = 0; t < 100; t++) {
                        const cx = Math.floor(Math.random() * (COLS - 6)) + 3;
                        const cy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                        if (sMap[cy][cx] !== SYMBOLS.WALL) continue;
                        if (sMap[cy-1][cx] !== SYMBOLS.WALL || sMap[cy+1][cx] !== SYMBOLS.WALL ||
                            sMap[cy][cx-1] !== SYMBOLS.WALL || sMap[cy][cx+1] !== SYMBOLS.WALL) continue;
                        // 入口エリアから十分離れているか
                        let tooClose = false;
                        for (const ep of entryPoints) {
                            if (Math.abs(cx - ep.x) + Math.abs(cy - ep.y) < minDist) { tooClose = true; break; }
                        }
                        if (tooClose) continue;
                        return { x: cx, y: cy };
                    }
                    return null;
                };

                // 敵を壁の中に閉じ込める（NORMAL 6体）
                for (let i = 0; i < 6; i++) {
                    const pos = findTrappedCell(5);
                    if (!pos) continue;
                    sMap[pos.y][pos.x] = SYMBOLS.FLOOR;
                    sEnemies.push({ type: 'NORMAL', x: pos.x, y: pos.y, hp: 3 + floorLevel, maxHp: 3 + floorLevel, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0 });
                }
                // FROST 2体
                for (let i = 0; i < 2; i++) {
                    const pos = findTrappedCell(5);
                    if (!pos) continue;
                    sMap[pos.y][pos.x] = SYMBOLS.FLOOR;
                    sEnemies.push({ type: 'FROST', x: pos.x, y: pos.y, hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15, stunTurns: 0 });
                }
                // BLAZE 2体
                for (let i = 0; i < 2; i++) {
                    const pos = findTrappedCell(5);
                    if (!pos) continue;
                    sMap[pos.y][pos.x] = SYMBOLS.FLOOR;
                    sEnemies.push({ type: 'BLAZE', x: pos.x, y: pos.y, hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15, stunTurns: 0 });
                }
                // ORC 1体
                {
                    const pos = findTrappedCell(5);
                    if (pos) {
                        sMap[pos.y][pos.x] = SYMBOLS.FLOOR;
                        sEnemies.push({ type: 'ORC', x: pos.x, y: pos.y, hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0 });
                    }
                }

                // アイテムを壁の中に閉じ込める（妖精は通行可能な床に配置）
                const trappedItems = [
                    SYMBOLS.SWORD, SYMBOLS.ARMOR,
                    SYMBOLS.SPEED, SYMBOLS.HEAL_TOME
                ];
                for (const item of trappedItems) {
                    const pos = findTrappedCell(3);
                    if (!pos) continue;
                    sMap[pos.y][pos.x] = item;
                }
                // 妖精は通路端の床に配置（壁に閉じ込めない）
                for (let tries = 0; tries < 100; tries++) {
                    const fx2 = Math.floor(Math.random() * (COLS - 4)) + 2;
                    const fy2 = Math.floor(Math.random() * (ROWS - 4)) + 2;
                    if (sMap[fy2][fx2] === SYMBOLS.FLOOR) { sMap[fy2][fx2] = SYMBOLS.FAIRY; break; }
                }

                // BREAKER を配置（入口付近に1体 + 壁の中にランダム3体）
                // 入口付近
                const mainEntry = entryPoints[0];
                const breakerNearEntry = { x: mainEntry.x + 1, y: mainEntry.y + 1 };
                if (breakerNearEntry.x >= 1 && breakerNearEntry.x < COLS - 1 && breakerNearEntry.y >= 1 && breakerNearEntry.y < ROWS - 1) {
                    sMap[breakerNearEntry.y][breakerNearEntry.x] = SYMBOLS.FLOOR;
                    sEnemies.push({ type: 'BREAKER', x: breakerNearEntry.x, y: breakerNearEntry.y, hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });
                }
                // 壁の中にランダム配置
                for (let i = 0; i < 3; i++) {
                    let bx, by, tries = 0;
                    do {
                        bx = Math.floor(Math.random() * (COLS - 4)) + 2;
                        by = Math.floor(Math.random() * (ROWS - 4)) + 2;
                        tries++;
                    } while (tries < 200 && (sMap[by][bx] !== SYMBOLS.WALL || sEnemies.some(en => en.x === bx && en.y === by)));
                    if (tries >= 200) continue;
                    sMap[by][bx] = SYMBOLS.FLOOR;
                    sEnemies.push({ type: 'BREAKER', x: bx, y: by, hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });
                }

                // ウィスプは少なめ（壁の中なので意味が薄い）
                for (let i = 0; i < 2; i++) {
                    const pos = findTrappedCell(3);
                    if (!pos) continue;
                    sWisps.push({ x: pos.x, y: pos.y, dir: Math.floor(Math.random() * 4), mode: 'STRAIGHT' });
                }

            } else if (screenType === 'maze') {
                // === 迷路型（77階方式） ===
                // 全面を床にする
                for (let y = 1; y < ROWS - 1; y++) {
                    for (let x = 1; x < COLS - 1; x++) {
                        sMap[y][x] = SYMBOLS.FLOOR;
                    }
                }
                // 部屋の生成（迷路の中の開けた空間）
                const _mRCMin = screenTheme ? screenTheme.roomCountMin : 5;
                const _mRCMax = screenTheme ? screenTheme.roomCountMax : 7;
                const _mRWMin = screenTheme ? screenTheme.roomWMin : 4, _mRWMax = screenTheme ? screenTheme.roomWMax : 8;
                const _mRHMin = screenTheme ? screenTheme.roomHMin : 4, _mRHMax = screenTheme ? screenTheme.roomHMax : 6;
                const roomCount = _mRCMin + Math.floor(Math.random() * (_mRCMax - _mRCMin + 1));
                for (let i = 0; i < roomCount; i++) {
                    const w = _mRWMin + Math.floor(Math.random() * (_mRWMax - _mRWMin + 1));
                    const h = _mRHMin + Math.floor(Math.random() * (_mRHMax - _mRHMin + 1));
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
                        if (Math.random() < (screenTheme ? screenTheme.mazeWallSkip : 0.15)) continue;
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
            } else if (screenType === 'castle') {
                // === お城型（間取り図風: 矩形部屋 + 1マス幅廊下） ===
                const MIN_SEP = 2; // 部屋間の最小壁間隔
                const castleRooms = [];

                const _cRMax = screenTheme ? screenTheme.roomCountMax : 10;
                const _cRWMin = screenTheme ? screenTheme.roomWMin : 4, _cRWMax = screenTheme ? screenTheme.roomWMax : 10;
                const _cRHMin = screenTheme ? screenTheme.roomHMin : 3, _cRHMax = screenTheme ? screenTheme.roomHMax : 7;
                for (let attempt = 0; attempt < 400 && castleRooms.length < _cRMax; attempt++) {
                    const rw = _cRWMin + Math.floor(Math.random() * (_cRWMax - _cRWMin + 1));
                    const rh = _cRHMin + Math.floor(Math.random() * (_cRHMax - _cRHMin + 1));
                    const rx = 2 + Math.floor(Math.random() * (COLS - rw - 4));
                    const ry = 2 + Math.floor(Math.random() * (ROWS - rh - 4));
                    const overlaps = castleRooms.some(r =>
                        rx < r.x + r.w + MIN_SEP && rx + rw + MIN_SEP > r.x &&
                        ry < r.y + r.h + MIN_SEP && ry + rh + MIN_SEP > r.y
                    );
                    if (overlaps) continue;
                    castleRooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) });
                }

                // 部屋を床にする
                for (const r of castleRooms) {
                    for (let py = r.y; py < r.y + r.h; py++)
                        for (let px = r.x; px < r.x + r.w; px++)
                            sMap[py][px] = SYMBOLS.FLOOR;
                    rooms.push({ x: r.x, y: r.y, w: r.w, h: r.h, cx: r.cx, cy: r.cy });
                }

                // 最小スパニングツリーで1マス幅L字廊下を接続
                if (castleRooms.length > 1) {
                    const inTree = new Set([0]);
                    while (inTree.size < castleRooms.length) {
                        let bestA = -1, bestB = -1, bestD = Infinity;
                        for (const ai of inTree) {
                            for (let bi = 0; bi < castleRooms.length; bi++) {
                                if (inTree.has(bi)) continue;
                                const d = Math.abs(castleRooms[ai].cx - castleRooms[bi].cx) + Math.abs(castleRooms[ai].cy - castleRooms[bi].cy);
                                if (d < bestD) { bestD = d; bestA = ai; bestB = bi; }
                            }
                        }
                        if (bestA < 0) break;
                        // L字廊下（縦先か横先をランダム）
                        const ra = castleRooms[bestA], rb = castleRooms[bestB];
                        let cpx = ra.cx, cpy = ra.cy;
                        if (Math.random() < 0.5) {
                            while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) sMap[cpy][cpx] = SYMBOLS.FLOOR; }
                            while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) sMap[cpy][cpx] = SYMBOLS.FLOOR; }
                        } else {
                            while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) sMap[cpy][cpx] = SYMBOLS.FLOOR; }
                            while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) sMap[cpy][cpx] = SYMBOLS.FLOOR; }
                        }
                        inTree.add(bestB);
                    }
                }
                // 追加通路（ランダムに2本）
                for (let k = 0; k < 2; k++) {
                    if (castleRooms.length < 2) break;
                    const ra = castleRooms[Math.floor(Math.random() * castleRooms.length)];
                    const rb = castleRooms[Math.floor(Math.random() * castleRooms.length)];
                    if (ra === rb) continue;
                    let cpx = ra.cx, cpy = ra.cy;
                    while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) sMap[cpy][cpx] = SYMBOLS.FLOOR; }
                    while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) sMap[cpy][cpx] = SYMBOLS.FLOOR; }
                }

                // 各部屋にモンスター配置（一部はモンスタールーム）
                for (let ri = 0; ri < castleRooms.length; ri++) {
                    const cr = castleRooms[ri];
                    const _cMRC = screenTheme ? screenTheme.monsterRoomChance : 0.35;
                    const isMonsterRoom = Math.random() < _cMRC;
                    const count = isMonsterRoom
                        ? 3 + Math.floor(Math.random() * 3)  // 3〜5体
                        : Math.random() < 0.5 ? 0 : 1;       // 通常は0か1体
                    // 家族グループの判定（101F以上・テーマで変動）
                    const _cFC = screenTheme ? screenTheme.familyChance : 0.05;
                    const roomFamilyId = (floorLevel >= 101 && Math.random() < _cFC) ? familyIdCounter++ : null;
                    for (let ei = 0; ei < count; ei++) {
                        // 部屋内のランダムな床タイルを探す
                        let ex, ey, found = false;
                        for (let t = 0; t < 30; t++) {
                            ex = cr.x + 1 + Math.floor(Math.random() * (cr.w - 2));
                            ey = cr.y + 1 + Math.floor(Math.random() * (cr.h - 2));
                            if (sMap[ey][ex] === SYMBOLS.FLOOR && !sEnemies.some(e => e.x === ex && e.y === ey)) { found = true; break; }
                        }
                        if (!found) continue;
                        const roll = Math.random();
                        const _ct1 = screenTheme ? screenTheme.eT1 : 0.10;
                        const _ct2 = screenTheme ? screenTheme.eT2 : 0.25;
                        const _ct3 = screenTheme ? screenTheme.eT3 : 0.38;
                        if (roll < _ct1) {
                            let bestDir = 0, maxDist = -1;
                            for (let d = 0; d < 4; d++) {
                                const ddx = [0,1,0,-1][d], ddy = [-1,0,1,0][d];
                                let dist = 0, tx2 = ex+ddx, ty2 = ey+ddy;
                                while (tx2>=0&&tx2<COLS&&ty2>=0&&ty2<ROWS&&sMap[ty2][tx2]!==SYMBOLS.WALL){dist++;tx2+=ddx;ty2+=ddy;}
                                if (dist > maxDist) { maxDist = dist; bestDir = d; }
                            }
                            const _cTType = (screenTheme && Math.random() < 0.30) ? 'HOPPER_TURRET' : 'TURRET';
                            sEnemies.push({ type:_cTType, x:ex, y:ey, dir:bestDir, hp:100+floorLevel*5, maxHp:100+floorLevel*5, flashUntil:0, offsetX:0, offsetY:0, expValue:40, stunTurns:0, hopTimer:1+Math.floor(Math.random()*3) });
                        } else if (roll < _ct2) {
                            sEnemies.push({ type:'ORC', x:ex, y:ey, hp:40+floorLevel*5, maxHp:40+floorLevel*5, flashUntil:0, offsetX:0, offsetY:0, expValue:40, stunTurns:0 });
                        } else if (roll < _ct3) {
                            sEnemies.push({ type:'BREAKER', x:ex, y:ey, hp:50+floorLevel*4, maxHp:50+floorLevel*4, flashUntil:0, offsetX:0, offsetY:0, expValue:45, stunTurns:0 });
                        } else {
                            const newEnemy = { type:'NORMAL', x:ex, y:ey, hp:3+floorLevel, maxHp:3+floorLevel, flashUntil:0, offsetX:0, offsetY:0, expValue:5, stunTurns:0 };
                            if (roomFamilyId != null) { newEnemy.familyId = roomFamilyId; newEnemy.homeX = cr.cx; newEnemy.homeY = cr.cy; newEnemy.breedTimer = 0; }
                            sEnemies.push(newEnemy);
                        }
                    }

                }

                // 商人をたまに配置（8%: フロアにまだ商人がいない場合のみ）
                if (!merchantState && Math.random() < 0.08 && castleRooms.length > 0) {
                    const shuffled = castleRooms.slice().sort(() => Math.random() - 0.5);
                    for (const cr of shuffled) {
                        let placed = false;
                        for (let t = 0; t < 30 && !placed; t++) {
                            const mx = cr.x + 1 + Math.floor(Math.random() * (cr.w - 2));
                            const my = cr.y + 1 + Math.floor(Math.random() * (cr.h - 2));
                            if (sMap[my][mx] === SYMBOLS.FLOOR && !sEnemies.some(e => e.x===mx&&e.y===my)) {
                                sMap[my][mx] = SYMBOLS.MERCHANT;
                                merchantState = { x: mx, y: my, facing: 'LEFT', jumpUntil: 0, nextAction: 3 + Math.floor(Math.random() * 4), hp: 30 };
                                lastMerchantFloor = floorLevel;
                                placed = true;
                            }
                        }
                        if (placed) break;
                    }
                }

                // Gがひしめく宝部屋（マルチスクリーン城郭型、3%の確率）
                if (castleRooms.length >= 3 && Math.random() < 0.03) {
                    const mrCandidates = castleRooms.slice(1, -1).filter(r => r.w >= 3 && r.h >= 3);
                    if (mrCandidates.length > 0) {
                        const mr = mrCandidates[Math.floor(Math.random() * mrCandidates.length)];
                        const orcCount = Math.min(8, Math.max(4, Math.floor(mr.w * mr.h / 4)));
                        const orcHp = 40 + floorLevel * 3;
                        const sleepGroupId = mr.cx * 1000 + mr.cy;
                        for (let i = 0; i < orcCount; i++) {
                            for (let t = 0; t < 40; t++) {
                                const ex = mr.x + Math.floor(Math.random() * mr.w);
                                const ey = mr.y + Math.floor(Math.random() * mr.h);
                                if (sMap[ey][ex] !== SYMBOLS.FLOOR) continue;
                                if (sEnemies.some(e => e.x === ex && e.y === ey)) continue;
                                sEnemies.push({ type: 'ORC', x: ex, y: ey,
                                    hp: orcHp, maxHp: orcHp,
                                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0,
                                    sleeping: true, sleepGroup: sleepGroupId });
                                break;
                            }
                        }
                        const ringIdx = Math.floor(Math.random() * RINGS.length);
                        let ringPlaced = false;
                        for (let t = 0; t < 40 && !ringPlaced; t++) {
                            const rx2 = mr.x + Math.floor(Math.random() * mr.w);
                            const ry2 = mr.y + Math.floor(Math.random() * mr.h);
                            if (sMap[ry2][rx2] !== SYMBOLS.FLOOR) continue;
                            if (sEnemies.some(e => e.x === rx2 && e.y === ry2)) continue;
                            sMap[ry2][rx2] = SYMBOLS.RING;
                            ringDrops.push({ x: rx2, y: ry2, ringId: RINGS[ringIdx].id });
                            addLog("💍 Something glitters behind guarded walls...");
                            ringPlaced = true;
                        }
                    }
                }

            } else {
                // === 通常ダンジョン型（部屋+通路） ===
                const _dRCMin = screenTheme ? screenTheme.roomCountMin : 8;
                const _dRCMax = screenTheme ? screenTheme.roomCountMax : 11;
                const _dRWMin = screenTheme ? screenTheme.roomWMin : 4, _dRWMax = screenTheme ? screenTheme.roomWMax : 9;
                const _dRHMin = screenTheme ? screenTheme.roomHMin : 4, _dRHMax = screenTheme ? screenTheme.roomHMax : 7;
                const roomCount = _dRCMin + Math.floor(Math.random() * (_dRCMax - _dRCMin + 1));
                for (let i = 0; i < roomCount; i++) {
                    const w = _dRWMin + Math.floor(Math.random() * (_dRWMax - _dRWMin + 1));
                    const h = _dRHMin + Math.floor(Math.random() * (_dRHMax - _dRHMin + 1));
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
            if (sx < screenGridSize - 1) {
                for (let py = 11; py <= 13; py++) {
                    sMap[py][COLS - 1] = SYMBOLS.FLOOR;
                    sMap[py][COLS - 2] = SYMBOLS.FLOOR;
                }
                digPathToNearestRoom(COLS - 3, 12);
            }
            // 左方向 (x=0, y=11〜13)
            if (sx > 0) {
                for (let py = 11; py <= 13; py++) {
                    sMap[py][0] = SYMBOLS.FLOOR;
                    sMap[py][1] = SYMBOLS.FLOOR;
                }
                digPathToNearestRoom(2, 12);
            }
            // 下方向 (y=ROWS-1, x=18〜21)
            if (sy < screenGridSize - 1) {
                for (let px = 18; px <= 21; px++) {
                    sMap[ROWS - 1][px] = SYMBOLS.FLOOR;
                    sMap[ROWS - 2][px] = SYMBOLS.FLOOR;
                }
                digPathToNearestRoom(19, ROWS - 3);
            }
            // 上方向 (y=0, x=18〜21)
            if (sy > 0) {
                for (let px = 18; px <= 21; px++) {
                    sMap[0][px] = SYMBOLS.FLOOR;
                    sMap[1][px] = SYMBOLS.FLOOR;
                }
                digPathToNearestRoom(19, 2);
            }

            // 壁の割合を計算（BREAKERの出現率補正に使用）
            let sWallCount = 0, sTotalInner = 0;
            for (let y = 1; y < ROWS - 1; y++) {
                for (let x = 1; x < COLS - 1; x++) {
                    sTotalInner++;
                    if (sMap[y][x] === SYMBOLS.WALL) sWallCount++;
                }
            }
            const sWallRatio = sWallCount / sTotalInner;
            const sBreakerBonus = sWallRatio > 0.2 ? Math.min(0.30, (sWallRatio - 0.2) * 0.6) : 0;

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
                // 家族グループの判定（101F以上・テーマで変動）
                const _dFC = screenTheme ? screenTheme.familyChance : 0.05;
                const roomFamilyId2 = (floorLevel >= 101 && Math.random() < _dFC) ? familyIdCounter++ : null;
                const roomCenter2 = rooms[i];
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
                        const _dt1 = screenTheme ? screenTheme.eT1 : 0.12;
                        const _dt2 = screenTheme ? screenTheme.eT2 : 0.25;
                        const _dt3 = screenTheme ? screenTheme.eT3 : (floorLevel <= 49 ? 0.35 : 0.28);
                        if (enemyRoll < _dt1) {
                            // 最も広い方向にビームを向ける
                            let bestDir = 0, maxDist = -1;
                            for (let d = 0; d < 4; d++) {
                                const dx_c = [0, 1, 0, -1][d], dy_c = [-1, 0, 1, 0][d];
                                let dist = 0, tx = ex + dx_c, ty = ey + dy_c;
                                while (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && sMap[ty][tx] !== SYMBOLS.WALL) { dist++; tx += dx_c; ty += dy_c; }
                                if (dist > maxDist) { maxDist = dist; bestDir = d; }
                            }
                            const _dTType = (screenTheme && Math.random() < 0.30) ? 'HOPPER_TURRET' : 'TURRET';
                            sEnemies.push({ type: _dTType, x: ex, y: ey, dir: bestDir, hp: 100 + floorLevel * 5, maxHp: 100 + floorLevel * 5, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0, hopTimer: 1 + Math.floor(Math.random() * 3) });
                        } else if (enemyRoll < _dt2) {
                            sEnemies.push({ type: 'ORC', x: ex, y: ey, hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0 });
                        } else if (floorLevel >= 4 && enemyRoll < _dt3 + sBreakerBonus) {
                            sEnemies.push({ type: 'BREAKER', x: ex, y: ey, hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });
                        } else if (!screenTheme && floorLevel >= 40 && floorLevel <= 49 && enemyRoll < 0.37 + sBreakerBonus) {
                            sEnemies.push({ type: 'LAYER', x: ex, y: ey, hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25, stunTurns: 0 });
                        } else {
                            const newEnemy = { type: 'NORMAL', x: ex, y: ey, hp: 3 + floorLevel, maxHp: 3 + floorLevel, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0 };
                            if (roomFamilyId2 != null) { newEnemy.familyId = roomFamilyId2; newEnemy.homeX = roomCenter2.cx; newEnemy.homeY = roomCenter2.cy; newEnemy.breedTimer = 0; }
                            sEnemies.push(newEnemy);
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
            const noEnemy = (ix, iy) => !sEnemies.some(e => e.x === ix && e.y === iy);
            // 魔導書を1つ配置
            const possibleTomes = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.ESCAPE, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.HEAL_TOME];
            const chosenTome = possibleTomes[Math.floor(Math.random() * possibleTomes.length)];
            for (let tries = 0; tries < 50; tries++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (sMap[iy][ix] === SYMBOLS.FLOOR && noEnemy(ix, iy)) { sMap[iy][ix] = chosenTome; break; }
            }
            // 剣または防具をランダム配置
            if (Math.random() < 0.3) {
                const item = Math.random() < 0.5 ? SYMBOLS.SWORD : SYMBOLS.ARMOR;
                for (let tries = 0; tries < 50; tries++) {
                    const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                    const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                    if (sMap[iy][ix] === SYMBOLS.FLOOR && noEnemy(ix, iy)) { sMap[iy][ix] = item; break; }
                }
            }

            // 深層での妖精出現（5%の確率で床タイルに配置）
            if (floorLevel >= 101 && Math.random() < 0.05 && rooms.length > 0) {
                for (let tries = 0; tries < 50; tries++) {
                    const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                    const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                    if (sMap[iy][ix] === SYMBOLS.FLOOR && noEnemy(ix, iy)) { sMap[iy][ix] = SYMBOLS.FAIRY; break; }
                }
            }

            // 1部屋あたりの魔導書を最大2個に制限
            const tomeSyms = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.ESCAPE, SYMBOLS.BREAKER_TOME];
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

            // --- 画面内の到達性チェック：1つの始点から全ポイントに到達できるか確認 ---
            {
                // チェック対象：画面間通路の入口 + 全部屋の中心
                const checkTargets = [];
                if (sx < screenGridSize - 1) checkTargets.push({ x: COLS - 2, y: 12 }); // 右通路
                if (sx > 0) checkTargets.push({ x: 1, y: 12 }); // 左通路
                if (sy < screenGridSize - 1) checkTargets.push({ x: 19, y: ROWS - 2 }); // 下通路
                if (sy > 0) checkTargets.push({ x: 19, y: 1 }); // 上通路
                for (const r of rooms) checkTargets.push({ x: r.cx, y: r.cy });

                if (checkTargets.length > 0) {
                    // BFSヘルパー：1つの始点からflood fill
                    const bfs = (startX, startY) => {
                        const vis = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
                        if (sMap[startY][startX] === SYMBOLS.WALL) return vis;
                        vis[startY][startX] = 1;
                        const q = [{ x: startX, y: startY }];
                        while (q.length > 0) {
                            const { x: fx, y: fy } = q.shift();
                            for (const [ddx, ddy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                                const nnx = fx + ddx, nny = fy + ddy;
                                if (nnx < 0 || nnx >= COLS || nny < 0 || nny >= ROWS) continue;
                                if (vis[nny][nnx]) continue;
                                if (sMap[nny][nnx] === SYMBOLS.WALL) continue;
                                vis[nny][nnx] = 1;
                                q.push({ x: nnx, y: nny });
                            }
                        }
                        return vis;
                    };

                    // 修復ループ：到達不能なポイントが無くなるまで繰り返す
                    for (let attempt = 0; attempt < 15; attempt++) {
                        // 毎回最初のターゲットから新しくBFSを実行
                        const visited = bfs(checkTargets[0].x, checkTargets[0].y);

                        // 到達不能なターゲットを探す
                        let unreachable = null;
                        for (let i = 1; i < checkTargets.length; i++) {
                            if (!visited[checkTargets[i].y][checkTargets[i].x]) {
                                unreachable = checkTargets[i];
                                break;
                            }
                        }
                        if (!unreachable) break; // 全ポイント到達可能

                        // 到達可能な最寄りポイントから到達不能ポイントへ通路を掘る
                        let nearestSrc = checkTargets[0];
                        let nearestDist = Math.abs(checkTargets[0].x - unreachable.x) + Math.abs(checkTargets[0].y - unreachable.y);
                        for (const other of checkTargets) {
                            if (!visited[other.y][other.x]) continue;
                            const d = Math.abs(other.x - unreachable.x) + Math.abs(other.y - unreachable.y);
                            if (d < nearestDist) { nearestDist = d; nearestSrc = other; }
                        }

                        // 通路を掘る（2タイル幅で確実に通行可能にする）
                        let cx = nearestSrc.x, cy = nearestSrc.y;
                        while (cx !== unreachable.x || cy !== unreachable.y) {
                            if (cx !== unreachable.x && (cy === unreachable.y || Math.random() < 0.5)) cx += (unreachable.x > cx ? 1 : -1);
                            else cy += (unreachable.y > cy ? 1 : -1);
                            if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1) {
                                if (sMap[cy][cx] === SYMBOLS.WALL) sMap[cy][cx] = SYMBOLS.FLOOR;
                            }
                        }
                    }
                }
            }

            return { sMap, sEnemies, sWisps, sTempWalls, rooms };
        }

        // ===== 奇妙な場所（深層101F+専用・低確率） =====
        function generateBizarreScreen(sx, sy) {
            const sMap = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
            const sEnemies = [];
            const sWisps = [];
            const sTempWalls = [];
            const rooms = [];

            const TYPES = ['MONSTER_FLOOD', 'LAVA_SEA', 'FROZEN_PRISON', 'VOID_CELLS', 'CHAOS_ALTAR'];
            // 超レア特殊MAP（各0.5%）
            const _bRoll = Math.random();
            const bizType = _bRoll < 0.005 ? 'FACTION_WAR'
                          : _bRoll < 0.010 ? 'FLEEING_HORDE'
                          : _bRoll < 0.015 ? 'CIRCLE_SIEGE'
                          : _bRoll < 0.020 ? 'KINGS_COURT'
                          : TYPES[Math.floor(Math.random() * TYPES.length)];

            // 共通: 通路入口を開ける
            const openPassages = () => {
                if (sx < screenGridSize - 1) { for (let py = 11; py <= 13; py++) { sMap[py][COLS-1] = SYMBOLS.FLOOR; sMap[py][COLS-2] = SYMBOLS.FLOOR; } }
                if (sx > 0)                 { for (let py = 11; py <= 13; py++) { sMap[py][0] = SYMBOLS.FLOOR; sMap[py][1] = SYMBOLS.FLOOR; } }
                if (sy < screenGridSize - 1){ for (let px = 18; px <= 21; px++) { sMap[ROWS-1][px] = SYMBOLS.FLOOR; sMap[ROWS-2][px] = SYMBOLS.FLOOR; } }
                if (sy > 0)                 { for (let px = 18; px <= 21; px++) { sMap[0][px] = SYMBOLS.FLOOR; sMap[1][px] = SYMBOLS.FLOOR; } }
            };

            // 共通: 入口から近くの床へ通路を掘る
            const digToNearestFloor = (startX, startY) => {
                if (sMap[startY][startX] !== SYMBOLS.WALL) return;
                let best = null, bestD = 999;
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) {
                    const t = sMap[y][x];
                    if (t !== SYMBOLS.WALL) {
                        const d = Math.abs(x-startX)+Math.abs(y-startY);
                        if (d < bestD) { bestD = d; best = {x,y}; }
                    }
                }
                if (!best) return;
                let cx = startX, cy = startY;
                while (cx !== best.x || cy !== best.y) {
                    if (cx !== best.x && (cy === best.y || Math.random() < 0.5)) cx += best.x > cx ? 1 : -1;
                    else cy += best.y > cy ? 1 : -1;
                    if (cx>=1&&cx<COLS-1&&cy>=1&&cy<ROWS-1&&sMap[cy][cx]===SYMBOLS.WALL) sMap[cy][cx]=SYMBOLS.FLOOR;
                }
            };

            // ---- MONSTER_FLOOD: 全面開放、モンスターが埋め尽くす ----
            if (bizType === 'MONSTER_FLOOD') {
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.FLOOR;
                rooms.push({ x:1, y:1, w:COLS-2, h:ROWS-2, cx:Math.floor(COLS/2), cy:Math.floor(ROWS/2) });
                // グリッド状（2マス間隔）に配置して画面を完全に埋め尽くす
                for (let y = 2; y < ROWS-2; y += 2) {
                    for (let x = 2; x < COLS-2; x += 2) {
                        // プレイヤーのスポーン地点（画面左上）は空ける
                        if (x <= 4 && y <= 4) continue;
                        const roll = Math.random();
                        if (roll < 0.30) {
                            sEnemies.push({ type:'NORMAL', x, y, hp:3+floorLevel, maxHp:3+floorLevel, flashUntil:0, offsetX:0, offsetY:0, expValue:5, stunTurns:0 });
                        } else if (roll < 0.45) {
                            sEnemies.push({ type:'ORC', x, y, hp:40+floorLevel*5, maxHp:40+floorLevel*5, flashUntil:0, offsetX:0, offsetY:0, expValue:40, stunTurns:0 });
                        } else if (roll < 0.58) {
                            sEnemies.push({ type:'BLAZE', x, y, hp:15+floorLevel*2, maxHp:15+floorLevel*2, flashUntil:0, offsetX:0, offsetY:0, expValue:15, stunTurns:0 });
                        } else if (roll < 0.70) {
                            sEnemies.push({ type:'FROST', x, y, hp:15+floorLevel*2, maxHp:15+floorLevel*2, flashUntil:0, offsetX:0, offsetY:0, expValue:15, stunTurns:0 });
                        } else if (roll < 0.83) {
                            const dir = Math.floor(Math.random()*4);
                            const ttype = Math.random() < 0.40 ? 'HOPPER_TURRET' : 'TURRET';
                            sEnemies.push({ type:ttype, x, y, dir, hp:100+floorLevel*5, maxHp:100+floorLevel*5, flashUntil:0, offsetX:0, offsetY:0, expValue:40, stunTurns:0, hopTimer:1+Math.floor(Math.random()*3) });
                        } else {
                            sWisps.push({ x, y, dir:Math.floor(Math.random()*4), mode:'STRAIGHT' });
                        }
                    }
                }

            // ---- LAVA_SEA: 9割が溶岩、細い道だけ ----
            } else if (bizType === 'LAVA_SEA') {
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.LAVA;
                // 5本のランダムウォークで細道を彫る
                for (let p = 0; p < 5; p++) {
                    let cx = Math.floor(Math.random()*(COLS-6))+3;
                    let cy = Math.floor(Math.random()*(ROWS-6))+3;
                    for (let step = 0; step < 90; step++) {
                        sMap[cy][cx] = SYMBOLS.FLOOR;
                        const dir = Math.floor(Math.random()*4);
                        if (dir===0) cy--; else if (dir===1) cy++; else if (dir===2) cx--; else cx++;
                        cx = Math.max(2, Math.min(COLS-3, cx)); cy = Math.max(2, Math.min(ROWS-3, cy));
                    }
                }
                rooms.push({ x:2, y:2, w:4, h:4, cx:4, cy:4 });
                // 道上に強敵数体
                const floorTiles = [];
                for (let y=2;y<ROWS-2;y++) for (let x=2;x<COLS-2;x++) if (sMap[y][x]===SYMBOLS.FLOOR) floorTiles.push({x,y});
                floorTiles.sort(() => Math.random()-0.5);
                for (let i = 0; i < Math.min(6, floorTiles.length); i++) {
                    const {x,y}=floorTiles[i]; const hp=40+floorLevel*5;
                    sEnemies.push({ type:'ORC', x, y, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:40, stunTurns:0 });
                }

            // ---- FROZEN_PRISON: 全面氷、FROSTだらけ ----
            } else if (bizType === 'FROZEN_PRISON') {
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.ICE;
                rooms.push({ x:1, y:1, w:COLS-2, h:ROWS-2, cx:Math.floor(COLS/2), cy:Math.floor(ROWS/2) });
                // 氷の柱（壁の島）をランダムに配置
                for (let i = 0; i < 12; i++) {
                    const px = Math.floor(Math.random()*(COLS-6))+3;
                    const py = Math.floor(Math.random()*(ROWS-6))+3;
                    sMap[py][px] = SYMBOLS.WALL; sMap[py+1][px] = SYMBOLS.WALL;
                    sMap[py][px+1] = SYMBOLS.WALL; sMap[py+1][px+1] = SYMBOLS.WALL;
                }
                // FROSTを多数配置
                for (let i = 0; i < 16; i++) {
                    for (let t = 0; t < 50; t++) {
                        const ex=Math.floor(Math.random()*(COLS-4))+2; const ey=Math.floor(Math.random()*(ROWS-4))+2;
                        if (sMap[ey][ex]===SYMBOLS.ICE && !sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            const hp=15+floorLevel*2;
                            sEnemies.push({ type:'FROST', x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:15, stunTurns:0 });
                            break;
                        }
                    }
                }

            // ---- VOID_CELLS: 格子状の小独房、細い一本道でつながる ----
            } else if (bizType === 'VOID_CELLS') {
                const cellW=7, cellH=6;
                const cCols=Math.floor((COLS-2)/cellW), cRows=Math.floor((ROWS-2)/cellH);
                for (let cr=0; cr<cRows; cr++) for (let cc=0; cc<cCols; cc++) {
                    const rx=1+cc*cellW+1, ry=1+cr*cellH+1;
                    const rw=cellW-2, rh=cellH-2;
                    for (let y=ry;y<ry+rh&&y<ROWS-1;y++) for (let x=rx;x<rx+rw&&x<COLS-1;x++) sMap[y][x]=SYMBOLS.FLOOR;
                    rooms.push({ x:rx, y:ry, w:rw, h:rh, cx:rx+Math.floor(rw/2), cy:ry+Math.floor(rh/2) });
                    // 右への1マス通路
                    if (cc<cCols-1) { const doorY=ry+Math.floor(rh/2); if(doorY>=1&&doorY<ROWS-1) sMap[doorY][rx+rw]=SYMBOLS.FLOOR; }
                    // 下への1マス通路
                    if (cr<cRows-1) { const doorX=rx+Math.floor(rw/2); if(doorX>=1&&doorX<COLS-1) sMap[ry+rh][doorX]=SYMBOLS.FLOOR; }
                    // 各部屋にほぼ確実にモンスター
                    if (Math.random() < 0.85) {
                        const ex=rx+1, ey=ry+1;
                        if (ex<COLS-1&&ey<ROWS-1&&sMap[ey][ex]===SYMBOLS.FLOOR) {
                            const roll=Math.random(); let type,hp,exp;
                            if (roll<0.6){type='NORMAL';hp=3+floorLevel;exp=5;}
                            else if(roll<0.8){type='BREAKER';hp=50+floorLevel*4;exp=45;}
                            else{type='ORC';hp=40+floorLevel*5;exp=40;}
                            sEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:exp, stunTurns:0 });
                        }
                    }
                }

            // ---- CHAOS_ALTAR: 全地形混沌、中央に砲台 ----
            } else if (bizType !== 'FACTION_WAR') {
                for (let y=1;y<ROWS-1;y++) for (let x=1;x<COLS-1;x++) {
                    const r=Math.random();
                    if(r<0.12) sMap[y][x]=SYMBOLS.WALL;
                    else if(r<0.32) sMap[y][x]=SYMBOLS.LAVA;
                    else if(r<0.48) sMap[y][x]=SYMBOLS.ICE;
                    else if(r<0.53) sMap[y][x]=SYMBOLS.POISON;
                    else sMap[y][x]=SYMBOLS.FLOOR;
                }
                const cx=Math.floor(COLS/2), cy=Math.floor(ROWS/2);
                for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++)
                    if(cy+dy>=1&&cy+dy<ROWS-1&&cx+dx>=1&&cx+dx<COLS-1) sMap[cy+dy][cx+dx]=SYMBOLS.FLOOR;
                rooms.push({ x:cx-2, y:cy-2, w:5, h:5, cx, cy });
                const tHp=100+floorLevel*5;
                sEnemies.push({ type:'TURRET', x:cx, y:cy, dir:0, hp:tHp, maxHp:tHp, flashUntil:0, offsetX:0, offsetY:0, expValue:40, stunTurns:0 });
                const eTypes=['NORMAL','BLAZE','FROST','ORC','BREAKER'];
                for (let i=0;i<10;i++) {
                    for (let t=0;t<60;t++) {
                        const ex=Math.floor(Math.random()*(COLS-4))+2; const ey=Math.floor(Math.random()*(ROWS-4))+2;
                        const tile=sMap[ey][ex];
                        if(tile!==SYMBOLS.WALL&&!sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            const type=eTypes[Math.floor(Math.random()*eTypes.length)];
                            let hp,exp;
                            if(type==='ORC'){hp=40+floorLevel*5;exp=40;}
                            else if(type==='BREAKER'){hp=50+floorLevel*4;exp=45;}
                            else if(type==='BLAZE'||type==='FROST'){hp=15+floorLevel*2;exp=15;}
                            else{hp=3+floorLevel;exp=5;}
                            sEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:exp, stunTurns:0 });
                            break;
                        }
                    }
                }

            // ---- FACTION_WAR: 二派閥の激戦区 ----
            } else if (bizType === 'FACTION_WAR') {
                // 全面開放の戦場
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.FLOOR;
                rooms.push({ x:1, y:1, w:COLS-2, h:ROWS-2, cx:Math.floor(COLS/2), cy:Math.floor(ROWS/2) });
                // 岩場・瓦礫（遮蔽物）
                for (let i = 0; i < 10; i++) {
                    const px = Math.floor(Math.random()*(COLS-8))+4;
                    const py = Math.floor(Math.random()*(ROWS-6))+3;
                    sMap[py][px] = SYMBOLS.WALL;
                    if (Math.random() < 0.6) sMap[py][px+1] = SYMBOLS.WALL;
                    if (Math.random() < 0.6) sMap[py+1][px] = SYMBOLS.WALL;
                    if (Math.random() < 0.35) sMap[py+1][px+1] = SYMBOLS.WALL;
                }
                // 中央に縦の境界線（すでに戦闘中なのでわずかに混在）
                const midX = Math.floor(COLS / 2);

                // --- CRIMSON派閥: ORC + BREAKER + BLAZE ---
                const crimsonPool = ['ORC','ORC','ORC','BREAKER','BREAKER','BLAZE','ORC','BREAKER','BLAZE','ORC','BREAKER'];
                for (let i = 0; i < crimsonPool.length; i++) {
                    for (let t = 0; t < 80; t++) {
                        // 左60%に多く配置（侵攻中なので一部は右側にも）
                        const ex = Math.random() < 0.70
                            ? Math.floor(Math.random() * (midX - 2)) + 2
                            : Math.floor(Math.random() * (COLS-4)) + 2;
                        const ey = Math.floor(Math.random() * (ROWS-4)) + 2;
                        if (sMap[ey][ex] === SYMBOLS.FLOOR && !sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            const type = crimsonPool[i];
                            let hp, exp;
                            if (type==='ORC')     { hp=40+floorLevel*5; exp=40; }
                            else if (type==='BREAKER'){ hp=50+floorLevel*4; exp=45; }
                            else                  { hp=15+floorLevel*2; exp=15; } // BLAZE
                            sEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:exp, stunTurns:0, faction:'CRIMSON' });
                            break;
                        }
                    }
                }
                // --- COBALT派閥: FROST + NORMAL ---
                const cobaltPool = ['FROST','NORMAL','FROST','NORMAL','NORMAL','FROST','FROST','NORMAL','FROST','NORMAL','NORMAL'];
                for (let i = 0; i < cobaltPool.length; i++) {
                    for (let t = 0; t < 80; t++) {
                        const ex = Math.random() < 0.70
                            ? Math.floor(Math.random() * (COLS - midX - 2)) + midX
                            : Math.floor(Math.random() * (COLS-4)) + 2;
                        const ey = Math.floor(Math.random() * (ROWS-4)) + 2;
                        if (sMap[ey][ex] === SYMBOLS.FLOOR && !sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            const type = cobaltPool[i];
                            let hp, exp;
                            if (type==='FROST'){ hp=15+floorLevel*2; exp=15; }
                            else              { hp=3+floorLevel;     exp=5;  } // NORMAL
                            sEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:exp, stunTurns:0, faction:'COBALT' });
                            break;
                        }
                    }
                }

            // ---- FLEEING_HORDE: 逃げ続ける敵の群れ ----
            } else if (bizType === 'FLEEING_HORDE') {
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.FLOOR;
                rooms.push({ x:1, y:1, w:COLS-2, h:ROWS-2, cx:Math.floor(COLS/2), cy:Math.floor(ROWS/2) });
                // 柱・隠れ場所（逃げ込む障害物）
                for (let i = 0; i < 12; i++) {
                    const px = Math.floor(Math.random()*(COLS-8))+4;
                    const py = Math.floor(Math.random()*(ROWS-6))+3;
                    sMap[py][px] = SYMBOLS.WALL;
                    if (Math.random() < 0.5) sMap[py][px+1] = SYMBOLS.WALL;
                    if (Math.random() < 0.5) sMap[py+1][px] = SYMBOLS.WALL;
                }
                // 逃げ回るNORMAL群 + GOLDも混じる
                const fleeTypes = ['NORMAL','NORMAL','NORMAL','NORMAL','GOLD','NORMAL','NORMAL','GOLD','NORMAL','NORMAL','NORMAL','GOLD','NORMAL','NORMAL','NORMAL','NORMAL','GOLD'];
                for (const type of fleeTypes) {
                    for (let t = 0; t < 80; t++) {
                        const ex = Math.floor(Math.random()*(COLS-4))+2;
                        const ey = Math.floor(Math.random()*(ROWS-4))+2;
                        if (sMap[ey][ex] === SYMBOLS.FLOOR && !sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            const hp = type === 'GOLD' ? 5+floorLevel : 3+floorLevel;
                            const exp = type === 'GOLD' ? 10 : 5;
                            sEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:exp, stunTurns:0, flee:true });
                            break;
                        }
                    }
                }

            // ---- CIRCLE_SIEGE: 同心円状に敵が配置 ----
            } else if (bizType === 'CIRCLE_SIEGE') {
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.FLOOR;
                const cx = Math.floor(COLS/2), cy = Math.floor(ROWS/2);
                rooms.push({ x:1, y:1, w:COLS-2, h:ROWS-2, cx, cy });

                // 中心: TURRET
                const tHp = 80+floorLevel*4;
                sEnemies.push({ type:'TURRET', x:cx, y:cy, dir:0, hp:tHp, maxHp:tHp, flashUntil:0, offsetX:0, offsetY:0, expValue:50, stunTurns:0 });

                // リングヘルパー: 半径r、count体を等間隔に配置
                const placeRing = (radius, count, type, hp, exp) => {
                    for (let j = 0; j < count; j++) {
                        const angle = (2 * Math.PI * j) / count;
                        const ex = Math.round(cx + radius * Math.cos(angle));
                        const ey = Math.round(cy + radius * Math.sin(angle) * 0.7); // 縦方向を少し圧縮
                        if (ex >= 2 && ex < COLS-2 && ey >= 2 && ey < ROWS-2
                            && sMap[ey][ex] === SYMBOLS.FLOOR
                            && !sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            sEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:exp, stunTurns:0 });
                        }
                    }
                };
                // Ring 1: NORMALが内側を守る
                placeRing(3, 8, 'NORMAL', 3+floorLevel, 5);
                // Ring 2: ORCが中間
                placeRing(6, 8, 'ORC', 40+floorLevel*5, 40);
                // Ring 3: BREAKERが外側を構成
                placeRing(10, 10, 'BREAKER', 50+floorLevel*4, 45);

            // ---- KINGS_COURT: 王の間 ----
            } else if (bizType === 'KINGS_COURT') {
                for (let y = 1; y < ROWS-1; y++) for (let x = 1; x < COLS-1; x++) sMap[y][x] = SYMBOLS.FLOOR;
                const cx = Math.floor(COLS/2), cy = Math.floor(ROWS/2);
                rooms.push({ x:1, y:1, w:COLS-2, h:ROWS-2, cx, cy });
                // 玉座の間の柱（左右対称4セット）
                [[cx-8,cy-4],[cx+7,cy-4],[cx-8,cy+3],[cx+7,cy+3]].forEach(([px,py]) => {
                    if (px>=1&&px<COLS-2&&py>=1&&py<ROWS-2) {
                        sMap[py][px]=SYMBOLS.WALL; sMap[py][px+1]=SYMBOLS.WALL;
                        sMap[py+1][px]=SYMBOLS.WALL; sMap[py+1][px+1]=SYMBOLS.WALL;
                    }
                });
                // KING（玉座）
                const kingHp = 70 + floorLevel * 3;
                sEnemies.push({ type:'KING', x:cx, y:cy, hp:kingHp, maxHp:kingHp, flashUntil:0, offsetX:0, offsetY:0, expValue:120, stunTurns:0 });
                // 近衛騎士（ORC）を周囲に固定配置
                [{x:-3,y:-1},{x:3,y:-1},{x:-3,y:1},{x:3,y:1},{x:-5,y:0},{x:5,y:0}].forEach(d => {
                    const ex = cx+d.x, ey = cy+d.y;
                    if (ex>=1&&ex<COLS-1&&ey>=1&&ey<ROWS-1&&sMap[ey][ex]===SYMBOLS.FLOOR&&!sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                        const hp = 40+floorLevel*5;
                        sEnemies.push({ type:'NORMAL', x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:20, stunTurns:0 });
                    }
                });
                // 兵士（ランダム配置）
                const soldierPool = ['NORMAL','NORMAL','ORC','NORMAL','BLAZE','NORMAL','NORMAL','BREAKER','NORMAL','FROST'];
                for (const type of soldierPool) {
                    for (let t = 0; t < 60; t++) {
                        const ex = Math.floor(Math.random()*(COLS-4))+2;
                        const ey = Math.floor(Math.random()*(ROWS-4))+2;
                        if (sMap[ey][ex]===SYMBOLS.FLOOR&&!sEnemies.some(e=>e.x===ex&&e.y===ey)) {
                            let hp,exp;
                            if(type==='ORC'){hp=40+floorLevel*5;exp=40;}
                            else if(type==='BREAKER'){hp=50+floorLevel*4;exp=45;}
                            else if(type==='BLAZE'||type==='FROST'){hp=15+floorLevel*2;exp=15;}
                            else{hp=3+floorLevel;exp=5;}
                            sEnemies.push({type,x:ex,y:ey,hp,maxHp:hp,flashUntil:0,offsetX:0,offsetY:0,expValue:exp,stunTurns:0});
                            break;
                        }
                    }
                }
            }

            // 全タイプ共通: 通路を開けて床まで掘る
            openPassages();
            const entries = [];
            if (sx > 0)                  entries.push([1, 12]);
            if (sx < screenGridSize - 1) entries.push([COLS-2, 12]);
            if (sy > 0)                  entries.push([19, 1]);
            if (sy < screenGridSize - 1) entries.push([19, ROWS-2]);
            entries.forEach(([ex, ey]) => digToNearestFloor(ex, ey));

            // roomsが空の場合のフォールバック（キー・出口配置用）
            if (rooms.length === 0) rooms.push({ x:2, y:2, w:4, h:4, cx:4, cy:4 });

            return { sMap, sEnemies, sWisps, sTempWalls, rooms, bizType };
        }

        // カギ・出口の画面座標をランダムに決定（スタート(0,0)を避け、互いに別の画面）
        let keyScreenX, keyScreenY, doorScreenX, doorScreenY;
        {
            const allScreens = [];
            for (let sy = 0; sy < screenGridSize; sy++)
                for (let sx = 0; sx < screenGridSize; sx++)
                    if (!(sx === 0 && sy === 0)) allScreens.push({ sx, sy });
            for (let i = allScreens.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allScreens[i], allScreens[j]] = [allScreens[j], allScreens[i]];
            }
            ({ sx: keyScreenX, sy: keyScreenY } = allScreens[0]);
            ({ sx: doorScreenX, sy: doorScreenY } = allScreens[1]);
        }

        // 各画面を生成（迷路型・通常ダンジョン型・壁掘り型をランダムに混合）
        // 90F以降: 特殊画面（プレイヤー開始/カギ/ドア/セーブ）以外でbreaker型が出現
        const specialScreens = new Set([
            '0,0',  // プレイヤー開始
            `${keyScreenX},${keyScreenY}`,  // カギ
            `${doorScreenX},${doorScreenY}`,  // ドア
            `${screenGridSize > 2 ? Math.floor(screenGridSize/2) : 0},${Math.floor(screenGridSize/2)}`  // セーブ
        ]);
        const allRooms = {}; // 各画面の部屋情報を保持
        for (let sy = 0; sy < screenGridSize; sy++) {
            for (let sx = 0; sx < screenGridSize; sx++) {
                let screenType;
                const isSpecial = specialScreens.has(`${sx},${sy}`);
                // 画面ごとにランダムなバリエーションテーマを選択
                const _sTheme = (screenThemes && screenThemes.length > 0)
                    ? screenThemes[Math.floor(Math.random() * screenThemes.length)]
                    : deepTheme;
                // 奇妙な場所（50F以上・特殊画面以外。101F+はテーマで変動、50〜99Fは低確率固定）
                const _bizChance = floorLevel >= 101
                    ? (_sTheme ? _sTheme.bizarreChance : 0.25)
                    : 0.06; // 50〜99F: 画面ごとに6%
                if (!isSpecial && Math.random() < _bizChance) {
                    const result = generateBizarreScreen(sx, sy);
                    screenGrid.maps[sy][sx] = result.sMap;
                    screenGrid.enemies[sy][sx] = result.sEnemies;
                    screenGrid.wisps[sy][sx] = result.sWisps;
                    screenGrid.tempWalls[sy][sx] = result.sTempWalls || [];
                    allRooms[`${sx},${sy}`] = result.rooms;
                    const bizNames = { MONSTER_FLOOD:'Monster Flood', LAVA_SEA:'Sea of Lava', FROZEN_PRISON:'Frozen Prison', VOID_CELLS:'Void Cells', CHAOS_ALTAR:'Chaos Altar', FACTION_WAR:'⚔️ FACTION WAR', FLEEING_HORDE:'🏃 FLEEING PREY', CIRCLE_SIEGE:'🔵 CIRCLE SIEGE', KINGS_COURT:'👑 KING\'S COURT' };
                    addLog(`⚠️ A strange aura... "${bizNames[result.bizType] || '???'}"`);
                    continue;
                }
                // ===== POISON WASTELAND スクリーン (90+F: 非特殊画面に約6%で出現) =====
                if (floorLevel >= 90 && !isSpecial && Math.random() < 0.06) {
                    const pwMap = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
                    const pwEnemies = [];

                    // 内部を全部毒にする
                    for (let y = 1; y < ROWS - 1; y++)
                        for (let x = 1; x < COLS - 1; x++)
                            pwMap[y][x] = SYMBOLS.POISON;

                    // ランダム壁クラスター（5〜9か所）— 通路帯を避けて配置
                    const pwWallCount = 5 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < pwWallCount; i++) {
                        const wcx = 4 + Math.floor(Math.random() * (COLS - 10));
                        const wcy = 3 + Math.floor(Math.random() * (ROWS - 8));
                        const ww = 1 + Math.floor(Math.random() * 4);
                        const wh = 1 + Math.floor(Math.random() * 3);
                        for (let ddy = 0; ddy < wh; ddy++)
                            for (let ddx = 0; ddx < ww; ddx++) {
                                const tx = wcx + ddx, ty = wcy + ddy;
                                if (tx < 1 || tx >= COLS-1 || ty < 1 || ty >= ROWS-1) continue;
                                // 通路帯（左右: y=11-13, 上下: x=18-21）は避ける
                                if ((tx <= 2 || tx >= COLS-3) && ty >= 10 && ty <= 14) continue;
                                if ((ty <= 1 || ty >= ROWS-2) && tx >= 17 && tx <= 22) continue;
                                pwMap[ty][tx] = SYMBOLS.WALL;
                            }
                    }

                    // 通路入口を開け、内側の代表座標を記録
                    const pwPassages = [];
                    if (sx < screenGridSize - 1) {
                        for (let ppy = 11; ppy <= 13; ppy++) { pwMap[ppy][COLS-1] = SYMBOLS.FLOOR; pwMap[ppy][COLS-2] = SYMBOLS.FLOOR; }
                        pwPassages.push({ x: COLS-3, y: 12 });
                    }
                    if (sx > 0) {
                        for (let ppy = 11; ppy <= 13; ppy++) { pwMap[ppy][0] = SYMBOLS.FLOOR; pwMap[ppy][1] = SYMBOLS.FLOOR; }
                        pwPassages.push({ x: 2, y: 12 });
                    }
                    if (sy < screenGridSize - 1) {
                        for (let ppx = 18; ppx <= 21; ppx++) { pwMap[ROWS-1][ppx] = SYMBOLS.FLOOR; pwMap[ROWS-2][ppx] = SYMBOLS.FLOOR; }
                        pwPassages.push({ x: 19, y: ROWS-3 });
                    }
                    if (sy > 0) {
                        for (let ppx = 18; ppx <= 21; ppx++) { pwMap[0][ppx] = SYMBOLS.FLOOR; pwMap[1][ppx] = SYMBOLS.FLOOR; }
                        pwPassages.push({ x: 19, y: 2 });
                    }

                    // BFS: WALL以外（POISON/FLOOR）を通って2点を接続
                    const bfsPW = (startX, startY, endX, endY) => {
                        if (startX === endX && startY === endY) return [];
                        const pwPrev = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
                        const pwVis  = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
                        const q = [{ x: startX, y: startY }];
                        pwVis[startY][startX] = 1;
                        const d4 = [[1,0],[-1,0],[0,1],[0,-1]];
                        while (q.length > 0) {
                            const { x, y } = q.shift();
                            if (x === endX && y === endY) {
                                const path = [];
                                let cx = endX, cy = endY;
                                while (cx !== startX || cy !== startY) {
                                    path.push({ x: cx, y: cy });
                                    const p = pwPrev[cy][cx]; cx = p.x; cy = p.y;
                                }
                                return path;
                            }
                            for (const [ddx, ddy] of d4) {
                                const nx = x + ddx, ny = y + ddy;
                                if (nx < 1 || nx >= COLS-1 || ny < 1 || ny >= ROWS-1) continue;
                                if (pwVis[ny][nx] || pwMap[ny][nx] === SYMBOLS.WALL) continue;
                                pwVis[ny][nx] = 1;
                                pwPrev[ny][nx] = { x, y };
                                q.push({ x: nx, y: ny });
                            }
                        }
                        return null;
                    };

                    // 2点間をウェイポイント経由で蛇行接続し、経路をFLOORにする
                    const pwConnect = (p1, p2) => {
                        const numWP = 3 + Math.floor(Math.random() * 3);
                        const halfY = Math.floor(ROWS / 2);
                        const halfX = Math.floor(COLS / 2);
                        const isH = Math.abs(p2.x - p1.x) >= Math.abs(p2.y - p1.y);
                        const wpts = [p1];
                        for (let wi = 1; wi <= numWP; wi++) {
                            const t = wi / (numWP + 1);
                            let wpX, wpY;
                            if (isH) {
                                wpX = Math.max(2, Math.min(COLS-3, Math.floor(p1.x + (p2.x - p1.x) * t)));
                                wpY = (wi % 2 === 0)
                                    ? 2 + Math.floor(Math.random() * (halfY - 3))
                                    : halfY + 1 + Math.floor(Math.random() * (ROWS - halfY - 4));
                            } else {
                                wpX = (wi % 2 === 0)
                                    ? 2 + Math.floor(Math.random() * (halfX - 3))
                                    : halfX + 1 + Math.floor(Math.random() * (COLS - halfX - 4));
                                wpY = Math.max(2, Math.min(ROWS-3, Math.floor(p1.y + (p2.y - p1.y) * t)));
                            }
                            // 壁と重なる場合は近傍補正
                            for (let dd = 0; dd < ROWS-2; dd++) {
                                const tryY = 1 + ((wpY - 1 + dd) % (ROWS-2));
                                if (pwMap[tryY][wpX] !== SYMBOLS.WALL) { wpY = tryY; break; }
                            }
                            wpts.push({ x: wpX, y: wpY });
                        }
                        wpts.push(p2);
                        for (let wi = 0; wi < wpts.length - 1; wi++) {
                            const seg = bfsPW(wpts[wi].x, wpts[wi].y, wpts[wi+1].x, wpts[wi+1].y);
                            if (seg) for (const { x, y } of seg)
                                if (pwMap[y][x] !== SYMBOLS.WALL) pwMap[y][x] = SYMBOLS.FLOOR;
                        }
                        // 両端に安全ゾーン（2×2 FLOOR）
                        for (const ep of [p1, p2])
                            for (let ddy = -1; ddy <= 1; ddy++)
                                for (let ddx = -1; ddx <= 1; ddx++) {
                                    const tx = ep.x + ddx, ty = ep.y + ddy;
                                    if (tx >= 1 && tx < COLS-1 && ty >= 1 && ty < ROWS-1)
                                        if (pwMap[ty][tx] !== SYMBOLS.WALL) pwMap[ty][tx] = SYMBOLS.FLOOR;
                                }
                    };

                    // 全通路を連鎖接続 (0→1→2→3)
                    if (pwPassages.length >= 2) {
                        for (let pi = 0; pi < pwPassages.length - 1; pi++)
                            pwConnect(pwPassages[pi], pwPassages[pi+1]);
                    } else if (pwPassages.length === 1) {
                        // 通路が1本だけなら中央へ接続
                        pwConnect(pwPassages[0], { x: Math.floor(COLS/2), y: Math.floor(ROWS/2) });
                    }

                    // 敵配置: POISON上のみ (NORMAL×5, FROST×3, BREAKER×2)
                    const pwBaseHp = 5 + floorLevel;
                    const placeEnemyPW = (type, hpMul, expV) => {
                        for (let t = 0; t < 100; t++) {
                            const ex = 2 + Math.floor(Math.random() * (COLS-4));
                            const ey = 2 + Math.floor(Math.random() * (ROWS-4));
                            if (pwMap[ey][ex] !== SYMBOLS.POISON) continue;
                            if (pwEnemies.some(e => e.x === ex && e.y === ey)) continue;
                            const hp = Math.floor(pwBaseHp * hpMul);
                            pwEnemies.push({ type, x:ex, y:ey, hp, maxHp:hp, flashUntil:0, offsetX:0, offsetY:0, expValue:expV, stunTurns:0 });
                            return;
                        }
                    };
                    for (let i = 0; i < 5; i++) placeEnemyPW('NORMAL', 1.0,  8);
                    for (let i = 0; i < 3; i++) placeEnemyPW('FROST',  2.0, 20);
                    for (let i = 0; i < 2; i++) placeEnemyPW('BREAKER',3.0, 35);

                    screenGrid.maps[sy][sx] = pwMap;
                    screenGrid.enemies[sy][sx] = pwEnemies;
                    screenGrid.wisps[sy][sx] = [];
                    screenGrid.tempWalls[sy][sx] = [];
                    allRooms[`${sx},${sy}`] = [{ x:1, y:1, w:COLS-2, h:ROWS-2, cx:Math.floor(COLS/2), cy:Math.floor(ROWS/2) }];
                    addLog('☠️ The stench of venom drifts from a nearby chamber...');
                    continue;
                }

                // ===== TURRET GAUNTLET スクリーン (90+F: 非特殊画面に約10%で出現) =====
                if (floorLevel >= 90 && !isSpecial && Math.random() < 0.10) {
                    const tgMap = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
                    const tgEnemies = [];

                    // 内部を全部床にする
                    for (let y = 1; y < ROWS - 1; y++)
                        for (let x = 1; x < COLS - 1; x++)
                            tgMap[y][x] = SYMBOLS.FLOOR;

                    // ランダム壁柱（タレット跳ね返り用）12本
                    for (let i = 0; i < 12; i++) {
                        const wx = Math.floor(Math.random() * (COLS - 10)) + 5;
                        const wy = Math.floor(Math.random() * (ROWS - 8)) + 4;
                        // 通路付近は避ける
                        if (wy >= 10 && wy <= 14 && (wx <= 2 || wx >= COLS - 3)) continue;
                        if (wx >= 17 && wx <= 22 && (wy <= 2 || wy >= ROWS - 3)) continue;
                        tgMap[wy][wx] = SYMBOLS.WALL;
                    }

                    // 毒沼パッチ（3〜5か所）
                    const tgPoisonCount = 3 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < tgPoisonCount; i++) {
                        const pcx = Math.floor(Math.random() * (COLS - 14)) + 7;
                        const pcy = Math.floor(Math.random() * (ROWS - 12)) + 6;
                        const pr = 1 + Math.floor(Math.random() * 2);
                        for (let dy = -pr; dy <= pr; dy++) {
                            for (let dx = -pr; dx <= pr; dx++) {
                                if (dx * dx + dy * dy > pr * pr) continue;
                                const ppx = pcx + dx, ppy = pcy + dy;
                                if (ppx < 2 || ppx >= COLS - 2 || ppy < 2 || ppy >= ROWS - 2) continue;
                                if (tgMap[ppy][ppx] === SYMBOLS.WALL) continue;
                                tgMap[ppy][ppx] = SYMBOLS.POISON;
                            }
                        }
                    }

                    // 通路入口を開ける（隣接スクリーンへの接続）
                    if (sx < screenGridSize - 1) { for (let py = 11; py <= 13; py++) { tgMap[py][COLS-1] = SYMBOLS.FLOOR; tgMap[py][COLS-2] = SYMBOLS.FLOOR; } }
                    if (sx > 0)                  { for (let py = 11; py <= 13; py++) { tgMap[py][0]      = SYMBOLS.FLOOR; tgMap[py][1]      = SYMBOLS.FLOOR; } }
                    if (sy < screenGridSize - 1) { for (let ppx = 18; ppx <= 21; ppx++) { tgMap[ROWS-1][ppx] = SYMBOLS.FLOOR; tgMap[ROWS-2][ppx] = SYMBOLS.FLOOR; } }
                    if (sy > 0)                  { for (let ppx = 18; ppx <= 21; ppx++) { tgMap[0][ppx]      = SYMBOLS.FLOOR; tgMap[1][ppx]      = SYMBOLS.FLOOR; } }

                    const tgHp = 80 + floorLevel * 5;

                    // 下壁沿い HOPPER_TURRET: dir:0 (上向きレーザー、左右移動)
                    const tgBottom = 4 + Math.floor(Math.random() * 4);
                    for (let i = 0; i < tgBottom; i++) {
                        for (let retry = 0; retry < 100; retry++) {
                            const tx = 3 + Math.floor(Math.random() * (COLS - 8));
                            const ty = ROWS - 2;
                            if (tgMap[ty][tx] !== SYMBOLS.FLOOR) continue;
                            if (tgEnemies.some(e => e.x === tx && e.y === ty)) continue;
                            if (tx >= 17 && tx <= 22) continue; // 下通路付近除外
                            tgEnemies.push({ type:'HOPPER_TURRET', x:tx, y:ty, dir:0, hp:tgHp, maxHp:tgHp, flashUntil:0, offsetX:0, offsetY:0, expValue:50, stunTurns:0, hopTimer:1+Math.floor(Math.random()*3) });
                            break;
                        }
                    }

                    // 右壁沿い HOPPER_TURRET: dir:3 (左向きレーザー、上下移動)
                    const tgRight = 3 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < tgRight; i++) {
                        for (let retry = 0; retry < 100; retry++) {
                            const tx = COLS - 2;
                            const ty = 3 + Math.floor(Math.random() * (ROWS - 8));
                            if (tgMap[ty][tx] !== SYMBOLS.FLOOR) continue;
                            if (tgEnemies.some(e => e.x === tx && e.y === ty)) continue;
                            if (ty >= 10 && ty <= 14) continue; // 右通路付近除外
                            tgEnemies.push({ type:'HOPPER_TURRET', x:tx, y:ty, dir:3, hp:tgHp, maxHp:tgHp, flashUntil:0, offsetX:0, offsetY:0, expValue:50, stunTurns:0, hopTimer:1+Math.floor(Math.random()*3) });
                            break;
                        }
                    }

                    // 上壁沿い HOPPER_TURRET: dir:2 (下向きレーザー、左右移動) ※確率50%で追加
                    if (Math.random() < 0.5) {
                        const tgTop = 3 + Math.floor(Math.random() * 3);
                        for (let i = 0; i < tgTop; i++) {
                            for (let retry = 0; retry < 100; retry++) {
                                const tx = 3 + Math.floor(Math.random() * (COLS - 8));
                                const ty = 1;
                                if (tgMap[ty][tx] !== SYMBOLS.FLOOR) continue;
                                if (tgEnemies.some(e => e.x === tx && e.y === ty)) continue;
                                if (tx >= 17 && tx <= 22) continue;
                                tgEnemies.push({ type:'HOPPER_TURRET', x:tx, y:ty, dir:2, hp:tgHp, maxHp:tgHp, flashUntil:0, offsetX:0, offsetY:0, expValue:50, stunTurns:0, hopTimer:1+Math.floor(Math.random()*3) });
                                break;
                            }
                        }
                    }

                    screenGrid.maps[sy][sx] = tgMap;
                    screenGrid.enemies[sy][sx] = tgEnemies;
                    screenGrid.wisps[sy][sx] = [];
                    screenGrid.tempWalls[sy][sx] = [];
                    allRooms[`${sx},${sy}`] = [{ x:1, y:1, w:COLS-2, h:ROWS-2, cx:Math.floor(COLS/2), cy:Math.floor(ROWS/2) }];
                    addLog('⚠️ Turret fire echoes from a nearby chamber...');
                    continue;
                }

                if (deepTheme) {
                    // フロアテーマの重みに基づいてスクリーンタイプを選択（タイプ分布はフロア全体で統一）
                    const _w = deepTheme.screenTypeWeights;
                    const _r = Math.random();
                    const _t1 = _w.maze, _t2 = _t1 + _w.dungeon, _t3 = _t2 + _w.castle;
                    screenType = _r < _t1 ? 'maze' : _r < _t2 ? 'dungeon' : _r < _t3 ? 'castle' : 'breaker';
                } else if (floorLevel >= 90 && !isSpecial && Math.random() < 0.35) {
                    screenType = 'breaker'; // 35%の確率で壁掘り型
                } else {
                    const r = Math.random();
                    screenType = r < 0.15 ? 'maze' : r < 0.35 ? 'dungeon' : 'castle';
                }
                const result = generateOneScreen(sx, sy, screenType, _sTheme);
                screenGrid.maps[sy][sx] = result.sMap;
                screenGrid.enemies[sy][sx] = result.sEnemies;
                screenGrid.wisps[sy][sx] = result.sWisps;
                screenGrid.tempWalls[sy][sx] = result.sTempWalls || [];
                allRooms[`${sx},${sy}`] = result.rooms;

                // ===== いかれたG (3%: 101F以上・スタート画面以外) =====
                if (floorLevel >= 101 && !(sx === 0 && sy === 0) && Math.random() < 0.03 && result.rooms.length >= 1) {
                    const gRoom = result.rooms[Math.floor(Math.random() * result.rooms.length)];
                    const gHp = 500 + floorLevel * 10;
                    screenGrid.enemies[sy][sx].push({
                        type: 'CRAZY_G', x: gRoom.cx, y: gRoom.cy,
                        hp: gHp, maxHp: gHp,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 200, stunTurns: 0
                    });
                }

                // ===== サモナールーム (1%: 101F以上・スタート画面以外) =====
                if (floorLevel >= 101 && !(sx === 0 && sy === 0) && Math.random() < 0.01 && result.rooms.length >= 2) {
                    // 十分広い部屋（8x6以上）のみ候補にする
                    const largeRooms = result.rooms.slice(1).filter(r => r.w >= 8 && r.h >= 6);
                    if (largeRooms.length === 0) { /* 大きな部屋がなければスキップ */ }
                    else {
                    const sr = largeRooms[Math.floor(Math.random() * largeRooms.length)];
                    const sMap2 = screenGrid.maps[sy][sx];

                    // 部屋をきれいな床に整える（最低8x6確保）
                    const srW = Math.max(sr.w, 8), srH = Math.max(sr.h, 6);
                    const srX = Math.max(1, Math.min(sr.x, COLS - srW - 1));
                    const srY = Math.max(1, Math.min(sr.y, ROWS - srH - 1));
                    for (let ry = srY; ry < srY + srH; ry++)
                        for (let rx = srX; rx < srX + srW; rx++)
                            sMap2[ry][rx] = SYMBOLS.FLOOR;

                    // 外壁（部屋の輪郭）を壁に戻してはっきりした部屋感を出す
                    for (let ry = srY; ry < srY + srH; ry++) {
                        sMap2[ry][srX] = SYMBOLS.WALL;
                        sMap2[ry][srX + srW - 1] = SYMBOLS.WALL;
                    }
                    for (let rx = srX; rx < srX + srW; rx++) {
                        sMap2[srY][rx] = SYMBOLS.WALL;
                        sMap2[srY + srH - 1][rx] = SYMBOLS.WALL;
                    }

                    // 入口（南側中央を開ける）
                    const entX = srX + Math.floor(srW / 2);
                    sMap2[srY + srH - 1][entX] = SYMBOLS.FLOOR;
                    sMap2[srY + srH - 1][entX - 1] = SYMBOLS.FLOOR;

                    // 氷床：部屋内を半分氷で覆う（上半分）
                    for (let ry = srY + 1; ry < srY + Math.floor(srH / 2); ry++)
                        for (let rx = srX + 1; rx < srX + srW - 1; rx++)
                            sMap2[ry][rx] = SYMBOLS.ICE;

                    // 内側の柱（4隅の内側1マス）
                    const pillarPositions = [
                        {x: srX+1, y: srY+1}, {x: srX+srW-2, y: srY+1},
                        {x: srX+1, y: srY+srH-2}, {x: srX+srW-2, y: srY+srH-2}
                    ];
                    for (const p of pillarPositions) sMap2[p.y][p.x] = SYMBOLS.WALL;

                    // 部屋内の既存敵を除去
                    screenGrid.enemies[sy][sx] = screenGrid.enemies[sy][sx].filter(
                        e => !(e.x >= srX && e.x < srX + srW && e.y >= srY && e.y < srY + srH)
                    );

                    // SUMMONER を中央上寄りに配置
                    const sumX = srX + Math.floor(srW / 2) - 1;
                    const sumY = srY + 2;
                    const sHp2 = 80 + floorLevel * 4;
                    const sumBody = [];
                    const word = "ummoner";
                    for (let i = 0; i < word.length; i++)
                        sumBody.push({ x: sumX + i + 1, y: sumY, char: word[i] });
                    screenGrid.enemies[sy][sx].push({
                        type: 'SUMMONER', x: sumX, y: sumY,
                        hp: sHp2, maxHp: sHp2,
                        flashUntil: 0, offsetX: 0, offsetY: 0,
                        expValue: 80, stunTurns: 0,
                        summonCooldown: 5, summonedCount: 0,
                        body: sumBody
                    });

                    // 護衛NORMAL 2体
                    for (const gPos of [{x: sumX-2, y: sumY+2}, {x: sumX+4, y: sumY+2}]) {
                        if (gPos.x > srX && gPos.x < srX+srW-1 && gPos.y > srY && gPos.y < srY+srH-1) {
                            sMap2[gPos.y][gPos.x] = SYMBOLS.FLOOR;
                            screenGrid.enemies[sy][sx].push({
                                type: 'NORMAL', x: gPos.x, y: gPos.y,
                                hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0
                            });
                        }
                    }

                    // 報酬アイテム（サモナーの奥・上端近く）
                    const rewardX = sumX + 1, rewardY = srY + 1;
                    if (sMap2[rewardY][rewardX] !== SYMBOLS.WALL) {
                        sMap2[rewardY][rewardX] = SYMBOLS.FLOOR;
                        const rewards = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.EXPLOSION, SYMBOLS.GUARDIAN, SYMBOLS.HEAL_TOME];
                        sMap2[rewardY][rewardX] = rewards[Math.floor(Math.random() * rewards.length)];
                    }

                    addLog("⚠️ A Summoner's Sanctum lurks nearby...");
                    } // end largeRooms check
                }
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

        // カギ: 決定済みの画面に配置
        const keyMap = screenGrid.maps[keyScreenY][keyScreenX];
        for (let y = ROWS - 3; y >= 2; y--) {
            let placed = false;
            for (let x = COLS - 3; x >= 2; x--) {
                if (keyMap[y][x] === SYMBOLS.FLOOR) { keyMap[y][x] = SYMBOLS.KEY; placed = true; break; }
            }
            if (placed) break;
        }

        // Stage 97: マルチスクリーン上でKEYをKEY_RUNNERに差し替え
        if (floorLevel === 97) {
            let krX = -1, krY = -1;
            for (let y = 0; y < ROWS && krX === -1; y++)
                for (let x = 0; x < COLS && krX === -1; x++)
                    if (keyMap[y][x] === SYMBOLS.KEY) { krX = x; krY = y; keyMap[y][x] = SYMBOLS.FLOOR; }
            if (krX !== -1) {
                const krHp = 10 + floorLevel;
                screenGrid.enemies[keyScreenY][keyScreenX].push({
                    type: 'KEY_RUNNER', x: krX, y: krY,
                    hp: krHp, maxHp: krHp,
                    flashUntil: 0, offsetX: 0, offsetY: 0,
                    expValue: 80, stunTurns: 0,
                    flee: true, holdsKey: true,
                    trailX: null, trailY: null
                });
            }
            addLog("EVENT: Stage 97 — The Key Thief!");
            addLog("🔑 K holds the only key. Find it across the labyrinth!");
        }

        // 階段(DOOR): 決定済みの画面に配置
        const doorMap = screenGrid.maps[doorScreenY][doorScreenX];
        const doorRooms = allRooms[`${doorScreenX},${doorScreenY}`];
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

        // マルチスクリーン内の商人配置
        if (isMerchantFloor) {
            // スタート・カギ・ドア・セーブ以外の画面から1つ選ぶ
            const reserved = new Set(['0,0', `${screenGridSize-1},${screenGridSize-1}`, `${screenGridSize-1},0`,
                `${screenGridSize > 2 ? Math.floor(screenGridSize/2) : 0},${Math.floor(screenGridSize/2)}`]);
            const candidates = [];
            for (let sy2 = 0; sy2 < screenGridSize; sy2++) {
                for (let sx2 = 0; sx2 < screenGridSize; sx2++) {
                    if (!reserved.has(`${sx2},${sy2}`)) candidates.push({ sx: sx2, sy: sy2 });
                }
            }
            if (candidates.length > 0) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                const mMap = screenGrid.maps[pick.sy][pick.sx];
                const mRooms = allRooms[`${pick.sx},${pick.sy}`];
                if (mRooms && mRooms.length > 0) {
                    const mRoom = mRooms[Math.floor(Math.random() * mRooms.length)];
                    // 部屋内の床タイルに商人を配置
                    for (let ty = mRoom.y; ty < mRoom.y + mRoom.h; ty++) {
                        let placed = false;
                        for (let tx = mRoom.x; tx < mRoom.x + mRoom.w; tx++) {
                            if (mMap[ty][tx] === SYMBOLS.FLOOR
                                && ty >= 1 && ty < ROWS - 1 && tx >= 1 && tx < COLS - 1
                                && mMap[ty-1][tx] !== SYMBOLS.WALL && mMap[ty+1][tx] !== SYMBOLS.WALL
                                && mMap[ty][tx-1] !== SYMBOLS.WALL && mMap[ty][tx+1] !== SYMBOLS.WALL) {
                                mMap[ty][tx] = SYMBOLS.MERCHANT;
                                merchantState = { x: tx, y: ty, facing: 'LEFT', jumpUntil: 0, nextAction: 3 + Math.floor(Math.random() * 4), hp: 30 };
                                lastMerchantFloor = floorLevel;
                                // 商人の位置の敵を除去
                                screenGrid.enemies[pick.sy][pick.sx] = screenGrid.enemies[pick.sy][pick.sx].filter(
                                    e => !(e.x === tx && e.y === ty)
                                );
                                placed = true;
                                break;
                            }
                        }
                        if (placed) break;
                    }
                }
            }
        }

        // 現在の画面をグローバルにロード
        currentScreen = { x: 0, y: 0 };
        map = screenGrid.maps[0][0];
        enemies = screenGrid.enemies[0][0];
        wisps = screenGrid.wisps[0][0];
        tempWalls = [...(screenGrid.tempWalls[0][0] || [])];
        isWindFloor = screenGrid.wind[0][0];

        // フロアに狂人を0〜1体だけ配置（101F以上・テーマで変動）
        if (floorLevel >= 101 && Math.random() < (deepTheme ? deepTheme.madmanChance : 0.40)) {
            // スタート画面(0,0)以外の非空スクリーンからランダムに選ぶ
            const candidates = [];
            for (let sy = 0; sy < screenGridSize; sy++)
                for (let sx = 0; sx < screenGridSize; sx++)
                    if (!(sx===0 && sy===0)) candidates.push({sx, sy});
            if (candidates.length > 0) {
                const pick = candidates[Math.floor(Math.random() * candidates.length)];
                const mMap = screenGrid.maps[pick.sy][pick.sx];
                for (let t = 0; t < 200; t++) {
                    const mx = Math.floor(Math.random()*(COLS-4))+2;
                    const my = Math.floor(Math.random()*(ROWS-4))+2;
                    const tile = mMap[my][mx];
                    if ((tile===SYMBOLS.FLOOR||tile===SYMBOLS.ICE) &&
                        !screenGrid.enemies[pick.sy][pick.sx].some(e=>e.x===mx&&e.y===my)) {
                        const hp = 15+floorLevel*2;
                        screenGrid.enemies[pick.sy][pick.sx].push({
                            type:'MADMAN', x:mx, y:my, hp, maxHp:hp,
                            flashUntil:0, offsetX:0, offsetY:0, expValue:30, stunTurns:0
                        });
                        break;
                    }
                }
            }
        }

        // 全スクリーンのMADMANをmovingMadmenに転送（スクリーン追跡のため）
        for (let sy = 0; sy < screenGridSize; sy++) {
            for (let sx = 0; sx < screenGridSize; sx++) {
                const madmen = screenGrid.enemies[sy][sx].filter(e => e.type === 'MADMAN');
                if (madmen.length > 0) {
                    screenGrid.enemies[sy][sx] = screenGrid.enemies[sy][sx].filter(e => e.type !== 'MADMAN');
                    madmen.forEach(m => movingMadmen.push({ ...m, screenX: sx, screenY: sy }));
                }
            }
        }
        // 聖域フロア: 全スクリーンの敵を友好的に（青色、攻撃しない）
        if (deepTheme && deepTheme.isSanctuaryFloor) {
            isSanctuaryFloor = true;
            for (let sy = 0; sy < screenGridSize; sy++)
                for (let sx = 0; sx < screenGridSize; sx++)
                    screenGrid.enemies[sy][sx].forEach(e => {
                    e.isAlly = true;
                    // 擬態中のミミックは擬態解除してSTAIRSタイルを除去
                    if (e.type === 'MIMIC' && e.disguised) {
                        e.disguised = false;
                        if (screenGrid.maps && screenGrid.maps[sy] && screenGrid.maps[sy][sx]) {
                            screenGrid.maps[sy][sx][e.y][e.x] = SYMBOLS.FLOOR;
                        }
                    }
                });
            movingMadmen.forEach(m => { m.isAlly = true; });
            addLog("Something feels different here...");
            addLog("All is silent. / すべてが静かだ。");
            addLog("The creatures here are at peace. / この階の者たちは、おだやかだ。");
        }

        // スタート画面(0,0)のmovingMadmenは即座にenemiesへ（ただしプレイヤーから遠ければ）
        enemies = screenGrid.enemies[0][0];
        const startMadmen = movingMadmen.filter(m => m.screenX === 0 && m.screenY === 0 &&
            !(Math.abs(m.x - player.x) <= 3 && Math.abs(m.y - player.y) <= 3));
        movingMadmen = movingMadmen.filter(m => !(m.screenX === 0 && m.screenY === 0));
        enemies.push(...startMadmen);

        // Stage 98: FAIRY_MIMICをスタート画面以外の各スクリーンに70%で1体ずつ配置
        if (floorLevel === 98) {
            for (let sy = 0; sy < screenGridSize; sy++) {
                for (let sx = 0; sx < screenGridSize; sx++) {
                    if (sx === 0 && sy === 0) continue; // スタート画面はスキップ
                    if (Math.random() >= 0.70) continue;
                    const fmMap = screenGrid.maps[sy][sx];
                    for (let t = 0; t < 300; t++) {
                        const fx = Math.floor(Math.random() * (COLS - 4)) + 2;
                        const fy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                        if (fmMap[fy][fx] === SYMBOLS.FLOOR &&
                            !screenGrid.enemies[sy][sx].some(e => e.x === fx && e.y === fy)) {
                            const fmHp = Math.floor(floorLevel / 2) + 8;
                            screenGrid.enemies[sy][sx].push({
                                type: 'FAIRY_MIMIC',
                                x: fx, y: fy,
                                hp: fmHp, maxHp: fmHp,
                                disguised: true,
                                mimicTransitionEnd: 0,
                                flashUntil: 0, offsetX: 0, offsetY: 0,
                                expValue: 20, stunTurns: 0,
                                moveCooldown: 0
                            });
                            break;
                        }
                    }
                }
            }
            addLog("⚠️ Something feels... off about those fairies.");
        }

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

    // --- SUMMONER STAGE (Floor 88) ---
    // ===== 85階: 嵐の壁窟 (2x2マルチスクリーン + 全画面突風 + Breaker Den) =====
    if (floorLevel === 85) {
        addLog("EVENT: The Wrecking Storm.");
        addLog("⚠️ BREAKERs lurk within every wall. Violent winds howl through all chambers!");

        multiScreenMode = true;
        screenGridSize = 2;
        addLog("⚠️ DANGER ZONE: Multi-screen labyrinth!");
        addLog("Explore 2x2 screens to find the KEY and EXIT.");

        screenGrid = {
            maps:    Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => null)),
            enemies: Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => [])),
            wisps:   Array.from({ length: 2 }, () => Array.from({ length: 2 }, () => [])),
            wind:    [[true, true], [true, true]]  // 全画面で突風
        };

        const allRooms85 = {};

        // 各画面生成
        for (let sy = 0; sy < 2; sy++) {
            for (let sx = 0; sx < 2; sx++) {
                const sMap = Array.from({ length: ROWS }, () => Array(COLS).fill(SYMBOLS.WALL));
                const sEnemies = [];
                const rooms = [];

                // 通路入口エリアを確保
                const entryPoints = [];
                if (sx > 0) entryPoints.push({ x: 3,        y: 12 });
                if (sx < 1) entryPoints.push({ x: COLS - 4, y: 12 });
                if (sy > 0) entryPoints.push({ x: 19,       y: 3 });
                if (sy < 1) entryPoints.push({ x: 19,       y: ROWS - 4 });
                if (entryPoints.length === 0) entryPoints.push({ x: 3, y: 3 });

                for (const ep of entryPoints) {
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        const ey = ep.y + dy, ex = ep.x + dx;
                        if (ey >= 1 && ey < ROWS - 1 && ex >= 1 && ex < COLS - 1) sMap[ey][ex] = SYMBOLS.FLOOR;
                    }
                    rooms.push({ x: ep.x - 1, y: ep.y - 1, w: 3, h: 3, cx: ep.x, cy: ep.y });
                }

                // 壁内の孤立セル探索ヘルパー
                const findTrapped85 = (minDist) => {
                    for (let t = 0; t < 150; t++) {
                        const cx = Math.floor(Math.random() * (COLS - 6)) + 3;
                        const cy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                        if (sMap[cy][cx] !== SYMBOLS.WALL) continue;
                        if (sMap[cy-1][cx] !== SYMBOLS.WALL || sMap[cy+1][cx] !== SYMBOLS.WALL ||
                            sMap[cy][cx-1] !== SYMBOLS.WALL || sMap[cy][cx+1] !== SYMBOLS.WALL) continue;
                        if (entryPoints.some(ep => Math.abs(cx - ep.x) + Math.abs(cy - ep.y) < minDist)) continue;
                        return { x: cx, y: cy };
                    }
                    return null;
                };

                // BOMBER を7体（床タイルに配置）
                const findFloor85 = () => {
                    for (let t = 0; t < 300; t++) {
                        const cx = Math.floor(Math.random() * (COLS - 4)) + 2;
                        const cy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                        if (sMap[cy][cx] !== SYMBOLS.FLOOR) continue;
                        if (sEnemies.some(fe => fe.x === cx && fe.y === cy)) continue;
                        return { x: cx, y: cy };
                    }
                    return null;
                };
                for (let i = 0; i < 7; i++) {
                    const pos = findFloor85();
                    if (!pos) continue;
                    sEnemies.push({ type: 'BOMBER', x: pos.x, y: pos.y, hp: 1, maxHp: 1, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 12, stunTurns: 0 });
                }
                // アイテム
                for (const item of [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.HEAL_TOME]) {
                    const pos = findTrapped85(3); if (!pos) continue;
                    sMap[pos.y][pos.x] = item;
                }

                // 四辺の中央にBREAKER固定配置（左/右/上/下）
                { const bHp = 50 + floorLevel * 4;
                  const mkB85 = (x, y) => ({ type: 'BREAKER', x, y, hp: bHp, maxHp: bHp, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });
                  sMap[12][2]        = SYMBOLS.FLOOR; sEnemies.push(mkB85(2,        12)); // 左辺
                  sMap[12][COLS - 3] = SYMBOLS.FLOOR; sEnemies.push(mkB85(COLS - 3, 12)); // 右辺
                  sMap[2][19]        = SYMBOLS.FLOOR; sEnemies.push(mkB85(19,        2)); // 上辺
                  sMap[ROWS - 3][19] = SYMBOLS.FLOOR; sEnemies.push(mkB85(19, ROWS - 3)); // 下辺
                }

                // ウィルを5体（壁の中に封じ込める）
                const sWisps85 = [];
                for (let i = 0; i < 5; i++) {
                    const pos = findTrapped85(4);
                    if (!pos) continue;
                    sMap[pos.y][pos.x] = SYMBOLS.FLOOR;
                    sWisps85.push({ x: pos.x, y: pos.y, dir: Math.floor(Math.random() * 4), mode: 'STRAIGHT' });
                }

                // モンスタールーム: 左下画面(sx=0, sy=1)に作成
                if (sx === 0 && sy === 1) {
                    const mrx = 8, mry = 8, mrw = 8, mrh = 5;
                    for (let ry = mry; ry < mry + mrh; ry++)
                        for (let rx = mrx; rx < mrx + mrw; rx++) sMap[ry][rx] = SYMBOLS.FLOOR;
                    rooms.push({ x: mrx, y: mry, w: mrw, h: mrh, cx: mrx + 4, cy: mry + 2 });
                    let mCount = 0;
                    for (let ry = mry; ry < mry + mrh; ry++) for (let rx = mrx; rx < mrx + mrw; rx++) {
                        if (Math.random() < 0.75 && !sEnemies.some(e => e.x === rx && e.y === ry)) {
                            sEnemies.push({ type: 'BOMBER', x: rx, y: ry, hp: 1, maxHp: 1, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 12, stunTurns: 0 });
                            mCount++;
                        }
                    }
                    addLog(`👾 MONSTER ROOM lurks in the storm — ${mCount} creatures!`);
                }

                // 隣接画面への外壁通路を開ける（画面遷移に必須）
                if (sx < 1) { for (let py = 11; py <= 13; py++) { sMap[py][COLS-1] = SYMBOLS.FLOOR; sMap[py][COLS-2] = SYMBOLS.FLOOR; } }
                if (sx > 0) { for (let py = 11; py <= 13; py++) { sMap[py][0]      = SYMBOLS.FLOOR; sMap[py][1]      = SYMBOLS.FLOOR; } }
                if (sy < 1) { for (let px = 18; px <= 21; px++) { sMap[ROWS-1][px] = SYMBOLS.FLOOR; sMap[ROWS-2][px] = SYMBOLS.FLOOR; } }
                if (sy > 0) { for (let px = 18; px <= 21; px++) { sMap[0][px]      = SYMBOLS.FLOOR; sMap[1][px]      = SYMBOLS.FLOOR; } }

                screenGrid.maps[sy][sx] = sMap;
                screenGrid.enemies[sy][sx] = sEnemies;
                screenGrid.wisps[sy][sx] = sWisps85;
                allRooms85[`${sx},${sy}`] = rooms;
            }
        }

        // プレイヤー: 画面(0,0)左上 - 3つの小部屋 + 通路 + BREAKER×3
        player.x = 3; player.y = 3;
        const startMap85 = screenGrid.maps[0][0];
        // ① スタート小部屋 (1,1)〜(5,5)
        for (let ry = 1; ry <= 5; ry++)
            for (let rx = 1; rx <= 5; rx++)
                startMap85[ry][rx] = SYMBOLS.FLOOR;
        // ② 右エントリ小部屋: (34,10)〜(38,14)
        for (let ry = 10; ry <= 14; ry++)
            for (let rx = 34; rx <= 38; rx++)
                startMap85[ry][rx] = SYMBOLS.FLOOR;
        // ③ 下エントリ小部屋: (17,19)〜(21,23)
        for (let ry = 19; ry <= 23; ry++)
            for (let rx = 17; rx <= 21; rx++)
                startMap85[ry][rx] = SYMBOLS.FLOOR;
        // プレイヤーそばの敵をクリア
        screenGrid.enemies[0][0] = screenGrid.enemies[0][0].filter(
            e => !(Math.abs(e.x - player.x) <= 3 && Math.abs(e.y - player.y) <= 3)
        );
        // BREAKER×3 各小部屋そばの壁に配置
        const bHp85 = 50 + floorLevel * 4;
        const mkBreaker85 = (x, y) => ({ type: 'BREAKER', x, y, hp: bHp85, maxHp: bHp85, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });
        // 自キャラ(3,3)の1マス隣にBREAKER（床タイルなので設定不要）
        screenGrid.enemies[0][0].push(mkBreaker85(4, 3));  // 自キャラの右隣

        // KEY: 画面(1,1)右下付近に床を確保して配置
        const k85Map = screenGrid.maps[1][1];
        const kx85 = COLS - 4, ky85 = ROWS - 4;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const ty = ky85 + dy, tx = kx85 + dx;
            if (ty >= 1 && ty < ROWS - 1 && tx >= 1 && tx < COLS - 1) k85Map[ty][tx] = SYMBOLS.FLOOR;
        }
        k85Map[ky85][kx85] = SYMBOLS.KEY;
        // KEYの1マス隣にBREAKER（3×3床エリア内なので設定不要）
        screenGrid.enemies[1][1].push({ type: 'BREAKER', x: kx85 - 1, y: ky85, hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });

        // STAIRS: 画面(1,0)右上付近に床を確保して配置
        const s85Map = screenGrid.maps[0][1];
        const ex85 = COLS - 4, ey85 = 3;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const ty = ey85 + dy, tx = ex85 + dx;
            if (ty >= 1 && ty < ROWS - 1 && tx >= 1 && tx < COLS - 1) s85Map[ty][tx] = SYMBOLS.FLOOR;
        }
        s85Map[ey85][ex85] = SYMBOLS.DOOR; // 鍵を取るまで封印された扉
        // 穴(STAIRS)の1マス隣にBREAKER（3×3床エリア内なので設定不要）
        screenGrid.enemies[0][1].push({ type: 'BREAKER', x: ex85 - 1, y: ey85, hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45, stunTurns: 0 });

        // 現在の画面をグローバルにロード
        currentScreen = { x: 0, y: 0 };
        map = screenGrid.maps[0][0];
        enemies = screenGrid.enemies[0][0];
        wisps = screenGrid.wisps[0][0];
        tempWalls = [...(screenGrid.tempWalls?.[0]?.[0] || [])];
        isWindFloor = true;
        windTimer = 4;

        return;
    }

    if (floorLevel === 88) {
        addLog("A vast, empty hall... Something lurks here.");

        // 広い空間を生成（外周1マスが壁、残りは全て床）
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y < 1 || y >= ROWS - 1 || x < 1 || x >= COLS - 1) {
                    map[y][x] = SYMBOLS.WALL;
                } else {
                    map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }

        // プレイヤー開始位置（下部中央）
        player.x = Math.floor(COLS / 2);
        player.y = ROWS - 3;

        // 穴（出口）を上部に配置
        const holeX = Math.floor(COLS / 2) - 1;
        const holeY = 4;

        // 穴の周辺に逆三角形の氷の床を配置（フロア面積の約20%）
        // 逆三角形: 上が広く下に向かって狭くなる
        const iceTopY = 1;       // 氷の開始行
        const iceBottomY = 15;   // 氷の終了行
        const iceHeight = iceBottomY - iceTopY + 1; // 15行
        for (let y = iceTopY; y <= iceBottomY; y++) {
            // 上ほど幅が広い逆三角形: 進行度に応じて幅を線形に狭める
            const progress = (y - iceTopY) / iceHeight; // 0(上)→1(下)
            const halfWidth = Math.floor((1 - progress) * 16) + 1;
            for (let x = holeX - halfWidth; x <= holeX + halfWidth; x++) {
                if (x >= 1 && x < COLS - 1 && map[y][x] === SYMBOLS.FLOOR) {
                    map[y][x] = SYMBOLS.ICE;
                }
            }
        }

        map[holeY][holeX] = SYMBOLS.STAIRS;

        // 穴の左右と下に1マスの壁を設置（滑り止め）
        map[holeY][holeX - 1] = SYMBOLS.WALL;
        map[holeY][holeX + 1] = SYMBOLS.WALL;
        map[holeY + 1][holeX] = SYMBOLS.WALL;

        // 召喚師を2体配置（左右に分かれて配置）
        const sHp = 80 + floorLevel * 4;
        const summonerWord = "ummoner";
        [{ sx: 6, sy: 8 }, { sx: COLS - 14, sy: 8 }].forEach(pos => {
            const body = [];
            for (let i = 0; i < summonerWord.length; i++) {
                body.push({ x: pos.sx + (i + 1), y: pos.sy, char: summonerWord[i] });
            }
            enemies.push({
                type: 'SUMMONER', x: pos.sx, y: pos.sy,
                hp: sHp, maxHp: sHp,
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: 80, stunTurns: 0,
                summonCooldown: 5, summonedCount: 0,
                body: body
            });
        });

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

    if (floorLevel === 4) {
        addLog("EVENT: The Sealed Chamber.");
        addLog("TIP: W (Breaker) destroys walls. Let it carve a path!");

        // 全面を壁で埋める
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        // --- 左の小部屋（プレイヤー）---
        // 3x3の小部屋: x=2..4, y=11..13
        for (let y = 11; y <= 13; y++) {
            for (let x = 2; x <= 4; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        player.x = 3; player.y = 12;

        // --- 右の小部屋（穴）---
        // 3x3の小部屋: x=35..37, y=11..13
        for (let y = 11; y <= 13; y++) {
            for (let x = 35; x <= 37; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        map[12][36] = SYMBOLS.STAIRS;

        // --- BREAKER 3匹 ---
        // 1. プレイヤーのとなり（左部屋内）
        enemies.push({
            type: 'BREAKER', x: 4, y: 12,
            hp: 30, maxHp: 30,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
            stunTurns: 0
        });

        // 2. 中間地点（壁の中に1マス空間）
        map[12][20] = SYMBOLS.FLOOR;
        enemies.push({
            type: 'BREAKER', x: 20, y: 12,
            hp: 30, maxHp: 30,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
            stunTurns: 0
        });

        // 3. 穴のとなり（右部屋内）
        enemies.push({
            type: 'BREAKER', x: 35, y: 12,
            hp: 30, maxHp: 30,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
            stunTurns: 0
        });

        return;
    }

    if (floorLevel === 10) {
        addLog("EVENT: A voice echoes from deep within the walls...");
        addLog("TIP: Let the Breakers (W) carve through the walls!");

        // 全面を壁で埋める
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        // --- 左の小部屋（プレイヤー）3x3: x=2..4, y=11..13
        for (let y = 11; y <= 13; y++) {
            for (let x = 2; x <= 4; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        player.x = 3; player.y = 12;

        // --- 中央の小部屋（商人）5x3: x=18..22, y=11..13
        for (let y = 11; y <= 13; y++) {
            for (let x = 18; x <= 22; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        map[12][20] = SYMBOLS.MERCHANT;
        merchantState = { x: 20, y: 12, facing: 'LEFT', jumpUntil: 0, nextAction: 3 + Math.floor(Math.random() * 4), hp: 30 };

        // --- 右の小部屋（穴）3x3: x=35..37, y=11..13
        for (let y = 11; y <= 13; y++) {
            for (let x = 35; x <= 37; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        map[12][36] = SYMBOLS.STAIRS;

        // --- BREAKER 2匹 ---
        // 1. プレイヤーの右隣（左部屋から右へ掘り進む）
        enemies.push({
            type: 'BREAKER', x: 4, y: 12,
            hp: 50, maxHp: 50,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
            stunTurns: 0
        });
        // 2. 穴の左隣（右部屋から左へ掘り進む）
        enemies.push({
            type: 'BREAKER', x: 35, y: 12,
            hp: 50, maxHp: 50,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 30,
            stunTurns: 0
        });

        return;
    }

    if (floorLevel === 15) {
        addLog("EVENT: The Frozen Hall.");
        addLog("WARNING: The entire floor is covered in ice!");
        isIceFloor = true;

        // 全面を氷にする
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.ICE;
            }
        }

        // 出口座標
        const exitX15 = COLS - 4, exitY15 = ROWS - 4; // (36, 21)

        // 左上コーナー（出入り口）周辺の厚い壁
        for (let y = 1; y <= 7; y++) map[y][1] = SYMBOLS.WALL;
        for (let y = 1; y <= 4; y++) map[y][2] = SYMBOLS.WALL;
        for (let x = 2; x <= 7; x++) map[1][x] = SYMBOLS.WALL;
        for (let x = 2; x <= 4; x++) map[2][x] = SYMBOLS.WALL;

        // 右下コーナー（出口）周辺の厚い壁
        for (let y = 18; y <= ROWS - 2; y++) map[y][COLS - 2] = SYMBOLS.WALL; // x=38
        for (let y = 19; y <= ROWS - 2; y++) map[y][COLS - 3] = SYMBOLS.WALL; // x=37
        for (let x = COLS - 5; x <= COLS - 2; x++) map[ROWS - 2][x] = SYMBOLS.WALL; // y=23
        for (let x = COLS - 5; x <= COLS - 3; x++) map[ROWS - 3][x] = SYMBOLS.WALL; // y=22

        // 中央付近の入り組んだ障害物壁（迷路）
        const mazeWalls15 = [
            // 左クラスター (x=13-15, y=9-13)
            [13,9],[14,9],[15,9],
            [13,10],[15,10],
            [15,11],
            [13,12],[15,12],
            [13,13],[14,13],
            // 中央クラスター (x=19-21, y=8-15)
            [20,8],
            [19,9],[20,9],[21,9],
            [19,10],
            [19,11],[21,11],
            [21,12],
            [19,13],[21,13],
            [19,14],[20,14],[21,14],
            [20,15],
            // 右クラスター (x=25-27, y=9-13)
            [25,9],[26,9],[27,9],
            [25,10],[27,10],
            [25,11],
            [25,12],[27,12],
            [26,13],[27,13],
            // コネクター（左クラスター↔中央↔右クラスター）
            [17,10],[17,11],[17,12],
            [23,10],[23,11],[23,12],
        ];
        for (const [wx, wy] of mazeWalls15) {
            map[wy][wx] = SYMBOLS.WALL;
        }

        // ランダムに壁の柱を点在させる（出入り口・出口・迷路エリアを除外）
        for (let i = 0; i < 12; i++) {
            const wx = Math.floor(Math.random() * (COLS - 8)) + 4;
            const wy = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const nearEntry = Math.abs(wx - 3) + Math.abs(wy - 3) <= 5;
            const inMaze = wx >= 12 && wx <= 28 && wy >= 7 && wy <= 16;
            const nearExit = wx >= exitX15 - 4 && wy >= exitY15 - 4;
            if (!nearEntry && !inMaze && !nearExit) {
                map[wy][wx] = SYMBOLS.WALL;
            }
        }

        // 上下の壁からランダムに1マスの出っ張りを作る（左半分のみ）
        const halfX = Math.floor(COLS / 2);
        for (let x = 8; x < halfX; x++) {
            if (Math.random() < 0.2) map[1][x] = SYMBOLS.WALL;
            if (Math.random() < 0.2) map[ROWS - 2][x] = SYMBOLS.WALL;
        }

        // プレイヤーを左上付近に配置、周囲を床にして滑らないように
        player.x = 3; player.y = 3;
        map[player.y][player.x] = SYMBOLS.FLOOR;
        for (const ad of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]) {
            if (map[player.y + ad.y][player.x + ad.x] !== SYMBOLS.WALL) {
                map[player.y + ad.y][player.x + ad.x] = SYMBOLS.FLOOR;
            }
        }

        // 出口を右下付近に配置
        map[exitY15][exitX15] = SYMBOLS.STAIRS;
        // 出口前のブレーキFLOOR（滑り込み防止）
        map[exitY15][exitX15 - 1] = SYMBOLS.FLOOR;     // (35,21)
        map[exitY15 - 1][exitX15] = SYMBOLS.FLOOR;     // (36,20)
        map[exitY15 - 1][exitX15 - 1] = SYMBOLS.FLOOR; // (35,20)

        // LAYER(L) 1匹
        for (let retry = 0; retry < 100; retry++) {
            const lx = Math.floor(Math.random() * (COLS - 6)) + 3;
            const ly = Math.floor(Math.random() * (ROWS - 6)) + 3;
            if ((map[ly][lx] === SYMBOLS.ICE || map[ly][lx] === SYMBOLS.FLOOR) &&
                !(lx === player.x && ly === player.y) &&
                !enemies.some(e => e.x === lx && e.y === ly) &&
                Math.abs(lx - player.x) + Math.abs(ly - player.y) > 5) {
                enemies.push({
                    type: 'LAYER', x: lx, y: ly,
                    hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25,
                    stunTurns: 0
                });
                break;
            }
        }

        // ザコ(E) 10匹
        for (let i = 0; i < 10; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if ((map[ey][ex] === SYMBOLS.ICE || map[ey][ex] === SYMBOLS.FLOOR) &&
                    !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey) &&
                    Math.abs(ex - player.x) + Math.abs(ey - player.y) > 4) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey,
                        hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ウィスプ 5匹（壁の柱に沿って巡回）
        for (let i = 0; i < 5; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const wx = Math.floor(Math.random() * (COLS - 6)) + 3;
                const wy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                if (map[wy][wx] !== SYMBOLS.WALL && map[wy][wx] !== SYMBOLS.STAIRS &&
                    !(wx === player.x && wy === player.y) &&
                    !wisps.some(w => w.x === wx && w.y === wy) &&
                    Math.abs(wx - player.x) + Math.abs(wy - player.y) > 5) {
                    wisps.push({ x: wx, y: wy, dir: Math.floor(Math.random() * 4), mode: 'FOLLOW' });
                    break;
                }
            }
        }

        // アイテム配置
        const f15items = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.SPEED, SYMBOLS.HEAL_TOME];
        for (const item of f15items) {
            for (let retry = 0; retry < 50; retry++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] === SYMBOLS.ICE || map[iy][ix] === SYMBOLS.FLOOR) { map[iy][ix] = item; break; }
            }
        }

        return;
    }

    if (floorLevel === 18) {
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
            if (map[ty][tx] === SYMBOLS.FLOOR) {
                const t25pool = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.HEAL_TOME, SYMBOLS.ESCAPE, SYMBOLS.BREAKER_TOME];
                map[ty][tx] = t25pool[Math.floor(Math.random() * t25pool.length)];
            }
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

    if (floorLevel === 23) {
        addLog("EVENT: The Frozen Vault.");
        addLog("WARNING: Ice covers the floor — and ancient Golems stand guard!");
        isIceFloor = true;

        // 全面を氷にする
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.ICE;
            }
        }

        // 出口座標
        const exitX23 = COLS - 4, exitY23 = ROWS - 4; // (36, 21)

        // 左上コーナー（出入り口）周辺の厚い壁
        for (let y = 1; y <= 7; y++) map[y][1] = SYMBOLS.WALL;
        for (let y = 1; y <= 4; y++) map[y][2] = SYMBOLS.WALL;
        for (let x = 2; x <= 7; x++) map[1][x] = SYMBOLS.WALL;
        for (let x = 2; x <= 4; x++) map[2][x] = SYMBOLS.WALL;

        // 右下コーナー（出口）周辺の厚い壁
        for (let y = 18; y <= ROWS - 2; y++) map[y][COLS - 2] = SYMBOLS.WALL; // x=38
        for (let y = 19; y <= ROWS - 2; y++) map[y][COLS - 3] = SYMBOLS.WALL; // x=37
        for (let x = COLS - 5; x <= COLS - 2; x++) map[ROWS - 2][x] = SYMBOLS.WALL; // y=23
        for (let x = COLS - 5; x <= COLS - 3; x++) map[ROWS - 3][x] = SYMBOLS.WALL; // y=22

        // 中央付近の入り組んだ障害物壁（迷路）
        const mazeWalls23 = [
            // 左クラスター (x=13-15, y=9-13)
            [13,9],[14,9],[15,9],
            [13,10],[15,10],
            [15,11],
            [13,12],[15,12],
            [13,13],[14,13],
            // 中央クラスター (x=19-21, y=8-15)
            [20,8],
            [19,9],[20,9],[21,9],
            [19,10],
            [19,11],[21,11],
            [21,12],
            [19,13],[21,13],
            [19,14],[20,14],[21,14],
            [20,15],
            // 右クラスター (x=25-27, y=9-13)
            [25,9],[26,9],[27,9],
            [25,10],[27,10],
            [25,11],
            [25,12],[27,12],
            [26,13],[27,13],
            // コネクター（左クラスター↔中央↔右クラスター）
            [17,10],[17,11],[17,12],
            [23,10],[23,11],[23,12],
        ];
        for (const [wx, wy] of mazeWalls23) {
            map[wy][wx] = SYMBOLS.WALL;
        }

        // ランダムに壁の柱を点在させる（出入り口・出口・迷路エリアを除外）
        for (let i = 0; i < 12; i++) {
            const wx = Math.floor(Math.random() * (COLS - 8)) + 4;
            const wy = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const nearEntry = Math.abs(wx - 3) + Math.abs(wy - 3) <= 5;
            const inMaze = wx >= 12 && wx <= 28 && wy >= 7 && wy <= 16;
            const nearExit = wx >= exitX23 - 4 && wy >= exitY23 - 4;
            if (!nearEntry && !inMaze && !nearExit) {
                map[wy][wx] = SYMBOLS.WALL;
            }
        }

        // 上下の壁からランダムに1マスの出っ張りを作る（左半分のみ）
        const halfX23 = Math.floor(COLS / 2);
        for (let x = 8; x < halfX23; x++) {
            if (Math.random() < 0.2) map[1][x] = SYMBOLS.WALL;
            if (Math.random() < 0.2) map[ROWS - 2][x] = SYMBOLS.WALL;
        }

        // プレイヤーを左上付近に配置、周囲を床にして滑らないように
        player.x = 3; player.y = 3;
        map[player.y][player.x] = SYMBOLS.FLOOR;
        for (const ad of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]) {
            if (map[player.y + ad.y] && map[player.y + ad.y][player.x + ad.x] !== SYMBOLS.WALL) {
                map[player.y + ad.y][player.x + ad.x] = SYMBOLS.FLOOR;
            }
        }

        // 出口を右下付近に配置
        map[exitY23][exitX23] = SYMBOLS.STAIRS;
        // 出口前のブレーキFLOOR（滑り込み防止）
        map[exitY23][exitX23 - 1] = SYMBOLS.FLOOR;     // (35,21)
        map[exitY23 - 1][exitX23] = SYMBOLS.FLOOR;     // (36,20)
        map[exitY23 - 1][exitX23 - 1] = SYMBOLS.FLOOR; // (35,20)

        // ORC (ゴーレム G) 2体：マップ中央部にバラして配置
        for (let i = 0; i < 2; i++) {
            for (let retry = 0; retry < 200; retry++) {
                const gx = Math.floor(Math.random() * (COLS - 14)) + 7 + i * 8;
                const gy = Math.floor(Math.random() * (ROWS - 10)) + 5;
                if ((map[gy][gx] === SYMBOLS.ICE || map[gy][gx] === SYMBOLS.FLOOR) &&
                    !(gx === player.x && gy === player.y) &&
                    !enemies.some(e => e.x === gx && e.y === gy) &&
                    Math.abs(gx - player.x) + Math.abs(gy - player.y) > 8 &&
                    Math.abs(gx - exitX23) + Math.abs(gy - exitY23) > 4) {
                    enemies.push({
                        type: 'ORC', x: gx, y: gy,
                        hp: 40 + floorLevel * 2, maxHp: 40 + floorLevel * 2,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // LAYER(L) 1体
        for (let retry = 0; retry < 100; retry++) {
            const lx = Math.floor(Math.random() * (COLS - 6)) + 3;
            const ly = Math.floor(Math.random() * (ROWS - 6)) + 3;
            if ((map[ly][lx] === SYMBOLS.ICE || map[ly][lx] === SYMBOLS.FLOOR) &&
                !(lx === player.x && ly === player.y) &&
                !enemies.some(e => e.x === lx && e.y === ly) &&
                Math.abs(lx - player.x) + Math.abs(ly - player.y) > 5) {
                enemies.push({
                    type: 'LAYER', x: lx, y: ly,
                    hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25,
                    stunTurns: 0
                });
                break;
            }
        }

        // ザコ(E) 8体
        for (let i = 0; i < 8; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if ((map[ey][ex] === SYMBOLS.ICE || map[ey][ex] === SYMBOLS.FLOOR) &&
                    !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey) &&
                    Math.abs(ex - player.x) + Math.abs(ey - player.y) > 4) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey,
                        hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // アイテム配置
        const f23items = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.HEAL_TOME, SYMBOLS.SPEED, SYMBOLS.CHARM];
        for (const item of f23items) {
            for (let retry = 0; retry < 50; retry++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] === SYMBOLS.ICE || map[iy][ix] === SYMBOLS.FLOOR) { map[iy][ix] = item; break; }
            }
        }

        return;
    }

    if (floorLevel === 27) {
        addLog("EVENT: The Hall of Forgeries.");
        addLog("Four exits lie in wait — three are MIMICS in disguise.");

        // 全体を壁で埋める
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        // ===== セル型DFS迷路生成 =====
        // セル(cx, cy) → マップ座標 (cx*2+1, cy*2+1)
        // cellW=19 (cx:0-18 → mx:1-37), cellH=12 (cy:0-11 → my:1-23)
        // ※ Math.floor(COLS/2)=20 にすると cx=19→mx=39 で右端の壁が消えるため 19 に固定
        const cellW27 = 19;
        const cellH27 = Math.floor(ROWS / 2);   // 12
        const visited27 = Array.from({length: cellH27}, () => new Array(cellW27).fill(false));

        const cellToMap27 = (cx, cy) => ({ mx: cx * 2 + 1, my: cy * 2 + 1 });

        const carve27 = (cx, cy) => {
            const {mx, my} = cellToMap27(cx, cy);
            map[my][mx] = SYMBOLS.FLOOR;
        };
        const carveWall27 = (cx1, cy1, cx2, cy2) => {
            // 隣接セル間の中間壁を通路にする
            map[cy1 + cy2 + 1][cx1 + cx2 + 1] = SYMBOLS.FLOOR;
        };

        const dirs27 = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        const shuffle27 = (arr) => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        // 中心セルからDFS
        const startCX27 = 9, startCY27 = 5; // → map (19, 11)
        const stack27 = [{cx: startCX27, cy: startCY27}];
        visited27[startCY27][startCX27] = true;
        carve27(startCX27, startCY27);

        while (stack27.length > 0) {
            const cur = stack27[stack27.length - 1];
            const shuffled = shuffle27(dirs27);
            let found = false;
            for (const {dx, dy} of shuffled) {
                const ncx = cur.cx + dx, ncy = cur.cy + dy;
                if (ncx >= 0 && ncx < cellW27 && ncy >= 0 && ncy < cellH27 && !visited27[ncy][ncx]) {
                    visited27[ncy][ncx] = true;
                    carve27(ncx, ncy);
                    carveWall27(cur.cx, cur.cy, ncx, ncy);
                    stack27.push({cx: ncx, cy: ncy});
                    found = true;
                    break;
                }
            }
            if (!found) stack27.pop();
        }

        // ループを少し追加して行き止まりを減らす（全壁の約15%）
        for (let cy = 0; cy < cellH27 - 1; cy++) {
            for (let cx = 0; cx < cellW27 - 1; cx++) {
                if (Math.random() < 0.12) {
                    const dir = Math.random() < 0.5 ? {dx:1,dy:0} : {dx:0,dy:1};
                    carveWall27(cx, cy, cx + dir.dx, cy + dir.dy);
                }
            }
        }

        // プレイヤーを中心付近に配置
        player.x = 19; player.y = 11;

        // スタート地点周辺の壁を解放（5×5の広場）
        for (let py = player.y - 2; py <= player.y + 2; py++) {
            for (let px = player.x - 2; px <= player.x + 2; px++) {
                if (px >= 1 && px < COLS - 1 && py >= 1 && py < ROWS - 1) {
                    map[py][px] = SYMBOLS.FLOOR;
                }
            }
        }

        // ===== 4つの出口位置（コーナー付近のセル）=====
        // cx=1,cy=1 → map(3,3) / cx=17,cy=1 → map(35,3)
        // cx=1,cy=10 → map(3,21) / cx=17,cy=10 → map(35,21)
        const exitDefs27 = [
            {cx: 1, cy: 1},
            {cx: 17, cy: 1},
            {cx: 1, cy: 10},
            {cx: 17, cy: 10},
        ];

        // 本物の出口をランダムに1つ選ぶ
        const realIdx27 = Math.floor(Math.random() * 4);
        const mimicHp27 = 50 + floorLevel * 3;

        for (let i = 0; i < 4; i++) {
            const {mx, my} = cellToMap27(exitDefs27[i].cx, exitDefs27[i].cy);
            // 出口セルとその周辺2マスを確実に床にして到達可能にする
            map[my][mx] = SYMBOLS.STAIRS;
            // 隣接する壁が多い場合に向けて隣接通路を保証
            for (const {dx, dy} of dirs27) {
                const nx = mx + dx, ny = my + dy;
                if (nx >= 1 && nx < COLS - 1 && ny >= 1 && ny < ROWS - 1 && map[ny][nx] === SYMBOLS.WALL) {
                    // 出口に確実にアクセスできるよう最低1方向を開ける（最初にヒットした壁を開ける）
                    map[ny][nx] = SYMBOLS.FLOOR;
                    break;
                }
            }
            if (i !== realIdx27) {
                enemies.push({
                    type: 'MIMIC', x: mx, y: my,
                    hp: mimicHp27, maxHp: mimicHp27,
                    flashUntil: 0, offsetX: 0, offsetY: 0,
                    expValue: 80, stunTurns: 0,
                    disguised: true, moveCooldown: 10
                });
            }
        }

        // ===== 敵配置 =====
        // ORC (ゴーレム) 2体：出口付近に配備
        const orcPositions27 = [{x: 10, y: 7}, {x: 28, y: 15}];
        for (const op of orcPositions27) {
            const tx = map[op.y][op.x] === SYMBOLS.FLOOR ? op.x : op.x + 1;
            const ty = map[op.y][op.x] === SYMBOLS.FLOOR ? op.y : op.y;
            // 床を探してORCを配置
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 8)) + 4;
                const ey = Math.floor(Math.random() * (ROWS - 8)) + 4;
                if (map[ey][ex] === SYMBOLS.FLOOR &&
                    !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey) &&
                    Math.abs(ex - player.x) + Math.abs(ey - player.y) > 6) {
                    enemies.push({
                        type: 'ORC', x: ex, y: ey,
                        hp: 40 + floorLevel * 2, maxHp: 40 + floorLevel * 2,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ザコ敵 10体
        for (let i = 0; i < 10; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[ey][ex] === SYMBOLS.FLOOR &&
                    !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey) &&
                    Math.abs(ex - player.x) + Math.abs(ey - player.y) > 4) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey,
                        hp: 5 + floorLevel, maxHp: 5 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 8, stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ===== アイテム配置 =====
        const f27items = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.HEAL_TOME, SYMBOLS.CHARM, SYMBOLS.ESCAPE];
        for (const item of f27items) {
            for (let retry = 0; retry < 100; retry++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] === SYMBOLS.FLOOR &&
                    !(ix === player.x && iy === player.y)) {
                    map[iy][ix] = item; break;
                }
            }
        }

        return;
    }

    if (floorLevel === 30) {
        addLog("EVENT: The Grand Forgery.");
        addLog("Eight exits await — SEVEN are MIMICS in disguise.");

        // 全体を壁で埋める
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        // ===== セル型DFS迷路生成（27Fと同構造）=====
        const cellW30 = 19;
        const cellH30 = Math.floor(ROWS / 2);
        const visited30 = Array.from({length: cellH30}, () => new Array(cellW30).fill(false));

        const cellToMap30 = (cx, cy) => ({ mx: cx * 2 + 1, my: cy * 2 + 1 });

        const carve30 = (cx, cy) => {
            const {mx, my} = cellToMap30(cx, cy);
            map[my][mx] = SYMBOLS.FLOOR;
        };
        const carveWall30 = (cx1, cy1, cx2, cy2) => {
            map[cy1 + cy2 + 1][cx1 + cx2 + 1] = SYMBOLS.FLOOR;
        };

        const dirs30 = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
        const shuffle30 = (arr) => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        const startCX30 = 9, startCY30 = 5;
        const stack30 = [{cx: startCX30, cy: startCY30}];
        visited30[startCY30][startCX30] = true;
        carve30(startCX30, startCY30);

        while (stack30.length > 0) {
            const cur = stack30[stack30.length - 1];
            const shuffled = shuffle30(dirs30);
            let found = false;
            for (const {dx, dy} of shuffled) {
                const ncx = cur.cx + dx, ncy = cur.cy + dy;
                if (ncx >= 0 && ncx < cellW30 && ncy >= 0 && ncy < cellH30 && !visited30[ncy][ncx]) {
                    visited30[ncy][ncx] = true;
                    carve30(ncx, ncy);
                    carveWall30(cur.cx, cur.cy, ncx, ncy);
                    stack30.push({cx: ncx, cy: ncy});
                    found = true;
                    break;
                }
            }
            if (!found) stack30.pop();
        }

        // ループを少し追加して行き止まりを減らす
        for (let cy = 0; cy < cellH30 - 1; cy++) {
            for (let cx = 0; cx < cellW30 - 1; cx++) {
                if (Math.random() < 0.12) {
                    const dir = Math.random() < 0.5 ? {dx:1,dy:0} : {dx:0,dy:1};
                    carveWall30(cx, cy, cx + dir.dx, cy + dir.dy);
                }
            }
        }

        // プレイヤーを中心付近に配置
        player.x = 19; player.y = 11;

        // スタート地点周辺の壁を解放（5×5の広場）
        for (let py = player.y - 2; py <= player.y + 2; py++) {
            for (let px = player.x - 2; px <= player.x + 2; px++) {
                if (px >= 1 && px < COLS - 1 && py >= 1 && py < ROWS - 1) {
                    map[py][px] = SYMBOLS.FLOOR;
                }
            }
        }

        // ===== 8つの出口位置（四隅 ＋ 各辺中央）7ミミック＋1本物 =====
        const exitDefs30 = [
            {cx:  1, cy:  1},  // 左上
            {cx: 17, cy:  1},  // 右上
            {cx:  1, cy: 10},  // 左下
            {cx: 17, cy: 10},  // 右下
            {cx:  9, cy:  1},  // 上中央
            {cx:  9, cy: 10},  // 下中央
            {cx:  1, cy:  5},  // 左中央
            {cx: 17, cy:  5},  // 右中央
        ];

        const realIdx30 = Math.floor(Math.random() * 8);
        const mimicHp30 = 60 + floorLevel * 3;

        for (let i = 0; i < 8; i++) {
            const {mx, my} = cellToMap30(exitDefs30[i].cx, exitDefs30[i].cy);
            map[my][mx] = SYMBOLS.STAIRS;
            // 出口へ確実にアクセスできるよう最低1方向の壁を開ける
            for (const {dx, dy} of dirs30) {
                const nx = mx + dx, ny = my + dy;
                if (nx >= 1 && nx < COLS - 1 && ny >= 1 && ny < ROWS - 1 && map[ny][nx] === SYMBOLS.WALL) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    break;
                }
            }
            if (i !== realIdx30) {
                enemies.push({
                    type: 'MIMIC', x: mx, y: my,
                    hp: mimicHp30, maxHp: mimicHp30,
                    flashUntil: 0, offsetX: 0, offsetY: 0,
                    expValue: 100, stunTurns: 0,
                    disguised: true, moveCooldown: 10
                });
            }
        }

        // ORC 2体：ランダム配置
        for (let i = 0; i < 2; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 8)) + 4;
                const ey = Math.floor(Math.random() * (ROWS - 8)) + 4;
                if (map[ey][ex] === SYMBOLS.FLOOR &&
                    !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey) &&
                    Math.abs(ex - player.x) + Math.abs(ey - player.y) > 6) {
                    enemies.push({
                        type: 'ORC', x: ex, y: ey,
                        hp: 40 + floorLevel * 2, maxHp: 40 + floorLevel * 2,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ザコ敵 10体
        for (let i = 0; i < 10; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[ey][ex] === SYMBOLS.FLOOR &&
                    !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey) &&
                    Math.abs(ex - player.x) + Math.abs(ey - player.y) > 4) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey,
                        hp: 5 + floorLevel, maxHp: 5 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 8, stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ウィスプ 1匹：プレイヤーから離れた床タイルに配置
        for (let retry = 0; retry < 200; retry++) {
            const wx = Math.floor(Math.random() * (COLS - 4)) + 2;
            const wy = Math.floor(Math.random() * (ROWS - 4)) + 2;
            if (map[wy][wx] === SYMBOLS.FLOOR &&
                !(wx === player.x && wy === player.y) &&
                !enemies.some(e => e.x === wx && e.y === wy) &&
                Math.abs(wx - player.x) + Math.abs(wy - player.y) > 8) {
                wisps.push({ x: wx, y: wy, dir: Math.floor(Math.random() * 4), mode: 'STRAIGHT' });
                break;
            }
        }

        // アイテム配置
        const f30items = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.HEAL_TOME, SYMBOLS.CHARM, SYMBOLS.ESCAPE];
        for (const item of f30items) {
            for (let retry = 0; retry < 100; retry++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] === SYMBOLS.FLOOR &&
                    !(ix === player.x && iy === player.y)) {
                    map[iy][ix] = item; break;
                }
            }
        }

        return;
    }

    // --- WIND STAGE (Floor 35): 突風の間 ---
    if (floorLevel === 35) {
        addLog("A powerful wind blows from above...");
        addLog("Use the walls and blocks to climb against the wind!");

        // 広い空間（外周1マスが壁、残りは全て床）
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y < 1 || y >= ROWS - 1 || x < 1 || x >= COLS - 1) {
                    map[y][x] = SYMBOLS.WALL;
                } else {
                    map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }

        isWindFloor = true;
        windTimer = 4; // 1ターン目で即発動

        // プレイヤー開始位置: 左下付近
        player.x = 3;
        player.y = ROWS - 3;

        // 穴（STAIRS）: 右上付近
        const stairsX = COLS - 5, stairsY = 3;
        map[stairsY][stairsX] = SYMBOLS.STAIRS;

        // 右から1/3あたりに縦長の壁を設置（区切り目1マスの隙間あり）
        const vertWallX = Math.floor(COLS * 2 / 3); // x≒27
        const gapY = Math.floor(Math.random() * (ROWS - 6)) + 3; // 隙間の位置（y=3〜ROWS-4）
        for (let y = 1; y < ROWS - 1; y++) {
            if (y === gapY) continue; // 区切り目（1マスの空白）
            if (y === stairsY && vertWallX === stairsX) continue; // 穴と重ならないよう
            map[y][vertWallX] = SYMBOLS.WALL;
        }

        // 横に伸びる壁をランダムに配置（足場として使う）
        // プレイヤー付近・穴付近を避けて、y=4〜ROWS-5の範囲に配置
        const wallSegments = []; // {x, y, len} の記録
        for (let i = 0; i < 15; i++) {
            let wy, wx, wlen, tries = 0;
            do {
                wy = Math.floor(Math.random() * (ROWS - 8)) + 4;
                wx = Math.floor(Math.random() * (COLS - 8)) + 3;
                wlen = Math.floor(Math.random() * 5) + 1; // 1〜5マス
                tries++;
                // 穴やプレイヤー開始位置と重ならないかチェック
                let blocked = false;
                for (let dx = 0; dx < wlen; dx++) {
                    const cx = wx + dx;
                    if (cx >= COLS - 1) { blocked = true; break; }
                    // 穴の周囲2マス以内は避ける
                    if (Math.abs(cx - stairsX) <= 2 && Math.abs(wy - stairsY) <= 1) { blocked = true; break; }
                    // プレイヤー開始位置の周囲2マス以内は避ける
                    if (Math.abs(cx - player.x) <= 2 && Math.abs(wy - player.y) <= 2) { blocked = true; break; }
                    // 縦壁の隙間を塞がない（隙間の上下1マスも含めて保護）
                    if (cx === vertWallX && Math.abs(wy - gapY) <= 1) { blocked = true; break; }
                }
                if (blocked) continue;
                break;
            } while (tries < 50);
            if (tries >= 50) continue;

            // 壁を配置
            const actualLen = Math.min(wlen, COLS - 2 - wx);
            for (let dx = 0; dx < actualLen; dx++) {
                map[wy][wx + dx] = SYMBOLS.WALL;
            }
            wallSegments.push({ x: wx, y: wy, len: actualLen });

            // 一部の壁にだけウィスプを纏わせる（30%の確率）
            if (Math.random() < 0.3) {
                const wispPositions = [];
                for (let dx = 0; dx < actualLen; dx++) {
                    if (wy - 1 >= 1 && map[wy - 1][wx + dx] === SYMBOLS.FLOOR) {
                        wispPositions.push({ x: wx + dx, y: wy - 1 });
                    }
                    if (wy + 1 < ROWS - 1 && map[wy + 1][wx + dx] === SYMBOLS.FLOOR) {
                        wispPositions.push({ x: wx + dx, y: wy + 1 });
                    }
                }
                if (wispPositions.length > 0) {
                    const wp = wispPositions[Math.floor(Math.random() * wispPositions.length)];
                    wisps.push({ x: wp.x, y: wp.y, dir: Math.floor(Math.random() * 4), mode: 'FOLLOW' });
                }
            }
        }

        // タレット: 上向き（dir:0）を3体配置（風で一緒に流される）
        for (let i = 0; i < 3; i++) {
            let tx, ty, tries = 0;
            do {
                tx = Math.floor(Math.random() * (COLS - 6)) + 3;
                ty = Math.floor(Math.random() * (ROWS - 8)) + 3;
                tries++;
            } while (tries < 200 && (
                map[ty][tx] !== SYMBOLS.FLOOR ||
                (Math.abs(tx - player.x) + Math.abs(ty - player.y)) < 6 ||
                (Math.abs(tx - stairsX) <= 2 && Math.abs(ty - stairsY) <= 2) ||
                enemies.some(e => e.x === tx && e.y === ty)
            ));
            if (tries >= 200) continue;
            const tHp = 100 + floorLevel * 5;
            enemies.push({
                type: 'TURRET', x: tx, y: ty, dir: 0,
                hp: tHp, maxHp: tHp,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                stunTurns: 0
            });
        }

        // 敵: NORMAL 6体 + ORC 2体（少なめ、足場ゲーム性を重視）
        const windEnemies = [];
        for (let i = 0; i < 8; i++) {
            let ex, ey, tries = 0;
            do {
                ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while (tries < 200 && (
                map[ey][ex] !== SYMBOLS.FLOOR ||
                (Math.abs(ex - player.x) + Math.abs(ey - player.y)) < 5 ||
                windEnemies.some(we => we.x === ex && we.y === ey)
            ));
            if (tries >= 200) continue;
            const eType = i < 6 ? 'NORMAL' : 'ORC';
            const eHp = eType === 'ORC' ? 8 + floorLevel * 2 : 3 + floorLevel;
            windEnemies.push({ x: ex, y: ey });
            enemies.push({
                type: eType, x: ex, y: ey,
                hp: eHp, maxHp: eHp,
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: eType === 'ORC' ? 15 : 5,
                stunTurns: 0
            });
        }

        // アイテム: SWORD 1個、HEAL_TOME 1個
        const windItems = [SYMBOLS.SWORD, SYMBOLS.HEAL_TOME];
        for (const item of windItems) {
            let ix, iy, tries = 0;
            do {
                ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while (tries < 200 && map[iy][ix] !== SYMBOLS.FLOOR);
            if (tries < 200) map[iy][ix] = item;
        }

        return;
    }

    // --- TEMPEST CROSSING (Floor 38): 突風×溶岩×氷 ---
    if (floorLevel === 38) {
        addLog("EVENT: The Tempest Crossing.");
        addLog("💨 Rivers of fire and ice — swept by violent winds!");

        // 外周を壁、内部を全て床にする
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                map[y][x] = (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1)
                    ? SYMBOLS.WALL : SYMBOLS.FLOOR;
            }
        }

        // 突風確定
        isWindFloor = true;
        windTimer = 4;

        // プレイヤー開始位置：左下
        player.x = 4;
        player.y = ROWS - 4;

        // 出口：右上（固定）
        const stairsX38 = COLS - 4; // 36
        const stairsY38 = 3;
        map[stairsY38][stairsX38] = SYMBOLS.STAIRS;

        // ===== 北壁中央の小さな出っ張り（5マス下向き）=====
        const northBumpX = Math.floor(COLS / 2) - 1; // x=19（中央付近）
        for (let dy = 1; dy <= 5; dy++) {
            map[dy][northBumpX] = SYMBOLS.WALL;
        }

        // ===== 出口に接する不定形の溶岩の沼（右上エリア）=====
        // 中心=(stairsX38-4, stairsY38+4)、小さめの楕円
        const poolCX38 = stairsX38 - 4; // x=32
        const poolCY38 = stairsY38 + 4; // y=7
        for (let ly = 1; ly < ROWS - 1; ly++) {
            for (let lx = 1; lx < COLS - 1; lx++) {
                if (lx === stairsX38 && ly === stairsY38) continue; // 出口は除く
                const ndx = (lx - poolCX38) / 7; // 横スケール
                const ndy = (ly - poolCY38) / 5; // 縦スケール
                const dist = Math.sqrt(ndx * ndx + ndy * ndy);
                // 外縁をランダムにギザギザにする
                const threshold = 0.75 + Math.random() * 0.4;
                if (dist < threshold) {
                    // 溶岩の中に床を少し点在させる（8%の確率でFLOORのまま）
                    map[ly][lx] = Math.random() < 0.08 ? SYMBOLS.FLOOR : SYMBOLS.LAVA;
                }
            }
        }

        // ===== 東壁のランダムな出っ張り =====
        for (let y = 2; y < ROWS - 2; y += Math.floor(Math.random() * 4) + 2) {
            const depth = Math.floor(Math.random() * 4) + 1; // 左へ1〜4マス突出
            const height = Math.floor(Math.random() * 3) + 1; // 高さ1〜3マス
            for (let dy = 0; dy < height && y + dy < ROWS - 2; dy++) {
                for (let dx = 1; dx <= depth; dx++) {
                    map[y + dy][COLS - 1 - dx] = SYMBOLS.WALL;
                }
            }
        }

        // ===== 南壁に接する溶岩地帯（高さ1〜3マス）=====
        for (let x = 1; x < COLS - 1; x++) {
            const h = Math.floor(Math.random() * 3) + 1; // 各列ごとに高さをランダムに
            for (let dy = 1; dy <= h; dy++) {
                const ty = ROWS - 1 - dy;
                if (ty >= 1) map[ty][x] = SYMBOLS.LAVA;
            }
        }

        // ===== 溶岩帯（横方向に伸びる）=====
        const lavaCount38 = 8 + Math.floor(Math.random() * 5); // 8〜12本
        for (let i = 0; i < lavaCount38; i++) {
            const ly = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const lStartX = Math.floor(Math.random() * 6) + 2;
            const lLen = 8 + Math.floor(Math.random() * 15); // 横8〜22マス
            const lHeight = Math.random() < 0.35 ? 2 : 1; // 35%の確率で2行
            for (let dy = 0; dy < lHeight; dy++) {
                for (let dx = 0; dx < lLen; dx++) {
                    const lx = lStartX + dx;
                    const ry = ly + dy;
                    if (lx < 1 || lx >= COLS - 1 || ry < 1 || ry >= ROWS - 1) continue;
                    if (Math.random() < 0.12) continue; // 12%でギャップ
                    map[ry][lx] = SYMBOLS.LAVA;
                }
            }
        }

        // ===== 追加溶岩帯（縦方向に伸びる）=====
        const lavaVCount38 = 6 + Math.floor(Math.random() * 4); // 6〜9本
        for (let i = 0; i < lavaVCount38; i++) {
            const vx = Math.floor(Math.random() * (COLS - 8)) + 4;
            const vStartY = Math.floor(Math.random() * 4) + 2;
            const vLen = 4 + Math.floor(Math.random() * 10); // 縦4〜13マス
            const vWidth = Math.random() < 0.3 ? 2 : 1;
            for (let dx = 0; dx < vWidth; dx++) {
                for (let dy = 0; dy < vLen; dy++) {
                    const rx = vx + dx;
                    const ry = vStartY + dy;
                    if (rx < 1 || rx >= COLS - 1 || ry < 1 || ry >= ROWS - 1) continue;
                    if (Math.random() < 0.12) continue;
                    map[ry][rx] = SYMBOLS.LAVA;
                }
            }
        }

        // プレイヤー開始地点周辺（5×5）をFLOORに（左下）
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const cx = player.x + dx, cy = player.y + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1)
                    map[cy][cx] = SYMBOLS.FLOOR;
            }
        }

        // 出口と同じ行（y=stairsY38）の左側は溶岩にしない
        for (let lx = 1; lx < stairsX38; lx++) {
            if (map[stairsY38][lx] === SYMBOLS.LAVA) map[stairsY38][lx] = SYMBOLS.FLOOR;
        }

        // 出口タイルだけ確実にSTAIRSに（沼は出口に接したままにする）
        map[stairsY38][stairsX38] = SYMBOLS.STAIRS;

        // 風避けの壁（横2〜4マス）を数本配置
        const wallCount38 = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < wallCount38; i++) {
            for (let t = 0; t < 60; t++) {
                const wx = Math.floor(Math.random() * (COLS - 10)) + 5;
                const wy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                const wlen = 2 + Math.floor(Math.random() * 3);
                if (Math.abs(wx - player.x) + Math.abs(wy - player.y) < 5) continue;
                if (wy < 1 || wy >= ROWS - 1) continue;
                let ok = true;
                for (let d = 0; d < wlen; d++) {
                    if (wx + d >= COLS - 1 || map[wy][wx + d] === SYMBOLS.STAIRS) { ok = false; break; }
                }
                if (!ok) continue;
                for (let d = 0; d < wlen; d++) map[wy][wx + d] = SYMBOLS.WALL;
                break;
            }
        }

        // ===== 敵配置ヘルパー =====
        const placeEnemy38 = (type, hp, expValue) => {
            for (let t = 0; t < 100; t++) {
                const ex = Math.floor(Math.random() * (COLS - 6)) + 3;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[ey][ex] !== SYMBOLS.FLOOR && map[ey][ex] !== SYMBOLS.ICE && map[ey][ex] !== SYMBOLS.LAVA) continue;
                if (map[ey][ex] === SYMBOLS.STAIRS) continue;
                if (ex === player.x && ey === player.y) continue;
                if (enemies.some(e => e.x === ex && e.y === ey)) continue;
                if (Math.abs(ex - player.x) + Math.abs(ey - player.y) < 6) continue;
                const hp2 = hp + floorLevel * 2;
                enemies.push({ type, x: ex, y: ey, hp: hp2, maxHp: hp2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue, stunTurns: 0 });
                return true;
            }
            return false;
        };

        // BLAZE × 5（溶岩と相性よい）
        for (let i = 0; i < 5; i++) placeEnemy38('BLAZE', 15, 30);
        // NORMAL × 8
        for (let i = 0; i < 8; i++) placeEnemy38('NORMAL', 5, 8);
        // ORC × 2
        for (let i = 0; i < 2; i++) placeEnemy38('ORC', 40, 50);

        // ===== アイテム配置 =====
        const items38 = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.HEAL_TOME, SYMBOLS.STEALTH, SYMBOLS.ESCAPE];
        for (const item of items38) {
            for (let t = 0; t < 100; t++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] !== SYMBOLS.FLOOR) continue;
                if (ix === player.x && iy === player.y) continue;
                map[iy][ix] = item;
                break;
            }
        }

        return;
    }

    if (floorLevel === 40) {
        addLog("EVENT: The Layer's Hall.");
        addLog("WARNING: Something is blocking the paths behind it...");

        // 大広間: 全面を床にする
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }

        // 壁に接している1マスをぐるりと溶岩の床にする
        for (let x = 1; x < COLS - 1; x++) {
            map[1][x] = SYMBOLS.LAVA;           // 上辺
            map[ROWS - 2][x] = SYMBOLS.LAVA;    // 下辺
        }
        for (let y = 1; y < ROWS - 1; y++) {
            map[y][1] = SYMBOLS.LAVA;            // 左辺
            map[y][COLS - 2] = SYMBOLS.LAVA;     // 右辺
        }

        // プレイヤーを左下付近に配置
        player.x = 3; player.y = ROWS - 3;

        // 出口を右上付近に配置
        const exitX40 = COLS - 4, exitY40 = 3;
        map[exitY40][exitX40] = SYMBOLS.STAIRS;

        // LAYER: プレイヤーのそばに1匹
        enemies.push({
            type: 'LAYER', x: player.x + 2, y: player.y,
            hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25,
            stunTurns: 0
        });

        // LAYER: 大穴のそばに1匹
        enemies.push({
            type: 'LAYER', x: exitX40 - 2, y: exitY40,
            hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25,
            stunTurns: 0
        });

        // LAYER: ランダムに2匹
        for (let i = 0; i < 2; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const lx = Math.floor(Math.random() * (COLS - 6)) + 3;
                const ly = Math.floor(Math.random() * (ROWS - 6)) + 3;
                if (map[ly][lx] === SYMBOLS.FLOOR && !(lx === player.x && ly === player.y) &&
                    !enemies.some(e => e.x === lx && e.y === ly) &&
                    Math.abs(lx - player.x) + Math.abs(ly - player.y) > 5) {
                    enemies.push({
                        type: 'LAYER', x: lx, y: ly,
                        hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // E(ザコ) 15匹
        for (let i = 0; i < 15; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ex = Math.floor(Math.random() * (COLS - 4)) + 2;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[ey][ex] === SYMBOLS.FLOOR && !(ex === player.x && ey === player.y) &&
                    !enemies.some(e => e.x === ex && e.y === ey)) {
                    enemies.push({
                        type: 'NORMAL', x: ex, y: ey,
                        hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ORC(G) 3匹
        for (let i = 0; i < 3; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const ox = Math.floor(Math.random() * (COLS - 6)) + 3;
                const oy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                if (map[oy][ox] === SYMBOLS.FLOOR && !(ox === player.x && oy === player.y) &&
                    !enemies.some(e => e.x === ox && e.y === oy) &&
                    Math.abs(ox - player.x) + Math.abs(oy - player.y) > 5) {
                    enemies.push({
                        type: 'ORC', x: ox, y: oy,
                        hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // TURRET(T) 2匹
        for (let i = 0; i < 2; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const tx = Math.floor(Math.random() * (COLS - 6)) + 3;
                const ty = Math.floor(Math.random() * (ROWS - 6)) + 3;
                if (map[ty][tx] === SYMBOLS.FLOOR && !(tx === player.x && ty === player.y) &&
                    !enemies.some(e => e.x === tx && e.y === ty) &&
                    Math.abs(tx - player.x) + Math.abs(ty - player.y) > 5) {
                    enemies.push({
                        type: 'TURRET', x: tx, y: ty, dir: Math.floor(Math.random() * 4),
                        hp: 100 + floorLevel * 5, maxHp: 100 + floorLevel * 5,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                        stunTurns: 0
                    });
                    break;
                }
            }
        }

        // 1マスの壁 + ウィスプのセットをランダムに配置（5セット）
        const f40WallPositions = [];
        for (let i = 0; i < 5; i++) {
            for (let retry = 0; retry < 100; retry++) {
                const bx = Math.floor(Math.random() * (COLS - 8)) + 4;
                const by = Math.floor(Math.random() * (ROWS - 8)) + 4;
                if (map[by][bx] === SYMBOLS.FLOOR && !(bx === player.x && by === player.y) &&
                    !enemies.some(e => e.x === bx && e.y === by) &&
                    !wisps.some(w => w.x === bx && w.y === by) &&
                    Math.abs(bx - player.x) + Math.abs(by - player.y) > 4) {
                    // 普通のダンジョン壁を1マス設置
                    map[by][bx] = SYMBOLS.WALL;
                    f40WallPositions.push({ x: bx, y: by });
                    // 壁の隣にウィスプを配置（FOLLOWモードで周回）
                    const wispX = bx + 1, wispY = by;
                    if (map[wispY][wispX] === SYMBOLS.FLOOR) {
                        wisps.push({ x: wispX, y: wispY, dir: 2, mode: 'FOLLOW' });
                    }
                    break;
                }
            }
        }

        // アイテム配置: 剣x1、鎧x1、魔導書数種
        const f40items = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.HEAL_TOME];
        for (const item of f40items) {
            for (let retry = 0; retry < 50; retry++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] === SYMBOLS.FLOOR) { map[iy][ix] = item; break; }
            }
        }

        return;
    }

    // --- THE POISON MARSH (Floor 43): 毒沼フロア（入門編）---
    if (floorLevel === 43) {
        addLog("EVENT: The Poison Marsh.");
        addLog("☠ The ground is saturated with venom. Watch your step.");

        // 外周を壁、内部を全て毒沼にする
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                map[y][x] = (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1)
                    ? SYMBOLS.WALL : SYMBOLS.POISON;
            }
        }

        // プレイヤー開始位置：左側ランダム
        player.x = 3;
        player.y = 3 + Math.floor(Math.random() * (ROWS - 6));

        // 出口：右側ランダム
        const stairsX43 = COLS - 4;
        const stairsY43 = 3 + Math.floor(Math.random() * (ROWS - 6));
        map[stairsY43][stairsX43] = SYMBOLS.STAIRS;

        // ランダムな壁の塊（6〜9か所、63より少なめ）
        const wallClusterCount43 = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < wallClusterCount43; i++) {
            const cx = Math.floor(Math.random() * (COLS - 10)) + 5;
            const cy = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const w = 1 + Math.floor(Math.random() * 4);
            const h = 1 + Math.floor(Math.random() * 3);
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    const tx = cx + dx, ty = cy + dy;
                    if (tx < 1 || tx >= COLS - 1 || ty < 1 || ty >= ROWS - 1) continue;
                    if (tx === stairsX43 && ty === stairsY43) continue;
                    map[ty][tx] = SYMBOLS.WALL;
                }
            }
        }

        // ===== スタートから出口への蛇行1マス幅通路（FLOOR）=====
        const bfsPath43 = (sx, sy, ex, ey) => {
            if (sx === ex && sy === ey) return [];
            const prev = Array.from({length: ROWS}, () => new Array(COLS).fill(null));
            const visited = Array.from({length: ROWS}, () => new Uint8Array(COLS));
            const queue = [{x: sx, y: sy}];
            visited[sy][sx] = 1;
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            while (queue.length > 0) {
                const {x, y} = queue.shift();
                if (x === ex && y === ey) {
                    const path = [];
                    let cx = ex, cy = ey;
                    while (cx !== sx || cy !== sy) {
                        path.push({x: cx, y: cy});
                        const p = prev[cy][cx]; cx = p.x; cy = p.y;
                    }
                    return path;
                }
                for (const [dx, dy] of dirs) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 1 || nx >= COLS-1 || ny < 1 || ny >= ROWS-1) continue;
                    if (visited[ny][nx] || map[ny][nx] === SYMBOLS.WALL) continue;
                    visited[ny][nx] = 1;
                    prev[ny][nx] = {x, y};
                    queue.push({x: nx, y: ny});
                }
            }
            return null;
        };

        const numWP43 = 4 + Math.floor(Math.random() * 3);
        const xStep43 = Math.floor((stairsX43 - player.x) / (numWP43 + 1));
        const half43 = Math.floor(ROWS / 2);
        const waypoints43 = [{x: player.x, y: player.y}];
        for (let i = 1; i <= numWP43; i++) {
            const wpX = Math.min(player.x + xStep43 * i, COLS - 2);
            const wpY = (i % 2 === 1)
                ? 2 + Math.floor(Math.random() * (half43 - 3))
                : half43 + Math.floor(Math.random() * (ROWS - half43 - 3));
            let finalY = wpY;
            for (let dy = 0; dy < ROWS - 2; dy++) {
                const tryY = 1 + ((wpY - 1 + dy) % (ROWS - 2));
                if (map[tryY][wpX] !== SYMBOLS.WALL) { finalY = tryY; break; }
            }
            waypoints43.push({x: wpX, y: finalY});
        }
        waypoints43.push({x: stairsX43, y: stairsY43});

        for (let wi = 0; wi < waypoints43.length - 1; wi++) {
            const from = waypoints43[wi], to = waypoints43[wi + 1];
            const path = bfsPath43(from.x, from.y, to.x, to.y);
            if (path) {
                for (const {x, y} of path) {
                    if (map[y][x] !== SYMBOLS.STAIRS) map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }

        // プレイヤー開始地点周辺（3×3）をFLOORに
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = player.x + dx, cy = player.y + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1)
                    map[cy][cx] = SYMBOLS.FLOOR;
            }
        }

        // 出口周辺（3×3）もFLOORに
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = stairsX43 + dx, cy = stairsY43 + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1)
                    map[cy][cx] = SYMBOLS.FLOOR;
            }
        }
        map[stairsY43][stairsX43] = SYMBOLS.STAIRS;

        // ===== 敵配置ヘルパー =====
        const placeEnemy43 = (type, hp, expValue) => {
            for (let t = 0; t < 100; t++) {
                const ex = Math.floor(Math.random() * (COLS - 6)) + 3;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[ey][ex] === SYMBOLS.WALL || map[ey][ex] === SYMBOLS.STAIRS) continue;
                if (ex === player.x && ey === player.y) continue;
                if (enemies.some(e => e.x === ex && e.y === ey)) continue;
                if (Math.abs(ex - player.x) + Math.abs(ey - player.y) < 5) continue;
                const hp2 = hp + floorLevel * 2;
                enemies.push({ type, x: ex, y: ey, hp: hp2, maxHp: hp2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue, stunTurns: 0 });
                return true;
            }
            return false;
        };

        // 63より少なめ: NORMAL×6、ORC×1、FROST×2
        for (let i = 0; i < 6; i++) placeEnemy43('NORMAL', 5, 8);
        for (let i = 0; i < 1; i++) placeEnemy43('ORC', 40, 50);
        for (let i = 0; i < 2; i++) placeEnemy43('FROST', 12, 20);

        // ===== アイテム配置 =====
        const items43 = [
            SYMBOLS.GUARDIAN, SYMBOLS.GUARDIAN,
            SYMBOLS.HEAL_TOME, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.ESCAPE
        ];
        for (const item of items43) {
            for (let t = 0; t < 100; t++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] !== SYMBOLS.FLOOR && map[iy][ix] !== SYMBOLS.POISON) continue;
                if (ix === player.x && iy === player.y) continue;
                if (ix === stairsX43 && iy === stairsY43) continue;
                map[iy][ix] = item;
                break;
            }
        }

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

    if (floorLevel === 53) {
        addLog("EVENT: The Lava Shrine.");
        addLog("WARNING: A ring shines on the island — but guardians surround it!");

        // ステージ18と同様の広い空間（外周2マスをLAVA、内側をFLOOR）
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

        const rx53 = 20, ry53 = 7; // 指輪の位置（ステージ18の妖精と同じ）

        // 指輪の周りと上部一帯を溶岩にする（ステージ18と同じ）
        for (let y = ry53 - 5; y <= ry53 + 5; y++) {
            for (let x = rx53 - 10; x <= rx53 + 10; x++) {
                if (x >= 1 && x < COLS - 1 && y >= 1 && y < ROWS - 1) {
                    map[y][x] = SYMBOLS.LAVA;
                }
            }
        }

        // 下半分は迷路なし（FLOORのオープンフィールドのまま）

        // プレイヤー足元と出口付近を確実に床にする
        map[ROWS - 5][20] = SYMBOLS.FLOOR;
        map[ROWS - 4][18] = SYMBOLS.FLOOR;

        // 中央の5x5の浮島をFLOORに
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                map[ry53 + dy][rx53 + dx] = SYMBOLS.FLOOR;
            }
        }

        // 浮島から左右に水平な通路を延ばす
        for (let x = 3; x < COLS - 3; x++) {
            map[ry53][x] = SYMBOLS.FLOOR;
        }
        // 左右の縦通路（y=ry53〜10）
        for (let y = ry53; y <= 10; y++) {
            map[y][3] = SYMBOLS.FLOOR;
            map[y][COLS - 4] = SYMBOLS.FLOOR;
        }

        // 指輪を確定配置（未所持の指輪から優先）
        const ringPool53 = RINGS.filter(r => !player.ownedRings.includes(r.id));
        const ringSrc53 = ringPool53.length > 0 ? ringPool53 : RINGS;
        const ring53 = ringSrc53[Math.floor(Math.random() * ringSrc53.length)];
        map[ry53][rx53] = SYMBOLS.RING;
        ringDrops.push({ x: rx53, y: ry53, ringId: ring53.id });
        addLog(`💍 A ring pulses with ancient power on the shrine island...`);

        // ORC 2体
        for (let i = 0; i < 2; i++) {
            let ox, oy, tries = 0;
            do {
                ox = Math.floor(Math.random() * (COLS - 6)) + 3;
                oy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                tries++;
            } while ((map[oy][ox] !== SYMBOLS.FLOOR || Math.abs(ox - player.x) < 5) && tries < 100);
            enemies.push({
                type: 'ORC', x: ox, y: oy,
                hp: 40 + floorLevel * 2, maxHp: 40 + floorLevel * 2,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 100, stunTurns: 0
            });
        }

        // ザコ敵を大量配置
        for (let i = 0; i < 15; i++) {
            const ex = Math.floor(Math.random() * (COLS - 6)) + 3;
            const ey = Math.floor(Math.random() * (ROWS - 6)) + 3;
            if (map[ey][ex] === SYMBOLS.FLOOR && Math.abs(ex - player.x) > 4) {
                enemies.push({
                    type: 'NORMAL', x: ex, y: ey,
                    hp: 15 + floorLevel, maxHp: 15 + floorLevel,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 20, stunTurns: 0
                });
            }
        }

        // 浮島を取り囲むLAVAに、BLAZEを大量配置（lavaBound=trueで溶岩の外に出ない）
        for (let by = ry53 - 5; by <= ry53 + 5; by++) {
            for (let bx = rx53 - 10; bx <= rx53 + 10; bx++) {
                if (bx < 1 || bx >= COLS - 1 || by < 1 || by >= ROWS - 1) continue;
                if (map[by][bx] !== SYMBOLS.LAVA) continue;
                if (enemies.some(e => e.x === bx && e.y === by)) continue;
                if (Math.random() < 0.55) {
                    enemies.push({
                        type: 'BLAZE', x: bx, y: by,
                        hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15, stunTurns: 0,
                        lavaBound: true
                    });
                }
            }
        }

        // 出口
        map[ROWS - 4][18] = SYMBOLS.STAIRS;
        return;
    }

    if (floorLevel === 57) {
        addLog("EVENT: The Glacial Battery.");
        addLog("WARNING: Sliding turrets patrol the hall — ice patches send them flying!");

        // まず全面を床にする
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }

        // まばらな氷のパッチをランダムに配置（10〜12か所）
        const icePatchCount = 10 + Math.floor(Math.random() * 3);
        for (let i = 0; i < icePatchCount; i++) {
            const cx = Math.floor(Math.random() * (COLS - 8)) + 4;
            const cy = Math.floor(Math.random() * (ROWS - 8)) + 4;
            const r = 2 + Math.floor(Math.random() * 3); // 半径2〜4
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const ix = cx + dx, iy = cy + dy;
                    if (ix >= 1 && ix < COLS - 1 && iy >= 1 && iy < ROWS - 1) {
                        if (Math.random() < 0.75) map[iy][ix] = SYMBOLS.ICE;
                    }
                }
            }
        }

        // 出口座標
        const exitX57 = COLS - 4, exitY57 = ROWS - 4; // (36, 21)

        // 左上コーナー（出入り口）周辺の厚い壁
        for (let y = 1; y <= 7; y++) map[y][1] = SYMBOLS.WALL;
        for (let y = 1; y <= 4; y++) map[y][2] = SYMBOLS.WALL;
        for (let x = 2; x <= 7; x++) map[1][x] = SYMBOLS.WALL;
        for (let x = 2; x <= 4; x++) map[2][x] = SYMBOLS.WALL;

        // 右下コーナー（出口）周辺の厚い壁
        for (let y = 18; y <= ROWS - 2; y++) map[y][COLS - 2] = SYMBOLS.WALL;
        for (let y = 19; y <= ROWS - 2; y++) map[y][COLS - 3] = SYMBOLS.WALL;
        for (let x = COLS - 5; x <= COLS - 2; x++) map[ROWS - 2][x] = SYMBOLS.WALL;
        for (let x = COLS - 5; x <= COLS - 3; x++) map[ROWS - 3][x] = SYMBOLS.WALL;

        // ランダムな壁柱（タレットのスライド方向転換ポイント）
        for (let i = 0; i < 18; i++) {
            const wx = Math.floor(Math.random() * (COLS - 8)) + 4;
            const wy = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const nearEntry = Math.abs(wx - 3) + Math.abs(wy - 3) <= 5;
            const nearExit = wx >= exitX57 - 4 && wy >= exitY57 - 4;
            if (!nearEntry && !nearExit) {
                map[wy][wx] = SYMBOLS.WALL;
            }
        }

        // プレイヤーを左上に配置
        player.x = 3; player.y = 3;
        map[player.y][player.x] = SYMBOLS.FLOOR;
        for (const ad of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]) {
            if (map[player.y + ad.y] && map[player.y + ad.y][player.x + ad.x] !== SYMBOLS.WALL) {
                map[player.y + ad.y][player.x + ad.x] = SYMBOLS.FLOOR;
            }
        }

        // 出口を右下に配置（ブレーキFLOOR付き）
        map[exitY57][exitX57] = SYMBOLS.STAIRS;
        map[exitY57][exitX57 - 1] = SYMBOLS.FLOOR;
        map[exitY57 - 1][exitX57] = SYMBOLS.FLOOR;
        map[exitY57 - 1][exitX57 - 1] = SYMBOLS.FLOOR;

        // 固定TURRET（移動しない）を大量配置
        const turretHp57 = 100 + floorLevel * 5;
        for (let i = 0; i < 28; i++) {
            for (let retry = 0; retry < 150; retry++) {
                const tx = Math.floor(Math.random() * (COLS - 8)) + 4;
                const ty = Math.floor(Math.random() * (ROWS - 8)) + 4;
                if ((map[ty][tx] === SYMBOLS.ICE || map[ty][tx] === SYMBOLS.FLOOR) &&
                    !enemies.some(e => e.x === tx && e.y === ty) &&
                    Math.abs(tx - player.x) + Math.abs(ty - player.y) > 6 &&
                    Math.abs(tx - exitX57) + Math.abs(ty - exitY57) > 4) {
                    const dir = Math.floor(Math.random() * 4);
                    enemies.push({
                        type: 'TURRET', x: tx, y: ty, dir,
                        hp: turretHp57, maxHp: turretHp57,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0
                    });
                    break;
                }
            }
        }

        // ORC（G）を配置
        for (let i = 0; i < 10; i++) {
            for (let retry = 0; retry < 150; retry++) {
                const gx = Math.floor(Math.random() * (COLS - 8)) + 4;
                const gy = Math.floor(Math.random() * (ROWS - 8)) + 4;
                if ((map[gy][gx] === SYMBOLS.ICE || map[gy][gx] === SYMBOLS.FLOOR) &&
                    !enemies.some(e => e.x === gx && e.y === gy) &&
                    Math.abs(gx - player.x) + Math.abs(gy - player.y) > 6) {
                    enemies.push({
                        type: 'ORC', x: gx, y: gy,
                        hp: 40 + floorLevel * 2, maxHp: 40 + floorLevel * 2,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0
                    });
                    break;
                }
            }
        }

        return;
    }

    // --- THE POISON WASTES (Floor 63): 全面毒沼 ---
    if (floorLevel === 63) {
        addLog("EVENT: The Poison Wastes.");
        addLog("☠ The entire floor reeks of venom — every step burns!");

        // 外周を壁、内部を全て毒沼にする
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                map[y][x] = (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1)
                    ? SYMBOLS.WALL : SYMBOLS.POISON;
            }
        }

        // プレイヤー開始位置：左側ランダム
        player.x = 3;
        player.y = 3 + Math.floor(Math.random() * (ROWS - 6));

        // 出口：右側ランダム
        const stairsX63 = COLS - 4;
        const stairsY63 = 3 + Math.floor(Math.random() * (ROWS - 6));
        map[stairsY63][stairsX63] = SYMBOLS.STAIRS;

        // ランダムな壁の塊（10〜15か所）を配置
        const wallClusterCount63 = 10 + Math.floor(Math.random() * 6);
        for (let i = 0; i < wallClusterCount63; i++) {
            const cx = Math.floor(Math.random() * (COLS - 10)) + 5;
            const cy = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const w = 1 + Math.floor(Math.random() * 4);
            const h = 1 + Math.floor(Math.random() * 3);
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    const tx = cx + dx, ty = cy + dy;
                    if (tx < 1 || tx >= COLS - 1 || ty < 1 || ty >= ROWS - 1) continue;
                    if (tx === stairsX63 && ty === stairsY63) continue;
                    map[ty][tx] = SYMBOLS.WALL;
                }
            }
        }

        // ===== スタートから出口への蛇行1マス幅通路（FLOOR）=====
        // BFS: 壁を避けてウェイポイント間の最短経路を探す
        const bfsPath63 = (sx, sy, ex, ey) => {
            if (sx === ex && sy === ey) return [];
            const prev = Array.from({length: ROWS}, () => new Array(COLS).fill(null));
            const visited = Array.from({length: ROWS}, () => new Uint8Array(COLS));
            const queue = [{x: sx, y: sy}];
            visited[sy][sx] = 1;
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            while (queue.length > 0) {
                const {x, y} = queue.shift();
                if (x === ex && y === ey) {
                    const path = [];
                    let cx = ex, cy = ey;
                    while (cx !== sx || cy !== sy) {
                        path.push({x: cx, y: cy});
                        const p = prev[cy][cx]; cx = p.x; cy = p.y;
                    }
                    return path;
                }
                for (const [dx, dy] of dirs) {
                    const nx = x + dx, ny = y + dy;
                    if (nx < 1 || nx >= COLS-1 || ny < 1 || ny >= ROWS-1) continue;
                    if (visited[ny][nx] || map[ny][nx] === SYMBOLS.WALL) continue;
                    visited[ny][nx] = 1;
                    prev[ny][nx] = {x, y};
                    queue.push({x: nx, y: ny});
                }
            }
            return null; // 到達不能
        };

        // 中間ウェイポイント：上半分・下半分に交互配置して蛇行させる
        const numWP63 = 4 + Math.floor(Math.random() * 3); // 4〜6個
        const xStep63 = Math.floor((stairsX63 - player.x) / (numWP63 + 1));
        const half63 = Math.floor(ROWS / 2);
        const waypoints63 = [{x: player.x, y: player.y}];
        for (let i = 1; i <= numWP63; i++) {
            const wpX = Math.min(player.x + xStep63 * i, COLS - 2);
            // 奇数番→上半分、偶数番→下半分 で交互に振る
            const wpY = (i % 2 === 1)
                ? 2 + Math.floor(Math.random() * (half63 - 3))
                : half63 + Math.floor(Math.random() * (ROWS - half63 - 3));
            // 壁と重なる場合は近くの非壁タイルに補正（近傍探索）
            let finalY = wpY;
            for (let dy = 0; dy < ROWS - 2; dy++) {
                const tryY = 1 + ((wpY - 1 + dy) % (ROWS - 2));
                if (map[tryY][wpX] !== SYMBOLS.WALL) { finalY = tryY; break; }
            }
            waypoints63.push({x: wpX, y: finalY});
        }
        waypoints63.push({x: stairsX63, y: stairsY63});

        // 隣接ウェイポイント間をBFSで接続してFLOORを敷く
        for (let wi = 0; wi < waypoints63.length - 1; wi++) {
            const from = waypoints63[wi], to = waypoints63[wi + 1];
            const path = bfsPath63(from.x, from.y, to.x, to.y);
            if (path) {
                for (const {x, y} of path) {
                    if (map[y][x] !== SYMBOLS.STAIRS) map[y][x] = SYMBOLS.FLOOR;
                }
            }
        }

        // プレイヤー開始地点周辺（3×3）をFLOORに（安全地帯）
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = player.x + dx, cy = player.y + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1)
                    map[cy][cx] = SYMBOLS.FLOOR;
            }
        }

        // 出口周辺（2×2）もFLOORに
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = stairsX63 + dx, cy = stairsY63 + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1)
                    map[cy][cx] = SYMBOLS.FLOOR;
            }
        }
        map[stairsY63][stairsX63] = SYMBOLS.STAIRS;

        // ===== 敵配置ヘルパー =====
        const placeEnemy63 = (type, hp, expValue) => {
            for (let t = 0; t < 100; t++) {
                const ex = Math.floor(Math.random() * (COLS - 6)) + 3;
                const ey = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[ey][ex] === SYMBOLS.WALL || map[ey][ex] === SYMBOLS.STAIRS) continue;
                if (ex === player.x && ey === player.y) continue;
                if (enemies.some(e => e.x === ex && e.y === ey)) continue;
                if (Math.abs(ex - player.x) + Math.abs(ey - player.y) < 5) continue;
                const hp2 = hp + floorLevel * 2;
                enemies.push({ type, x: ex, y: ey, hp: hp2, maxHp: hp2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue, stunTurns: 0 });
                return true;
            }
            return false;
        };

        // NORMAL × 10（毒沼に慣れた雑魚）
        for (let i = 0; i < 10; i++) placeEnemy63('NORMAL', 5, 8);
        // ORC × 3（強敵）
        for (let i = 0; i < 3; i++) placeEnemy63('ORC', 40, 50);
        // FROST × 4（毒沼×氷の複合）
        for (let i = 0; i < 4; i++) placeEnemy63('FROST', 12, 20);
        // BREAKER × 2（壁破壊で地形を変化させる）
        for (let i = 0; i < 2; i++) placeEnemy63('BREAKER', 30, 35);

        // ===== アイテム配置 =====
        // GUARDIAN × 2（毒沼シールドに有用）、その他ランダム
        const items63 = [
            SYMBOLS.GUARDIAN, SYMBOLS.GUARDIAN,
            SYMBOLS.HEAL_TOME, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.ESCAPE
        ];
        for (const item of items63) {
            for (let t = 0; t < 100; t++) {
                const ix = Math.floor(Math.random() * (COLS - 4)) + 2;
                const iy = Math.floor(Math.random() * (ROWS - 4)) + 2;
                if (map[iy][ix] !== SYMBOLS.FLOOR && map[iy][ix] !== SYMBOLS.POISON) continue;
                if (ix === player.x && iy === player.y) continue;
                if (ix === stairsX63 && iy === stairsY63) continue;
                map[iy][ix] = item;
                break;
            }
        }

        return;
    }

    if (floorLevel === 70) {
        addLog("EVENT: The Hopper's Gauntlet.");
        addLog("WARNING: Turrets line the walls — poison pools fill the floor!");

        // まず全面を床にする
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }

        // 左上コーナー（入口）周辺の厚い壁
        for (let y = 1; y <= 7; y++) map[y][1] = SYMBOLS.WALL;
        for (let y = 1; y <= 4; y++) map[y][2] = SYMBOLS.WALL;
        for (let x = 2; x <= 7; x++) map[1][x] = SYMBOLS.WALL;
        for (let x = 2; x <= 4; x++) map[2][x] = SYMBOLS.WALL;

        // 右下コーナー（出口）周辺の厚い壁
        for (let y = 18; y <= ROWS - 2; y++) map[y][COLS - 2] = SYMBOLS.WALL;
        for (let y = 19; y <= ROWS - 2; y++) map[y][COLS - 3] = SYMBOLS.WALL;
        for (let x = COLS - 5; x <= COLS - 2; x++) map[ROWS - 2][x] = SYMBOLS.WALL;
        for (let x = COLS - 5; x <= COLS - 3; x++) map[ROWS - 3][x] = SYMBOLS.WALL;

        // ランダムな壁柱（タレットの向き転換ポイント）を適度に配置
        for (let i = 0; i < 20; i++) {
            const wx = Math.floor(Math.random() * (COLS - 8)) + 4;
            const wy = Math.floor(Math.random() * (ROWS - 6)) + 3;
            const nearEntry = Math.abs(wx - 3) + Math.abs(wy - 3) <= 5;
            const nearExit = wx >= COLS - 8 && wy >= ROWS - 7;
            if (!nearEntry && !nearExit) map[wy][wx] = SYMBOLS.WALL;
        }

        // 毒沼パッチをランダムに散布（8〜12か所）
        const poisonPatch70 = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < poisonPatch70; i++) {
            const pcx = Math.floor(Math.random() * (COLS - 12)) + 6;
            const pcy = Math.floor(Math.random() * (ROWS - 10)) + 5;
            const pr = 1 + Math.floor(Math.random() * 3);
            for (let dy = -pr; dy <= pr; dy++) {
                for (let dx = -pr; dx <= pr; dx++) {
                    if (dx * dx + dy * dy > pr * pr) continue;
                    const px = pcx + dx, py = pcy + dy;
                    if (px < 2 || px >= COLS - 2 || py < 2 || py >= ROWS - 2) continue;
                    if (map[py][px] === SYMBOLS.WALL) continue;
                    // 入口・出口付近は除外
                    if (Math.abs(px - 3) + Math.abs(py - 3) <= 5) continue;
                    map[py][px] = SYMBOLS.POISON;
                }
            }
        }

        // プレイヤーを左上に配置
        player.x = 3; player.y = 3;
        map[player.y][player.x] = SYMBOLS.FLOOR;
        for (const ad of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]) {
            if (map[player.y + ad.y] && map[player.y + ad.y][player.x + ad.x] !== SYMBOLS.WALL)
                map[player.y + ad.y][player.x + ad.x] = SYMBOLS.FLOOR;
        }

        // 出口を右下に配置
        const exitX70 = COLS - 4, exitY70 = ROWS - 4;
        map[exitY70][exitX70] = SYMBOLS.STAIRS;
        map[exitY70][exitX70 - 1] = SYMBOLS.FLOOR;
        map[exitY70 - 1][exitX70] = SYMBOLS.FLOOR;
        map[exitY70 - 1][exitX70 - 1] = SYMBOLS.FLOOR;

        const hpHopper = 80 + floorLevel * 5;

        // HOPPER_TURRET：下壁に接する位置（y = ROWS-2）に配置
        // dir:0 = 上向きレーザー照射、左右に移動
        const bottomTurretCount70 = 5 + Math.floor(Math.random() * 4); // 5〜8体
        for (let i = 0; i < bottomTurretCount70; i++) {
            for (let retry = 0; retry < 150; retry++) {
                const tx = 4 + Math.floor(Math.random() * (COLS - 10));
                const ty = ROWS - 2;
                if (map[ty][tx] === SYMBOLS.WALL) continue;
                if (enemies.some(e => e.x === tx && e.y === ty)) continue;
                if (Math.abs(tx - player.x) + Math.abs(ty - player.y) <= 5) continue;
                if (Math.abs(tx - exitX70) + Math.abs(ty - exitY70) <= 4) continue;
                map[ty][tx] = SYMBOLS.FLOOR;
                enemies.push({
                    type: 'HOPPER_TURRET', x: tx, y: ty,
                    dir: 0, // 上向きレーザー → 左右移動
                    hp: hpHopper, maxHp: hpHopper,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0,
                    hopTimer: 1 + Math.floor(Math.random() * 3)
                });
                break;
            }
        }

        // HOPPER_TURRET：右壁に接する位置（x = COLS-2）に配置
        // dir:3 = 左向きレーザー照射、上下に移動
        const rightTurretCount70 = 5 + Math.floor(Math.random() * 4); // 5〜8体
        for (let i = 0; i < rightTurretCount70; i++) {
            for (let retry = 0; retry < 150; retry++) {
                const tx = COLS - 2;
                const ty = 4 + Math.floor(Math.random() * (ROWS - 10));
                if (map[ty][tx] === SYMBOLS.WALL) continue;
                if (enemies.some(e => e.x === tx && e.y === ty)) continue;
                if (Math.abs(tx - player.x) + Math.abs(ty - player.y) <= 5) continue;
                if (Math.abs(tx - exitX70) + Math.abs(ty - exitY70) <= 4) continue;
                map[ty][tx] = SYMBOLS.FLOOR;
                enemies.push({
                    type: 'HOPPER_TURRET', x: tx, y: ty,
                    dir: 3, // 左向きレーザー → 上下移動
                    hp: hpHopper, maxHp: hpHopper,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0,
                    hopTimer: 1 + Math.floor(Math.random() * 3)
                });
                break;
            }
        }

        // その他の敵をランダム配置
        const placeEnemy70 = (type, hp, expValue) => {
            for (let t = 0; t < 100; t++) {
                const ex = Math.floor(Math.random() * (COLS - 8)) + 4;
                const ey = Math.floor(Math.random() * (ROWS - 8)) + 4;
                if (map[ey][ex] === SYMBOLS.WALL || map[ey][ex] === SYMBOLS.STAIRS) continue;
                if (enemies.some(e => e.x === ex && e.y === ey)) continue;
                if (Math.abs(ex - player.x) + Math.abs(ey - player.y) < 5) continue;
                const hp2 = hp + floorLevel * 2;
                enemies.push({ type, x: ex, y: ey, hp: hp2, maxHp: hp2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue, stunTurns: 0 });
                return true;
            }
            return false;
        };
        for (let i = 0; i < 8; i++) placeEnemy70('NORMAL', 5, 8);
        for (let i = 0; i < 3; i++) placeEnemy70('ORC', 40, 50);
        for (let i = 0; i < 3; i++) placeEnemy70('FROST', 12, 20);

        return;
    }

    if (floorLevel === 66) {
        addLog("EVENT: The Breaker's Den.");
        addLog("WARNING: The walls tremble... something massive lurks here.");
        addLog("Enemies and treasures are trapped in the walls!");

        // まず全体を壁で埋める
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        // プレイヤーの初期位置とその周囲を確保（広めに3x3）
        player.x = 3; player.y = 3;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                map[player.y + dy][player.x + dx] = SYMBOLS.FLOOR;
            }
        }

        // 出口を右上付近に配置（1マスだけ床）
        const exitX = COLS - 4, exitY = 3;
        map[exitY][exitX] = SYMBOLS.STAIRS;

        // 壁の中に1マス空間を作るヘルパー（周囲4方向がすべて壁の場所を探す）
        const findTrappedCell = (minDist) => {
            for (let t = 0; t < 100; t++) {
                const cx = Math.floor(Math.random() * (COLS - 6)) + 3;
                const cy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                if (map[cy][cx] !== SYMBOLS.WALL) continue;
                if (map[cy-1][cx] !== SYMBOLS.WALL || map[cy+1][cx] !== SYMBOLS.WALL ||
                    map[cy][cx-1] !== SYMBOLS.WALL || map[cy][cx+1] !== SYMBOLS.WALL) continue;
                if (Math.abs(cx - player.x) + Math.abs(cy - player.y) < minDist) continue;
                return { x: cx, y: cy };
            }
            return null;
        };

        // 突風を設定（66階は確定で風が吹く）
        isWindFloor = true;
        windTimer = 4;
        addLog("💨 The Breaker's Den roars with violent winds!");

        // 敵(E)を壁の中に1マスだけの空間で閉じ込める
        for (let i = 0; i < 12; i++) {
            const pos = findTrappedCell(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'NORMAL', x: pos.x, y: pos.y,
                hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                stunTurns: 0
            });
        }

        // タレット(T)を壁の中に閉じ込める（4体）
        for (let i = 0; i < 4; i++) {
            const pos = findTrappedCell(5);
            if (pos) {
                map[pos.y][pos.x] = SYMBOLS.FLOOR;
                enemies.push({
                    type: 'TURRET', x: pos.x, y: pos.y, dir: (Math.random() < 0.5 ? 1 : 3), // 横向き固定（右or左）
                    hp: 100 + floorLevel * 5, maxHp: 100 + floorLevel * 5,
                    flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                    stunTurns: 0
                });
            }
        }

        // ORC(G)を壁の中に閉じ込める（2体）
        for (let i = 0; i < 2; i++) {
            const pos = findTrappedCell(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'ORC', x: pos.x, y: pos.y,
                hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                stunTurns: 0
            });
        }

        // アイテムを壁の中に1マスだけの空間で閉じ込める
        const trappedItems = [
            SYMBOLS.SWORD, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.ARMOR,
            SYMBOLS.FAIRY,
            SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH,
            SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION
        ];
        for (const item of trappedItems) {
            const pos = findTrappedCell(3);
            if (!pos) continue;
            map[pos.y][pos.x] = item;
        }

        // BREAKER: プレイヤーのそばに2匹（確定）
        const playerBreakers = [
            { x: player.x + 2, y: player.y },
            { x: player.x, y: player.y + 2 }
        ];
        for (const pb of playerBreakers) {
            map[pb.y][pb.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'BREAKER', x: pb.x, y: pb.y,
                hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
                stunTurns: 0
            });
        }

        // BREAKER: 穴のすぐ隣に1匹（確定）
        const exitBreaker = { x: exitX - 1, y: exitY };
        map[exitBreaker.y][exitBreaker.x] = SYMBOLS.FLOOR;
        enemies.push({
            type: 'BREAKER', x: exitBreaker.x, y: exitBreaker.y,
            hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
            stunTurns: 0
        });

        // BREAKER: 残り6匹をランダム配置（壁を1マス壊して床にして配置）
        for (let i = 0; i < 6; i++) {
            let bx, by, tries = 0;
            do {
                bx = Math.floor(Math.random() * (COLS - 4)) + 2;
                by = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while (tries < 200 && (map[by][bx] !== SYMBOLS.WALL ||
                enemies.some(en => en.x === bx && en.y === by)));
            if (tries >= 200) continue;
            map[by][bx] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'BREAKER', x: bx, y: by,
                hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
                stunTurns: 0
            });
        }

        return;
    }

    // --- THE MIMIC'S GALLERY (Floor 48): 25体のミミック ---
    if (floorLevel === 48) {
        addLog("EVENT: The Mimic's Gallery.");
        addLog("⚠ Every exit could be a trap. Only one is real.");

        // 外周を壁、内部を全て床にする
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                map[y][x] = (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1)
                    ? SYMBOLS.WALL : SYMBOLS.FLOOR;
            }
        }

        // 城郭風の部屋を生成（内部に壁の区画を作る）
        const rooms48 = [];
        const MIN_SEP48 = 2;
        const roomTarget48 = 7 + Math.floor(Math.random() * 5); // 7〜11部屋
        for (let attempt = 0; attempt < 500 && rooms48.length < roomTarget48; attempt++) {
            const rw = 4 + Math.floor(Math.random() * 7);
            const rh = 3 + Math.floor(Math.random() * 5);
            const rx = 2 + Math.floor(Math.random() * (COLS - rw - 4));
            const ry = 2 + Math.floor(Math.random() * (ROWS - rh - 4));
            const overlaps = rooms48.some(r =>
                rx < r.x + r.w + MIN_SEP48 && rx + rw + MIN_SEP48 > r.x &&
                ry < r.y + r.h + MIN_SEP48 && ry + rh + MIN_SEP48 > r.y
            );
            if (overlaps) continue;
            // 部屋の外周を壁にして区画化する（廊下だけで移動）
            for (let py = ry - 1; py <= ry + rh; py++) {
                for (let px = rx - 1; px <= rx + rw; px++) {
                    if (px < 1 || px >= COLS - 1 || py < 1 || py >= ROWS - 1) continue;
                    if (py === ry - 1 || py === ry + rh || px === rx - 1 || px === rx + rw)
                        map[py][px] = SYMBOLS.WALL;
                    else
                        map[py][px] = SYMBOLS.FLOOR;
                }
            }
            rooms48.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) });
        }

        // 最小スパニングツリーで部屋間をL字廊下接続
        if (rooms48.length > 1) {
            const inTree48 = new Set([0]);
            while (inTree48.size < rooms48.length) {
                let bestA = -1, bestB = -1, bestD = Infinity;
                for (const ai of inTree48) {
                    for (let bi = 0; bi < rooms48.length; bi++) {
                        if (inTree48.has(bi)) continue;
                        const d = Math.abs(rooms48[ai].cx - rooms48[bi].cx) + Math.abs(rooms48[ai].cy - rooms48[bi].cy);
                        if (d < bestD) { bestD = d; bestA = ai; bestB = bi; }
                    }
                }
                if (bestA < 0) break;
                const ra = rooms48[bestA], rb = rooms48[bestB];
                let cpx = ra.cx, cpy = ra.cy;
                if (Math.random() < 0.5) {
                    while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                    while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                } else {
                    while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                    while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                }
                inTree48.add(bestB);
            }
        }

        // プレイヤーを左上付近に配置
        player.x = 3; player.y = 3;
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                const cx = player.x + dx, cy = player.y + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1) map[cy][cx] = SYMBOLS.FLOOR;
            }

        // 本物の出口（右下付近）
        const stairsX48 = COLS - 4, stairsY48 = ROWS - 4;
        map[stairsY48][stairsX48] = SYMBOLS.STAIRS;
        // 出口周辺を床に確保
        for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
                const cx = stairsX48 + dx, cy = stairsY48 + dy;
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1 && map[cy][cx] !== SYMBOLS.STAIRS)
                    map[cy][cx] = SYMBOLS.FLOOR;
            }

        // ミミック25体：偽の出口として配置
        const mimicHp48 = 50 + floorLevel * 3;
        let mimicsPlaced48 = 0;
        for (let attempt = 0; attempt < 2000 && mimicsPlaced48 < 25; attempt++) {
            const mx = 2 + Math.floor(Math.random() * (COLS - 4));
            const my = 2 + Math.floor(Math.random() * (ROWS - 4));
            if (map[my][mx] !== SYMBOLS.FLOOR) continue;
            if (mx === player.x && my === player.y) continue;
            if (Math.abs(mx - player.x) + Math.abs(my - player.y) < 4) continue;
            if (mx === stairsX48 && my === stairsY48) continue;
            if (enemies.some(e => e.x === mx && e.y === my)) continue;
            map[my][mx] = SYMBOLS.STAIRS; // 偽の出口に見せる
            enemies.push({
                type: 'MIMIC', x: mx, y: my,
                hp: mimicHp48, maxHp: mimicHp48,
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: 80, stunTurns: 0,
                disguised: true, moveCooldown: 10
            });
            mimicsPlaced48++;
        }

        // その他の敵（ランダム配置）
        const placeEnemy48 = (type, hp, expValue) => {
            for (let t = 0; t < 100; t++) {
                const ex = 2 + Math.floor(Math.random() * (COLS - 4));
                const ey = 2 + Math.floor(Math.random() * (ROWS - 4));
                if (map[ey][ex] !== SYMBOLS.FLOOR) continue;
                if (ex === player.x && ey === player.y) continue;
                if (enemies.some(e => e.x === ex && e.y === ey)) continue;
                if (Math.abs(ex - player.x) + Math.abs(ey - player.y) < 5) continue;
                const hp2 = hp + floorLevel * 2;
                enemies.push({ type, x: ex, y: ey, hp: hp2, maxHp: hp2, flashUntil: 0, offsetX: 0, offsetY: 0, expValue, stunTurns: 0 });
                return true;
            }
            return false;
        };
        for (let i = 0; i < 6; i++) placeEnemy48('NORMAL', 5, 8);
        for (let i = 0; i < 2; i++) placeEnemy48('ORC', 40, 50);
        for (let i = 0; i < 2; i++) placeEnemy48('FROST', 12, 20);

        // アイテム（ランダム配置）
        const items48 = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.HEAL_TOME, SYMBOLS.ESCAPE, SYMBOLS.STEALTH];
        for (const item of items48) {
            for (let t = 0; t < 100; t++) {
                const ix = 2 + Math.floor(Math.random() * (COLS - 4));
                const iy = 2 + Math.floor(Math.random() * (ROWS - 4));
                if (map[iy][ix] !== SYMBOLS.FLOOR) continue;
                if (ix === player.x && iy === player.y) continue;
                map[iy][ix] = item;
                break;
            }
        }

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
            SYMBOLS.SPEED, SYMBOLS.HEAL_TOME, SYMBOLS.ESCAPE, SYMBOLS.STEALTH, SYMBOLS.CHARM
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
    let isSpiralFloor = !isDenseMazeFloor && layoutRoll < 0.13;
    let isCrossFloor = !isDenseMazeFloor && !isSpiralFloor && layoutRoll < 0.21;
    let isIslandsFloor = !isDenseMazeFloor && !isSpiralFloor && !isCrossFloor && layoutRoll < 0.29;
    let isMazeFloor = !isDenseMazeFloor && !isSpiralFloor && !isCrossFloor && !isIslandsFloor && layoutRoll < 0.37;
    let isBoldMazeFloor = isMazeFloor && Math.random() < 0.10; // 迷路フロアの10%で大胆構造に
    if (isBoldMazeFloor) isMazeFloor = false;
    let isCastleFloor = !isDenseMazeFloor && !isSpiralFloor && !isCrossFloor && !isIslandsFloor && !isMazeFloor && !isBoldMazeFloor && layoutRoll < 0.57;
    let isGreatHallFloor = !isDenseMazeFloor && !isSpiralFloor && !isCrossFloor && !isIslandsFloor && !isMazeFloor && !isBoldMazeFloor && !isCastleFloor && layoutRoll < 0.67;
    // 大広間フロアにランダムモディファイアを付与（ICE / WIND / WISP）
    let greatHallModifier = null;
    if (isGreatHallFloor) {
        const _mRoll = Math.random();
        if (_mRoll < 0.33) greatHallModifier = 'ICE';
        else if (_mRoll < 0.66) greatHallModifier = 'WIND';
        else greatHallModifier = 'WISP';
    }

    if (floorLevel === 80) {
        addLog("EVENT: The Frozen Furnace.");
        addLog("WARNING: Ice and fire are sealed within these walls!");
        addLog("Enemies and treasures are trapped in the walls!");

        // まず全体を壁で埋める
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.WALL;
            }
        }

        // プレイヤーの初期位置とその周囲を確保（3x3）
        player.x = 3; player.y = 3;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                map[player.y + dy][player.x + dx] = SYMBOLS.FLOOR;
            }
        }

        // 出口を右下付近に配置（1マスだけ床）
        const exitX = COLS - 4, exitY = ROWS - 4;
        map[exitY][exitX] = SYMBOLS.STAIRS;

        // 壁の中に1マス空間を作るヘルパー
        const findTrappedCell80 = (minDist) => {
            for (let t = 0; t < 100; t++) {
                const cx = Math.floor(Math.random() * (COLS - 6)) + 3;
                const cy = Math.floor(Math.random() * (ROWS - 6)) + 3;
                if (map[cy][cx] !== SYMBOLS.WALL) continue;
                if (map[cy-1][cx] !== SYMBOLS.WALL || map[cy+1][cx] !== SYMBOLS.WALL ||
                    map[cy][cx-1] !== SYMBOLS.WALL || map[cy][cx+1] !== SYMBOLS.WALL) continue;
                if (Math.abs(cx - player.x) + Math.abs(cy - player.y) < minDist) continue;
                return { x: cx, y: cy };
            }
            return null;
        };

        // 敵(E)を壁の中に閉じ込める
        for (let i = 0; i < 12; i++) {
            const pos = findTrappedCell80(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'NORMAL', x: pos.x, y: pos.y,
                hp: 3 + floorLevel, maxHp: 3 + floorLevel,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5,
                stunTurns: 0
            });
        }

        // FROST(I)を壁の中に閉じ込める（5体）— 解放されると周囲を凍らせる
        for (let i = 0; i < 5; i++) {
            const pos = findTrappedCell80(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'FROST', x: pos.x, y: pos.y,
                hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15,
                stunTurns: 0
            });
        }

        // BLAZE(F)を壁の中に閉じ込める（5体）— 解放されると周囲を溶岩に
        for (let i = 0; i < 5; i++) {
            const pos = findTrappedCell80(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'BLAZE', x: pos.x, y: pos.y,
                hp: 15 + floorLevel * 2, maxHp: 15 + floorLevel * 2,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 15,
                stunTurns: 0
            });
        }

        // タレット(T)を壁の中に閉じ込める（2体）
        for (let i = 0; i < 2; i++) {
            const pos = findTrappedCell80(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'TURRET', x: pos.x, y: pos.y, dir: Math.floor(Math.random() * 4),
                hp: 100 + floorLevel * 5, maxHp: 100 + floorLevel * 5,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                stunTurns: 0
            });
        }

        // ORC(G)を壁の中に閉じ込める（2体）
        for (let i = 0; i < 2; i++) {
            const pos = findTrappedCell80(5);
            if (!pos) continue;
            map[pos.y][pos.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'ORC', x: pos.x, y: pos.y,
                hp: 40 + floorLevel * 5, maxHp: 40 + floorLevel * 5,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40,
                stunTurns: 0
            });
        }

        // アイテムを壁の中に閉じ込める
        const trappedItems80 = [
            SYMBOLS.SWORD, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.ARMOR,
            SYMBOLS.FAIRY,
            SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH,
            SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.ESCAPE
        ];
        for (const item of trappedItems80) {
            const pos = findTrappedCell80(3);
            if (!pos) continue;
            map[pos.y][pos.x] = item;
        }

        // BREAKER: プレイヤーのそばに2匹（確定）
        const playerBreakers80 = [
            { x: player.x + 2, y: player.y },
            { x: player.x, y: player.y + 2 }
        ];
        for (const pb of playerBreakers80) {
            map[pb.y][pb.x] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'BREAKER', x: pb.x, y: pb.y,
                hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
                stunTurns: 0
            });
        }

        // BREAKER: 穴のすぐ隣に1匹（確定）
        const exitBreaker80 = { x: exitX - 1, y: exitY };
        map[exitBreaker80.y][exitBreaker80.x] = SYMBOLS.FLOOR;
        enemies.push({
            type: 'BREAKER', x: exitBreaker80.x, y: exitBreaker80.y,
            hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
            stunTurns: 0
        });

        // BREAKER: 残り7匹をランダム配置
        for (let i = 0; i < 7; i++) {
            let bx, by, tries = 0;
            do {
                bx = Math.floor(Math.random() * (COLS - 4)) + 2;
                by = Math.floor(Math.random() * (ROWS - 4)) + 2;
                tries++;
            } while (tries < 200 && (map[by][bx] !== SYMBOLS.WALL ||
                enemies.some(en => en.x === bx && en.y === by)));
            if (tries >= 200) continue;
            map[by][bx] = SYMBOLS.FLOOR;
            enemies.push({
                type: 'BREAKER', x: bx, y: by,
                hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
                stunTurns: 0
            });
        }

        return;
    }

    if (floorLevel === 83) {
        addLog("EVENT: The Thief's Labyrinth.");
        addLog("K holds the only key. Hunt it down!");
        // 内部を全床にしてから迷路ロジックへフォールスルー
        for (let y = 1; y < ROWS - 1; y++)
            for (let x = 1; x < COLS - 1; x++)
                map[y][x] = SYMBOLS.FLOOR;
        isDenseMazeFloor = true;
        isSpiralFloor = false; isCrossFloor = false; isIslandsFloor = false;
        isMazeFloor = false; isBoldMazeFloor = false;
        isCastleFloor = false; isGreatHallFloor = false;
        // return しない → 既存の迷路生成コードへ落ちる
    }

    if (floorLevel === 77) {
        addLog("EVENT: The Forbidden Labyrinth.");
        // フロア全体を一旦床にして、迷路ロジックの土台を作る
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = SYMBOLS.FLOOR;
            }
        }
        isDenseMazeFloor = true; // 超高密度迷路ロジックを使用
        isSpiralFloor = false;
        isCrossFloor = false;
        isIslandsFloor = false;
        isMazeFloor = false;
        isGreatHallFloor = false;
    }
    const rooms = [];

    if (isDenseMazeFloor) addLog("⚠️ WARNING: Entering an extremely dense TWISTED LABYRINTH...");
    else if (isSpiralFloor) addLog("A spiraling corridor stretches before you... The path coils inward.");
    else if (isCrossFloor) addLog("A great crossroads dominates this floor. Four quarters await.");
    else if (isIslandsFloor) addLog("Isolated chambers float in the void, connected by narrow bridges...");
    else if (isMazeFloor) addLog("Warning: This floor is a complex NARROW MAZE!");
    else if (isBoldMazeFloor) addLog("⚠️ GRAND LABYRINTH: Vast corridors echo with danger...");
    else if (isCastleFloor) addLog("The floor is a fortified castle — rooms connected by narrow passages.");
    else if (isGreatHallFloor) addLog("This floor is a vast GREAT HALL.");

    // フロアタイプに応じて部屋数を決定
    const roomCount = isDenseMazeFloor ? 8 : (isSpiralFloor ? 6 : (isCrossFloor ? 6 : (isIslandsFloor ? 12 : (isMazeFloor ? 25 : (isBoldMazeFloor ? 14 : (isCastleFloor ? 0 : (isGreatHallFloor ? 2 : (Math.floor(Math.random() * 4) + 8))))))));

    // --- Spiral Floor: 渦巻き通路を生成 ---
    if (isSpiralFloor) {
        // 外周から中心へ時計回りの渦巻き通路を掘る
        let left = 2, right = COLS - 3, top = 2, bottom = ROWS - 3;
        const pathWidth = 2;
        const wallGap = 3; // 壁の間隔（通路幅 + 壁）

        while (left < right && top < bottom) {
            // 上辺: 左→右
            for (let x = left; x <= right; x++) {
                for (let pw = 0; pw < pathWidth && top + pw <= bottom; pw++) {
                    map[top + pw][x] = SYMBOLS.FLOOR;
                }
            }
            top += wallGap;

            // 右辺: 上→下
            for (let y = top - wallGap + pathWidth; y <= bottom; y++) {
                for (let pw = 0; pw < pathWidth && right - pw >= left; pw++) {
                    map[y][right - pw] = SYMBOLS.FLOOR;
                }
            }
            right -= wallGap;

            // 下辺: 右→左
            if (top <= bottom) {
                for (let x = right + wallGap - pathWidth; x >= left; x--) {
                    for (let pw = 0; pw < pathWidth && bottom - pw >= top; pw++) {
                        map[bottom - pw][x] = SYMBOLS.FLOOR;
                    }
                }
                bottom -= wallGap;
            }

            // 左辺: 下→上
            if (left <= right) {
                for (let y = bottom + wallGap - pathWidth; y >= top; y--) {
                    for (let pw = 0; pw < pathWidth && left + pw <= right; pw++) {
                        map[y][left + pw] = SYMBOLS.FLOOR;
                    }
                }
                left += wallGap;
            }
        }

        // 螺旋上にダミー部屋を登録（敵・アイテム配置用）
        const spiralPoints = [
            { x: 3, y: 3 },
            { x: COLS - 5, y: 3 },
            { x: COLS - 5, y: ROWS - 5 },
            { x: 3, y: ROWS - 5 },
            { x: Math.floor(COLS / 2) - 1, y: Math.floor(ROWS / 2) - 1 },
            { x: Math.floor(COLS / 2) + 2, y: Math.floor(ROWS / 2) + 1 },
        ];
        for (const sp of spiralPoints) {
            const rw = 3, rh = 3;
            rooms.push({ x: sp.x, y: sp.y, w: rw, h: rh, cx: sp.x + 1, cy: sp.y + 1 });
        }
    }

    // --- Cross Floor: 十字通路 + 4象限に部屋 ---
    else if (isCrossFloor) {
        const midX = Math.floor(COLS / 2);
        const midY = Math.floor(ROWS / 2);
        const crossWidth = 3;
        const halfW = Math.floor(crossWidth / 2);

        // 横通路（幅3）
        for (let x = 1; x < COLS - 1; x++) {
            for (let dy = -halfW; dy <= halfW; dy++) {
                if (midY + dy >= 1 && midY + dy < ROWS - 1) {
                    map[midY + dy][x] = SYMBOLS.FLOOR;
                }
            }
        }
        // 縦通路（幅3）
        for (let y = 1; y < ROWS - 1; y++) {
            for (let dx = -halfW; dx <= halfW; dx++) {
                if (midX + dx >= 1 && midX + dx < COLS - 1) {
                    map[y][midX + dx] = SYMBOLS.FLOOR;
                }
            }
        }

        // 交差点の広場を登録
        rooms.push({ x: midX - 2, y: midY - 2, w: 5, h: 5, cx: midX, cy: midY });

        // 4象限にそれぞれ1-2個の中型部屋を配置
        const quadrants = [
            { minX: 2, maxX: midX - halfW - 2, minY: 2, maxY: midY - halfW - 2 },           // 左上
            { minX: midX + halfW + 2, maxX: COLS - 3, minY: 2, maxY: midY - halfW - 2 },    // 右上
            { minX: 2, maxX: midX - halfW - 2, minY: midY + halfW + 2, maxY: ROWS - 3 },    // 左下
            { minX: midX + halfW + 2, maxX: COLS - 3, minY: midY + halfW + 2, maxY: ROWS - 3 } // 右下
        ];

        for (const q of quadrants) {
            const numRooms = Math.floor(Math.random() * 2) + 1; // 1-2部屋
            for (let r = 0; r < numRooms; r++) {
                const rw = Math.floor(Math.random() * 4) + 5; // 5-8
                const rh = Math.floor(Math.random() * 3) + 4; // 4-6
                const maxRx = q.maxX - rw;
                const maxRy = q.maxY - rh;
                if (maxRx < q.minX || maxRy < q.minY) continue; // 象限が小さすぎる場合スキップ
                const rx = Math.floor(Math.random() * (maxRx - q.minX + 1)) + q.minX;
                const ry = Math.floor(Math.random() * (maxRy - q.minY + 1)) + q.minY;

                for (let dy = 0; dy < rh; dy++) {
                    for (let dx = 0; dx < rw; dx++) {
                        map[ry + dy][rx + dx] = SYMBOLS.FLOOR;
                    }
                }
                rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) });
            }
        }
    }

    // --- Islands Floor: 小型浮島 + 一本橋 ---
    else if (isIslandsFloor) {
        const islandCount = Math.floor(Math.random() * 5) + 10; // 10-14
        for (let i = 0; i < islandCount; i++) {
            const rw = Math.floor(Math.random() * 3) + 3; // 3-5
            const rh = Math.floor(Math.random() * 3) + 3; // 3-5
            const rx = Math.floor(Math.random() * (COLS - rw - 2)) + 1;
            const ry = Math.floor(Math.random() * (ROWS - rh - 2)) + 1;

            for (let dy = 0; dy < rh; dy++) {
                for (let dx = 0; dx < rw; dx++) {
                    map[ry + dy][rx + dx] = SYMBOLS.FLOOR;
                }
            }
            rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) });
        }
    }

    // --- Castle Floor: 矩形部屋 + 1マス幅L字廊下（城郭型） ---
    else if (isCastleFloor) {
        const MIN_SEP = 2;
        const castleRoomsF = [];
        const _cRMax = 6 + Math.floor(Math.random() * 5); // 6〜10部屋
        for (let attempt = 0; attempt < 400 && castleRoomsF.length < _cRMax; attempt++) {
            const rw = 4 + Math.floor(Math.random() * 7);  // 4〜10幅
            const rh = 3 + Math.floor(Math.random() * 5);  // 3〜7高さ
            const rx = 2 + Math.floor(Math.random() * (COLS - rw - 4));
            const ry = 2 + Math.floor(Math.random() * (ROWS - rh - 4));
            const overlaps = castleRoomsF.some(r =>
                rx < r.x + r.w + MIN_SEP && rx + rw + MIN_SEP > r.x &&
                ry < r.y + r.h + MIN_SEP && ry + rh + MIN_SEP > r.y
            );
            if (overlaps) continue;
            // 部屋を床にする
            for (let py = ry; py < ry + rh; py++)
                for (let px = rx; px < rx + rw; px++)
                    map[py][px] = SYMBOLS.FLOOR;
            const entry = { x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) };
            castleRoomsF.push(entry);
            rooms.push(entry);
        }
        // 最小スパニングツリーでL字廊下接続
        if (castleRoomsF.length > 1) {
            const inTree = new Set([0]);
            while (inTree.size < castleRoomsF.length) {
                let bestA = -1, bestB = -1, bestD = Infinity;
                for (const ai of inTree) {
                    for (let bi = 0; bi < castleRoomsF.length; bi++) {
                        if (inTree.has(bi)) continue;
                        const d = Math.abs(castleRoomsF[ai].cx - castleRoomsF[bi].cx) + Math.abs(castleRoomsF[ai].cy - castleRoomsF[bi].cy);
                        if (d < bestD) { bestD = d; bestA = ai; bestB = bi; }
                    }
                }
                if (bestA < 0) break;
                const ra = castleRoomsF[bestA], rb = castleRoomsF[bestB];
                let cpx = ra.cx, cpy = ra.cy;
                if (Math.random() < 0.5) {
                    while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                    while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                } else {
                    while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                    while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
                }
                inTree.add(bestB);
            }
        }
        // 追加通路（ランダムに2本）
        for (let k = 0; k < 2; k++) {
            if (castleRoomsF.length < 2) break;
            const ra = castleRoomsF[Math.floor(Math.random() * castleRoomsF.length)];
            const rb = castleRoomsF[Math.floor(Math.random() * castleRoomsF.length)];
            if (ra === rb) continue;
            let cpx = ra.cx, cpy = ra.cy;
            while (cpx !== rb.cx) { cpx += rb.cx > cpx ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
            while (cpy !== rb.cy) { cpy += rb.cy > cpy ? 1 : -1; if (cpx >= 1 && cpx < COLS-1 && cpy >= 1 && cpy < ROWS-1) map[cpy][cpx] = SYMBOLS.FLOOR; }
        }
    }

    // --- 通常のフロアタイプの部屋生成 ---
    else {
    for (let i = 0; i < roomCount; i++) {
        let w, h;
        if (isMazeFloor) {
            w = Math.floor(Math.random() * 2) + 2;
            h = Math.floor(Math.random() * 2) + 2;
        } else if (isBoldMazeFloor) {
            w = Math.floor(Math.random() * 4) + 3; // 3-6
            h = Math.floor(Math.random() * 4) + 3; // 3-6
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

        // 大部屋や標準の部屋には柱や瓦礫を配置（大広間は装飾なしの広い空間）
        if (!isMazeFloor && !isGreatHallFloor && w >= 5 && h >= 5) {
            const pattern = Math.random();
            const cx = Math.floor(x + w / 2);
            const cy = Math.floor(y + h / 2);
            if (pattern < 0.3) {
                map[cy][cx] = SYMBOLS.WALL;
            } else if (pattern < 0.5) {
                map[y + 1][x + 1] = SYMBOLS.WALL;
                map[y + 1][x + w - 2] = SYMBOLS.WALL;
                map[y + h - 2][x + 1] = SYMBOLS.WALL;
                map[y + h - 2][x + w - 2] = SYMBOLS.WALL;
            }
        }

        rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
    }
    } // end of else (通常フロアタイプ)

    // --- Gがひしめく宝部屋（城郭・通常ダンジョン共通、15%の確率）---
    // 迷路・スパイラル・孤島系は小部屋構成でないため除外
    if (!isDenseMazeFloor && !isSpiralFloor && !isIslandsFloor && !isMazeFloor && !isBoldMazeFloor
        && rooms.length >= 3 && Math.random() < 0.03) {
        // スタート部屋（rooms[0]）と出口部屋（最後）を除いた中間候補
        const mrCandidates = rooms.slice(1, -1).filter(r => r.w >= 3 && r.h >= 3);
        if (mrCandidates.length > 0) {
            const mr = mrCandidates[Math.floor(Math.random() * mrCandidates.length)];
            // ORC（G）を部屋サイズに応じて4〜8体配置（攻撃されるまで眠り状態）
            const orcCount = Math.min(8, Math.max(4, Math.floor(mr.w * mr.h / 4)));
            const orcHp = 40 + floorLevel * 3;
            const sleepGroupId = mr.cx * 1000 + mr.cy; // 部屋ごとのユニークID
            for (let i = 0; i < orcCount; i++) {
                for (let t = 0; t < 40; t++) {
                    const ex = mr.x + Math.floor(Math.random() * mr.w);
                    const ey = mr.y + Math.floor(Math.random() * mr.h);
                    if (map[ey][ex] !== SYMBOLS.FLOOR) continue;
                    if (enemies.some(e => e.x === ex && e.y === ey)) continue;
                    enemies.push({ type: 'ORC', x: ex, y: ey,
                        hp: orcHp, maxHp: orcHp,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 50, stunTurns: 0,
                        sleeping: true, sleepGroup: sleepGroupId });
                    break;
                }
            }
            // 指輪をランダムに1つ部屋内に配置
            const ringIdx = Math.floor(Math.random() * RINGS.length);
            for (let t = 0; t < 40; t++) {
                const rx2 = mr.x + Math.floor(Math.random() * mr.w);
                const ry2 = mr.y + Math.floor(Math.random() * mr.h);
                if (map[ry2][rx2] !== SYMBOLS.FLOOR) continue;
                if (enemies.some(e => e.x === rx2 && e.y === ry2)) continue;
                map[ry2][rx2] = SYMBOLS.RING;
                ringDrops.push({ x: rx2, y: ry2, ringId: RINGS[ringIdx].id });
                addLog("💍 Something glitters behind guarded walls...");
                break;
            }
        }
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

        // Spiral floor: 螺旋が全体をカバーするため通常接続は不要
        if (isSpiralFloor) continue;

        while (cx !== tx || cy !== ty) {
            // 迷路フロアの場合、30%の確率でターゲットとは無関係な方向に寄り道する
            if (isMazeFloor && Math.random() < 0.3) {
                const randDir = Math.floor(Math.random() * 4);
                if (randDir === 0 && cx + 1 < COLS - 1) cx++;
                else if (randDir === 1 && cx - 1 > 0) cx--;
                else if (randDir === 2 && cy + 1 < ROWS - 1) cy++;
                else if (randDir === 3 && cy - 1 > 0) cy--;
            } else if (isBoldMazeFloor) {
                // 大胆迷路: 直線的に進み、2タイル幅の通路を掘る
                const moveH = cx !== tx && (cy === ty || Math.random() < 0.5);
                if (moveH) {
                    cx += (tx > cx ? 1 : -1);
                    if (cy + 1 < ROWS - 1) map[cy + 1][cx] = SYMBOLS.FLOOR;
                } else {
                    cy += (ty > cy ? 1 : -1);
                    if (cx + 1 < COLS - 1) map[cy][cx + 1] = SYMBOLS.FLOOR;
                }
            } else if (isIslandsFloor) {
                // Islands: 幅1の一本橋（直線的に接続）
                if (cx !== tx && (cy === ty || Math.random() < 0.5)) {
                    cx += (tx > cx ? 1 : -1);
                } else {
                    cy += (ty > cy ? 1 : -1);
                }
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
    const extraConnCount = isDenseMazeFloor ? 25 : (isSpiralFloor ? 5 : (isIslandsFloor ? 2 : (isMazeFloor ? 20 : (isBoldMazeFloor ? 6 : 3))));
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

    // 大広間(ICEモディファイア): フロア全体を氷に変換
    if (greatHallModifier === 'ICE') {
        isIceFloor = true;
        for (let _gy = 1; _gy < ROWS - 1; _gy++) {
            for (let _gx = 1; _gx < COLS - 1; _gx++) {
                if (map[_gy][_gx] === SYMBOLS.FLOOR) map[_gy][_gx] = SYMBOLS.ICE;
            }
        }
        addLog("❄️ FROZEN HALL: The entire hall is a sheet of ice!");
    }

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

    // 風フロアのランダム発生 (36階以降、3%の確率。固定ステージには発生しない)
    const fixedStages = [35, 40, 50, 66, 75, 80, 88, 100];
    if (floorLevel === 45 && !isWindFloor) {
        isWindFloor = true;
        windTimer = 4; // 1ターン目で即発動
        addLog("💨 FLOOR 45: Violent gales tear through this labyrinth!");
    }
    const windChance = (floorLevel >= 60 && floorLevel <= 69) ? 0.75 : 0.03;
    if (floorLevel >= 36 && !isWindFloor && !fixedStages.includes(floorLevel) && Math.random() < windChance) {
        isWindFloor = true;
        windTimer = 4; // 1ターン目で即発動
        addLog("💨 WARNING: Strong winds blow through this floor!");
    }
    // 大広間(WINDモディファイア): 確定で突風
    if (greatHallModifier === 'WIND' && !isWindFloor) {
        isWindFloor = true;
        windTimer = 4;
        addLog("💨 GUST HALL: A violent tempest rages through this vast chamber!");
    }

    // モンスターROOM (5階以降、固定ステージ除く、25%の確率)
    if (floorLevel >= 5 && !fixedStages.includes(floorLevel) && rooms.length > 2 && Math.random() < 0.25) {
        // スタート・最終部屋を除いた中から、ある程度広い部屋を優先して選ぶ
        const monsterCandidates = rooms.slice(1, -1).filter(r => r.w * r.h >= 9);
        const mRoom = monsterCandidates.length > 0
            ? monsterCandidates[Math.floor(Math.random() * monsterCandidates.length)]
            : rooms[1 + Math.floor(Math.random() * (rooms.length - 2))];

        // 部屋内のアイテム・既存の敵をクリア
        for (let ry = mRoom.y; ry < mRoom.y + mRoom.h; ry++) {
            for (let rx = mRoom.x; rx < mRoom.x + mRoom.w; rx++) {
                if (map[ry][rx] !== SYMBOLS.FLOOR && map[ry][rx] !== SYMBOLS.WALL) {
                    map[ry][rx] = SYMBOLS.FLOOR;
                }
            }
        }
        enemies = enemies.filter(e => !(e.x >= mRoom.x && e.x < mRoom.x + mRoom.w && e.y >= mRoom.y && e.y < mRoom.y + mRoom.h));

        // 床タイルの80%に敵を密集配置
        let monsterCount = 0;
        for (let ry = mRoom.y; ry < mRoom.y + mRoom.h; ry++) {
            for (let rx = mRoom.x; rx < mRoom.x + mRoom.w; rx++) {
                if (map[ry][rx] !== SYMBOLS.FLOOR) continue;
                if (Math.random() < 0.2) continue; // 20%は隙間
                const mr = Math.random();
                let mType = 'NORMAL';
                if      (floorLevel >= 40 && mr < 0.20) mType = 'LAYER';
                else if (floorLevel >= 30 && mr < 0.30) mType = 'BREAKER';
                else if (floorLevel >= 20 && mr < 0.40) mType = 'ORC';
                const mHp = 3 + floorLevel;
                enemies.push({ type: mType, x: rx, y: ry, hp: mHp, maxHp: mHp, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 5, stunTurns: 0 });
                monsterCount++;
            }
        }
        if (monsterCount > 0) addLog(`👾 MONSTER ROOM: A chamber teeming with ${monsterCount} monsters!`);
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
        if (floorLevel >= 4) possibleTomes.push(SYMBOLS.BREAKER_TOME);
        if (floorLevel >= 3) possibleTomes.push(SYMBOLS.HEAL_TOME);
        // 序盤（3〜15F）はヒール魔導書を多めに出す
        if (floorLevel <= 15) possibleTomes.push(SYMBOLS.HEAL_TOME);

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

    // 指輪のフロア落下（超低確率: 10階以降、0.8%）
    if (floorLevel >= 10 && Math.random() < 0.008) {
        const ringPool = RINGS.map((r, i) => i);
        const ringIdx = ringPool[Math.floor(Math.random() * ringPool.length)];
        const ringRooms = rooms.slice(1);
        if (ringRooms.length > 0) {
            const ringRoom = ringRooms[Math.floor(Math.random() * ringRooms.length)];
            for (let _rt = 0; _rt < 20; _rt++) {
                const rx = ringRoom.x + Math.floor(Math.random() * ringRoom.w);
                const ry = ringRoom.y + Math.floor(Math.random() * ringRoom.h);
                if (map[ry][rx] === SYMBOLS.FLOOR && !(rx === player.x && ry === player.y)) {
                    map[ry][rx] = SYMBOLS.RING;
                    ringDrops.push({ x: rx, y: ry, ringId: RINGS[ringIdx].id });
                    addLog(`💍 Something sparkles in the dungeon...`);
                    break;
                }
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

    // 商人NPC配置 (通常ダンジョン用)
    // 商人専用の小部屋を生成し、通路1マスで既存の部屋と接続する
    if (!multiScreenMode && isMerchantFloor) {
        let merchantPlaced = false;
        // 全部屋をシャッフルして試す（スタート部屋以外）
        const srcRooms = rooms.slice(1).sort(() => Math.random() - 0.5);
        const shopW = 5, shopH = 3;
        for (const srcRoom of srcRooms) {
            if (merchantPlaced) break;
            const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}].sort(() => Math.random() - 0.5);
            for (const dir of dirs) {
                let sx, sy;
                if (dir.dx === 1) {
                    sx = srcRoom.x + srcRoom.w + 2;
                    sy = srcRoom.cy - Math.floor(shopH / 2);
                } else if (dir.dx === -1) {
                    sx = srcRoom.x - shopW - 2;
                    sy = srcRoom.cy - Math.floor(shopH / 2);
                } else if (dir.dy === 1) {
                    sx = srcRoom.cx - Math.floor(shopW / 2);
                    sy = srcRoom.y + srcRoom.h + 2;
                } else {
                    sx = srcRoom.cx - Math.floor(shopW / 2);
                    sy = srcRoom.y - shopH - 2;
                }
                if (sx - 1 < 1 || sy - 1 < 1 || sx + shopW >= COLS - 1 || sy + shopH >= ROWS - 1) continue;
                let canPlace = true;
                for (let cy = sy - 1; cy <= sy + shopH && canPlace; cy++) {
                    for (let cx = sx - 1; cx <= sx + shopW && canPlace; cx++) {
                        if (map[cy][cx] !== SYMBOLS.WALL) canPlace = false;
                    }
                }
                if (!canPlace) continue;
                // 小部屋を掘る
                for (let cy = sy; cy < sy + shopH; cy++) {
                    for (let cx = sx; cx < sx + shopW; cx++) {
                        map[cy][cx] = SYMBOLS.FLOOR;
                    }
                }
                // 壁から1マス離れた中央に商人を配置
                const mcx = sx + Math.floor(shopW / 2);
                const mcy = sy + Math.floor(shopH / 2);
                map[mcy][mcx] = SYMBOLS.MERCHANT;
                merchantState = { x: mcx, y: mcy, facing: 'LEFT', jumpUntil: 0, nextAction: 3 + Math.floor(Math.random() * 4), hp: 30 };
                lastMerchantFloor = floorLevel;
                // 通路を掘って接続
                if (dir.dx === 1) {
                    for (let tx = srcRoom.x + srcRoom.w; tx < sx; tx++) map[srcRoom.cy][tx] = SYMBOLS.FLOOR;
                } else if (dir.dx === -1) {
                    for (let tx = sx + shopW; tx <= srcRoom.x - 1; tx++) map[srcRoom.cy][tx] = SYMBOLS.FLOOR;
                } else if (dir.dy === 1) {
                    for (let ty = srcRoom.y + srcRoom.h; ty < sy; ty++) map[ty][srcRoom.cx] = SYMBOLS.FLOOR;
                } else {
                    for (let ty = sy + shopH; ty <= srcRoom.y - 1; ty++) map[ty][srcRoom.cx] = SYMBOLS.FLOOR;
                }
                enemies = enemies.filter(e => !(e.x >= sx && e.x < sx + shopW && e.y >= sy && e.y < sy + shopH));
                addLog("A stranded adventurer (＠) is on this floor!");
                merchantPlaced = true;
                break;
            }
        }
        // フォールバック: 小部屋が作れなかった場合、既存部屋に直接配置
        if (!merchantPlaced && srcRooms.length > 0) {
            const fallbackRoom = srcRooms[0];
            // 部屋の中央付近の床タイルに配置
            for (let dy = 0; dy <= 2; dy++) {
                for (let dx = 0; dx <= 2; dx++) {
                    const fx = fallbackRoom.cx + dx;
                    const fy = fallbackRoom.cy + dy;
                    if (fy >= 1 && fy < ROWS - 1 && fx >= 1 && fx < COLS - 1 && map[fy][fx] === SYMBOLS.FLOOR
                        && map[fy-1][fx] !== SYMBOLS.WALL && map[fy+1][fx] !== SYMBOLS.WALL
                        && map[fy][fx-1] !== SYMBOLS.WALL && map[fy][fx+1] !== SYMBOLS.WALL) {
                        map[fy][fx] = SYMBOLS.MERCHANT;
                        merchantState = { x: fx, y: fy, facing: 'LEFT', jumpUntil: 0, nextAction: 3 + Math.floor(Math.random() * 4), hp: 30 };
                        lastMerchantFloor = floorLevel;
                        enemies = enemies.filter(e => !(e.x === fx && e.y === fy));
                        addLog("A stranded adventurer (＠) is on this floor!");
                        merchantPlaced = true;
                        break;
                    }
                }
                if (merchantPlaced) break;
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
                if (t === SYMBOLS.ICE || t === SYMBOLS.POISON || t === SYMBOLS.LAVA || t === SYMBOLS.WALL || t === SYMBOLS.BLOCK || t === SYMBOLS.BLOCK_CRACKED) map[ty][tx] = SYMBOLS.FLOOR;
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

    // --- 到達性チェック：プレイヤーから全部屋に到達できるか確認し、不可なら通路を修復 ---
    {
        const floodFill = (startX, startY) => {
            const visited = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
            const queue = [{ x: startX, y: startY }];
            visited[startY][startX] = 1;
            while (queue.length > 0) {
                const { x: fx, y: fy } = queue.shift();
                for (const [ddx, ddy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
                    const nnx = fx + ddx, nny = fy + ddy;
                    if (nnx < 0 || nnx >= COLS || nny < 0 || nny >= ROWS) continue;
                    if (visited[nny][nnx]) continue;
                    if (map[nny][nnx] === SYMBOLS.WALL) continue;
                    visited[nny][nnx] = 1;
                    queue.push({ x: nnx, y: nny });
                }
            }
            return visited;
        };

        const carvePath = (x1, y1, x2, y2) => {
            let cx = x1, cy = y1;
            while (cx !== x2 || cy !== y2) {
                if (cx !== x2 && (cy === y2 || Math.random() < 0.5)) {
                    cx += (x2 > cx ? 1 : -1);
                } else {
                    cy += (y2 > cy ? 1 : -1);
                }
                if (cx >= 1 && cx < COLS - 1 && cy >= 1 && cy < ROWS - 1) {
                    if (map[cy][cx] === SYMBOLS.WALL) {
                        map[cy][cx] = SYMBOLS.FLOOR;
                    }
                }
            }
        };

        // 全部屋＋出口への到達性を確認し、到達不能なら通路を掘る（修復後に再チェック）
        for (let attempt = 0; attempt < 10; attempt++) {
            const visited = floodFill(player.x, player.y);
            let allReachable = true;
            // 出口チェック
            if (!visited[ey][ex]) {
                console.log(`[ReachCheck] Exit (${ex},${ey}) unreachable from player (${player.x},${player.y}), carving path (attempt ${attempt})`);
                carvePath(player.x, player.y, ex, ey);
                allReachable = false;
            }
            // 全部屋の中心チェック
            for (const room of rooms) {
                if (!visited[room.cy][room.cx]) {
                    console.log(`[ReachCheck] Room center (${room.cx},${room.cy}) unreachable, carving path (attempt ${attempt})`);
                    carvePath(player.x, player.y, room.cx, room.cy);
                    allReachable = false;
                }
            }
            if (allReachable) break;
        }
        // 最終確認：まだ到達不能なら各未到達部屋へ隣接部屋経由で通路を掘る
        {
            const finalCheck = floodFill(player.x, player.y);
            for (const room of rooms) {
                if (!finalCheck[room.cy][room.cx]) {
                    // 到達可能な最寄りの部屋を探して、そこから掘る
                    let nearestReachable = null;
                    let nearestDist = Infinity;
                    for (const other of rooms) {
                        if (other === room) continue;
                        if (finalCheck[other.cy][other.cx]) {
                            const d = Math.abs(other.cx - room.cx) + Math.abs(other.cy - room.cy);
                            if (d < nearestDist) { nearestDist = d; nearestReachable = other; }
                        }
                    }
                    if (nearestReachable) {
                        carvePath(nearestReachable.cx, nearestReachable.cy, room.cx, room.cy);
                    } else {
                        carvePath(player.x, player.y, room.cx, room.cy);
                    }
                }
            }
            if (!finalCheck[ey][ex]) {
                carvePath(player.x, player.y, ex, ey);
            }
        }
    }

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

    // Xステージ警告
    if (isXWallStage) {
        addLog("⚠️ The walls feel... alive. Something lurks within.");
    }

    // 壁の割合を計算（BREAKERの出現率補正に使用）
    let wallCount = 0, totalInner = 0;
    for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
            totalInner++;
            if (map[y][x] === SYMBOLS.WALL) wallCount++;
        }
    }
    const wallRatio = wallCount / totalInner; // 0.0〜1.0
    // 壁が多いほどBREAKER出現閾値を上げる（壁20%超で発動、壁が多いほど大幅に上昇）
    const breakerBonus = wallRatio > 0.2 ? Math.min(0.30, (wallRatio - 0.2) * 0.6) : 0;

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
                        } else if (floorLevel >= 4 && enemyRoll < (floorLevel <= 49 ? 0.35 : 0.28) + breakerBonus) {
                            enemies.push({
                                type: 'BREAKER', x: ex, y: ey,
                                hp: 50 + floorLevel * 4, maxHp: 50 + floorLevel * 4,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 45,
                                stunTurns: 0
                            });
                        } else if (floorLevel >= 40 && floorLevel <= 49 && enemyRoll < 0.37 + breakerBonus) {
                            enemies.push({
                                type: 'LAYER', x: ex, y: ey,
                                hp: 20 + floorLevel * 2, maxHp: 20 + floorLevel * 2,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 25,
                                stunTurns: 0
                            });
                        } else if (floorLevel >= 7 && Math.random() < 0.12) {
                            // BOMBER(X): 死体が3ターン後に爆発
                            enemies.push({
                                type: 'BOMBER', x: ex, y: ey,
                                hp: 8 + floorLevel, maxHp: 8 + floorLevel,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 12,
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

    // --- 渦巻き床: 中央の穴周辺に同一タイプの敵クラスター ---
    if (isSpiralFloor) {
        const spiralCX = Math.floor(COLS / 2);
        const spiralCY = Math.floor(ROWS / 2);
        // 中心に穴（STAIRS）を追加配置
        if (map[spiralCY][spiralCX] === SYMBOLS.FLOOR || map[spiralCY][spiralCX] === SYMBOLS.ICE || map[spiralCY][spiralCX] === SYMBOLS.POISON) {
            map[spiralCY][spiralCX] = SYMBOLS.STAIRS;
        }
        // フロアレベルに応じて出現可能な敵タイプを選択
        const clusterPool = ['NORMAL', 'BREAKER'];
        if (floorLevel >= 7) clusterPool.push('BOMBER');
        if (floorLevel >= 8) clusterPool.push('ORC');
        if (floorLevel >= 12) clusterPool.push('TURRET');
        if (floorLevel >= 40 && floorLevel <= 49) clusterPool.push('LAYER');
        const clusterType = clusterPool[Math.floor(Math.random() * clusterPool.length)];
        const clusterCount = 3 + Math.floor(Math.random() * 3); // 3〜5体
        let spiralPlaced = 0;
        outer: for (let dist = 1; dist <= 5; dist++) {
            for (let dy = -dist; dy <= dist; dy++) {
                for (let dx = -dist; dx <= dist; dx++) {
                    if (Math.abs(dx) !== dist && Math.abs(dy) !== dist) continue;
                    if (spiralPlaced >= clusterCount) break outer;
                    const tx = spiralCX + dx, ty = spiralCY + dy;
                    if (tx < 1 || ty < 1 || tx >= COLS - 1 || ty >= ROWS - 1) continue;
                    const tile = map[ty][tx];
                    if (tile !== SYMBOLS.FLOOR && tile !== SYMBOLS.ICE && tile !== SYMBOLS.POISON) continue;
                    if (enemies.some(e => e.x === tx && e.y === ty)) continue;
                    if (tx === player.x && ty === player.y) continue;
                    let eHp, eExp;
                    if (clusterType === 'ORC')    { eHp = 40 + floorLevel * 5; eExp = 40; }
                    else if (clusterType === 'BREAKER') { eHp = 50 + floorLevel * 4; eExp = 45; }
                    else if (clusterType === 'BOMBER')  { eHp = 8 + floorLevel;     eExp = 12; }
                    else if (clusterType === 'LAYER')   { eHp = 20 + floorLevel * 2; eExp = 25; }
                    else if (clusterType === 'TURRET')  { eHp = 100 + floorLevel * 5; eExp = 40; }
                    else { eHp = 3 + floorLevel; eExp = 5; }
                    const clusterEnemy = { type: clusterType, x: tx, y: ty, hp: eHp, maxHp: eHp, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: eExp, stunTurns: 0 };
                    if (clusterType === 'TURRET') {
                        let bestDir = 0, maxDist = -1;
                        for (let d = 0; d < 4; d++) {
                            const ddx = [0,1,0,-1][d], ddy = [-1,0,1,0][d];
                            let ld = 0, lx = tx + ddx, ly = ty + ddy;
                            while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS && !isWallAt(lx, ly)) { ld++; lx += ddx; ly += ddy; }
                            if (ld > maxDist) { maxDist = ld; bestDir = d; }
                        }
                        clusterEnemy.dir = bestDir;
                    }
                    enemies.push(clusterEnemy);
                    spiralPlaced++;
                }
            }
        }
        if (spiralPlaced > 0) addLog(`⚠ ${spiralPlaced} ${clusterType}s converge around the central abyss!`);
    }

    // --- ミミック配置 ---
    // 77階で確定出現（テスト用）、それ以外は5%の確率で出現
    if (floorLevel === 77 || (floorLevel >= 20 && Math.random() < 0.05)) {
        // 出口のある部屋（lastRoom）以外の部屋から配置場所を探す
        const mimicRooms = rooms.filter(r => r !== lastRoom && r !== rooms[0]);
        if (mimicRooms.length > 0) {
            const mimicRoom = mimicRooms[Math.floor(Math.random() * mimicRooms.length)];
            let mimicPos = null;
            for (let t = 0; t < 30; t++) {
                const tx = mimicRoom.x + Math.floor(Math.random() * mimicRoom.w);
                const ty = mimicRoom.y + Math.floor(Math.random() * mimicRoom.h);
                if (map[ty][tx] === SYMBOLS.FLOOR && !(tx === player.x && ty === player.y) &&
                    !enemies.some(e => e.x === tx && e.y === ty) &&
                    !(isWallAt(tx - 1, ty) && isWallAt(tx + 1, ty)) &&
                    !(isWallAt(tx, ty - 1) && isWallAt(tx, ty + 1))) {
                    mimicPos = { x: tx, y: ty };
                    break;
                }
            }
            if (mimicPos) {
                const mimicHp = 50 + floorLevel * 3;
                enemies.push({
                    type: 'MIMIC', x: mimicPos.x, y: mimicPos.y,
                    hp: mimicHp, maxHp: mimicHp,
                    flashUntil: 0, offsetX: 0, offsetY: 0,
                    expValue: 60, stunTurns: 0,
                    disguised: true, moveCooldown: 10
                });
                // 床タイルを偽の穴（STAIRS）に書き換える
                map[mimicPos.y][mimicPos.x] = SYMBOLS.STAIRS;
            }
        }
    }

    // --- ミミック部屋（超低確率: 0.2%）---
    // 1つの部屋の全ての敵をミミックに入れ替える特殊イベント
    if (floorLevel >= 15 && Math.random() < 0.002) {
        const mimicRoomCandidates = rooms.filter(r => r !== lastRoom && r !== rooms[0]);
        if (mimicRoomCandidates.length > 0) {
            const mRoom = mimicRoomCandidates[Math.floor(Math.random() * mimicRoomCandidates.length)];
            const mimicHp = 50 + floorLevel * 3;
            // その部屋にいる敵をミミックに置き換える
            for (const e of enemies) {
                if (e.x >= mRoom.x && e.x < mRoom.x + mRoom.w &&
                    e.y >= mRoom.y && e.y < mRoom.y + mRoom.h) {
                    e.type = 'MIMIC';
                    e.hp = mimicHp;
                    e.maxHp = mimicHp;
                    e.expValue = 60;
                    e.disguised = true;
                    e.moveCooldown = 10;
                    map[e.y][e.x] = SYMBOLS.STAIRS;
                }
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
    const tomeSymbols = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.ESCAPE, SYMBOLS.BREAKER_TOME, SYMBOLS.GUARDIAN];
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

    // 大広間(WISPモディファイア): 各柱に隣接してウィスプを1体配置
    if (greatHallModifier === 'WISP') {
        const _ghDirs = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
        const _usedWispTiles = new Set();
        for (let _wy = 1; _wy < ROWS - 1; _wy++) {
            for (let _wx = 1; _wx < COLS - 1; _wx++) {
                if (map[_wy][_wx] !== SYMBOLS.WALL) continue;
                // 周囲に通行可能タイルがある（柱らしい）壁のみ対象
                for (const _d of _ghDirs) {
                    const _nx = _wx + _d.dx, _ny = _wy + _d.dy;
                    if (_nx < 1 || _nx >= COLS - 1 || _ny < 1 || _ny >= ROWS - 1) continue;
                    const _t = map[_ny][_nx];
                    if (_t === SYMBOLS.WALL || _t === SYMBOLS.STAIRS) continue;
                    if (_nx === player.x && _ny === player.y) continue;
                    const _key = `${_nx},${_ny}`;
                    if (_usedWispTiles.has(_key)) continue;
                    if (wisps.some(w => w.x === _nx && w.y === _ny)) continue;
                    _usedWispTiles.add(_key);
                    wisps.push({ x: _nx, y: _ny, dir: Math.floor(Math.random() * 4), mode: 'FOLLOW' });
                    break;
                }
            }
        }
        if (_usedWispTiles.size > 0) addLog("👻 HAUNTED HALL: Every pillar is haunted by a Wisp!");
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

    // ステージ5に確定でGOLD敵を出現
    if (floorLevel === 5) {
        for (let t = 0; t < 300; t++) {
            const gx = Math.floor(Math.random() * (COLS - 4)) + 2;
            const gy = Math.floor(Math.random() * (ROWS - 4)) + 2;
            if (map[gy][gx] !== SYMBOLS.FLOOR) continue;
            if (gx === player.x && gy === player.y) continue;
            if (enemies.some(e => e.x === gx && e.y === gy)) continue;
            if (Math.abs(gx - player.x) + Math.abs(gy - player.y) < 5) continue;
            enemies.push({
                type: 'GOLD', x: gx, y: gy, hp: 4, maxHp: 4,
                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 500 + floorLevel * 100
            });
            addLog("!! A Golden Shiny Enemy appeared !!");
            break;
        }
    }

    // ステージ83: 密集迷路＋KEY_RUNNERのみ。完全クリーンアップ後に再配置
    if (floorLevel === 83) {
        enemies = [];
        wisps = [];
        merchantState = null; // 商人を除去

        // マップ上の余分なタイルを整理：
        // KEY→FLOOR、MERCHANT→FLOOR、STAIRS/DOOR→まず全部FLOOR
        let doorX = -1, doorY = -1;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const t = map[y][x];
                if (t === SYMBOLS.KEY || t === SYMBOLS.MERCHANT) {
                    map[y][x] = SYMBOLS.FLOOR;
                } else if (t === SYMBOLS.STAIRS || t === SYMBOLS.DOOR) {
                    // 最初に見つけたSTAIRS/DOORをDOORとして使い、残りはFLOORに
                    if (doorX === -1) { doorX = x; doorY = y; map[y][x] = SYMBOLS.DOOR; }
                    else { map[y][x] = SYMBOLS.FLOOR; }
                }
            }
        }
        // STAIRS/DOORが一つも無かった場合のフォールバック（右下付近）
        if (doorX === -1) {
            doorX = COLS - 4; doorY = ROWS - 4;
            map[doorY][doorX] = SYMBOLS.DOOR;
        }

        // KEY_RUNNERをプレイヤーから遠い床タイルに配置
        let kr83placed = false;
        for (let t = 0; t < 1000 && !kr83placed; t++) {
            const kx = 2 + Math.floor(Math.random() * (COLS - 4));
            const ky = 2 + Math.floor(Math.random() * (ROWS - 4));
            if (map[ky][kx] !== SYMBOLS.FLOOR) continue;
            if (Math.abs(kx - player.x) + Math.abs(ky - player.y) < 12) continue;
            const krHp = 10 + floorLevel;
            enemies.push({
                type: 'KEY_RUNNER', x: kx, y: ky,
                hp: krHp, maxHp: krHp,
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: 80, stunTurns: 0,
                flee: true, holdsKey: true,
                trailX: null, trailY: null
            });
            kr83placed = true;
        }
        addLog("🔑 K holds the only key. Catch it to unlock the door!");
    }

    // Stage 86 / 93: KEY_RUNNER がカギを持って逃げる（マップ・敵はそのまま）
    if (floorLevel === 86 || floorLevel === 93) {
        // マップ上のKEYをすべて除去し、STAIRS/DOORは最初の1個だけDOORとして残す
        let doorX = -1, doorY = -1;
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const t = map[y][x];
                if (t === SYMBOLS.KEY) {
                    map[y][x] = SYMBOLS.FLOOR;
                } else if (t === SYMBOLS.STAIRS || t === SYMBOLS.DOOR) {
                    if (doorX === -1) { doorX = x; doorY = y; map[y][x] = SYMBOLS.DOOR; }
                    else { map[y][x] = SYMBOLS.FLOOR; }
                }
            }
        }
        // STAIRS/DOORが一つも無かった場合のフォールバック
        if (doorX === -1) {
            map[ROWS - 4][COLS - 4] = SYMBOLS.DOOR;
        }

        // KEY_RUNNERをプレイヤーから遠い床タイルに配置
        let krPlaced = false;
        for (let t = 0; t < 1000 && !krPlaced; t++) {
            const kx = 2 + Math.floor(Math.random() * (COLS - 4));
            const ky = 2 + Math.floor(Math.random() * (ROWS - 4));
            if (map[ky][kx] !== SYMBOLS.FLOOR) continue;
            if (Math.abs(kx - player.x) + Math.abs(ky - player.y) < 12) continue;
            const krHp = 10 + floorLevel;
            enemies.push({
                type: 'KEY_RUNNER', x: kx, y: ky,
                hp: krHp, maxHp: krHp,
                flashUntil: 0, offsetX: 0, offsetY: 0,
                expValue: 80, stunTurns: 0,
                flee: true, holdsKey: true,
                trailX: null, trailY: null
            });
            krPlaced = true;
        }
        addLog(`EVENT: Stage ${floorLevel} — The Key Thief!`);
        addLog("🔑 K holds the only key. Catch it to unlock the door!");
    }

    // ========================================================
    // STAGE 99: ICICLE CAVERN — 敵なし・洞窟壁・つらら密室
    // ========================================================
    if (floorLevel === 99) {
        addLog("EVENT: The Final Cavern.");
        addLog("▲ Rock spikes fill every corner. The air is deathly still.");
        addLog("⚠️ Something lurks beyond the silence...");

        // 全面を外周壁・内部床で初期化
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                map[y][x] = (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1)
                    ? SYMBOLS.WALL : SYMBOLS.FLOOR;
            }
        }

        // --- 洞窟壁の凹凸（各辺から不規則に突き出す） ---
        // 上壁から下向き突起（列ごとにランダムな深さ 0-4）
        for (let x = 2; x < COLS - 2; x++) {
            const depth = Math.floor(Math.random() * 5); // 0〜4
            for (let d = 1; d <= depth; d++) {
                if (d < ROWS - 2) map[d][x] = SYMBOLS.WALL;
            }
        }
        // 下壁から上向き突起
        for (let x = 2; x < COLS - 2; x++) {
            const depth = Math.floor(Math.random() * 5);
            for (let d = 1; d <= depth; d++) {
                if (ROWS - 1 - d >= 1) map[ROWS - 1 - d][x] = SYMBOLS.WALL;
            }
        }
        // 左壁から右向き突起
        for (let y = 2; y < ROWS - 2; y++) {
            const depth = Math.floor(Math.random() * 5);
            for (let d = 1; d <= depth; d++) {
                if (d < COLS - 2) map[y][d] = SYMBOLS.WALL;
            }
        }
        // 右壁から左向き突起
        for (let y = 2; y < ROWS - 2; y++) {
            const depth = Math.floor(Math.random() * 5);
            for (let d = 1; d <= depth; d++) {
                if (COLS - 1 - d >= 1) map[y][COLS - 1 - d] = SYMBOLS.WALL;
            }
        }
        // 角の丸め：4隅の内側に小さな壁の塊を追加してより洞窟らしく
        const addCorner = (cx, cy, r) => {
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx < 1 || nx >= COLS-1 || ny < 1 || ny >= ROWS-1) continue;
                if (dx*dx + dy*dy <= r*r && Math.random() < 0.7) map[ny][nx] = SYMBOLS.WALL;
            }
        };
        addCorner(3, 3, 2);
        addCorner(COLS - 4, 3, 2);
        addCorner(3, ROWS - 4, 2);
        addCorner(COLS - 4, ROWS - 4, 2);

        // --- プレイヤー配置：左上の安全地帯 ---
        player.x = 5; player.y = 6;
        // スタート周辺 5×5 を強制的に床にする
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const ny = player.y + dy, nx = player.x + dx;
            if (ny >= 1 && ny < ROWS-1 && nx >= 1 && nx < COLS-1) map[ny][nx] = SYMBOLS.FLOOR;
        }

        // --- 出口（STAIRS）：右下の安全地帯 ---
        const stairsX99 = COLS - 6, stairsY99 = ROWS - 6;
        map[stairsY99][stairsX99] = SYMBOLS.STAIRS;
        // 出口周辺 5×5 を強制的に床にする
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
            const ny = stairsY99 + dy, nx = stairsX99 + dx;
            if (ny >= 1 && ny < ROWS-1 && nx >= 1 && nx < COLS-1 && map[ny][nx] !== SYMBOLS.STAIRS)
                map[ny][nx] = SYMBOLS.FLOOR;
        }

        // --- つらら（ICICLE）を床タイル全体に密に散布 ---
        // tempWalls への追加：hp:2 の破壊可能障害物
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                if (map[y][x] !== SYMBOLS.FLOOR) continue;
                // スタート・出口周辺は除外
                if (Math.abs(x - player.x) + Math.abs(y - player.y) <= 4) continue;
                if (Math.abs(x - stairsX99) + Math.abs(y - stairsY99) <= 4) continue;
                // 50% の確率でつらら配置（密集感を出す）
                if (Math.random() < 0.50) {
                    tempWalls.push({ x, y, hp: 2, type: 'ICICLE' });
                }
            }
        }

        // 敵なし（ラスボス前の静寂）
        enemies = [];

        return;
    }

}

function breakStealth() {
    if (player.isStealth) {
        player.isStealth = false;
        addLog("Stealth broken!");
    }
}

function isWallAt(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    const tile = map[y][x];
    if (tile === SYMBOLS.WALL || tile === SYMBOLS.DOOR || tile === SYMBOLS.CORE || tile === SYMBOLS.BLOCK || tile === SYMBOLS.BLOCK_CRACKED || tile === SYMBOLS.MERCHANT) return true;
    if (tile === SYMBOLS.FIRE_BLOCK) return true;
    if (tempWalls.some(w => w.x === x && w.y === y)) return true;
    if (bombs.some(b => b.x === x && b.y === y)) return true;
    return false;
}

async function startFloorTransition() {
    if (floorLevel === 100 || floorLevel === 99) stopBGM();
    isProcessing = true;
    isPlayerVisible = false; // 遷移開始時に即座に隠す
    SOUNDS.DESCEND();
    transition.active = true;
    transition.mode = 'FALLING';
    transition.text = `FLOOR ${floorLevel}`;
    transition.textColor = '#ededed';
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
    if (floorLevel > maxReachedFloor) maxReachedFloor = floorLevel;
    // マルチスクリーン: 全画面の妖精タイルを自律エンティティとして登録
    if (multiScreenMode && screenGrid) {
        for (let sy = 0; sy < screenGridSize; sy++) {
            for (let sx = 0; sx < screenGridSize; sx++) {
                const m = (sx === currentScreen.x && sy === currentScreen.y) ? map : screenGrid.maps[sy][sx];
                if (!m) continue;
                for (let fy = 0; fy < ROWS; fy++) {
                    for (let fx = 0; fx < COLS; fx++) {
                        if (m[fy][fx] === SYMBOLS.FAIRY) {
                            // 四方が全て壁かどうかを実際に確認して初期化
                            const _dirs4 = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
                            const _isSurr = _dirs4.every(d => {
                                const nx = fx + d.x, ny = fy + d.y;
                                return nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || m[ny][nx] === SYMBOLS.WALL;
                            });
                            movingFairies.push({ x: fx, y: fy, screenX: sx, screenY: sy, underTile: SYMBOLS.FLOOR, surrounded: _isSurr, waitTurns: 0 });
                        }
                    }
                }
            }
        }
    }
    // 階段降下時にHP全回復
    player.hp = player.maxHp;
    player.isSpeeding = false;
    player.isExtraTurn = false;
    player.isShielded = false;
    updateUI();
    // フロア開始時点の状態をオートセーブ
    saveGame();
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

    // 着地後にBGM処理（100階は無音）
    // 再生中なら次フロアへ引き継ぐ。無音状態でフロア移動したときだけ新しく開始する。
    if (floorLevel !== 100 && floorLevel !== 99 && !bgmActive) changeBGMTrack();

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

    // 演出時間 (500msに短縮：テンポ重視)
    await new Promise(r => setTimeout(r, 500));

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
            spawnFloatingText(item.x, item.y, "HASTE TOME IDENTIFIED", "#38bdf8", 1500);
        } else if (item.symbol === SYMBOLS.CHARM) {
            await animateItemGet(SYMBOLS.TOME);
            player.charmTomes++;
            addLog("📜 YOU DECIPHERED: 'Charm Tome'! (Press [C] to recite)");
            spawnFloatingText(item.x, item.y, "CHARM TOME IDENTIFIED", "#60a5fa", 1500);
        } else if (item.symbol === SYMBOLS.STEALTH) {
            await animateItemGet(SYMBOLS.TOME);
            player.stealthTomes++;
            addLog("📜 YOU DECIPHERED: 'Stealth Tome'! (Inventory to recite)");
            spawnFloatingText(item.x, item.y, "STEALTH TOME IDENTIFIED", "#94a3b8", 1500);
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
            addLog("✨ You were joined by a FAIRY! ✨");
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
    playBossBGM('bgm_obsidian_drum_rite.mp3');

    // 近くの敵も吹き飛ばす
    enemies.forEach(otherE => {
        if (otherE.type === 'DRAGON') return;
        if (otherE.hp > 0) {
            otherE.y = Math.min(ROWS - 3, otherE.y + 10);
            spawnDamageText(otherE.x, otherE.y, 0, '#ededed'); // ダメージなしの吹き飛ばし演出
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

async function showStoryPages(pages, useMiddlePos = false, useTopPos = false, autoAdvanceMs = 0) {
    for (let i = 0; i < pages.length; i++) {
        const isLastPage = (i === pages.length - 1);
        storyMessage = {
            lines: pages[i],
            alpha: 0,
            showNext: !isLastPage && autoAdvanceMs === 0,
            useMiddlePos: useMiddlePos,
            useTopPos: useTopPos
        };

        // フェードイン
        for (let a = 0; a <= 1; a += 0.05) {
            storyMessage.alpha = a;
            await new Promise(r => setTimeout(r, 20));
        }

        if (autoAdvanceMs > 0) {
            // 自動進行モード: 指定ミリ秒後に次へ
            await new Promise(r => setTimeout(r, autoAdvanceMs));
        } else {
            // 入力待ちモード
            isTutorialInputActive = true;
            while (isTutorialInputActive) {
                await new Promise(r => setTimeout(r, 20));
            }
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
    try {
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
        try { await enemyTurn(); } catch(etErr) { console.error('[wand enemyTurn ERROR]', etErr); }
        await new Promise(r => setTimeout(r, 600));

        // ブロックを上、左、下に設置
        addLog("Magic block! Protect yourself!");
        const blocks = [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }];
        for (const b of blocks) {
            const bx = player.x + b.dx; const by = player.y + b.dy;
            // マップの空き状況を確認 (稀に床以外に置こうとしないように)
            if (map[by][bx] === SYMBOLS.FLOOR || map[by][bx] === SYMBOLS.POISON) {
                tempWalls.push({ x: bx, y: by, hp: 2 });
                SOUNDS.PLACE_BLOCK();
                updateUI();
                await new Promise(r => setTimeout(r, 300));
            }
        }

        await new Promise(r => setTimeout(r, 500));
    } catch(err) {
        console.error('[wand event ERROR]', err);
    } finally {
        isProcessing = false;
    }
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

async function triggerGolemEvent() {
    isProcessing = true;
    hasShownGolemTut = true;
    await new Promise(r => setTimeout(r, 500));

    await showStoryPages([
        [
            "There is a Golem.",
            "",
            "ゴーレムがいる"
        ],
        [
            "It is a powerful enemy.",
            "If it charges at you,",
            "you will be knocked back into a wall.",
            "",
            "強敵だ。",
            "体当たりをされると、",
            "壁まで飛ばされてしまう"
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
    const hideStates = ['TITLE', 'OPENING', 'GAMEOVER', 'GAMEOVER_SEQ', 'ENDING', 'ENDING_SEQ'];
    statsBar.style.display = hideStates.includes(gameState) ? 'none' : '';
    logRow.style.display = hideStates.includes(gameState) ? 'none' : '';

    if (gameState === 'TITLE') {
        drawTitle();
    } else if (gameState === 'CONFIRM_NEWGAME') {
        drawTitle();
        drawConfirmNewGame();
    } else if (gameState === 'MENU') {
        draw(now);
        drawMenuScreen();
    } else if (gameState === 'STATUS') {
        draw(now);
        drawStatusScreen();
    } else if (gameState === 'INVENTORY') {
        draw(now);
        drawInventoryScreen();
    } else if (gameState === 'SHOP') {
        draw(now);
        drawShopScreen();
    } else if (gameState === 'CONFIRM_BUY') {
        draw(now);
        drawShopScreen();
        drawConfirmBuy();
    } else if (gameState === 'RINGS') {
        draw(now);
        drawRingsScreen();
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
        damageTexts = damageTexts.filter(d => now - d.startTime < (d.duration ?? 400));
        attackLines = attackLines.filter(l => now < l.until);
    }

    requestAnimationFrame(gameLoop);
}

function drawTitle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    const deepUnlocked = localStorage.getItem('deep_unlocked') === '1';

    ctx.fillStyle = '#ededed';
    ctx.font = "bold 40px 'Courier New', Courier, monospace";
    ctx.fillText('MINIMAL ROGUE', canvas.width / 2, canvas.height / 3);

    // 深層解放メッセージ
    if (deepUnlocked) {
        const pulse = Math.sin(performance.now() / 600) * 0.3 + 0.7;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#38bdf8';
        ctx.font = "12px 'Courier New', Courier, monospace";
        ctx.fillText('— THE ABYSS AWAITS —', canvas.width / 2, canvas.height / 3 + 30);
        ctx.restore();
    }

    const menuY = canvas.height / 2 + 30;
    ctx.font = '24px Courier New';
    const hasSave = localStorage.getItem('minimal_rogue_save') !== null;
    let saveFloor = null;
    if (hasSave) {
        try { saveFloor = JSON.parse(localStorage.getItem('minimal_rogue_save')).floorLevel; } catch(e) {}
    }
    const allOptions = ['START NEW GAME', 'CONTINUE', 'TEST PLAY', 'DEEP TEST'];
    const visibleCount = testModeVisible ? 4 : 2;
    const options = allOptions.slice(0, visibleCount);
    options.forEach((opt, i) => {
        const isSelected = titleSelection === i;
        let isDisabled = i === 1 && !hasSave && !deepUnlocked;
        let text = opt;
        if (i === 1 && deepUnlocked) {
            text = 'DESCEND INTO THE ABYSS';
            ctx.fillStyle = isSelected ? '#38bdf8' : '#1e6fa8';
        } else {
            ctx.fillStyle = isSelected ? '#ededed' : (isDisabled ? '#333' : '#666');
        }
        if (i === 2) text = `TEST: FLOOR ${testFloor}`;
        if (i === 3) text = `DEEP TEST: FLOOR ${deepTestFloor}`;
        if (isSelected) {
            text = `> ${text} <`;
            if (i === 1 && !hasSave && !deepUnlocked) {
                // セーブなし・深層未解放時のヒント（2行）
                ctx.font = '11px Courier New';
                ctx.fillStyle = '#555';
                ctx.fillText('Auto-save only. Resume from where you died.  /  オートセーブのみ。死んだ階層から再開します。', canvas.width / 2, menuY + i * 40 + 22);
                ctx.fillText('No save data yet.  /  まだデータがありません。', canvas.width / 2, menuY + i * 40 + 36);
                ctx.font = '24px Courier New';
                ctx.fillStyle = '#ededed'; // CONTINUE本文の色を白に戻す
            } else if (i === 1 && hasSave && !deepUnlocked) {
                ctx.font = '12px Courier New';
                ctx.fillStyle = '#aaa';
                ctx.fillText(`— Resume from B${saveFloor}F —`, canvas.width / 2, menuY + i * 40 + 25);
                ctx.font = '24px Courier New';
                ctx.fillStyle = '#ededed';
            } else if (i === 1 && deepUnlocked) {
                ctx.font = '12px Courier New';
                ctx.fillStyle = '#38bdf8';
                const deepSubText = saveFloor != null ? `Beyond floor 100 lies the unknown...  (B${saveFloor}F)` : 'Beyond floor 100 lies the unknown...';
                ctx.fillText(deepSubText, canvas.width / 2, menuY + i * 40 + 25);
                ctx.font = '24px Courier New';
                ctx.fillStyle = '#38bdf8';
            }
            if (i === 2) {
                ctx.font = '12px Courier New';
                ctx.fillStyle = '#888';
                ctx.fillText('Use [Left/Right] to change Floor  (1-100)', canvas.width / 2, menuY + i * 40 + 25);
                ctx.font = '24px Courier New';
            }
            if (i === 3) {
                ctx.font = '12px Courier New';
                ctx.fillStyle = '#f97316';
                ctx.fillText('Use [Left/Right] to change Floor  (101-999)', canvas.width / 2, menuY + i * 40 + 25);
                ctx.font = '24px Courier New';
            }
        }
        ctx.fillText(text, canvas.width / 2, menuY + i * 40);
    });
    // テストモード表示中インジケーター
    if (testModeVisible) {
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#f97316';
        ctx.fillText('[TEST MODE]', canvas.width / 2, menuY + 4 * 40 + 15);
    }
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
    const JA_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
    const CY = 12, CH = canvas.height - 24;
    const label = statusPage === 0 ? 'STATUS  1/3' : statusPage === 1 ? 'EQUIP  2/3' : 'SETTINGS  3/3';

    // Cascade: CMD (dimmed, STATUS=idx2) + main window
    dqCmdBackground(2);
    const WX = 154, WW = canvas.width - WX - 12;
    drawDQWindow(WX, CY, WW, CH);
    drawDQTitle(WX, CY, WW, label);

    if (statusPage === 0) {
        // ── Page 1: Main Stats ─────────────────────────────────
        const atk = 2 + player.level + (player.swordCount * 3);
        const def = player.armorCount;
        const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
        const hpColor = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#facc15' : '#f87171';

        // ── HP ──────────────────────────────────────
        const barX = WX + 30, barY = CY + 48, barW = WW - 60, barH = 18;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, Math.floor(barW * hpRatio), barH);
        ctx.strokeStyle = 'rgba(237,237,237,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 12px Courier New';
        ctx.fillText('HP', barX, barY - 4);

        ctx.textAlign = 'right';
        ctx.fillStyle = hpColor;
        ctx.font = 'bold 12px Courier New';
        ctx.fillText(`${player.hp} / ${player.maxHp}`, barX + barW, barY - 4);

        // ── ATK / DEF ───────────────────────────────
        const statY = CY + 102;
        const halfW = (WW - 60) / 2;

        // ATK box
        const atkX = WX + 30;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(atkX, statY, halfW - 10, 66);
        ctx.strokeStyle = 'rgba(237,237,237,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(atkX, statY, halfW - 10, 66);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.font = '11px Courier New';
        ctx.fillText('ATTACK', atkX + (halfW - 10) / 2, statY + 16);
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 30px Courier New';
        ctx.fillText(atk, atkX + (halfW - 10) / 2, statY + 52);

        // DEF box
        const defX = WX + 30 + halfW + 10;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(defX, statY, halfW - 10, 66);
        ctx.strokeStyle = 'rgba(237,237,237,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(defX, statY, halfW - 10, 66);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        ctx.font = '11px Courier New';
        ctx.fillText('DEFENSE', defX + (halfW - 10) / 2, statY + 16);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 30px Courier New';
        ctx.fillText(def, defX + (halfW - 10) / 2, statY + 52);

        // ── Divider ─────────────────────────────────
        const divY = statY + 80;
        ctx.strokeStyle = 'rgba(237,237,237,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(WX + 20, divY); ctx.lineTo(WX + WW - 20, divY); ctx.stroke();

        // ── Secondary stats (small) ──────────────────
        const cols = [
            [
                { label: 'LEVEL',   val: `${player.level}` },
                { label: 'EXP',     val: `${player.exp} / ${player.nextExp}` },
                { label: 'STAMINA', val: `${player.stamina}%` },
            ],
            [
                { label: 'FLOOR',   val: `${floorLevel}F` },
                { label: 'KILLS',   val: `${player.totalKills}` },
                { label: 'GOLD',    val: `${player.gold}G` },
            ]
        ];
        const secY = divY + 16;
        const colW = (WW - 60) / 2;
        cols.forEach((col, ci) => {
            const cx2 = WX + 30 + ci * (colW + 10);
            col.forEach((item, ri) => {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#555';
                ctx.font = '11px Courier New';
                ctx.fillText(item.label, cx2, secY + ri * 22);
                ctx.fillStyle = '#aaa';
                ctx.font = '12px Courier New';
                ctx.fillText(item.val, cx2 + 72, secY + ri * 22);
            });
        });

    } else if (statusPage === 1) {
        // ── Page 2: Equipment ──────────────────────────────────
        const sx = WX + 30;
        let ey = CY + 50;

        const equipRow = (symbol, color, name, level, desc) => {
            ctx.fillStyle = color;
            ctx.font = `bold 18px Courier New`;
            ctx.textAlign = 'left';
            ctx.fillText(symbol, sx, ey + 4);
            ctx.fillStyle = '#ededed';
            ctx.font = 'bold 14px Courier New';
            ctx.fillText(name, sx + 26, ey);
            ctx.fillStyle = '#777';
            ctx.font = '11px Courier New';
            ctx.fillText(`Lv ${level}`, sx + 26, ey + 14);
            ctx.fillStyle = '#555';
            ctx.font = '11px ' + JA_FONT;
            ctx.fillText(desc, sx + 26, ey + 28);
            ctx.strokeStyle = 'rgba(237,237,237,0.10)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, ey + 40); ctx.lineTo(WX + WW - 20, ey + 40); ctx.stroke();
            ey += 56;
        };

        equipRow(SYMBOLS.SWORD, '#38bdf8', 'Holy Sword', player.swordCount, `攻撃力 +${player.swordCount * 3}`);
        equipRow(SYMBOLS.ARMOR, '#38bdf8', 'Holy Armor', player.armorCount, `防御力 +${player.armorCount}`);

        if (player.fairyCount > 0) {
            ctx.fillStyle = '#f472b6';
            ctx.font = 'bold 18px Courier New';
            ctx.textAlign = 'left';
            ctx.fillText(SYMBOLS.FAIRY, sx, ey + 4);
            ctx.fillStyle = '#ededed';
            ctx.font = 'bold 14px Courier New';
            ctx.fillText('Fairy Companion', sx + 26, ey);
            ctx.fillStyle = '#777';
            ctx.font = '11px Courier New';
            ctx.fillText(`x${player.fairyCount}`, sx + 26, ey + 14);
            ctx.fillStyle = '#555';
            ctx.font = '11px ' + JA_FONT;
            ctx.fillText('鍵へ向かう。周囲5マスの敵を遠ざける。', sx + 26, ey + 28);
        }

    } else {
        // ── Page 3: Settings ───────────────────────────────────
        const sx = WX + 30;
        const optY = CY + 70;

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ededed';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('▶  BGM', sx, optY);
        ctx.fillStyle = bgmEnabled ? '#4ade80' : '#f87171';
        ctx.font = 'bold 16px Courier New';
        ctx.fillText(bgmEnabled ? 'ON' : 'OFF', sx + 120, optY);

        ctx.fillStyle = '#555';
        ctx.font = '12px Courier New';
        ctx.fillText('[Enter] Toggle', sx, optY + 28);
    }

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#555';
    ctx.font = '11px Courier New';
    ctx.fillText('[←→] Page  [X] Back', WX + WW / 2, CY + CH - 10);
}

// ─── DQ1-style UI Helpers ────────────────────────────────────────
function drawDQWindow(x, y, w, h) {
    ctx.fillStyle = '#000010';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ededed';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = 'rgba(237, 237, 237, 0.20)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
}

function drawDQTitle(x, y, w, title) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ededed';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('━ ' + title + ' ━', x + w / 2, y + 22);
}

function drawDQWindowDim(x, y, w, h) {
    ctx.fillStyle = '#000008';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(237,237,237,0.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = 'rgba(237,237,237,0.07)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
}

// Render the COMMAND window as a dimmed background layer (cascade level 0)
// activeIdx: which option is faintly highlighted (0=ITEMS, 1=RINGS, 2=STATUS)
function dqCmdBackground(activeIdx) {
    const JA_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
    const cx = 12, cy = 12, cw = 152, ch = 116;
    const opts = [{ en: 'ITEMS', ja: '道具' }, { en: 'RINGS', ja: '指輪' }, { en: 'STATUS', ja: '状態' }];
    drawDQWindowDim(cx, cy, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(237,237,237,0.28)';
    ctx.font = 'bold 13px Courier New';
    ctx.fillText('━ COMMAND ━', cx + cw / 2, cy + 20);
    ctx.textAlign = 'left';
    opts.forEach((opt, i) => {
        const ty = cy + 44 + i * 26;
        const isAct = i === activeIdx;
        ctx.fillStyle = isAct ? 'rgba(237,237,237,0.55)' : 'rgba(237,237,237,0.18)';
        ctx.font = (isAct ? 'bold ' : '') + '13px Courier New';
        ctx.fillText(opt.en, cx + 18, ty);
        ctx.font = '11px ' + JA_FONT;
        ctx.fillStyle = isAct ? 'rgba(237,237,237,0.35)' : 'rgba(237,237,237,0.12)';
        ctx.fillText(opt.ja, cx + 110, ty);
    });
}

// ─── Main Menu ───────────────────────────────────────────────────
function drawMenuScreen() {
    const JA_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
    const cx = 12, cy = 12, cw = 152, ch = 116;
    const opts = [{ en: 'ITEMS', ja: '道具' }, { en: 'RINGS', ja: '指輪' }, { en: 'STATUS', ja: '状態' }];
    drawDQWindow(cx, cy, cw, ch);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ededed';
    ctx.font = 'bold 13px Courier New';
    ctx.fillText('━ COMMAND ━', cx + cw / 2, cy + 20);
    ctx.textAlign = 'left';
    opts.forEach((opt, i) => {
        const ty = cy + 44 + i * 26;
        const isSel = i === menuSelection;
        if (isSel) {
            ctx.fillStyle = 'rgba(237,237,237,0.10)';
            ctx.fillRect(cx + 10, ty - 16, cw - 20, 22);
            ctx.fillStyle = '#ededed';
            ctx.font = 'bold 13px Courier New';
            ctx.fillText('▶', cx + 10, ty);
        }
        ctx.fillStyle = isSel ? '#ededed' : '#777';
        ctx.font = 'bold 13px Courier New';
        ctx.fillText(opt.en, cx + 26, ty);
        ctx.font = '11px ' + JA_FONT;
        ctx.fillStyle = isSel ? '#aaa' : '#444';
        ctx.fillText(opt.ja, cx + 110, ty);
    });
}

function drawShopScreen() {
    const pad = 30;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(pad, pad, w, h);
    ctx.strokeStyle = '#ededed';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ededed';
    ctx.font = 'bold 22px Courier New';
    ctx.fillText('-- Stranded Adventurer --', canvas.width / 2, pad + 30);

    // ゴールド表示
    ctx.font = '14px Courier New';
    ctx.fillStyle = '#ededed';
    ctx.textAlign = 'right';
    ctx.fillText(`Gold: ${player.gold}G`, pad + w - 15, pad + 55);
    ctx.textAlign = 'left';

    const startY = pad + 80;
    const lineH = 45;
    shopStock.forEach((item, i) => {
        const yPos = startY + i * lineH;
        const isSelected = shopSelection === i;
        const canAfford = player.gold >= item.cost;
        let name = '', nameJa = '', descJa = '', owned = false, symbol = '';

        if (item.type === 'ring') {
            const ring = RINGS[item.ringIndex];
            name = ring.name; nameJa = ring.nameJa; descJa = ring.descJa;
            owned = player.ownedRings.includes(ring.id);
            symbol = ring.symbol;
        } else if (item.type === 'sword') {
            name = 'Sword'; nameJa = '剣'; descJa = '攻撃力+3';
            symbol = SYMBOLS.SWORD;
        } else if (item.type === 'armor') {
            name = 'Armor'; nameJa = '防具'; descJa = '防御力+1';
            symbol = SYMBOLS.ARMOR;
        } else if (item.type === 'tome') {
            name = item.name; nameJa = item.nameJa; descJa = item.descJa;
            symbol = SYMBOLS.TOME;
        }

        if (isSelected) {
            ctx.fillStyle = 'rgba(237, 237, 237, 0.1)';
            ctx.fillRect(pad + 5, yPos - 12, w - 10, lineH - 4);
            ctx.fillStyle = '#ededed';
            ctx.fillText('>', pad + 12, yPos + 5);
        }

        // アイコン + 名前
        ctx.font = '14px Courier New';
        const iconColor = (item.type === 'sword' || item.type === 'armor') ? '#38bdf8' : '#ededed';
        if (owned) {
            ctx.fillStyle = '#4ade80';
            ctx.fillText(`✓ ${symbol} ${name}（${nameJa}）`, pad + 30, yPos + 5);
        } else if (!canAfford) {
            ctx.fillStyle = '#555';
            ctx.fillText(`  ${symbol} ${name}（${nameJa}）`, pad + 30, yPos + 5);
        } else {
            // アイコン部分を色分け
            ctx.fillStyle = isSelected ? iconColor : (item.type === 'ring' ? '#ccc' : '#38bdf8');
            ctx.fillText(`  ${symbol}`, pad + 30, yPos + 5);
            ctx.fillStyle = isSelected ? '#ededed' : '#ccc';
            ctx.fillText(` ${name}（${nameJa}）`, pad + 30 + ctx.measureText(`  ${symbol}`).width, yPos + 5);
        }

        // コスト
        ctx.textAlign = 'right';
        ctx.fillStyle = owned ? '#4ade80' : (canAfford ? '#ededed' : '#555');
        ctx.fillText(owned ? 'Owned' : `${item.cost}G`, pad + w - 15, yPos + 5);
        ctx.textAlign = 'left';

        // 説明
        ctx.font = '12px Courier New';
        ctx.fillStyle = isSelected ? '#aaa' : '#666';
        ctx.fillText(`  ${descJa}`, pad + 30, yPos + 22);
    });

    // 操作ガイド
    ctx.textAlign = 'center';
    ctx.font = '12px Courier New';
    ctx.fillStyle = '#666';
    ctx.fillText('[Up/Down] Select  [Enter] Buy  [X] Close', canvas.width / 2, pad + h - 12);
}

function drawRingsScreen() {
    const JA_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
    const CY = 12, CH = canvas.height - 24;

    if (ringEquipPhase === 'SLOT') {
        // ── Phase 1: CMD (dimmed) + SLOTS window ─────────────────
        dqCmdBackground(1);
        const SX = 154; // 12 + 152 - 10 (overlap)
        const SW = canvas.width - SX - 12;
        drawDQWindow(SX, CY, SW, CH);
        drawDQTitle(SX, CY, SW, 'RINGS  指輪');

        const ROW_H = 72;
        const listTop = CY + 42;

        for (let s = 0; s < 2; s++) {
            const sy = listTop + s * ROW_H;
            const ringId = player.equippedRings[s];
            const ring = ringId ? RINGS.find(r => r.id === ringId) : null;
            const isSel = ringSlotSelection === s;

            if (isSel) {
                ctx.fillStyle = 'rgba(237,237,237,0.08)';
                ctx.fillRect(SX + 10, sy - 2, SW - 20, ROW_H - 8);
                ctx.fillStyle = '#ededed';
                ctx.font = 'bold 14px Courier New';
                ctx.textAlign = 'left';
                ctx.fillText('▶', SX + 12, sy + 18);
            }

            ctx.textAlign = 'left';
            ctx.font = 'bold 13px Courier New';
            ctx.fillStyle = isSel ? '#ededed' : '#666';
            ctx.fillText('Slot ' + (s + 1), SX + 30, sy + 16);

            const boxX = SX + 86, boxY = sy - 2, boxW = SW - 100, boxH = ROW_H - 8;
            ctx.fillStyle = '#060614';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = isSel ? 'rgba(237,237,237,0.40)' : 'rgba(237,237,237,0.12)';
            ctx.lineWidth = 1;
            ctx.strokeRect(boxX, boxY, boxW, boxH);

            if (ring) {
                ctx.font = '16px Courier New';
                ctx.fillStyle = '#ededed';
                ctx.fillText(ring.symbol || '◎', boxX + 10, boxY + 22);
                ctx.font = 'bold 14px ' + JA_FONT;
                ctx.fillStyle = isSel ? '#ededed' : '#ccc';
                ctx.fillText(ring.nameJa, boxX + 30, boxY + 22);
                ctx.font = '11px Courier New';
                ctx.fillStyle = '#888';
                ctx.fillText(ring.name, boxX + 30, boxY + 38);
                if (isSel) {
                    ctx.font = '11px ' + JA_FONT;
                    ctx.fillStyle = '#aaa';
                    ctx.fillText(ring.descJa, boxX + 10, boxY + 56);
                }
            } else {
                ctx.font = '13px ' + JA_FONT;
                ctx.fillStyle = '#444';
                ctx.fillText('（空き）─ 装備なし', boxX + 10, boxY + 22);
            }
        }

        ctx.textAlign = 'center';
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#555';
        ctx.fillText('[↑↓] Select  [Enter] Choose Slot  [X] Back', SX + SW / 2, CY + CH - 10);

    } else {
        // ── Phase 2: CMD (dimmed) + SLOT SUMMARY (dimmed) + RING LIST (active) ──
        dqCmdBackground(1);

        // Slot summary panel (dimmed, cascade level 1)
        const SS_X = 154, SS_W = 178;
        drawDQWindowDim(SS_X, CY, SS_W, CH);
        const slotRingId = player.equippedRings[ringSlotSelection];
        const slotRing = slotRingId ? RINGS.find(r => r.id === slotRingId) : null;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(237,237,237,0.28)';
        ctx.font = 'bold 13px Courier New';
        ctx.fillText('━ SLOT ' + (ringSlotSelection + 1) + ' ━', SS_X + SS_W / 2, CY + 20);
        ctx.textAlign = 'left';
        ctx.font = '11px ' + JA_FONT;
        ctx.fillStyle = 'rgba(237,237,237,0.25)';
        ctx.fillText('現在の装備', SS_X + 14, CY + 38);
        ctx.font = 'bold 12px ' + JA_FONT;
        ctx.fillStyle = slotRing ? 'rgba(74,222,128,0.60)' : 'rgba(237,237,237,0.20)';
        ctx.fillText(slotRing ? slotRing.nameJa : '（空き）', SS_X + 14, CY + 54);

        // Ring list+detail panel (active, cascade level 2)
        const RL_X = SS_X + SS_W - 10; // 322
        const RL_W = canvas.width - RL_X - 12; // 466
        drawDQWindow(RL_X, CY, RL_W, CH);
        drawDQTitle(RL_X, CY, RL_W, 'SELECT RING');

        // Internal split: left=list (220px), right=detail
        const LIST_W = 220;
        const DETAIL_X = RL_X + LIST_W;
        const DETAIL_W = RL_W - LIST_W;

        ctx.strokeStyle = 'rgba(237,237,237,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(DETAIL_X, CY + 8);
        ctx.lineTo(DETAIL_X, CY + CH - 8);
        ctx.stroke();

        // Ring list
        const ownedRings = RINGS.filter(r => player.ownedRings.includes(r.id));
        const listItems = [{ id: null, nameJa: '（外す）', name: 'Remove', descJa: 'このスロットを空にする' }, ...ownedRings];

        const LIST_TOP = CY + 36;
        const LIST_BOT = CY + CH - 28;
        const ROW_H = 34;
        const maxVis = Math.floor((LIST_BOT - LIST_TOP) / ROW_H);

        ringScrollOffset = Math.max(0, Math.min(ringScrollOffset, Math.max(0, listItems.length - maxVis)));
        if (ringEquipSelection < ringScrollOffset) ringScrollOffset = ringEquipSelection;
        if (ringEquipSelection >= ringScrollOffset + maxVis) ringScrollOffset = ringEquipSelection - maxVis + 1;

        if (ringScrollOffset > 0) {
            ctx.fillStyle = '#ededed'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('▲', RL_X + LIST_W / 2, LIST_TOP - 4);
        }

        const visItems = listItems.slice(ringScrollOffset, ringScrollOffset + maxVis);
        visItems.forEach((item, vi) => {
            const idx = vi + ringScrollOffset;
            const iy = LIST_TOP + vi * ROW_H;
            const isSel = ringEquipSelection === idx;
            const isEquippedHere = item.id && player.equippedRings[ringSlotSelection] === item.id;
            const isEquippedOther = item.id && player.equippedRings[1 - ringSlotSelection] === item.id;

            if (isSel) {
                ctx.fillStyle = 'rgba(237,237,237,0.08)';
                ctx.fillRect(RL_X + 10, iy - 2, LIST_W - 20, ROW_H - 4);
                ctx.fillStyle = '#ededed';
                ctx.font = 'bold 14px Courier New';
                ctx.textAlign = 'left';
                ctx.fillText('▶', RL_X + 12, iy + 18);
            }

            ctx.textAlign = 'left';
            let nameColor = isSel ? '#ededed' : '#aaa';
            if (item.id === null) nameColor = isSel ? '#f87171' : '#666';
            else if (isEquippedHere) nameColor = '#4ade80';
            else if (isEquippedOther) nameColor = '#60a5fa';

            ctx.font = (isSel ? 'bold ' : '') + '13px ' + JA_FONT;
            ctx.fillStyle = nameColor;
            ctx.fillText((item.id ? '◎ ' : '✕ ') + item.nameJa, RL_X + 30, iy + 18);

            if (isEquippedHere) {
                ctx.textAlign = 'right'; ctx.fillStyle = '#4ade80'; ctx.font = '11px Courier New';
                ctx.fillText('装備中', RL_X + LIST_W - 14, iy + 18);
                ctx.textAlign = 'left';
            } else if (isEquippedOther) {
                ctx.textAlign = 'right'; ctx.fillStyle = '#60a5fa'; ctx.font = '11px Courier New';
                ctx.fillText('Slot' + (2 - ringSlotSelection), RL_X + LIST_W - 14, iy + 18);
                ctx.textAlign = 'left';
            }
        });

        if (ringScrollOffset + maxVis < listItems.length) {
            ctx.fillStyle = '#ededed'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('▼', RL_X + LIST_W / 2, LIST_TOP + maxVis * ROW_H + 8);
        }

        ctx.textAlign = 'center';
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#444';
        ctx.fillText('[↑↓] Select', RL_X + LIST_W / 2, CY + CH - 10);

        // Detail panel (right of divider)
        const selItem = listItems[ringEquipSelection];
        const dx = DETAIL_X + 14;
        if (selItem && selItem.id) {
            let ry = CY + 42;
            ctx.font = 'bold 13px ' + JA_FONT;
            ctx.fillStyle = '#ededed';
            ctx.textAlign = 'left';
            ctx.fillText(selItem.symbol || '◎', dx, ry);
            ctx.font = 'bold 15px ' + JA_FONT;
            ctx.fillStyle = '#ededed';
            ctx.fillText(selItem.nameJa, dx + 20, ry);
            ry += 18;
            ctx.font = '12px Courier New';
            ctx.fillStyle = '#777';
            ctx.fillText(selItem.name, dx + 20, ry);
            ry += 16;

            ctx.strokeStyle = 'rgba(237,237,237,0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(dx, ry); ctx.lineTo(RL_X + RL_W - 14, ry); ctx.stroke();
            ry += 14;

            ctx.font = '13px ' + JA_FONT;
            ctx.fillStyle = '#ccc';
            const descW = DETAIL_W - 28;
            const descText = selItem.descJa;
            if (ctx.measureText(descText).width <= descW) {
                ctx.fillText(descText, dx, ry);
            } else {
                const parts = descText.split('。').filter(s => s.trim());
                parts.forEach(p => { ctx.fillText(p + '。', dx, ry); ry += 18; });
            }
        }

        const footerY = CY + CH - 28;
        ctx.strokeStyle = 'rgba(237,237,237,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(dx, footerY - 14); ctx.lineTo(RL_X + RL_W - 14, footerY - 14); ctx.stroke();
        ctx.textAlign = 'center';
        ctx.font = 'bold 13px Courier New';
        ctx.fillStyle = '#ededed';
        ctx.fillText('[Enter] Equip', DETAIL_X + DETAIL_W / 2, footerY);
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#555';
        ctx.fillText('[X] Back to Slots', DETAIL_X + DETAIL_W / 2, footerY + 14);
    }
}

function drawInventoryScreen() {
    const JA_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif';
    const CY = 12, CH = canvas.height - 24;

    // Cascade layout: CMD (dimmed) → ITEM LIST → INFO
    dqCmdBackground(0);

    const LX = 154;  // 12 + 152 - 10 (overlap)
    const LW = 220;
    const RX = LX + LW - 10; // 364
    const RW = canvas.width - RX - 12; // 424

    drawDQWindow(LX, CY, LW, CH);
    drawDQTitle(LX, CY, LW, 'ITEM BAG');
    drawDQWindow(RX, CY, RW, CH);
    drawDQTitle(RX, CY, RW, 'INFO');

    // アイテムリスト定義（今後増える想定 ─ ここに追加するだけでOK）
    const fullItems = [
        { name: 'Fairy',          nameJa: '妖精',           symbol: SYMBOLS.FAIRY,          count: player.fairyCount,
          desc: 'Release a fairy. Heads for the KEY. Enemies flee 5 tiles.', descJa: '鍵へ向かう。周囲5マスの敵を遠ざける。' },
        { name: 'Breaker Tome',   nameJa: '破壊の魔導書',  symbol: SYMBOLS.BREAKER_TOME,  count: player.breakerTomes,
          desc: 'Smash one wall tile on this floor.',          descJa: 'この階の壁を1枚破壊できる。' },
        { name: 'Charm Tome',     nameJa: '魅了の魔導書',  symbol: SYMBOLS.CHARM,          count: player.charmTomes,
          desc: 'Tame nearby enemies for this floor.',         descJa: 'この階の周囲の敵をすべて仲間にする。' },
        { name: 'Escape Tome',    nameJa: '脱出の魔導書',  symbol: SYMBOLS.ESCAPE,         count: player.escapeTomes,
          desc: 'Warp to a random floor (3F–99F).',            descJa: 'ランダムな階層へワープする。' },
        { name: 'Explosion Tome', nameJa: '爆発の魔導書',  symbol: SYMBOLS.EXPLOSION,      count: player.explosionTomes,
          desc: 'Release a powerful blast around you.',        descJa: '周囲に強力な爆発を引き起こす。' },
        { name: 'Guardian Tome',  nameJa: '守護の魔導書',  symbol: SYMBOLS.GUARDIAN,       count: player.guardianTomes,
          desc: 'Shield from terrain & laser damage.',         descJa: '地形ダメージとレーザーを無効化する。' },
        { name: 'Haste Tome',     nameJa: '加速の魔導書',  symbol: SYMBOLS.SPEED,          count: player.hasteTomes,
          desc: 'Accelerate the flow of time.',                descJa: '時間の流れを加速させる。' },
        { name: 'Heal Tome',      nameJa: '回復の魔導書',  symbol: SYMBOLS.HEAL_TOME,      count: player.healTomes,
          desc: 'Fully restore HP.',                           descJa: 'HPを全回復する。' },
        { name: 'Stealth Tome',   nameJa: '隠身の魔導書',  symbol: SYMBOLS.STEALTH,        count: player.stealthTomes,
          desc: 'Vanish from sight. Enemies cannot see you.',  descJa: '姿を消し、敵から見えなくなる。' },
    ];
    const items = fullItems.filter(it => it.count > 0);

    // ── Left panel: item list ────────────────────────────────
    if (items.length === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#555';
        ctx.font = '14px Courier New';
        ctx.fillText('(Empty)', LX + LW / 2, CY + CH / 2);
    } else {
        const LIST_TOP = CY + 36;
        const LIST_BOT = CY + CH - 28;
        const ROW_H = 34;
        const maxVis = Math.floor((LIST_BOT - LIST_TOP) / ROW_H);

        let startIdx = 0;
        if (inventorySelection >= maxVis) startIdx = inventorySelection - maxVis + 1;

        if (startIdx > 0) {
            ctx.fillStyle = '#ededed'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('▲', LX + LW / 2, LIST_TOP - 4);
        }

        for (let i = 0; i < maxVis; i++) {
            const idx = startIdx + i;
            if (idx >= items.length) break;
            const item = items[idx];
            const iy = LIST_TOP + i * ROW_H;
            const isSel = idx === inventorySelection;

            if (isSel) {
                ctx.fillStyle = 'rgba(237,237,237,0.08)';
                ctx.fillRect(LX + 10, iy - 2, LW - 20, ROW_H - 4);
                ctx.fillStyle = '#ededed';
                ctx.font = 'bold 14px Courier New';
                ctx.textAlign = 'left';
                ctx.fillText('▶', LX + 12, iy + 18);
            }

            ctx.font = '14px Courier New';
            ctx.fillStyle = isSel ? '#ededed' : '#777';
            ctx.textAlign = 'left';
            ctx.fillText(item.symbol, LX + 30, iy + 18);

            ctx.fillStyle = isSel ? '#ededed' : '#aaa';
            ctx.font = (isSel ? 'bold ' : '') + '13px Courier New';
            ctx.fillText(item.name, LX + 50, iy + 18);

            ctx.textAlign = 'right';
            ctx.fillStyle = isSel ? '#ededed' : '#666';
            ctx.font = 'bold 12px Courier New';
            ctx.fillText('×' + item.count, LX + LW - 14, iy + 18);
            ctx.textAlign = 'left';
        }

        if (startIdx + maxVis < items.length) {
            ctx.fillStyle = '#ededed'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('▼', LX + LW / 2, LIST_TOP + maxVis * ROW_H + 8);
        }
    }

    ctx.textAlign = 'center';
    ctx.font = '11px Courier New';
    ctx.fillStyle = '#444';
    ctx.fillText('[↑↓] Select', LX + LW / 2, CY + CH - 10);

    // ── Right panel: info ────────────────────────────────────
    const sel = items.length > 0 ? items[inventorySelection] : null;
    if (sel) {
        const rx = RX + 16;
        let ry = CY + 42;

        ctx.font = 'bold 28px Courier New';
        ctx.fillStyle = '#ededed';
        ctx.textAlign = 'left';
        ctx.fillText(sel.symbol, rx, ry + 4);

        ctx.font = 'bold 16px Courier New';
        ctx.fillStyle = '#ededed';
        ctx.fillText(sel.name, rx + 34, ry);

        ctx.font = '12px ' + JA_FONT;
        ctx.fillStyle = '#aaa';
        ctx.fillText(sel.nameJa, rx + 34, ry + 16);

        ry += 34;

        ctx.strokeStyle = 'rgba(237,237,237,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(RX + RW - 16, ry); ctx.stroke();
        ry += 16;

        ctx.font = '13px Courier New';
        ctx.fillStyle = '#ccc';
        const maxDescW = RW - 36;
        const words = sel.desc.split(' ');
        let line = '';
        for (const word of words) {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > maxDescW && line) {
                ctx.fillText(line.trim(), rx, ry); ry += 18; line = word + ' ';
            } else { line = test; }
        }
        if (line.trim()) { ctx.fillText(line.trim(), rx, ry); ry += 18; }

        ry += 6;

        ctx.font = '13px ' + JA_FONT;
        ctx.fillStyle = '#aaa';
        const jp = sel.descJa;
        const jpMaxW = RW - 36;
        if (ctx.measureText(jp).width <= jpMaxW) {
            ctx.fillText(jp, rx, ry); ry += 20;
        } else {
            const parts = jp.split('。').filter(s => s.trim());
            parts.forEach(p => { ctx.fillText(p + '。', rx, ry); ry += 18; });
        }

        const footerY = CY + CH - 28;
        ctx.strokeStyle = 'rgba(237,237,237,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx, footerY - 14); ctx.lineTo(RX + RW - 16, footerY - 14); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = 'bold 13px Courier New';
        ctx.fillStyle = '#ededed';
        ctx.fillText('[Enter] Use Item', RX + RW / 2, footerY);
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#555';
        ctx.fillText('[X] Back to Menu', RX + RW / 2, footerY + 14);
    } else {
        ctx.textAlign = 'center';
        ctx.font = '11px Courier New';
        ctx.fillStyle = '#444';
        ctx.fillText('[X] Back', RX + RW / 2, CY + CH - 10);
    }
}

function drawConfirmBuy() {
    const item = shopStock[shopSelection];
    let name = '';
    if (item.type === 'ring') name = RINGS[item.ringIndex].name;
    else if (item.type === 'sword') name = 'Sword';
    else if (item.type === 'armor') name = 'Armor';

    const w = 320, h = 130;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ededed';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ededed';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText(`Buy ${name}?`, canvas.width / 2, y + 35);

    ctx.font = '13px Courier New';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`${item.cost}G`, canvas.width / 2, y + 60);

    ctx.font = '16px Courier New';
    ctx.fillStyle = (shopConfirmSelection === 0) ? '#ededed' : '#666';
    ctx.fillText(shopConfirmSelection === 0 ? '> YES <' : '  YES  ', canvas.width / 2 - 60, y + 100);
    ctx.fillStyle = (shopConfirmSelection === 1) ? '#ededed' : '#666';
    ctx.fillText(shopConfirmSelection === 1 ? '> NO <' : '  NO  ', canvas.width / 2 + 60, y + 100);
}

function drawConfirmNewGame() {
    const w = 360, h = 150;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 15px Courier New';
    ctx.fillText('⚠  START NEW GAME?  ⚠', canvas.width / 2, y + 38);

    ctx.font = '12px Courier New';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Current save data will be lost.', canvas.width / 2, y + 62);

    ctx.font = '16px Courier New';
    // NO on left (default safe option), YES on right
    ctx.fillStyle = (newGameConfirmSelection === 0) ? '#ededed' : '#555';
    ctx.fillText(newGameConfirmSelection === 0 ? '> NO <' : '  NO  ', canvas.width / 2 - 70, y + 110);
    ctx.fillStyle = (newGameConfirmSelection === 1) ? '#f87171' : '#555';
    ctx.fillText(newGameConfirmSelection === 1 ? '> YES <' : '  YES  ', canvas.width / 2 + 70, y + 110);
}

function drawConfirmEscape() {
    const w = 320, h = 160;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ededed';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ededed';
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

function hasRing(id) {
    return player.equippedRings.includes(id);
}

function spawnXFromWall(x, y) {
    // 壁を壊した位置の隣接する空きマスにBOMBERを出現させる
    const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
    const spawnCandidates = dirs.filter(d => {
        const sx = x + d.dx, sy = y + d.dy;
        return sx >= 1 && sx < COLS - 1 && sy >= 1 && sy < ROWS - 1
            && map[sy][sx] === SYMBOLS.FLOOR
            && !enemies.some(e => e.x === sx && e.y === sy && e.hp > 0)
            && !(player.x === sx && player.y === sy);
    });
    // 出現位置: 隣接空きマスがあればそちら、なければ壊した場所自体
    const pos = spawnCandidates.length > 0
        ? spawnCandidates[Math.floor(Math.random() * spawnCandidates.length)]
        : { dx: 0, dy: 0 };
    const ex = x + pos.dx, ey = y + pos.dy;
    if (ex < 1 || ex >= COLS - 1 || ey < 1 || ey >= ROWS - 1) return;
    if (player.x === ex && player.y === ey) return;
    enemies.push({ type: 'BOMBER', x: ex, y: ey, hp: 1, maxHp: 1, flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 12, stunTurns: 0 });
    spawnFloatingText(ex, ey, "X!", '#f97316');
    setScreenShake(4, 150);
}

function spawnFloatingText(x, y, text, color, duration = 400) {
    damageTexts.push({ x, y, text, color, startTime: performance.now(), duration });
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
    // 期限切れの爆風エフェクトを除去
    blastEffects = blastEffects.filter(b => now < b.endTime);
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
            ctx.fillStyle = isWhite ? '#ededed' : transition.mode === 'RED_OUT' ? '#b00' : '#000';
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

                // 爆風エフェクト（赤く点滅）
                for (const blast of blastEffects) {
                    if (now < blast.endTime && blast.tiles.some(t => t.x === x && t.y === y)) {
                        const remaining = (blast.endTime - now) / 500;
                        const flash = Math.floor(now / 80) % 2 === 0;
                        if (flash) {
                            ctx.save(); ctx.fillStyle = '#ef4444'; ctx.globalAlpha = 0.5 * remaining;
                            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE); ctx.restore();
                        }
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
                    ctx.fillStyle = '#ededed'; ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px + 2, py + TILE_SIZE - 4, TILE_SIZE - 4, 2);
                } else if (char === SYMBOLS.SAVE) {
                    ctx.fillStyle = '#38bdf8'; ctx.fillText(SYMBOLS.SAVE, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                } else if (char === SYMBOLS.MERCHANT) {
                    // 遭難冒険者: 向きに応じて反転、ジャンプアニメーション
                    // 死亡演出中: 点滅 → 消滅
                    if (merchantState && merchantState.dyingUntil) {
                        if (now >= merchantState.dyingUntil) {
                            // 点滅終了 → 消す
                            map[merchantState.y][merchantState.x] = SYMBOLS.FLOOR;
                            merchantState = null;
                        } else {
                            // 点滅描画（100msごとに表示/非表示を切替）
                            const visible = Math.floor(now / 100) % 2 === 0;
                            if (visible) {
                                ctx.save();
                                ctx.fillStyle = '#ef4444';
                                ctx.fillText(SYMBOLS.MERCHANT, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                                ctx.restore();
                            }
                        }
                    } else {
                        ctx.save();
                        let jumpOff = 0;
                        if (merchantState && merchantState.jumpUntil > now) {
                            const jumpProgress = (merchantState.jumpUntil - now) / 300;
                            jumpOff = Math.sin(jumpProgress * Math.PI) * 8;
                        }
                        const mOffX = (merchantState && merchantState.offsetX) || 0;
                        const mOffY = (merchantState && merchantState.offsetY) || 0;
                        const facingRight = merchantState && merchantState.facing === 'RIGHT';
                        if (facingRight) {
                            ctx.translate(px + TILE_SIZE / 2 + mOffX, py + TILE_SIZE / 2 - jumpOff + mOffY);
                            ctx.scale(-1, 1);
                            ctx.fillStyle = '#fbbf24'; ctx.fillText(SYMBOLS.MERCHANT, 0, 0);
                        } else {
                            ctx.fillStyle = '#fbbf24'; ctx.fillText(SYMBOLS.MERCHANT, px + TILE_SIZE / 2 + mOffX, py + TILE_SIZE / 2 - jumpOff + mOffY);
                        }
                        ctx.restore();
                    }
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
                    ctx.strokeStyle = 'rgba(237, 237, 237, 0.15)'; ctx.lineWidth = 1;
                    const stripe = 6;
                    for (let s = -TILE_SIZE; s < TILE_SIZE * 2; s += stripe) {
                        ctx.beginPath(); ctx.moveTo(px + s, py); ctx.lineTo(px + s + TILE_SIZE, py + TILE_SIZE); ctx.stroke();
                    }
                    ctx.restore();
                } else if (char === SYMBOLS.RING) {
                    if (!enemies.some(e => e.hp > 0 && e.x === x && e.y === y)) {
                        ctx.save();
                        const rp = Math.sin(now / 300) * 0.5 + 0.5;
                        const rc = `rgb(255,255,${200 + Math.round(rp * 55)})`;
                        const rcx = px + TILE_SIZE / 2, rcy = py + TILE_SIZE / 2;
                        // 外側のグロー
                        ctx.shadowColor = rc;
                        ctx.shadowBlur = 10 + rp * 14;
                        // 外周の小さな円
                        ctx.fillStyle = rc;
                        ctx.beginPath();
                        ctx.arc(rcx, rcy, TILE_SIZE * 0.24, 0, Math.PI * 2);
                        ctx.fill();
                        // 内側の穴（リング形状）
                        ctx.shadowBlur = 0;
                        ctx.fillStyle = '#111827';
                        ctx.beginPath();
                        ctx.arc(rcx, rcy, TILE_SIZE * 0.11, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                } else if ([SYMBOLS.WAND, SYMBOLS.KEY, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.ESCAPE, SYMBOLS.BREAKER_TOME, SYMBOLS.GUARDIAN, SYMBOLS.TOME].includes(char)) {
                    // 敵が乗っている場合はアイテムを描画しない（敵が上に来るように）
                    if (!enemies.some(e => e.hp > 0 && e.x === x && e.y === y)) {
                        // 魔導書系アイテムはすべて統一アイコンで表示（拾うまで種類不明）
                        const isTome = [SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.ESCAPE, SYMBOLS.BREAKER_TOME, SYMBOLS.GUARDIAN].includes(char);
                        const displayChar = isTome ? SYMBOLS.TOME : char;
                        ctx.fillStyle = '#fbbf24'; ctx.fillText(displayChar, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                    }
                } else if (char === SYMBOLS.FAIRY) {
                    // 妖精は常時表示（点滅なし）
                    ctx.fillStyle = '#f472b6';
                    ctx.fillText(char, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
                } else {
                    // 擬態ミミックのウィスプフラッシュ中はSTAIRSをFLOORとして描画（穴を隠す）
                    const wispFlashMimic = char === SYMBOLS.STAIRS
                        ? enemies.find(e => e.type === 'MIMIC' && e.disguised && e.x === x && e.y === y && e.mimicWispFlashUntil && now < e.mimicWispFlashUntil)
                        : null;
                    const drawChar = wispFlashMimic ? SYMBOLS.FLOOR
                        : (char === SYMBOLS.FLOOR && isWindFloor) ? '↓' : char;
                    let tileColor = '#444';
                    if (char === SYMBOLS.FLOOR) {
                        // 移動中の妖精の周囲3マス: 白（守護ゾーン）
                        // 立ち止まった妖精の周囲3マス: 通常（守護ゾーン消滅）
                        const nearMoving = movingFairies.some(f =>
                            !f.stopped &&
                            (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y)) &&
                            Math.abs(f.x - x) + Math.abs(f.y - y) <= 3
                        );
                        if (nearMoving) tileColor = '#ededed';
                    }
                    ctx.fillStyle = tileColor; ctx.fillText(drawChar, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
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
            } else if (w.type === 'ICE_BLOCK') {
                ctx.fillStyle = (w.hp === 1) ? '#7dd3fc' : '#bae6fd';
                ctx.fillText(SYMBOLS.BLOCK, wx + TILE_SIZE / 2, wy + TILE_SIZE / 2);
            } else if (w.type === 'ICE_STAR_BLOCK') {
                // 氷の星ブロック：シアン地に白の＊
                ctx.fillStyle = '#67e8f9';
                ctx.fillText(SYMBOLS.BLOCK, wx + TILE_SIZE / 2, wy + TILE_SIZE / 2);
                ctx.save();
                ctx.fillStyle = '#ededed';
                ctx.fillText('*', wx + TILE_SIZE / 2, wy + TILE_SIZE / 2 + 2);
                ctx.restore();
            } else if (w.type === 'BOMB_STAR_BLOCK') {
                // 爆弾星ブロック：暗いオレンジ地に白の小さいX
                ctx.fillStyle = '#c2410c';
                ctx.fillText(SYMBOLS.BLOCK, wx + TILE_SIZE / 2, wy + TILE_SIZE / 2);
                ctx.save();
                ctx.font = `bold 11px 'Courier New'`;
                ctx.fillStyle = '#ededed';
                ctx.fillText('X', wx + TILE_SIZE / 2, wy + TILE_SIZE / 2 + 4);
                ctx.restore();
            } else if (w.type === 'FIRE_BLOCK') {
                // 炎ブロック：□の赤アレンジ＋中央に飛翔球
                ctx.fillStyle = '#ef4444';
                ctx.fillText(SYMBOLS.BLOCK, wx + TILE_SIZE / 2, wy + TILE_SIZE / 2);
                if (!w.fired) {
                    ctx.save();
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText('*', wx + TILE_SIZE / 2, wy + TILE_SIZE / 2 + 3);
                    ctx.restore();
                }
                // HP=1のとき赤い斜め線を追加
                if (w.hp === 1) {
                    ctx.save();
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    const margin = Math.floor(TILE_SIZE * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(wx + margin, wy + margin);
                    ctx.lineTo(wx + TILE_SIZE - margin, wy + TILE_SIZE - margin);
                    ctx.stroke();
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = (w.hp === 1) ? '#aaa' : '#ededed';
                ctx.fillText((w.hp === 1) ? SYMBOLS.BLOCK_CRACKED : SYMBOLS.BLOCK, wx + TILE_SIZE / 2, wy + TILE_SIZE / 2);
            }
        });

        // 2.5. 爆弾（接地ブロック風の四角形）
        bombs.forEach(b => {
            const bx = b.x * TILE_SIZE;
            const by = b.y * TILE_SIZE;
            ctx.save();
            // タイマーに応じた色: 灰色 → オレンジ → 赤（氷爆弾は水色系）
            let bombFill, bombHighlight;
            if (b.isCorpse) {
                // 死体爆弾: 暗いオレンジ（timer 3→1で赤みが増す）
                if (b.timer >= 3) { bombFill = '#7c2d12'; bombHighlight = '#c2410c'; }
                else if (b.timer === 2) { bombFill = '#9a3412'; bombHighlight = '#ea580c'; }
                else { bombFill = '#dc2626'; bombHighlight = '#f97316'; }
            } else if (b.isIce) {
                if (b.timer >= 4) { bombFill = '#bae6fd'; bombHighlight = '#e0f2fe'; }
                else if (b.timer === 3) { bombFill = '#7dd3fc'; bombHighlight = '#bae6fd'; }
                else if (b.timer === 2) { bombFill = '#38bdf8'; bombHighlight = '#7dd3fc'; }
                else { bombFill = '#0ea5e9'; bombHighlight = '#38bdf8'; }
            } else if (b.timer >= 4) { bombFill = '#6b7280'; bombHighlight = '#9ca3af'; }
            else if (b.timer === 3) { bombFill = '#78716c'; bombHighlight = '#a8a29e'; }
            else if (b.timer === 2) { bombFill = '#b45309'; bombHighlight = '#f59e0b'; }
            else { bombFill = '#dc2626'; bombHighlight = '#f87171'; }
            // hp1(ひび入り)なら暗くする
            if (b.hp === 1) { bombFill = bombFill + 'aa'; bombHighlight = bombHighlight + 'aa'; }
            // ブロックと同じ四角形を描画
            ctx.fillStyle = bombFill;
            ctx.fillRect(bx + 2, by + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            // ハイライト（左辺に明るい線）
            ctx.strokeStyle = bombHighlight;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + 2, by + 2);
            ctx.lineTo(bx + 2, by + TILE_SIZE - 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx + 2, by + 2);
            ctx.lineTo(bx + TILE_SIZE - 2, by + 2);
            ctx.stroke();
            // 残りターン数を中央に表示（死体は上にX、下にタイマー）
            ctx.font = "bold 11px 'Courier New'";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ededed';
            if (b.isCorpse) {
                ctx.fillText('X', bx + TILE_SIZE / 2, by + TILE_SIZE / 2 - 3);
                ctx.font = "bold 8px 'Courier New'";
                ctx.fillText(String(b.timer), bx + TILE_SIZE / 2, by + TILE_SIZE / 2 + 5);
            } else {
                ctx.fillText(String(b.timer), bx + TILE_SIZE / 2, by + TILE_SIZE / 2);
            }
            // ひび入り表示
            if (b.hp === 1) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(bx + 5, by + 5);
                ctx.lineTo(bx + TILE_SIZE / 2, by + TILE_SIZE / 2 - 2);
                ctx.lineTo(bx + TILE_SIZE - 5, by + TILE_SIZE - 5);
                ctx.stroke();
            }
            ctx.restore();
        });

        // 3. エネミー
        enemies.forEach(e => {
            if (e.hp <= 0) return;
            // 擬態中のミミックは敵として描画しない（マップのSTAIRSタイルとして見える）
            // ただし変身演出中は点滅させる
            // FAIRY_MIMIC: 擬態中は妖精として描画（ゆっくり脈動）
            if (e.type === 'FAIRY_MIMIC' && e.disguised) {
                const fmPx = e.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0);
                const fmPy = e.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0);
                ctx.save();
                ctx.globalAlpha = 1.0; // 点滅なし・本物の妖精と同じ不透明度
                ctx.fillStyle = '#f9a8d4';
                ctx.shadowColor = '#f472b6'; ctx.shadowBlur = 10;
                ctx.fillText(SYMBOLS.FAIRY, fmPx, fmPy);
                ctx.restore();
                return;
            }

            if (e.type === 'MIMIC' && e.disguised) {
                if (e.mimicTransitionEnd && now < e.mimicTransitionEnd) {
                    // 変身演出中：穴とMが交互に点滅
                    const phase = Math.floor(now / 80) % 2;
                    const px = e.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0);
                    const py = e.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0);
                    ctx.save();
                    ctx.fillStyle = phase === 0 ? '#ef4444' : '#c084fc';
                    ctx.fillText(phase === 0 ? 'M' : SYMBOLS.STAIRS, px, py);
                    ctx.restore();
                } else if (e.mimicWispFlashUntil && now < e.mimicWispFlashUntil) {
                    // ウィスプダメージ：一瞬だけ本性を露出（穴は消えてMを赤で表示）
                    const px = e.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0);
                    const py = e.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0);
                    ctx.save();
                    ctx.fillStyle = '#ef4444';
                    ctx.globalAlpha = 0.9;
                    ctx.fillText('M', px, py);
                    ctx.restore();
                }
                return;
            }
            const px = e.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0);
            const py = e.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0);
            const isFlashing = now < e.flashUntil || (e.stunTurns > 0 && Math.floor(now / 150) % 2 === 0);
            ctx.save();
            ctx.globalAlpha = e.alpha !== undefined ? e.alpha : 1.0;
            if (e.type === 'DRAGON') {
                let color = (e.hp <= e.maxHp / 2) ? `rgb(255, ${50 + Math.round((Math.sin(now / 150) * 0.5 + 0.5) * 100)}, 0)` : `rgb(255, 255, ${255 - Math.round((Math.sin(now / 300) * 0.5 + 0.5) * 55)})`;
                ctx.fillStyle = isFlashing ? '#ededed' : color;
                ctx.shadowColor = color; ctx.shadowBlur = 15;
                ctx.fillText('D', px, py);
                if (e.body) e.body.forEach(seg => ctx.fillText(seg.char || 'D', seg.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0), seg.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0)));
            } else if (e.type === 'SUMMONER') {
                let sColor = '#a855f7';
                // 召喚直前（クールダウン1以下）は明滅させて予兆を出す
                if (e.summonCooldown <= 1 && !e.isAlly) {
                    const phase = Math.floor(now / 100) % 2;
                    sColor = phase === 0 ? '#a855f7' : '#d8b4fe';
                }
                if (e.isAlly) sColor = '#60a5fa';
                ctx.fillStyle = isFlashing ? '#ededed' : sColor;
                ctx.shadowColor = sColor; ctx.shadowBlur = 10;
                ctx.fillText('S', px, py);
                if (e.body) e.body.forEach(seg => ctx.fillText(seg.char, seg.x * TILE_SIZE + TILE_SIZE / 2 + (e.offsetX || 0), seg.y * TILE_SIZE + TILE_SIZE / 2 + (e.offsetY || 0)));
            } else {
                let eColor = '#f87171';
                let eChar = SYMBOLS.ENEMY;
                if (e.type === 'GOLD') { eColor = '#fbbf24'; }
                else if (e.type === 'ORC') { eColor = '#f87171'; eChar = SYMBOLS.ORC; }
                else if (e.type === 'SNAKE') { eColor = '#4ade80'; eChar = SYMBOLS.SNAKE; }
                else if (e.type === 'WISP_ENEMY') { eColor = '#818cf8'; eChar = SYMBOLS.WISP; }
                else if (e.type === 'TURRET') { eColor = '#ef4444'; eChar = SYMBOLS.TURRET; }
                else if (e.type === 'HOPPER_TURRET') {
                    // 移動タレット: オレンジと黄色の間で点滅
                    eChar = SYMBOLS.TURRET;
                    eColor = Math.floor(now / 150) % 2 === 0 ? '#f97316' : '#fbbf24';
                    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 6;
                }
                else if (e.type === 'BLAZE') { eColor = '#fb923c'; eChar = 'F'; }
                else if (e.type === 'FROST') { eColor = '#ededed'; eChar = 'I'; }
                else if (e.type === 'BOMBER') { eColor = '#f97316'; eChar = 'X'; }
                else if (e.type === 'BREAKER') { eColor = '#f87171'; eChar = SYMBOLS.BREAKER; }
                else if (e.type === 'LAYER') { eColor = '#f87171'; eChar = SYMBOLS.LAYER; }
                else if (e.type === 'MIMIC') {
                    eColor = '#ef4444'; eChar = 'M';
                    // 正体暴露の変身演出中は点滅
                    if (e.mimicTransitionEnd && now < e.mimicTransitionEnd) {
                        const phase = Math.floor(now / 80) % 2;
                        eColor = phase === 0 ? '#ef4444' : '#c084fc';
                        eChar = phase === 0 ? 'M' : SYMBOLS.STAIRS;
                    }
                }
                else if (e.type === 'FAIRY_MIMIC') {
                    eColor = '#ef4444'; eChar = 'M';
                    // 正体暴露直後は妖精と交互に点滅
                    if (e.mimicTransitionEnd && now < e.mimicTransitionEnd) {
                        const phase = Math.floor(now / 80) % 2;
                        eColor = phase === 0 ? '#ef4444' : '#f472b6';
                        eChar = phase === 0 ? 'M' : SYMBOLS.FAIRY;
                    }
                }
                else if (e.type === 'MADMAN') {
                    // 狂人: 赤く不規則に明滅する＠
                    const mPhase = Math.floor(now / 90) % 3;
                    eColor = mPhase === 0 ? '#ef4444' : mPhase === 1 ? '#b91c1c' : '#fca5a5';
                    eChar = SYMBOLS.PLAYER;
                    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8;
                }
                else if (e.type === 'CRAZY_G') {
                    // いかれたG: 紫色（点滅なし）
                    eColor = '#a855f7';
                    eChar = 'G';
                    ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 10;
                }
                else if (e.type === 'KEY_RUNNER') {
                    eColor = '#f87171'; eChar = 'K';
                }
                else if (e.type === 'KING') {
                    // 王: ゆっくり輝く金色の王冠
                    const kPhase = Math.floor(now / 400) % 2;
                    eColor = kPhase === 0 ? '#fbbf24' : '#f59e0b';
                    eChar = '♛';
                    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 20;
                }
                if (e.isAlly) eColor = '#60a5fa';
                // 派閥グロー
                if (e.faction === 'CRIMSON' && !e.isAlly) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 14; }
                else if (e.faction === 'COBALT' && !e.isAlly) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 14; }
                // 王の加護グロー（KINGが生存中は全非KING敵が金色にほんのり光る）
                if (e.type !== 'KING' && !e.isAlly && enemies.some(k => k.type === 'KING' && k.hp > 0 && !k._dead)) {
                    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = Math.max(ctx.shadowBlur, 8);
                }
                // 氷床の上の敵は視認性向上のため色グロー付加
                if (map[e.y] && map[e.y][e.x] === SYMBOLS.ICE) {
                    ctx.shadowColor = isFlashing ? '#ededed' : eColor;
                    ctx.shadowBlur = Math.max(ctx.shadowBlur || 0, 8);
                }
                ctx.fillStyle = isFlashing ? '#ededed' : eColor;
                ctx.fillText(eChar, px, py);
                // KEY_RUNNER: 移動前の位置に追従する小さなkを描画
                if (e.type === 'KEY_RUNNER' && e.trailX != null && (e.trailX !== e.x || e.trailY !== e.y)) {
                    const tkx = e.trailX * TILE_SIZE + TILE_SIZE / 2;
                    const tky = e.trailY * TILE_SIZE + TILE_SIZE / 2;
                    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText('k', tkx, tky);
                }
            }
            ctx.restore();
        });

        // 3.5. タレットのレーザー光線
        enemies.forEach(e => {
            if ((e.type !== 'TURRET' && e.type !== 'HOPPER_TURRET') || e.hp <= 0 || e.isFalling) return;
            const dx = [0, 1, 0, -1][e.dir];
            const dy = [-1, 0, 1, 0][e.dir];
            let lx = e.x + dx, ly = e.y + dy;
            const offX = e.offsetX || 0, offY = e.offsetY || 0;
            const startX = e.x * TILE_SIZE + TILE_SIZE / 2 + offX;
            const startY = e.y * TILE_SIZE + TILE_SIZE / 2 + offY;
            let endX = startX, endY = startY;
            while (lx >= 0 && lx < COLS && ly >= 0 && ly < ROWS) {
                if (isWallAt(lx, ly)) {
                    // 壁にぶつかるまで描画（壁の手前の端まで伸ばす）
                    endX = lx * TILE_SIZE + TILE_SIZE / 2 - dx * TILE_SIZE / 2 + offX;
                    endY = ly * TILE_SIZE + TILE_SIZE / 2 - dy * TILE_SIZE / 2 + offY;
                    break;
                }
                endX = lx * TILE_SIZE + TILE_SIZE / 2 + offX;
                endY = ly * TILE_SIZE + TILE_SIZE / 2 + offY;
                lx += dx; ly += dy;
            }
            if (endX !== startX || endY !== startY) {
                ctx.save();
                const laserColor = e.isAlly ? '#60a5fa' : '#ef4444';
                const laserGlow = e.isAlly ? 'rgba(96, 165, 250, 0.3)' : 'rgba(239, 68, 68, 0.3)';
                // グロー（太い半透明の線）
                ctx.strokeStyle = laserGlow;
                ctx.lineWidth = 6;
                ctx.shadowColor = laserColor; ctx.shadowBlur = 15;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                // コア（細い明るい線）
                ctx.strokeStyle = '#ededed';
                ctx.lineWidth = 1;
                ctx.shadowColor = '#ededed'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY); ctx.stroke();
                ctx.restore();
            }
        });

        // 4. ウィスプ
        wisps.forEach(w => {
            ctx.fillStyle = '#ededed'; ctx.shadowBlur = 10; ctx.shadowColor = '#ededed';
            ctx.fillText(SYMBOLS.WISP, w.x * TILE_SIZE + TILE_SIZE / 2, w.y * TILE_SIZE + TILE_SIZE / 2);
            ctx.shadowBlur = 0;
        });

        // 4.4.5. 飛翔爆弾
        bombProjectiles.forEach(bp => {
            ctx.save();
            ctx.font = `bold 11px 'Courier New'`;
            ctx.shadowBlur = 14; ctx.shadowColor = '#f97316';
            ctx.fillStyle = '#ededed';
            ctx.fillText('X', bp.x * TILE_SIZE + TILE_SIZE / 2, bp.y * TILE_SIZE + TILE_SIZE / 2 + 4);
            ctx.restore();
        });

        // 4.5. 炎の飛翔体
        flameProjectiles.forEach(fp => {
            ctx.save();
            if (fp.fromIceStar) {
                ctx.shadowBlur = 12; ctx.shadowColor = '#67e8f9';
                ctx.fillStyle = '#ededed';
            } else {
                ctx.shadowBlur = 12; ctx.shadowColor = '#f97316';
                ctx.fillStyle = '#fbbf24';
            }
            ctx.fillText('*', fp.x * TILE_SIZE + TILE_SIZE / 2, fp.y * TILE_SIZE + TILE_SIZE / 2);
            ctx.restore();
        });

        // 5. プレイヤー
        if (isPlayerVisible) {
            ctx.save();
            const px = player.x * TILE_SIZE + TILE_SIZE / 2 + player.offsetX;
            const py = player.y * TILE_SIZE + TILE_SIZE / 2 + player.offsetY;
            const pFlashing = now < player.flashUntil;
            if (player.isStealth) ctx.globalAlpha = 0.5;

            if (tomeAuraParams.active) {
                const colors = ['#ededed', '#fbbf24', '#4ade80', '#38bdf8'];
                ctx.fillStyle = colors[Math.floor(now / 40) % colors.length]; ctx.shadowBlur = 15; ctx.shadowColor = ctx.fillStyle;
            } else {
                ctx.fillStyle = pFlashing ? '#f87171' : PLAYER_COLORS[playerColorIndex];
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

        // 5.5. 風エフェクト（突風の間）— 突風時のみ表示
        if (isWindFloor && now < windGustEndTime) {
            ctx.save();
            const canvasW = COLS * TILE_SIZE;
            const canvasH = ROWS * TILE_SIZE;
            const remaining = (windGustEndTime - now) / 800;
            // 薄い白青オーバーレイ
            ctx.fillStyle = `rgba(200, 230, 255, ${0.2 * remaining})`;
            ctx.fillRect(0, 0, canvasW, canvasH);
            // 高速で上から下へ駆け抜ける大量の縦線
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 80; i++) {
                const seed = i * 61.7;
                const x = (seed * 11.3) % canvasW;
                const len = 40 + (i % 6) * 12;
                // 非常に速いスクロール（speed小=高速）
                const speed = 3 + (i % 3) * 2;
                const totalH = canvasH + len;
                const y = ((now / speed + seed * 7.1) % totalH) - len;
                const alpha = (0.25 + (i % 4) * 0.08) * remaining;
                ctx.strokeStyle = `rgba(220, 240, 255, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + len);
                ctx.stroke();
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
    attackLines.forEach(l => { ctx.strokeStyle = '#ededed'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke(); });
    damageTexts.forEach(d => {
        const elapsed = (now - d.startTime) / (d.duration ?? 400);
        ctx.save(); ctx.globalAlpha = 1 - elapsed; ctx.fillStyle = d.color;
        ctx.font = "12px 'Courier New', Courier, monospace";
        ctx.fillText(d.text, d.x * TILE_SIZE + TILE_SIZE, d.y * TILE_SIZE - 5); ctx.restore();
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
            ctx.fillStyle = isWhiteTr ? '#ededed' : transition.mode === 'RED_OUT' ? '#b00' : '#000';
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (transition.mode === 'FALLING') {
            transition.particles.forEach(p => { ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fill(); });
            ctx.fillStyle = '#ededed'; ctx.font = `bold ${TILE_SIZE * 1.5}px 'Courier New'`; ctx.fillText(SYMBOLS.PLAYER, canvas.width / 2, transition.playerY);
        } else if ((transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT') && transition.particles) {
            transition.particles.forEach(p => {
                p.y += p.speed * (1 + (transition.accel || 0) * 4); if (p.y > canvas.height) p.y = -20;
                ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
            });
        } else if (transition.mode === 'STARS' && transition.particles) {
            ctx.fillStyle = '#ededed'; transition.particles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 1, 0, Math.PI * 2); ctx.fill(); });
        }

        // トランジションテキスト（FLOOR 100 等）
        if (transition.text) {
            ctx.fillStyle = transition.textColor || ((transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT') ? '#000' : '#ededed');
            ctx.font = (transition.mode === 'BLACK_OUT' || transition.mode === 'STARS' || transition.mode === 'RED_OUT') ? "bold 48px 'Courier New', Courier, monospace" : "bold 32px 'Courier New', Courier, monospace";
            ctx.fillText(transition.text, canvas.width / 2, canvas.height / 2);
        }
        ctx.restore();
    }

    // エンディング中のフラッシュオーバーレイ
    if (transition.flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = transition.flashAlpha;
        ctx.fillStyle = '#ededed';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // 物語のメッセージ（storyMessage）
    if (storyMessage) {
        const lines = storyMessage.lines;
        const _isJP = s => /[\u3000-\u9FFF\uFF00-\uFFEF]/.test(s);
        const FONT_EN = "13px 'Courier New', Courier, monospace";
        const FONT_JP = '13px "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "HGS Mincho", serif';
        const LH = 17; // 行の高さ（80%サイズ）
        let totalH = 0;
        lines.forEach(line => {
            if (typeof line === 'object') {
                const enLines = line.en.split('\n'); const jpLines = line.jp.split('\n');
                totalH += (enLines.length * LH) + 8 + (jpLines.length * LH) + 8;
            } else { totalH += LH; }
        });

        // テキスト表示位置の決定
        let currentY = canvas.height - totalH - 45;
        if (storyMessage.useTopPos) {
            currentY = 30;
        } else if (storyMessage.useMiddlePos && dungeonCore) {
            currentY = (player.y * TILE_SIZE + dungeonCore.y * TILE_SIZE) / 2 - totalH / 2;
        }

        ctx.save(); ctx.globalAlpha = storyMessage.alpha; ctx.textAlign = 'center';
        const isWhiteBG = transition.active && (transition.mode === 'WHITE_OUT' || transition.mode === 'WHITE_ASCENT');

        lines.forEach(line => {
            if (typeof line === 'object') {
                const enLines = line.en.split('\n'); const jpLines = line.jp.split('\n');
                ctx.fillStyle = isWhiteBG ? '#000' : '#ccc'; ctx.font = FONT_EN;
                enLines.forEach(l => { ctx.fillText(l, canvas.width / 2, currentY + 13); currentY += LH; });
                currentY += 8;
                ctx.fillStyle = isWhiteBG ? '#444' : '#aaa'; ctx.font = FONT_JP;
                jpLines.forEach(l => { ctx.fillText(l, canvas.width / 2, currentY + 13); currentY += LH; });
                currentY += 8;
            } else {
                const isJP = _isJP(line);
                ctx.fillStyle = isWhiteBG ? (isJP ? '#444' : '#000') : (isJP ? '#aaa' : '#ccc');
                ctx.font = isJP ? FONT_JP : FONT_EN;
                ctx.fillText(line, canvas.width / 2, currentY + 13); currentY += LH;
            }
        });

        // ▼ 記号：テキストの最終描画位置（currentY）より少し下に表示し、重なりを防止
        if (storyMessage.showNext) {
            ctx.fillStyle = isWhiteBG ? '#000' : '#888'; ctx.font = "12px 'Courier New'";
            ctx.fillText("▼", canvas.width / 2, currentY + 16);
        }
        ctx.restore();
    }

    // エンドクレジット画面
    if (gameState === 'ENDING') {
        ctx.save(); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const credits = ["STAFF", "", "GAME DESIGN", "HIROTAKA ADACHI", "", "PROGRAMMING", "HIROTAKA ADACHI", "", "GRAPHICS", "HIROTAKA ADACHI", "", "MUSIC", "SUNO AI", "", "SPECIAL THANKS", "YOU", "", "THANK YOU FOR PLAYING!", "", "THE END"];
        credits.forEach((txt, i) => {
            ctx.fillStyle = (i === 0 || txt === "THE END") ? '#ededed' : '#ccc';
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

function detonateBomb(bomb) {
    const idx = bombs.indexOf(bomb);
    if (idx !== -1) bombs.splice(idx, 1);
    const damage = 15 + player.level * 2;
    const blastTiles = [
        { x: bomb.x, y: bomb.y },
        { x: bomb.x - 1, y: bomb.y },
        { x: bomb.x + 1, y: bomb.y },
        { x: bomb.x, y: bomb.y - 1 },
        { x: bomb.x, y: bomb.y + 1 }
    ];
    SOUNDS.EXPLODE();
    setScreenShake(10, 200);
    spawnFloatingText(bomb.x, bomb.y, "BOMB!", "#ef4444");
    // 爆風エフェクト（0.5秒間赤く点滅）
    blastEffects.push({ tiles: blastTiles.map(t => ({ x: t.x, y: t.y })), endTime: performance.now() + 500 });
    // 敵へのダメージ
    for (const tile of blastTiles) {
        enemies.forEach(e => {
            if (e.hp <= 0) return;
            let hit = (e.x === tile.x && e.y === tile.y);
            if (!hit && (e.type === 'SNAKE' || e.type === 'SUMMONER') && e.body) {
                hit = e.body.some(seg => seg.x === tile.x && seg.y === tile.y);
            }
            if (hit) {
                if (e.type === 'BOMBER') {
                    // BOMBERは爆風で即死 → 連鎖爆発
                    e.hp = 0;
                    spawnFloatingText(e.x, e.y, "CHAIN!", "#f97316");
                    handleEnemyDeath(e, true);
                } else {
                    const eDmg = e.hp;
                    e.hp -= eDmg;
                    spawnFloatingText(e.x, e.y, `-${eDmg}`, "#ef4444");
                    if (e.hp <= 0) {
                        handleEnemyDeath(e, true);
                    }
                }
            }
        });
    }
    // プレイヤーへのダメージ
    if (blastTiles.some(t => t.x === player.x && t.y === player.y)) {
        const reduced = Math.max(1, damage - player.armorCount);
        player.hp -= reduced;
        spawnFloatingText(player.x, player.y, `-${reduced}`, "#ff6b6b");
        if (player.hp <= 0) {
            player.hp = 0;
            triggerGameOver();
        }
    }
    // 誘爆: 範囲内の他の爆弾の timer を 0 に
    for (const tile of blastTiles) {
        bombs.forEach(b => {
            if (b.x === tile.x && b.y === tile.y) {
                b.timer = 0;
            }
        });
    }
    // tempWalls破壊
    for (const tile of blastTiles) {
        const twIdx = tempWalls.findIndex(w => w.x === tile.x && w.y === tile.y);
        if (twIdx !== -1) tempWalls.splice(twIdx, 1);
    }
    // 周囲の壁を破壊（マップの壁）
    for (const tile of blastTiles) {
        if (tile.x >= 1 && tile.x < COLS - 1 && tile.y >= 1 && tile.y < ROWS - 1) {
            if (map[tile.y][tile.x] === SYMBOLS.WALL) {
                map[tile.y][tile.x] = SYMBOLS.FLOOR;
            }
        }
    }
    // 遭難冒険者へのダメージ
    if (merchantState) {
        for (const tile of blastTiles) {
            if (tile.x === merchantState.x && tile.y === merchantState.y) {
                merchantState.hp = (merchantState.hp || 30) - damage;
                spawnFloatingText(merchantState.x, merchantState.y, `-${damage}`, "#ef4444");
                if (merchantState.hp <= 0) {
                    addLog("The stranded adventurer was killed by the explosion!");
                    spawnFloatingText(merchantState.x, merchantState.y, "DEAD", "#ff0000");
                    merchantState.dyingUntil = performance.now() + 800;
                }
                break;
            }
        }
    }
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
        if ((e.type === 'SNAKE' || e.type === 'SUMMONER') && e.body) return e.body.some(seg => seg.x === bx && seg.y === by);
        return false;
    }) && !wisps.some(w => w.x === bx && w.y === by) && !tempWalls.some(w => w.x === bx && w.y === by)
       && !bombs.some(b => b.x === bx && b.y === by)) {
        if (hasRing('STAR_RING') && hasRing('ICE_BLOCK_RING')) {
            tempWalls.push({ x: bx, y: by, hp: 1, type: 'ICE_STAR_BLOCK' });
            addLog("❄★ Placed an ice star block!");
            SOUNDS.PLACE_BLOCK();
            return true;
        }
        if (hasRing('STAR_RING') && hasRing('BOMB_RING')) {
            tempWalls.push({ x: bx, y: by, hp: 1, type: 'BOMB_STAR_BLOCK' });
            addLog("💣* Placed a bomb star block!");
            SOUNDS.PLACE_BLOCK();
            return true;
        }
        if (hasRing('STAR_RING')) {
            tempWalls.push({ x: bx, y: by, hp: 2, type: 'FIRE_BLOCK' });
            addLog("★ Placed a star block!");
            SOUNDS.PLACE_BLOCK();
            return true;
        }
        if (hasRing('BOMB_RING') && hasRing('ICE_BLOCK_RING')) {
            bombs.push({ x: bx, y: by, timer: 5, hp: 2, isIce: true });
            addLog("Placed an ice bomb! (slides + explodes in 5 turns)");
            SOUNDS.PLACE_BLOCK();
            return true;
        }
        if (hasRing('BOMB_RING')) {
            bombs.push({ x: bx, y: by, timer: 5, hp: 2 });
            addLog("Placed a bomb!");
            SOUNDS.PLACE_BLOCK();
            return true;
        }
        if (hasRing('ICE_BLOCK_RING')) {
            tempWalls.push({ x: bx, y: by, hp: 2, type: 'ICE_BLOCK' });
            addLog("Placed an ice block!");
            SOUNDS.PLACE_BLOCK();
            return true;
        }
        tempWalls.push({ x: bx, y: by, hp: 2, type: 'BLOCK' });
        addLog("Constructed a block!");
        SOUNDS.PLACE_BLOCK();
        return true;
    }
    return false;
}

async function slideIceBlock(block, dx, dy) {
    const trailTiles = new Set([SYMBOLS.FLOOR, SYMBOLS.LAVA, SYMBOLS.POISON, SYMBOLS.FIRE_FLOOR, SYMBOLS.GRASS]);
    while (true) {
        const nx = block.x + dx;
        const ny = block.y + dy;
        // マップ端・壁でストップ
        if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) break;
        if (map[ny][nx] === SYMBOLS.WALL) break;
        // 他の tempWall・爆弾でストップ
        if (tempWalls.some(w => w !== block && w.x === nx && w.y === ny)) break;
        if (bombs.some(b => b !== block && b.x === nx && b.y === ny)) break;
        // 敵・ウィスプにぶつかったらストップ（ダメージなし）
        if (enemies.some(e => e.x === nx && e.y === ny)) break;
        if (wisps.some(w => w.x === nx && w.y === ny)) break;
        // 通過したマスを氷の床に変換（溶岩・毒沼・通常床など）
        if (trailTiles.has(map[block.y][block.x])) map[block.y][block.x] = SYMBOLS.ICE;
        block.x = nx;
        block.y = ny;
        await new Promise(r => setTimeout(r, 55));
    }
    addLog("The ice block slides!");
}

async function dragonWaveAttack(wave = 1) {
    const isSecondWave = wave >= 2;
    addLog("The DRAGONLORD unleashes a devastating shockwave!");
    SOUNDS.FATAL();
    setScreenShake(50, 800);
    spawnFloatingText(Math.floor(COLS / 2), Math.floor(ROWS / 2), "SHOCKWAVE!", "#f97316");

    await new Promise(r => setTimeout(r, 500));
    SOUNDS.RUMBLE();
    setScreenShake(30, 600);

    // つらら（ICICLE）と設置ブロック（BLOCK）を爆発させて破壊
    const toExplode = tempWalls.filter(w => w.type === 'ICICLE' || w.type === 'BLOCK' || w.type === 'ICE_BLOCK' || w.type === 'ICE_STAR_BLOCK' || w.type === 'BOMB_STAR_BLOCK');
    tempWalls = tempWalls.filter(w => w.type !== 'ICICLE' && w.type !== 'BLOCK' && w.type !== 'ICE_BLOCK' && w.type !== 'ICE_STAR_BLOCK' && w.type !== 'BOMB_STAR_BLOCK');

    if (toExplode.length > 0) {
        spawnFloatingText(Math.floor(COLS / 2), Math.floor(ROWS / 2) - 2, "SHATTER!", "#87ceeb");

        const blastDamage = 5;
        let totalPlayerDamage = 0;

        for (const w of toExplode) {
            const wx = Math.round(w.x);
            const wy = Math.round(w.y);
            const blastTiles = [
                { x: wx,     y: wy     },
                { x: wx - 1, y: wy     },
                { x: wx + 1, y: wy     },
                { x: wx,     y: wy - 1 },
                { x: wx,     y: wy + 1 }
            ];
            blastEffects.push({ tiles: blastTiles, endTime: performance.now() + 500 });

            if (blastTiles.some(t => t.x === player.x && t.y === player.y)) {
                totalPlayerDamage += blastDamage;
            }
        }

        SOUNDS.EXPLODE();
        if (toExplode.length > 2) setTimeout(() => SOUNDS.EXPLODE(), 160);
        setScreenShake(15, 400);

        if (totalPlayerDamage > 0 && !player.isShielded) {
            const reduced = Math.max(1, totalPlayerDamage - player.armorCount);
            player.hp -= reduced;
            player.flashUntil = performance.now() + 300;
            spawnFloatingText(player.x, player.y, `-${reduced}`, '#ff6b6b');
            SOUNDS.DAMAGE();
            if (player.hp <= 0) {
                player.hp = 0;
                updateUI();
                triggerGameOver();
                return;
            }
        }
    }

    await new Promise(r => setTimeout(r, 300));

    // 波動スライド用の壁判定（WALL境界のみ。COREやtempWallsは無視）
    function isHardWallAt(x, y) {
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
        return map[y][x] === SYMBOLS.WALL;
    }

    // プレイヤーと敵（ドラゴン以外）を下端へスライド
    const slidables = enemies.filter(e => e.hp > 0 && e.type !== 'DRAGON').sort((a, b) => b.y - a.y);

    let playerTargetY = player.y;
    for (let y = player.y + 1; y < ROWS - 1; y++) {
        if (isHardWallAt(player.x, y)) break;
        playerTargetY = y;
    }

    const enemyTargets = new Map();
    const occupied = new Set();
    occupied.add(`${player.x},${playerTargetY}`);
    for (const e of slidables) {
        let targetY = e.y;
        for (let y = e.y + 1; y < ROWS - 1; y++) {
            if (isHardWallAt(e.x, y)) break;
            const key = `${e.x},${y}`;
            if (occupied.has(key)) break;
            targetY = y;
        }
        enemyTargets.set(e, targetY);
        occupied.add(`${e.x},${targetY}`);
    }

    let anyMoved = true;
    while (anyMoved) {
        anyMoved = false;
        if (player.y < playerTargetY) { player.y++; anyMoved = true; }
        for (const e of slidables) {
            const target = enemyTargets.get(e);
            if (e.y < target) { e.y++; anyMoved = true; }
        }
        if (anyMoved) {
            draw();
            await new Promise(r => setTimeout(r, 30));
        }
    }

    SOUNDS.LANDING_THUD();
    SOUNDS.EXPLODE();
    setScreenShake(60, 800);

    await new Promise(r => setTimeout(r, 600));

    // バフを全解除して点滅演出
    const hadBuff = player.isSpeeding || player.isStealth || player.isShielded || player.isBreaker || player.isInfiniteStamina;
    player.isSpeeding = false;
    player.isStealth = false;
    player.isShielded = false;
    player.isBreaker = false;
    player.isInfiniteStamina = false;
    if (hadBuff) {
        addLog("The shockwave dispels all your buffs!");
        spawnFloatingText(player.x, player.y, "DEBUFFED!", "#c084fc");
    }

    // 弱体化サウンド（下降音arpeggio 〜0.5秒）
    [700, 500, 350, 220, 130].forEach((freq, i) => {
        setTimeout(() => playSound(freq, 'sawtooth', 0.12, 0.09), i * 85);
    });

    // プレイヤーを点滅（0.5秒）
    const debuffBlinkEnd = performance.now() + 500;
    let debuffBlink = true;
    while (performance.now() < debuffBlinkEnd) {
        player.flashUntil = debuffBlink ? performance.now() + 55 : 0;
        debuffBlink = !debuffBlink;
        draw();
        await new Promise(r => setTimeout(r, 55));
    }
    player.flashUntil = 0;
    updateUI();

    // ランダムウォークで有機的な形のブロブ状炎を生成（永続）
    spawnFloatingText(Math.floor(COLS / 2), Math.floor(ROWS / 2) + 2, "HELLFIRE!", "#ef4444");

    const blobCount = wave === 3 ? 12 : (isSecondWave ? 7 : 4);
    const blobSize  = wave === 3 ? 25 : (isSecondWave ? 18 : 10);
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];

    const canFire = (fx, fy) => {
        if (fx < 1 || fx >= COLS-1 || fy < 1 || fy >= ROWS-1) return false;
        const t = map[fy][fx];
        if (t === SYMBOLS.WALL || t === SYMBOLS.LAVA || t === SYMBOLS.CORE) return false;
        return !fireFloors.some(f => f.x === fx && f.y === fy);
    };

    const newFires = [];

    for (let b = 0; b < blobCount; b++) {
        // シード点をランダムに選ぶ
        let sx, sy, tries = 0;
        do {
            sx = 2 + Math.floor(Math.random() * (COLS - 4));
            sy = 2 + Math.floor(Math.random() * (ROWS - 4));
            tries++;
        } while (!canFire(sx, sy) && tries < 60);
        if (!canFire(sx, sy)) continue;

        // BFS + ランダム成長でブロブを形成
        const queue = [{ x: sx, y: sy }];
        const blobSet = new Set([`${sx},${sy}`]);
        newFires.push({ x: sx, y: sy });

        while (queue.length > 0 && blobSet.size < blobSize) {
            // ランダムに親タイルを選ぶ（幅優先でなくランダム選択）
            const idx = Math.floor(Math.random() * queue.length);
            const cur = queue[idx];

            // 隣接4方向をシャッフルして試みる
            const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
            let grew = false;
            for (const d of shuffled) {
                const nx = cur.x + d.x, ny = cur.y + d.y;
                const key = `${nx},${ny}`;
                if (!blobSet.has(key) && canFire(nx, ny) && Math.random() < 0.6) {
                    blobSet.add(key);
                    queue.push({ x: nx, y: ny });
                    newFires.push({ x: nx, y: ny });
                    grew = true;
                    break;
                }
            }
            if (!grew) queue.splice(idx, 1);
        }
    }

    // シャッフルしてランダムな順番で出現
    newFires.sort(() => Math.random() - 0.5);
    for (let i = 0; i < newFires.length; i++) {
        fireFloors.push({ x: newFires[i].x, y: newFires[i].y, life: 9999 });
        if (i % 2 === 0) {
            draw();
            await new Promise(r => setTimeout(r, 18));
        }
    }
    draw();

    await new Promise(r => setTimeout(r, 400));
}

async function windGustSlide() {
    if (!isWindFloor || windTimer < 5) return;
    windTimer = 0;
    addLog("A strong gust blows!");
    SOUNDS.WIND_GUST();
    setScreenShake(8, 400);
    windGustEndTime = performance.now() + 800;
    spawnFloatingText(Math.floor(COLS / 2), Math.floor(ROWS / 2), "WIND!", "#87ceeb");

    // 全キャラの最終到達位置を先に計算
    // プレイヤーの最終Y（穴に落ちる場合はその位置で停止）
    let playerTargetY = player.y;
    let playerFallsIntoHole = false;
    for (let y = player.y + 1; y < ROWS - 1; y++) {
        if (isWallAt(player.x, y)) break;
        playerTargetY = y;
        if (map[y][player.x] === SYMBOLS.STAIRS) { playerFallsIntoHole = true; break; }
    }
    // 敵の最終Y（下の敵から計算して重なり防止。穴に落ちた敵は死亡）
    const sortedEnemies = enemies.filter(e => e.hp > 0).sort((a, b) => b.y - a.y);
    const enemyTargets = new Map();
    const enemyFallsIntoHole = new Set();
    const occupied = new Set();
    occupied.add(`${player.x},${playerTargetY}`);
    for (const e of sortedEnemies) {
        let targetY = e.y;
        let falls = false;
        for (let y = e.y + 1; y < ROWS - 1; y++) {
            if (isWallAt(e.x, y)) break;
            const key = `${e.x},${y}`;
            if (occupied.has(key)) break;
            targetY = y;
            if (map[y][e.x] === SYMBOLS.STAIRS) { falls = true; break; }
        }
        enemyTargets.set(e, targetY);
        if (falls) enemyFallsIntoHole.add(e);
        occupied.add(`${e.x},${targetY}`);
    }

    // 1マスずつ同時にアニメーション
    let anyMoved = true;
    while (anyMoved) {
        anyMoved = false;
        // プレイヤーを1マス下へ
        if (player.y < playerTargetY) {
            player.y++;
            anyMoved = true;
        }
        // 全敵を1マス下へ（下の敵から）
        for (const e of sortedEnemies) {
            const target = enemyTargets.get(e);
            if (e.y < target) {
                e.y++;
                anyMoved = true;
            }
        }
        if (anyMoved) {
            draw();
            await new Promise(r => setTimeout(r, 35));
        }
    }

    // 穴に落ちた敵を死亡処理
    for (const e of enemyFallsIntoHole) {
        spawnFloatingText(e.x, e.y, "FELL!", "#f87171");
        await handleEnemyDeath(e, false);
    }

    // プレイヤーが穴に落ちた場合は次のフロアへ
    if (playerFallsIntoHole) {
        addLog("The wind blows you into the hole!");
        isPlayerVisible = false;
        floorLevel++;
        if (floorLevel >= DEEP_ENDING_FLOOR) { stopBGM(); await triggerEnding2(); return; }
        await startFloorTransition();
    }
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

        // ウィルへの衝突: その場で停止してダメージ
        const hitWisp = wisps.find(w => w.x === nx && w.y === ny);
        if (hitWisp) {
            const dmg = 10;
            player.hp -= dmg;
            player.flashUntil = performance.now() + 200;
            if (player.hp > 0) animateBounce(player);
            spawnDamageText(player.x, player.y, dmg, '#ededed');
            SOUNDS.DAMAGE();
            addLog("ZAP! Slid into a Wisp!");
            updateUI();
            if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
            break;
        }

        // 通過タイトルのアイテム回収判定
        const nextTile = map[ny][nx];
        const itemSymbols = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.KEY, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.WAND, SYMBOLS.EXPLOSION, SYMBOLS.BREAKER_TOME, SYMBOLS.HEAL_TOME, SYMBOLS.ESCAPE, SYMBOLS.GUARDIAN];
        if (itemSymbols.includes(nextTile)) {
            pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
            map[ny][nx] = SYMBOLS.FLOOR; // 即座に消す
        } else if (nextTile === SYMBOLS.FAIRY) {
            // 妖精タイルの特殊処理: underTileを復元してICE等を保護
            const _sf = movingFairies.find(f => f.x === nx && f.y === ny &&
                (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y)));
            if (_sf) {
                map[ny][nx] = (_sf.underTile != null) ? _sf.underTile : SYMBOLS.FLOOR;
                if (_sf.stopped) {
                    // 停止済み妖精なら拾う
                    pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
                    movingFairies = movingFairies.filter(f => !(f.x === nx && f.y === ny &&
                        (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y))));
                }
                // 移動中（stopped=false）は拾えない
            } else {
                // 静的妖精（movingFairiesに無い）: FLOOR復元して拾う
                map[ny][nx] = SYMBOLS.FLOOR;
                pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
            }
        }

        player.x = nx; player.y = ny;
        updateUI();
        draw();
        await applyLaserDamage(); // メインタレットなどが滑っている最中もレーザーが追従して焼くように

        // 階段チェック
        if (map[player.y][player.x] === SYMBOLS.STAIRS) {
            const mimicSlide = enemies.find(e => e.type === 'MIMIC' && e.disguised && e.x === player.x && e.y === player.y);
            if (mimicSlide) {
                mimicSlide.disguised = false;
                map[mimicSlide.y][mimicSlide.x] = SYMBOLS.FLOOR;
                mimicSlide.mimicTransitionEnd = performance.now() + 500;
                SOUNDS.MIMIC_REVEAL();
                addLog("The hole suddenly attacks! It was a MIMIC!");
                spawnFloatingText(player.x, player.y, "MIMIC!!", "#c084fc");
                SOUNDS.ENEMY_ATTACK();
                setScreenShake(10, 300);
                const mimicDmg = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                player.hp -= mimicDmg;
                player.flashUntil = performance.now() + 300;
                spawnDamageText(player.x, player.y, mimicDmg, '#c084fc');
                SOUNDS.DAMAGE();
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                break;
            }
            addLog("You slid into the dark hole...");
            isPlayerVisible = false;
            floorLevel++;
            if (floorLevel >= DEEP_ENDING_FLOOR) { stopBGM(); await triggerEnding2(); return; }
            await startFloorTransition();
            break;
        }

        // 毒沼チェック
        if (map[player.y][player.x] === SYMBOLS.POISON) {
            player.hp -= 1;
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, Math.floor(player.stamina / 2));
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
    endingSkipLock = true;
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

    // mapが未初期化の場合（デバッグ起動時）はフラッシュのみで開始
    if (!map || !map[0]) {
        transition.active = true;
        transition.mode = 'WHITE_OUT';
        transition.alpha = 1.0;
        transition.particles = [];
    }

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
    if (map && map[0]) draw(performance.now());
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
        if (dungeonCore && map && map[dungeonCore.y]) {
            map[dungeonCore.y][dungeonCore.x] = coreVisible ? SYMBOLS.CORE : SYMBOLS.FLOOR;
        }

        // 通常描画
        if (map && map[0]) draw(performance.now());

        await new Promise(r => setTimeout(r, 16));
    }

    // コアを完全に消す
    if (dungeonCore && map && map[dungeonCore.y]) map[dungeonCore.y][dungeonCore.x] = SYMBOLS.FLOOR;
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

    // 3. テキスト表示 (目覚め - 日英) — 自動進行、各ページ4秒表示
    await showStoryPages([
        [{ en: "When you came to,", jp: "気づくとあなたは" }],
        [{ en: "You were lying on the ground.", jp: "地面に倒れていた" }],
        [{ en: "The night sky stretched out above you.", jp: "頭上に夜空が広がっている" }]
    ], false, false, 4000);

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

    // 5. 復讐の誓いテキスト (暗闇にて) — 自動進行、各ページ4秒表示
    await showStoryPages([
        [{ en: "You headed toward the town.", jp: "あなたは町へむかった" }],
        [{ en: "To the friends who betrayed you...", jp: "裏切った仲間たちを" }],
        [{ en: "To kill them.", jp: "殺すために" }]
    ], false, false, 4000);

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
    endingSkipLock = false;
    isProcessing = false;
    // クリア達成: 次回の新規プレイでまた100Fのストーリーが読めるようにリセット
    localStorage.removeItem('floor100_story_seen');
    // 深層アンロック
    localStorage.setItem('deep_unlocked', '1');
}

// 深層エンディング: 理論上の最下層で穴に落ちた時
async function triggerEnding2() {
  try {
    isProcessing = true;
    endingSkipLock = true;
    gameState = 'ENDING_SEQ';
    transition.text = "";
    attackLines = [];
    damageTexts = [];

    addLog("The floor gives way... and you fall.");
    isPlayerVisible = false;
    player.offsetX = 0; player.offsetY = 0;

    // 最初から黒背景（mapへのアクセスを避ける）
    transition.active = true;
    transition.mode = 'BLACK_OUT';
    transition.alpha = 1.0;

    // 落下音（ノイズのフェードダウン）
    const fallNoise = (() => {
        const duration = 4.0;
        const bufferSize = audioCtx.sampleRate * duration;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        const f = audioCtx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(800, audioCtx.currentTime);
        f.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + duration);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.5, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        src.connect(f); f.connect(g); g.connect(audioCtx.destination);
        src.start();
    })();

    // 画面を揺らしながら暗転
    const shakeStart = performance.now();
    while (performance.now() - shakeStart < 3000) {
        const p = (performance.now() - shakeStart) / 3000;
        screenShake.x = (Math.random() - 0.5) * p * 20;
        screenShake.y = (Math.random() - 0.5) * p * 20;
        screenShake.until = performance.now() + 50;
        transition.flashAlpha = p * 0.3 * (Math.random() < 0.1 ? 1 : 0);
        draw(performance.now());
        await new Promise(r => setTimeout(r, 16));
    }
    transition.flashAlpha = 0;

    // 完全暗転
    transition.active = true;
    transition.mode = 'BLACK_OUT';
    transition.alpha = 1.0;
    draw(performance.now());
    await new Promise(r => setTimeout(r, 4000));

    // 静寂の中、低いドローン音
    const drone2 = (() => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 28;
        g.gain.setValueAtTime(0.0, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 3);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start();
        return { osc, g };
    })();

    await new Promise(r => setTimeout(r, 2000));

    // ストーリーページ: 闇の底
    await showStoryPages([
        [{ en: "Darkness.", jp: "暗闇だ" }],
        [{ en: "An endless fall.", jp: "終わりのない落下" }],
        [{ en: "How long have you been falling?", jp: "どれくらい落ちているのか" }],
        [{ en: "The dungeon has no bottom.", jp: "このダンジョンに底はない" }],
        [{ en: "Or so you thought.", jp: "そう思っていた" }],
    ], false, false, 4000);

    await new Promise(r => setTimeout(r, 2000));

    // 遠くに光が見える
    transition.mode = 'STARS';
    transition.alpha = 0;
    transition.particles = [];
    for (let i = 0; i < 1; i++) {
        transition.particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            size: 0.5
        });
    }
    for (let a = 0; a <= 0.3; a += 0.005) {
        transition.alpha = a;
        draw(performance.now());
        await new Promise(r => setTimeout(r, 30));
    }
    await new Promise(r => setTimeout(r, 3000));

    await showStoryPages([
        [{ en: "A faint light.", jp: "ひとつの光" }],
        [{ en: "Far, far below.", jp: "はるか遠く　下に" }],
        [{ en: "Something is there.", jp: "何かがある" }],
    ], false, false, 4000);

    // 光が広がる（パーティクル増加）
    for (let n = 2; n <= 60; n++) {
        transition.particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * n * 10,
            y: canvas.height / 2 + (Math.random() - 0.5) * n * 10,
            size: Math.random() * 1.0
        });
        if (n % 3 === 0) {
            for (let a = transition.alpha; a <= Math.min(0.8, transition.alpha + 0.1); a += 0.01) {
                transition.alpha = a;
                draw(performance.now());
                await new Promise(r => setTimeout(r, 16));
            }
        }
    }
    await new Promise(r => setTimeout(r, 2000));

    await showStoryPages([
        [{ en: "The true core.", jp: "真のコア" }],
        [{ en: "The heart of the dungeon.", jp: "ダンジョンの心臓" }],
        [{ en: "It was here all along.", jp: "ずっとここにあった" }],
        [{ en: "Waiting.", jp: "待っていた" }],
    ], false, false, 4500);

    // ドローン音を強くしながら完全ホワイトアウト
    drone2.g.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 5);
    for (let a = transition.alpha; a <= 1.0; a += 0.008) {
        transition.alpha = a;
        draw(performance.now());
        await new Promise(r => setTimeout(r, 20));
    }
    await new Promise(r => setTimeout(r, 1000));
    SOUNDS.EXPLODE();
    setScreenShake(30, 1000);

    transition.mode = 'WHITE_OUT';
    transition.alpha = 1.0;
    transition.particles = [];
    transition.flashAlpha = 1.0;
    draw(performance.now());
    await new Promise(r => setTimeout(r, 3000));
    transition.flashAlpha = 0;

    await showStoryPages([
        [{ en: "And then —", jp: "そして——" }],
        [{ en: "silence.", jp: "静寂" }],
        [{ en: "You understood everything.", jp: "あなたはすべてを理解した" }],
        [{ en: "The dungeon was never a prison.", jp: "ダンジョンは牢獄ではなかった" }],
        [{ en: "It was a test.", jp: "それは試練だった" }],
        [{ en: "And you passed.", jp: "あなたは合格した" }],
    ], false, false, 4000);

    await new Promise(r => setTimeout(r, 2000));

    // 深淵との対峙
    await showStoryPages([
        [{ en: "The abyss looked back at you.", jp: "深淵が、あなたを見返した" }],
        [{ en: "You did not look away.", jp: "あなたは目を逸らさなかった" }],
        [{ en: "Something passed between you.", jp: "何かが、交わされた" }],
        [{ en: "...", jp: "……" }],
        [{ en: "You reached out your hand.", jp: "あなたは手を、伸ばした" }],
    ], false, false, 4500);

    await new Promise(r => setTimeout(r, 1500));

    // ドローン停止（長めにフェード）
    drone2.g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 4);
    setTimeout(() => { drone2.osc.stop(); }, 4500);
    await new Promise(r => setTimeout(r, 3000));

    // BLACK_OUTへ
    transition.mode = 'BLACK_OUT';
    transition.alpha = 1.0;
    transition.darken = 1;
    draw(performance.now());
    await new Promise(r => setTimeout(r, 2000));

    // 闇の中の最後のページ
    await showStoryPages([
        [{ en: "Somewhere far above,", jp: "はるか上方では" }],
        [{ en: "the dungeon breathes.", jp: "ダンジョンが息をしている" }],
        [{ en: "It has always breathed.", jp: "いつだって、そうだった" }],
        [{ en: "But now —", jp: "けれど今は——" }],
    ], false, false, 5000);

    await new Promise(r => setTimeout(r, 2000));

    // 衝撃音と共にエンディングテキスト
    SOUNDS.BANG();
    transition.mode = 'RED_OUT';
    transition.text = "TRUE ENDING";
    transition.textColor = "#ededed";
    draw(performance.now());
    await new Promise(r => setTimeout(r, 6000));
    transition.text = "";

    // 特別メッセージ (BLACK_OUTで白文字)
    transition.mode = 'BLACK_OUT';
    transition.alpha = 1.0;
    draw(performance.now());
    await new Promise(r => setTimeout(r, 2000));

    await showStoryPages([
        ["You have reached the limits of the deep layers."],
        ["The theoretical upper bound was approximately", "18 quintillion tiers."],
        ["It should have required 1.71 billion years", "of playtime to reach this point."],
        ["Truly, well done."],
        ["And\u2026 thank you."],
    ], true, false, 5000);

    await new Promise(r => setTimeout(r, 3000));

    gameState = 'ENDING';
    transition.active = false;
    endingSkipLock = false;
    isProcessing = false;
  } catch(err) {
    console.error('[triggerEnding2 ERROR]', err);
    endingSkipLock = false;
    isProcessing = false;
  }
}

async function handleAction(dx, dy) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlayerVisible = true; // 操作時は確実に表示する
    if (isProcessing) return;

    if (dx > 0) player.facing = 'RIGHT';
    else if (dx < 0) player.facing = 'LEFT';

    // 毒沼スロー: 2ターンに1回のみ行動可能
    if (map[player.y][player.x] === SYMBOLS.POISON) {
        if (player.poisonStagger) {
            player.poisonStagger = false;
            isProcessing = true;
            addLog("The poison swamp slows your movement...");
            turnCount++;
            updateUI();
            try {
                await windGustSlide();
                await enemyTurn();
            } catch(err) {
                console.error('[turn ERROR]', err);
            } finally {
                try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); }
                moveFairies();
                moveMadmen();
                isProcessing = false;
            }
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            return;
        } else {
            player.poisonStagger = true;
        }
    } else {
        player.poisonStagger = false;
    }

    // ブロック設置モード（杖を持っている時のみ）
    if (player.hasWand && isSpacePressed && (dx !== 0 || dy !== 0)) {
        if (tryPlaceBlock(dx, dy)) {
            spaceUsedForBlock = true;
            isProcessing = true;
            turnCount++;
            updateUI();
            try {
                await windGustSlide();
                await enemyTurn();
            } catch(err) {
                console.error('[block turn ERROR]', err);
            } finally {
                try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); }
                moveFairies();
                moveMadmen();
                isProcessing = false;
            }
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
        }
        return;
    }

    // 杖なしでスペース+方向キー：移動しない（方向を無視してその場で防御）
    if (isSpacePressed && !player.hasWand && (dx !== 0 || dy !== 0)) {
        dx = 0; dy = 0;
    }

    isProcessing = true;
    player.isDefending = false; // アクション開始時に防御状態を解除

    // ドラゴン出現チェック
    if (floorLevel === 100 && !hasSpawnedDragon && dungeonCore) {
        const dist = Math.abs(player.x - dungeonCore.x) + Math.abs(player.y - dungeonCore.y);
        if (dist <= 6) {
            try { await triggerDragonSpawn(); } catch(err) { console.error('[dragon spawn ERROR]', err); } finally { isProcessing = false; }
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
            } else if (nx >= COLS && currentScreen.x < screenGridSize - 1 && player.y >= 11 && player.y <= 13) {
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
            } else if (ny >= ROWS && currentScreen.y < screenGridSize - 1 && player.x >= 18 && player.x <= 21) {
                // 下端 → 下の画面へ
                newScreenY = currentScreen.y + 1;
                newPlayerY = 0;
                newPlayerX = player.x;
                canTransition = true;
            }

            if (canTransition) {
                // 現在の画面データを保存（MADMANはmovingMadmenへ）
                const leavingMadmen = enemies.filter(e => e.type === 'MADMAN');
                leavingMadmen.forEach(m => movingMadmen.push({ ...m, screenX: currentScreen.x, screenY: currentScreen.y }));
                enemies = enemies.filter(e => e.type !== 'MADMAN');
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

                // 現在画面のtempWallsを保存してから新画面をロード
                if (screenGrid.tempWalls) screenGrid.tempWalls[currentScreen.y][currentScreen.x] = [...tempWalls];
                currentScreen.x = newScreenX;
                currentScreen.y = newScreenY;
                map = screenGrid.maps[newScreenY][newScreenX];
                enemies = screenGrid.enemies[newScreenY][newScreenX];
                wisps = screenGrid.wisps[newScreenY][newScreenX];
                // 新スクリーンに追跡中のMADMANがいれば即転入
                const arrivingMadmen = movingMadmen.filter(m => m.screenX === newScreenX && m.screenY === newScreenY);
                movingMadmen = movingMadmen.filter(m => !(m.screenX === newScreenX && m.screenY === newScreenY));
                enemies.push(...arrivingMadmen);
                isWindFloor = screenGrid.wind ? screenGrid.wind[newScreenY][newScreenX] : false;
                windTimer = 0;
                tempWalls = screenGrid.tempWalls ? [...(screenGrid.tempWalls[newScreenY][newScreenX] || [])] : [];

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

                if (isWindFloor) addLog("💨 Strong winds blow in this area!");

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
        breakStealth();
        player.offsetX = dx * 10; player.offsetY = dy * 10;
        spawnSlash(nx, ny);
        SOUNDS.HIT();
        addLog("You struck the Dungeon Core!");

        dungeonCore.hp--;
        if (dungeonCore.hp <= 0) {
            stopBGM();
            await triggerEnding();
            return;
        }

        // コアへの攻撃に対するドラゴンの反撃
        const dragon = enemies.find(e => e.type === 'DRAGON');
        if (dragon && (dungeonCore.hp === 10 || dungeonCore.hp === 5 || dungeonCore.hp === 1)) {
            const wave = dungeonCore.hp === 10 ? 1 : dungeonCore.hp === 5 ? 2 : 3;
            await dragonWaveAttack(wave);
        } else if (dragon) {
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
            try {
                await windGustSlide();
                await enemyTurn();
            } catch(err) {
                console.error('[turn ERROR]', err);
            } finally {
                try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); }
                moveFairies();
                moveMadmen();
                isProcessing = false;
            }
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
        }
        return;
    }

    const victim = enemies.find(e => {
        if (e.x === nx && e.y === ny) return true;
        if (e.type === 'SNAKE' || e.type === 'DRAGON' || e.type === 'SUMMONER') return (e.body && e.body.some(seg => seg.x === nx && seg.y === ny));
        return false;
    });

    // ブロックへの攻撃チェック
    const blockIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
    if (blockIdx !== -1 && !victim) {
        // 壁（ブロック）への攻撃
        const block = tempWalls[blockIdx];
        spawnSlash(nx, ny);
        SOUNDS.HIT();
        player.offsetX = dx * 10; player.offsetY = dy * 10;

        if (block.type === 'ICE_BLOCK') {
            // 氷ブロック: スライドしつつHPを1減らす（2回で破壊）
            block.hp--;
            if (block.hp <= 0) {
                tempWalls.splice(blockIdx, 1);
                addLog("The ice block shattered!");
                SOUNDS.DEFEAT();
            } else {
                await slideIceBlock(block, dx, dy);
                addLog("The ice block slides! (1 hit left)");
            }
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
            if (!transition.active) {
                turnCount++; updateUI();
                try { await windGustSlide(); await applyLaserDamage(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; }
                if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            }
            return;
        }

        if (block.type === 'ICE_STAR_BLOCK') {
            // 氷の星ブロック: スライド → 停止後に3方向炎発射 → 破壊
            SOUNDS.HIT();
            await slideIceBlock(block, dx, dy);
            // スライド停止後、後方(-dx,-dy)を除く3方向に炎発射
            const allDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
            for (const d of allDirs) {
                if (!(d.dx === -dx && d.dy === -dy)) {
                    launchFlameProjectile(block.x, block.y, d.dx, d.dy, true);
                }
            }
            tempWalls.splice(blockIdx, 1);
            addLog("❄* The ice star block explodes!");
            SOUNDS.EXPLODE();
            setScreenShake(12, 200);
            await moveFlameProjectiles();
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
            if (!transition.active) {
                turnCount++; updateUI();
                try { await windGustSlide(); await applyLaserDamage(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; }
                if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            }
            return;
        }

        if (block.type === 'BOMB_STAR_BLOCK') {
            // 爆弾星ブロック: 攻撃方向に爆弾を発射 → 着弾点で爆発
            tempWalls.splice(blockIdx, 1);
            addLog("💣* The bomb star block fires!");
            SOUNDS.DART_FIRE();
            await launchBombProjectile(nx, ny, dx, dy);
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
            if (!transition.active) {
                turnCount++; updateUI();
                try { await windGustSlide(); await applyLaserDamage(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; }
                if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            }
            return;
        }

        if (block.type === 'FIRE_BLOCK') {
            // 星ブロック: 攻撃方向に炎を発射 + HP減少（2回で破壊）
            if (block.fired) return; // 発射済みは無反応
            block.fired = true;
            block.hp--;
            SOUNDS.DART_FIRE();
            launchFlameProjectile(nx, ny, dx, dy);
            if (block.hp <= 0) {
                tempWalls.splice(blockIdx, 1);
                addLog("★ The star block shattered!");
                SOUNDS.DEFEAT();
            } else {
                addLog("★ Star block fires! (1 hit left)");
            }
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
            await new Promise(r => setTimeout(r, 200));
            player.offsetX = 0; player.offsetY = 0;
            if (!transition.active) {
                turnCount++; updateUI();
                try { await windGustSlide(); await applyLaserDamage(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; }
                if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            }
            return;
        }

        block.hp--;
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
            try {
                await windGustSlide();
                // ブロックが壊れた瞬間にレーザーが通る可能性があるので判定
                await applyLaserDamage();
                await enemyTurn();
            } catch(err) {
                console.error('[turn ERROR]', err);
            } finally {
                moveFairies();
                moveMadmen();
                isProcessing = false;
            }
            if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
        }
        return;
    }

    // 爆弾への攻撃チェック
    const bombAtIdx = bombs.findIndex(b => b.x === nx && b.y === ny);
    if (bombAtIdx !== -1 && !victim) {
        const bomb = bombs[bombAtIdx];
        spawnSlash(nx, ny);
        SOUNDS.HIT();
        player.offsetX = dx * 10; player.offsetY = dy * 10;

        if (bomb.isCorpse) {
            // 死体爆弾: 攻撃で即爆発
            addLog("💥 You struck the corpse — it detonated!");
            bomb.timer = 0;
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
            if (!transition.active) {
                turnCount++; updateUI();
                try { await windGustSlide(); await applyLaserDamage(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; }
                if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            }
            return;
        }

        if (bomb.isIce) {
            // 氷爆弾: スライドしつつHPを1減らす（2回で破壊）
            bomb.hp--;
            if (bomb.hp <= 0) {
                bombs.splice(bombAtIdx, 1);
                addLog("The ice bomb shattered without exploding!");
                SOUNDS.DEFEAT();
            } else {
                await slideIceBlock(bomb, dx, dy);
                addLog("The ice bomb slides! (1 hit left)");
            }
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
            await new Promise(r => setTimeout(r, 100));
            player.offsetX = 0; player.offsetY = 0;
            if (!transition.active) {
                turnCount++; updateUI();
                try { await windGustSlide(); await applyLaserDamage(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; }
                if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); }
            }
            return;
        }

        bomb.hp--;
        if (bomb.hp <= 0) {
            bombs.splice(bombAtIdx, 1);
            addLog("The bomb was disarmed!");
            SOUNDS.DEFEAT();
        } else {
            addLog("The bomb is cracked!");
        }

        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 20);
        await new Promise(r => setTimeout(r, 200));
        player.offsetX = 0; player.offsetY = 0;

        if (!transition.active) {
            turnCount++;
            updateUI();
            try {
                await windGustSlide();
                await applyLaserDamage();
                await enemyTurn();
            } catch(err) {
                console.error('[turn ERROR]', err);
            } finally {
                moveFairies();
                moveMadmen();
                isProcessing = false;
            }
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
        player.stamina = Math.min(100, player.stamina + (hasRing('GOLEM_RING') ? 10 : 20));
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
        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - (hasRing('STAMINA_RING') ? 12 : 20));
        player.offsetX = 0; player.offsetY = 0;
    } else {
        // 防御(dx=0,dy=0)は+50、移動は+20
        player.stamina = Math.min(100, player.stamina + (dx === 0 && dy === 0 ? (hasRing('GOLEM_RING') ? 25 : 50) : (hasRing('GOLEM_RING') ? 10 : 20)));

        // 商人への接触（壁扱いだが、隣接してEnterの代わりに方向キーで話しかける）
        if (map[ny][nx] === SYMBOLS.MERCHANT && !(merchantState && merchantState.dyingUntil)) {
            SOUNDS.GET_ITEM();
            if (shopStock.length === 0) {
                const unowned = RINGS.map((r, i) => i).filter(i => !player.ownedRings.includes(RINGS[i].id));
                const pool = unowned.length >= 3 ? unowned : RINGS.map((r, i) => i);
                const shuffled = pool.slice().sort(() => Math.random() - 0.5);
                const ringItems = shuffled.slice(0, 3).map(i => ({ type: 'ring', ringIndex: i, cost: RINGS[i].cost }));
                // 武器・防具の価格: 10Fは100G固定、他の階はランダム
                const equipCost = (floorLevel === 10) ? 100 : (80 + Math.floor(Math.random() * 121)); // 80-200G
                // 格安魔導書（序盤でも買える価格帯）
                const cheapTomePool = [
                    { tomeType: 'healTomes',    symbol: SYMBOLS.HEAL_TOME,    name: 'Heal Tome',    nameJa: '回復の魔導書',   descJa: 'HPを大きく回復する',             cost: 20 },
                    { tomeType: 'hasteTomes',   symbol: SYMBOLS.SPEED,        name: 'Haste Tome',   nameJa: '加速の魔導書',   descJa: '次のターン二回行動できる',       cost: 25 },
                    { tomeType: 'breakerTomes', symbol: SYMBOLS.BREAKER_TOME, name: 'Breaker Tome', nameJa: '壁砕きの魔導書', descJa: '一時的に壁を壊して進める',       cost: 30 },
                    { tomeType: 'stealthTomes', symbol: SYMBOLS.STEALTH,      name: 'Stealth Tome', nameJa: '隠身の魔導書',   descJa: '敵に気づかれにくくなる',         cost: 22 },
                ];
                const shuffledTomes = cheapTomePool.slice().sort(() => Math.random() - 0.5);
                const tomeItems = shuffledTomes.slice(0, 2).map(t => ({ type: 'tome', ...t }));
                shopStock = [
                    ...ringItems,
                    { type: 'sword', cost: equipCost },
                    { type: 'armor', cost: equipCost },
                    ...tomeItems,
                ];
            }
            // 商人がプレイヤーの方を向く
            if (merchantState) {
                merchantState.facing = (player.x < nx) ? 'LEFT' : 'RIGHT';
                merchantState.jumpUntil = performance.now() + 300;
            }
            // 商人の会話テキスト表示
            addLog("A stranded adventurer offers to trade!");
            updateUI();
            const showOnTop = player.y >= Math.floor(ROWS / 2);
            try {
                if (floorLevel === 10) {
                    // 10F: 固定テキスト
                    await showStoryPages([
                        ["傷ついた冒険者の男がいる。", "あなたを見て、おどろいた様子で話しかけてきた。"],
                        ["「おまえも、迷ったのか？", "なあ、金をくれよ。", "指輪と交換しようぜ」"]
                    ], false, showOnTop);
                } else {
                    // 他の階: ランダム会話パターン
                    merchantPatternIndex = Math.floor(Math.random() * MERCHANT_PATTERNS.length);
                    await showStoryPages(MERCHANT_PATTERNS[merchantPatternIndex].intro, false, showOnTop);
                }
                gameState = 'SHOP';
                shopSelection = 0;
            } catch(err) {
                console.error('[merchant story ERROR]', err);
                gameState = 'SHOP';
                shopSelection = 0;
            } finally {
                isProcessing = false;
            }
            return;
        }

        const isBlockedByWall = map[ny][nx] === SYMBOLS.WALL;
        const isBlockedByTempWall = tempWalls.some(w => w.x === nx && w.y === ny);
        const isBlockedByBomb = bombs.some(b => b.x === nx && b.y === ny);

        if (isBlockedByWall && !player.isBreaker && hasRing('BREAKER_RING') && player.stamina >= 100 && ny >= 1 && ny < ROWS - 1 && nx >= 1 && nx < COLS - 1) {
            // 壁壊しの指輪: スタミナ満タン時に壁を壊して進む（スタミナ全消費）
            map[ny][nx] = SYMBOLS.FLOOR;
            player.x = nx; player.y = ny;
            SOUNDS.WALL_BREAK();
            setScreenShake(8, 200);
            addLog("The Breaker Ring shattered the wall!");
            spawnFloatingText(nx, ny, "BREAK!", '#f59e0b');
            if (!player.isInfiniteStamina) player.stamina = 0;
            // Xステージ: 高確率でBOMBERが出現
            if (isXWallStage && Math.random() < 0.75) {
                spawnXFromWall(nx, ny);
            }
            if (!transition.active) { turnCount++; updateUI(); try { await windGustSlide(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; } if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); } }
            return;
        } else if (isBlockedByWall && player.isBreaker && ny >= 1 && ny < ROWS - 1 && nx >= 1 && nx < COLS - 1) {
            // 壁破壊の魔導書効果: 壁を壊して進む
            map[ny][nx] = SYMBOLS.FLOOR;
            player.x = nx; player.y = ny;
            SOUNDS.WALL_BREAK();
            setScreenShake(8, 200);
            addLog("You smashed through the wall!");
            spawnFloatingText(nx, ny, "BREAK!", '#f59e0b');
            if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - 10);
            // Xステージ: 高確率でBOMBERが出現
            if (isXWallStage && Math.random() < 0.75) {
                spawnXFromWall(nx, ny);
            }
            if (!transition.active) { turnCount++; updateUI(); try { await windGustSlide(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; } if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); } }
            return;
        } else if (isBlockedByWall || isBlockedByTempWall || isBlockedByBomb) {
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
                    if (!transition.active) { turnCount++; updateUI(); try { await windGustSlide(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; } if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); } }
                    return;
                } else {
                    addLog("The door is locked.");
                    player.offsetX = dx * 5; player.offsetY = dy * 5;
                    await new Promise(r => setTimeout(r, 50));
                    player.offsetX = 0; player.offsetY = 0;
                    if (!transition.active) { turnCount++; updateUI(); try { await windGustSlide(); await enemyTurn(); } catch(err) { console.error('[turn ERROR]', err); } finally { try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); } moveFairies(); moveMadmen(); isProcessing = false; } if (bufferedInput) { const b = bufferedInput; bufferedInput = null; handleAction(b.dx, b.dy); } }
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
                    // holdsKey敵ドロップの場合は元タイルを復元、通常配置はFLOOR
                    map[ny][nx] = keyDropUnderTile !== null ? keyDropUnderTile : SYMBOLS.FLOOR;
                    keyDropUnderTile = null;
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
                    spawnFloatingText(nx, ny, "HASTE TOME IDENTIFIED", "#38bdf8", 1500);
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
                    spawnFloatingText(nx, ny, "CHARM TOME IDENTIFIED", "#60a5fa", 1500);
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
                    spawnFloatingText(nx, ny, "STEALTH TOME IDENTIFIED", "#94a3b8", 1500);
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
                    spawnFloatingText(nx, ny, "EXPLOSION TOME IDENTIFIED", "#ef4444", 1500);
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
                    spawnFloatingText(nx, ny, "ESCAPE TOME IDENTIFIED", "#c084fc", 1500);
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
                    spawnFloatingText(nx, ny, "HEAL TOME IDENTIFIED", "#4ade80", 1500);
                } else if (nextTile === SYMBOLS.BREAKER_TOME) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    player.x = nx; player.y = ny;
                    updateUI();
                    await animateItemGet(SYMBOLS.TOME);
                    SOUNDS.GET_ITEM();
                    player.breakerTomes++;
                    if (!hasShownTomeTut) {
                        await triggerTomeEvent();
                    } else {
                        addLog("📜 YOU DECIPHERED: 'Breaker Tome'! (Key [7] to break walls)");
                    }
                    spawnFloatingText(nx, ny, "BREAKER TOME IDENTIFIED", "#f59e0b", 1500);
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
                        addLog("📜 YOU DECIPHERED: 'Guardian Tome'! (Key [4] to shield)");
                    }
                    spawnFloatingText(nx, ny, "GUARDIAN TOME IDENTIFIED", "#facc15", 1500);
                } else if (nextTile === SYMBOLS.RING) {
                    const ringDrop = ringDrops.find(r => r.x === nx && r.y === ny);
                    if (ringDrop) {
                        map[ny][nx] = SYMBOLS.FLOOR;
                        player.x = nx; player.y = ny;
                        const ringData = RINGS.find(r => r.id === ringDrop.ringId);
                        ringDrops = ringDrops.filter(r => !(r.x === nx && r.y === ny));
                        SOUNDS.GET_ITEM();
                        if (ringData && !player.ownedRings.includes(ringData.id)) {
                            player.ownedRings.push(ringData.id);
                            addLog(`💍 Found a ${ringData.name}! (${ringData.desc})`);
                            spawnFloatingText(nx, ny, `${ringData.nameJa}！`, "#fbbf24", 1800);
                        } else if (ringData) {
                            // 重複: ゴールドに変換
                            const bonus = ringData.cost;
                            player.gold += bonus;
                            addLog(`💍 Found a ${ringData.name}, but you already have one. Converted to ${bonus}G!`);
                            spawnFloatingText(nx, ny, `+${bonus}G`, "#fbbf24", 1500);
                        }
                        updateUI();
                    }
                } else if (nextTile === SYMBOLS.FAIRY) {
                    const mf = movingFairies.find(f => f.x === nx && f.y === ny && (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y)));
                    // 移動中（stopped=false）は拾えない
                    if (mf && !mf.stopped) {
                        // 拾わずそのまま通過（移動だけする）
                    } else {
                        // Bug2修正: underTileを復元（ICEならICEに戻す）
                        map[ny][nx] = (mf && mf.underTile != null) ? mf.underTile : SYMBOLS.FLOOR;
                        // 自律移動妖精リストからも除去
                        movingFairies = movingFairies.filter(f => !(f.x === nx && f.y === ny && (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y))));
                        player.x = nx; player.y = ny;
                        updateUI();
                        await animateItemGet(SYMBOLS.FAIRY);
                        SOUNDS.GET_ITEM();
                        player.fairyCount++;
                        if (!hasShownFairyTut) {
                            await triggerFairyEvent();
                        } else {
                            addLog("✨ You were joined by a FAIRY! ✨");
                        }
                        spawnFloatingText(nx, ny, "FAIRY JOINED", "#f472b6");
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
                // ミミックが擬態している偽の穴かチェック
                const mimicAtStairs = enemies.find(e => e.type === 'MIMIC' && e.disguised && e.x === nx && e.y === ny);
                if (mimicAtStairs) {
                    // 穴に見えたが実はミミック！擬態解除して戦闘開始
                    mimicAtStairs.disguised = false;
                    map[mimicAtStairs.y][mimicAtStairs.x] = SYMBOLS.FLOOR;
                    mimicAtStairs.mimicTransitionEnd = performance.now() + 500;
                    SOUNDS.MIMIC_REVEAL();
                    addLog("The hole suddenly attacks! It was a MIMIC!");
                    spawnFloatingText(nx, ny, "MIMIC!!", "#c084fc");
                    SOUNDS.ENEMY_ATTACK();
                    setScreenShake(10, 300);
                    // ミミックの先制攻撃
                    const mimicDmg = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                    player.hp -= mimicDmg;
                    player.flashUntil = performance.now() + 300;
                    spawnDamageText(player.x, player.y, mimicDmg, '#c084fc');
                    SOUNDS.DAMAGE();
                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                } else {
                    addLog("You fall into the dark hole...");
                    isPlayerVisible = false;
                    floorLevel++;
                    if (floorLevel >= DEEP_ENDING_FLOOR) { stopBGM(); await triggerEnding2(); return; }
                    await startFloorTransition();
                }
            }
        }
    }

    // 毒沼ダメージ（プレイヤー）- POISON_RING でスタミナ減少緩和
    if (map[player.y][player.x] === SYMBOLS.POISON && !player.isShielded) {
        breakStealth();
        player.hp -= 1;
        if (!player.isInfiniteStamina) player.stamina = Math.max(0, Math.floor(player.stamina * (hasRing('POISON_RING') ? 0.75 : 0.5)));
        player.flashUntil = performance.now() + 200;
        if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
        spawnDamageText(player.x, player.y, 1, '#a855f7');
        SOUNDS.DAMAGE();
        if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
    }

    // 溶岩ダメージ（プレイヤー）- FIRE_RING で無効化
    if (map[player.y][player.x] === SYMBOLS.LAVA && !player.isShielded && !hasRing('FIRE_RING')) {
        breakStealth();
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

    // ゴーレム（G）接近チュートリアル（2マス以内に初めて接近した時）
    if (!hasShownGolemTut && enemies.some(e => e.type === 'ORC' && e.hp > 0 &&
        Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= 2)) {
        await triggerGolemEvent();
    }

    // 4F BREAKERチュートリアル（前のターンにBREAKERが壁を壊したら次のアクション開始時に表示）
    if (pendingF4BreakerTutorial && !pendingF4Tutorial) {
        pendingF4BreakerTutorial = false;
        pendingF4Tutorial = true;
        await showStoryPages([
            [
                "The Wall Breakers are",
                "destroying the walls...",
                "",
                "ウォールブレイカーが",
                "壁を破壊している"
            ],
            [
                "They are reshaping",
                "the dungeon!",
                "",
                "こいつらが",
                "ダンジョンを作りかえている"
            ]
        ]);
    }

    // 炎の床（溶岩）ダメージと寿命管理
    for (let i = fireFloors.length - 1; i >= 0; i--) {
        const floor = fireFloors[i];
        if (floor.x === player.x && floor.y === player.y && !player.isShielded && !hasRing('FIRE_RING')) {
            breakStealth();
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
        player.isExtraTurn = false;

        turnCount++;
        updateUI();
        try {
            await windGustSlide();
            await enemyTurn();
        } catch(err) {
            console.error('[turn ERROR]', err);
        } finally {
            // moveWisps/moveFairies/moveMadmen は例外が起きても必ず実行する
            try { await moveWisps(); } catch(we) { console.error('[wisp ERROR]', we); }
            moveFairies();
            moveMadmen();
            isProcessing = false;
        }
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
        spawnDamageText(player.x, player.y, dmg, '#ededed');
        SOUNDS.DAMAGE();
        addLog("ZAP! Touched a Wisp!");
        if (player.hp <= 0) triggerGameOver();
    }

    // 敵との接触
    for (const e of [...enemies]) { // コピーを取る: handleEnemyDeath が enemies を再代入しても安全
        if (e._dead) continue; // 既に死亡処理済みならスキップ
        if (e.type === 'BREAKER') continue; // BREAKERはウィスプの影響を受けない
        if (e.type === 'BOMBER' && e.x === w.x && e.y === w.y) {
            // BOMBERはウィルに触れると即死 → 連鎖爆発
            e.hp = 0; e.flashUntil = performance.now() + 200;
            spawnFloatingText(w.x, w.y, "ZAP!", "#fff");
            await handleEnemyDeath(e, false, true);
            continue;
        }
        let hit = (e.x === w.x && e.y === w.y);
        if (!hit && e.type === 'SNAKE' && e.body) {
            hit = e.body.some(b => b.x === w.x && b.y === w.y);
        }
        if (hit) {
            const dmg = 20;
            e.hp -= dmg;
            e.flashUntil = performance.now() + 200;
            spawnDamageText(w.x, w.y, dmg, '#ededed');
            SOUNDS.DAMAGE();
            // 擬態中のミミックは一瞬だけ本性を見せる
            if (e.type === 'MIMIC' && e.disguised) {
                e.mimicWispFlashUntil = performance.now() + 350;
            }
            if (e.hp <= 0) {
                await handleEnemyDeath(e, false, true);
            }
        }
    }
}

// 妖精BFS: fMap内でstartからtargetまでの最短経路の第一歩を返す
// 妖精は飛行しているため、氷・溶岩・毒沼も1マスずつ通過可能（壁のみ通過不可）
function fairyBFS(fMap, startX, startY, targetX, targetY) {
    if (startX === targetX && startY === targetY) return { dx: 0, dy: 0 };
    // 妖精が通過できない「壁扱い」タイルのセット（壁・設置ブロックは通過不可）
    const fairyWall = new Set([SYMBOLS.WALL]);
    const tempWallSet = new Set(tempWalls.map(w => `${w.x},${w.y}`));
    const visited = new Uint8Array(ROWS * COLS);
    visited[startY * COLS + startX] = 1;
    const queue = [];
    const dirs4 = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    for (const d of dirs4) {
        const nx = startX + d.x, ny = startY + d.y;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        if (fairyWall.has(fMap[ny][nx])) continue;
        if (tempWallSet.has(`${nx},${ny}`)) continue;
        if (visited[ny * COLS + nx]) continue;
        visited[ny * COLS + nx] = 1;
        if (nx === targetX && ny === targetY) return { dx: d.x, dy: d.y };
        queue.push({ x: nx, y: ny, fdx: d.x, fdy: d.y });
    }
    let head = 0;
    while (head < queue.length) {
        const cur = queue[head++];
        for (const d of dirs4) {
            const nx = cur.x + d.x, ny = cur.y + d.y;
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
            if (fairyWall.has(fMap[ny][nx])) continue;
            if (tempWallSet.has(`${nx},${ny}`)) continue;
            if (visited[ny * COLS + nx]) continue;
            visited[ny * COLS + nx] = 1;
            if (nx === targetX && ny === targetY) return { dx: cur.fdx, dy: cur.fdy };
            queue.push({ x: nx, y: ny, fdx: cur.fdx, fdy: cur.fdy });
        }
    }
    return { dx: 0, dy: 0 }; // 経路なし
}

// 敵の落下処理を非同期で実行（ターン進行をブロックしない）
function useFairy() {
    if (player.fairyCount <= 0) { addLog("You have no fairy to release."); return; }

    // プレイヤー周辺（8方向）の通行可能タイルを探す
    const passable = new Set([SYMBOLS.FLOOR, SYMBOLS.ICE, SYMBOLS.LAVA, SYMBOLS.POISON, SYMBOLS.FIRE_FLOOR, SYMBOLS.GRASS]);
    const dirs8 = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0},{x:1,y:-1},{x:1,y:1},{x:-1,y:1},{x:-1,y:-1}];
    let fx = -1, fy = -1;
    for (const d of dirs8) {
        const nx = player.x + d.x, ny = player.y + d.y;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        if (!passable.has(map[ny][nx])) continue;
        if (enemies.some(e => e.x === nx && e.y === ny)) continue;
        if (movingFairies.some(f => f.x === nx && f.y === ny && f.screenX === -1)) continue;
        fx = nx; fy = ny; break;
    }
    if (fx < 0) {
        // 周囲が全部塞がれている場合はプレイヤーの上に置く
        fx = player.x; fy = player.y;
    }

    const under = map[fy][fx];
    map[fy][fx] = SYMBOLS.FAIRY;
    player.fairyCount--;

    if (multiScreenMode && screenGrid) {
        movingFairies.push({ x: fx, y: fy, screenX: currentScreen.x, screenY: currentScreen.y, underTile: under, surrounded: false, waitTurns: 3, stopped: false });
    } else {
        movingFairies.push({ x: fx, y: fy, screenX: -1, screenY: -1, underTile: under, surrounded: false, waitTurns: 3, stopped: false });
    }

    const hasKR = enemies.some(e => e.type === 'KEY_RUNNER' && e.holdsKey && e.hp > 0);
    addLog(hasKR ? "🧚 You released a FAIRY! It hunts the KEY RUNNER!" : "🧚 You released a FAIRY! It heads toward the KEY.");
    spawnFloatingText(fx, fy, "FAIRY RELEASED", "#f472b6");
    SOUNDS.GET_ITEM();
    updateUI();
}

function moveFairies() {
    if (movingFairies.length === 0) return;

    // ===== 通常フロア妖精（screenX === -1）の処理 =====
    const _passable = new Set([SYMBOLS.FLOOR, SYMBOLS.ICE, SYMBOLS.LAVA, SYMBOLS.POISON, SYMBOLS.FIRE_FLOOR, SYMBOLS.GRASS]);
    for (let i = movingFairies.length - 1; i >= 0; i--) {
        const f = movingFairies[i];
        if (f.screenX !== -1) continue;

        // プレイヤーと重なったら再取得（停止済みのみ取得可能）
        if (f.x === player.x && f.y === player.y && f.stopped) {
            if (map[f.y][f.x] === SYMBOLS.FAIRY) map[f.y][f.x] = f.underTile ?? SYMBOLS.FLOOR;
            movingFairies.splice(i, 1);
            player.fairyCount++;
            SOUNDS.GET_ITEM();
            spawnFloatingText(player.x, player.y, "FAIRY JOINED", "#f472b6");
            addLog("✨ A FAIRY returned to you! ✨");
            updateUI();
            continue;
        }

        // 壁解放検出: 四方が壁→通路が開いた瞬間に数ターン待機
        {
            const dirs4 = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
            const passNeighbors = dirs4.filter(d => {
                const nx = f.x + d.x, ny = f.y + d.y;
                return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && map[ny][nx] !== SYMBOLS.WALL;
            }).length;
            if (passNeighbors === 0) {
                f.surrounded = true;
            } else if (f.surrounded) {
                f.surrounded = false;
                f.waitTurns = 4;
            }
        }
        if (f.waitTurns > 0) f.waitTurns--;

        // 目標を探す（KEY_RUNNER最優先、次にKEY、DOOR、STAIRS）
        // MIMICが擬態しているSTAIRSは除外して本物の穴だけを目標にする
        let goalX = -1, goalY = -1, goalSym = null;
        const krTarget = enemies.find(e => e.type === 'KEY_RUNNER' && e.holdsKey && e.hp > 0);
        if (krTarget) {
            goalX = krTarget.x; goalY = krTarget.y; goalSym = 'KEY_RUNNER';
        } else {
            outerRF: for (const sym of [SYMBOLS.KEY, SYMBOLS.DOOR, SYMBOLS.STAIRS]) {
                for (let gy = 0; gy < ROWS; gy++) {
                    for (let gx = 0; gx < COLS; gx++) {
                        if (map[gy][gx] === sym && !(gx === f.x && gy === f.y) &&
                            !enemies.some(e => e.type === 'MIMIC' && e.disguised && e.x === gx && e.y === gy)) {
                            goalX = gx; goalY = gy; goalSym = sym; break outerRF;
                        }
                    }
                }
            }
        }
        if (goalX < 0) continue;

        // KEY_RUNNER以外: 目標の1マス手前で停止（stopped = true → 取得可能・点滅終了）
        if (goalSym !== 'KEY_RUNNER' && Math.abs(f.x - goalX) + Math.abs(f.y - goalY) <= 1) {
            f.stopped = true;
            continue;
        }
        // まだ移動中（stopped = false → 取得不可・点滅中）
        f.stopped = false;

        // BFSで次の一歩を計算
        const { dx: bestDX, dy: bestDY } = fairyBFS(map, f.x, f.y, goalX, goalY);

        // KEY_RUNNER以外: 目標タイル自体への踏み込みは避ける
        if (goalSym !== 'KEY_RUNNER' && f.x + bestDX === goalX && f.y + bestDY === goalY) continue;

        if (bestDX !== 0 || bestDY !== 0) {
            // 設置ブロック（tempWall）には進まない（BFSで避けているが念のため）
            if (tempWalls.some(w => w.x === f.x + bestDX && w.y === f.y + bestDY)) continue;
            if (map[f.y][f.x] === SYMBOLS.FAIRY) map[f.y][f.x] = f.underTile ?? SYMBOLS.FLOOR;
            f.x += bestDX; f.y += bestDY;
            const prev = map[f.y][f.x];
            const isDisguisedMimicTile = prev === SYMBOLS.STAIRS &&
                enemies.some(e => e.type === 'MIMIC' && e.disguised && e.x === f.x && e.y === f.y);
            if (prev !== SYMBOLS.KEY && (prev !== SYMBOLS.STAIRS || isDisguisedMimicTile) && prev !== SYMBOLS.FAIRY)
                map[f.y][f.x] = SYMBOLS.FAIRY;
            // アイテム（剣・鎧・魔導書等）も underTile に正しく保存する
            // 壁と妖精自身以外はすべて保存（_passable に限定しない）
            f.underTile = (prev !== SYMBOLS.WALL && prev !== SYMBOLS.FAIRY) ? prev : SYMBOLS.FLOOR;

            // 移動後にプレイヤーと重なったら即取得（移動直後はstopped=falseなので取得不可）
            if (f.stopped && f.x === player.x && f.y === player.y) {
                if (map[f.y][f.x] === SYMBOLS.FAIRY) map[f.y][f.x] = f.underTile ?? SYMBOLS.FLOOR;
                movingFairies.splice(i, 1);
                player.fairyCount++;
                SOUNDS.GET_ITEM();
                spawnFloatingText(player.x, player.y, "FAIRY JOINED", "#f472b6");
                addLog("✨ A FAIRY returned to you! ✨");
                updateUI();
            }
        }
    }

    if (!multiScreenMode || !screenGrid) return;

    // 妖精がマップタイルを上書きするとき、元のタイルを退避して後で復元するヘルパー
    const fairyLeave = (fMap, fx, fy, underTile) => {
        if (fMap && fMap[fy][fx] === SYMBOLS.FAIRY)
            fMap[fy][fx] = (underTile != null) ? underTile : SYMBOLS.FLOOR;
    };
    // 妖精が新しいタイルへ到着: 氷・溶岩・毒沼などの上も飛行でそのまま通過
    const _fairyPassable = new Set([
        SYMBOLS.FLOOR, SYMBOLS.ICE, SYMBOLS.LAVA, SYMBOLS.POISON,
        SYMBOLS.FIRE_FLOOR, SYMBOLS.GRASS,
    ]);
    const fairyArrive = (fMap, fx, fy) => {
        if (!fMap) return SYMBOLS.FLOOR;
        const prev = fMap[fy][fx];
        // KEY・STAIRS・FAIRY 以外のタイルはFAIRYで上書き（通過可能タイル全て対応）
        if (prev !== SYMBOLS.KEY && prev !== SYMBOLS.STAIRS && prev !== SYMBOLS.FAIRY)
            fMap[fy][fx] = SYMBOLS.FAIRY;
        // underTileとして保存: 壁・FAIRY以外はアイテム含めてすべて保存（消失防止）
        if (prev === SYMBOLS.KEY || prev === SYMBOLS.STAIRS) return SYMBOLS.FLOOR;
        return (prev !== SYMBOLS.WALL && prev !== SYMBOLS.FAIRY) ? prev : SYMBOLS.FLOOR;
    };

    // 妖精ごとに目標を計算するヘルパー（自分の位置を除外してキー優先・なければ出口）
    const findGoalForFairy = (fairy) => {
        // KEY_RUNNER最優先: 全画面のscreenGrid.enemiesを検索
        for (let sy = 0; sy < screenGridSize; sy++) {
            for (let sx = 0; sx < screenGridSize; sx++) {
                const scrEnemies = (sx === currentScreen.x && sy === currentScreen.y)
                    ? enemies
                    : (screenGrid.enemies[sy][sx] || []);
                const kr = scrEnemies.find(e => e.type === 'KEY_RUNNER' && e.holdsKey && e.hp > 0);
                if (kr) return { gx: sx * COLS + kr.x, gy: sy * ROWS + kr.y, sym: 'KEY_RUNNER' };
            }
        }
        const searchSymbols = [SYMBOLS.KEY, SYMBOLS.DOOR, SYMBOLS.STAIRS];
        for (const sym of searchSymbols) {
            let gx = -1, gy = -1;
            outer: for (let sy = 0; sy < screenGridSize; sy++) {
                for (let sx = 0; sx < screenGridSize; sx++) {
                    const m = (sx === currentScreen.x && sy === currentScreen.y) ? map : screenGrid.maps[sy][sx];
                    if (!m) continue;
                    for (let fy2 = 0; fy2 < ROWS; fy2++) {
                        for (let fx2 = 0; fx2 < COLS; fx2++) {
                            if (m[fy2][fx2] !== sym) continue;
                            // 自分がすでにそのタイルにいる場合はスキップ（立ち止まり防止）
                            if (sx === fairy.screenX && sy === fairy.screenY && fx2 === fairy.x && fy2 === fairy.y) continue;
                            // MIMICが擬態しているSTAIRSは除外（現在画面のみ判定）
                            if (sx === currentScreen.x && sy === currentScreen.y &&
                                enemies.some(e => e.type === 'MIMIC' && e.disguised && e.x === fx2 && e.y === fy2)) continue;
                            gx = sx * COLS + fx2; gy = sy * ROWS + fy2; break outer;
                        }
                    }
                }
            }
            if (gx >= 0) return { gx, gy, sym };
        }
        return { gx: -1, gy: -1, sym: null };
    };

    const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
    const PASS_Y = 12, PASS_X = 19;

    for (let i = movingFairies.length - 1; i >= 0; i--) {
        const f = movingFairies[i];
        if (f.underTile == null) f.underTile = SYMBOLS.FLOOR; // 初回初期化
        const isCurrentScreen = (f.screenX === currentScreen.x && f.screenY === currentScreen.y);
        const fMap = isCurrentScreen ? map : screenGrid.maps[f.screenY][f.screenX];
        if (!fMap) continue;

        // ---- 画面越え: 通路端にいたら即転送 ----
        let crossed = false;
        if (f.x === 0 && f.screenX > 0 && f.y >= 11 && f.y <= 13) {
            fairyLeave(fMap, f.x, f.y, f.underTile);
            f.screenX--; f.x = COLS - 2; crossed = true;
        } else if (f.x === COLS - 1 && f.screenX < screenGridSize - 1 && f.y >= 11 && f.y <= 13) {
            fairyLeave(fMap, f.x, f.y, f.underTile);
            f.screenX++; f.x = 1; crossed = true;
        } else if (f.y === 0 && f.screenY > 0 && f.x >= 18 && f.x <= 21) {
            fairyLeave(fMap, f.x, f.y, f.underTile);
            f.screenY--; f.y = ROWS - 2; crossed = true;
        } else if (f.y === ROWS - 1 && f.screenY < screenGridSize - 1 && f.x >= 18 && f.x <= 21) {
            fairyLeave(fMap, f.x, f.y, f.underTile);
            f.screenY++; f.y = 1; crossed = true;
        }

        if (crossed) {
            const nMap = (f.screenX === currentScreen.x && f.screenY === currentScreen.y) ? map : screenGrid.maps[f.screenY][f.screenX];
            f.underTile = fairyArrive(nMap, f.x, f.y);
        }

        // ---- プレイヤーと重なったら取得（停止済みのみ取得可能）----
        if (isCurrentScreen && f.x === player.x && f.y === player.y && f.stopped) {
            fairyLeave(fMap, f.x, f.y, f.underTile);
            movingFairies.splice(i, 1);
            player.fairyCount++;
            SOUNDS.GET_ITEM();
            spawnFloatingText(player.x, player.y, "FAIRY JOINED", "#f472b6");
            addLog("✨ You were joined by a FAIRY! ✨");
            updateUI();
            continue;
        }

        // ---- 壁解放検出: 四方が壁→通路が開いた瞬間に数ターン待機 ----
        {
            const checkMap = isCurrentScreen ? map : screenGrid.maps[f.screenY][f.screenX];
            if (checkMap) {
                const dirs4 = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
                const passNeighbors = dirs4.filter(d => {
                    const nx = f.x + d.x, ny = f.y + d.y;
                    return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && checkMap[ny][nx] !== SYMBOLS.WALL;
                }).length;
                if (passNeighbors === 0) {
                    f.surrounded = true;
                } else if (f.surrounded) {
                    f.surrounded = false;
                    f.waitTurns = 4;
                }
            }
        }
        if (f.waitTurns > 0) f.waitTurns--;

        // ---- 1マス移動: 壁以外はすべてすり抜ける ----
        const curFMap = (f.screenX === currentScreen.x && f.screenY === currentScreen.y) ? map : screenGrid.maps[f.screenY][f.screenX];
        if (!curFMap) continue;

        // この妖精専用のゴールを計算（自分の位置は除外して立ち止まり防止）
        const { gx: goalGX, gy: goalGY, sym: goalSym } = findGoalForFairy(f);
        if (goalGX < 0) continue; // 目標なし

        const goalSX = Math.floor(goalGX / COLS), goalSY = Math.floor(goalGY / ROWS);
        const goalLocalX = goalGX % COLS, goalLocalY = goalGY % ROWS;

        // KEY_RUNNER以外: KEY・DOOR・STAIRS が目標かつ同じ画面なら1マス隣で停止
        if (goalSym !== 'KEY_RUNNER' && (goalSym === SYMBOLS.KEY || goalSym === SYMBOLS.DOOR || goalSym === SYMBOLS.STAIRS) && f.screenX === goalSX && f.screenY === goalSY) {
            const distToGoal = Math.abs(f.x - goalLocalX) + Math.abs(f.y - goalLocalY);
            if (distToGoal <= 1) { f.stopped = true; continue; } // 停止 → 取得可能・点滅終了
        }
        f.stopped = false; // 移動中 → 取得不可・点滅中

        let targetX, targetY;
        if (f.screenX === goalSX && f.screenY === goalSY) {
            targetX = goalLocalX; targetY = goalLocalY;
        } else {
            const dx = goalSX - f.screenX, dy = goalSY - f.screenY;
            if (Math.abs(dx) >= Math.abs(dy)) {
                targetX = dx > 0 ? COLS - 1 : 0; targetY = PASS_Y;
            } else {
                targetX = PASS_X; targetY = dy > 0 ? ROWS - 1 : 0;
            }
        }

        // BFSで障害物（壁）を避けながら最短経路の第一歩を取得
        const { dx: bestDX, dy: bestDY } = fairyBFS(curFMap, f.x, f.y, targetX, targetY);

        // KEY_RUNNER以外: KEY・DOOR・STAIRSが目標の場合、そのタイル自体には踏み込まない
        if (goalSym !== 'KEY_RUNNER' && (goalSym === SYMBOLS.KEY || goalSym === SYMBOLS.DOOR || goalSym === SYMBOLS.STAIRS) && f.screenX === goalSX && f.screenY === goalSY) {
            const nx = f.x + bestDX, ny = f.y + bestDY;
            if (nx === goalLocalX && ny === goalLocalY) continue;
        }

        if (bestDX !== 0 || bestDY !== 0) {
            fairyLeave(curFMap, f.x, f.y, f.underTile);
            f.x += bestDX; f.y += bestDY;
            const newMap = (f.screenX === currentScreen.x && f.screenY === currentScreen.y) ? map : screenGrid.maps[f.screenY][f.screenX];
            f.underTile = fairyArrive(newMap, f.x, f.y);

            // 移動後にプレイヤーと重なったら即取得（移動直後はstopped=falseなので取得不可）
            if (f.stopped && f.screenX === currentScreen.x && f.screenY === currentScreen.y && f.x === player.x && f.y === player.y) {
                fairyLeave(newMap, f.x, f.y, f.underTile);
                movingFairies.splice(i, 1);
                player.fairyCount++;
                SOUNDS.GET_ITEM();
                spawnFloatingText(player.x, player.y, "FAIRY JOINED", "#f472b6");
                addLog("✨ You were joined by a FAIRY! ✨");
                updateUI();
            }
        }
    }
}

function moveMadmen() {
    if (!multiScreenMode || !screenGrid || movingMadmen.length === 0) return;

    const PASS_Y = 12, PASS_X = 19;
    const dirs = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

    for (let i = movingMadmen.length - 1; i >= 0; i--) {
        const m = movingMadmen[i];

        // ---- 画面越え: 通路端にいたら転送（妖精と同じロジック）----
        if (m.x === 0 && m.screenX > 0 && m.y >= 11 && m.y <= 13)
            { m.screenX--; m.x = COLS - 2; }
        else if (m.x === COLS - 1 && m.screenX < screenGridSize - 1 && m.y >= 11 && m.y <= 13)
            { m.screenX++; m.x = 1; }
        else if (m.y === 0 && m.screenY > 0 && m.x >= 18 && m.x <= 21)
            { m.screenY--; m.y = ROWS - 2; }
        else if (m.y === ROWS - 1 && m.screenY < screenGridSize - 1 && m.x >= 18 && m.x <= 21)
            { m.screenY++; m.y = 1; }

        // プレイヤーのいるスクリーンに到達 → enemiesに転送
        if (m.screenX === currentScreen.x && m.screenY === currentScreen.y) {
            movingMadmen.splice(i, 1);
            enemies.push(m);
            spawnFloatingText(m.x, m.y, "!!!", '#ef4444');
            addLog("The MADMAN has caught up to this room!");
            continue;
        }

        // ---- 1マス移動: プレイヤースクリーンへ向かう ----
        const mMap = screenGrid.maps[m.screenY][m.screenX];
        if (!mMap) continue;

        const goalSX = currentScreen.x, goalSY = currentScreen.y;
        let targetX, targetY;
        const dx = goalSX - m.screenX, dy = goalSY - m.screenY;
        if (Math.abs(dx) >= Math.abs(dy)) {
            targetX = dx > 0 ? COLS - 1 : 0; targetY = PASS_Y;
        } else {
            targetX = PASS_X; targetY = dy > 0 ? ROWS - 1 : 0;
        }

        let bestDist = Math.abs(m.x - targetX) + Math.abs(m.y - targetY);
        let bestDX = 0, bestDY = 0;
        for (const d of dirs) {
            const nx = m.x + d.x, ny = m.y + d.y;
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
            if (mMap[ny][nx] === SYMBOLS.WALL) continue;
            const nd = Math.abs(nx - targetX) + Math.abs(ny - targetY);
            if (nd < bestDist) { bestDist = nd; bestDX = d.x; bestDY = d.y; }
        }
        m.x += bestDX; m.y += bestDY;
    }
}

function scheduleEnemyFall(enemy, msg, killedByPlayer = false) {
    enemy.isFalling = true;
    enemy.hp = 0; // 落下直後から行動・攻撃を無効化
    addLog(msg);
    SOUNDS.FALL_WHIZ();
    setTimeout(() => { handleEnemyDeath(enemy, killedByPlayer); }, 400);
}

async function handleEnemyDeath(enemy, killedByPlayer = false, killedByWisp = false) {
    if (enemy._dead) return; // 二重処理防止
    enemy._dead = true;

    SOUNDS.DEFEAT();

    // ミミックが擬態中に死んだ場合、マップタイルを床に戻す
    if (enemy.type === 'MIMIC' && enemy.disguised) {
        map[enemy.y][enemy.x] = SYMBOLS.FLOOR;
    }

    // キーホルダー: 死亡時にその場にキーを落とす（元タイルを保存して上書き）
    if (enemy.holdsKey) {
        keyDropUnderTile = map[enemy.y][enemy.x]; // ICE/LAVA等を記憶
        map[enemy.y][enemy.x] = SYMBOLS.KEY;
        addLog("🔑 The thief dropped the key!");
        spawnFloatingText(enemy.x, enemy.y, "KEY DROP!", "#fbbf24");
        playMelody([
            { f: 880, d: 0.1 }, { f: 1108, d: 0.1 }, { f: 1320, d: 0.2 }
        ]);
    }

    // BOMBERが死んだ場合: 死体が3ターン後に爆発（穴落下時はそのまま消える）
    if (enemy.type === 'BOMBER') {
        if (!enemy.isFalling && !isRealHole(enemy.x, enemy.y)) {
            bombs.push({ x: enemy.x, y: enemy.y, timer: 3, hp: 3, isCorpse: true });
            addLog("💀 BOMBER's corpse will explode in 3 turns!");
        }
    }

    // ドラゴン撃破時にBGMを停止
    if (enemy.type === 'DRAGON') {
        stopBGM();
    }

    // 狂人が死んだ場合: 最後の叫び
    if (enemy.type === 'MADMAN') {
        const lastWords = ["「…ここから、出してくれ……」", "「…ありがとう……やっと……」", "「…俺は、どこにいる……」"];
        addLog(lastWords[Math.floor(Math.random() * lastWords.length)]);
    }

    // 召喚師が死んだ場合: 召喚された敵のリファレンスを解除
    if (enemy.type === 'SUMMONER') {
        enemies.forEach(e => {
            if (e.summonedBy === enemy) e.summonedBy = null;
        });
    }

    // KINGが死んだ場合: 残存する全ての敵がパニックになって逃げ出す
    if (enemy.type === 'KING') {
        playMelody([
            { f: 880, d: 0.12 }, { f: 740, d: 0.12 }, { f: 622, d: 0.12 },
            { f: 494, d: 0.3 }
        ]);
        addLog("👑 The King has fallen! His followers flee in panic!");
        enemies.forEach(e => {
            if (!e._dead && e.hp > 0) {
                e.flee = true;
                spawnFloatingText(e.x, e.y, "PANIC!", '#fbbf24');
            }
        });
        setScreenShake(12, 400);
    }

    enemies = enemies.filter(e => e !== enemy);

    // 88階: 全サモナー撃破で穴の周囲の壁が消滅（演出付き）
    if (enemy.type === 'SUMMONER' && floorLevel === 88) {
        const remainingSummoners = enemies.filter(e => e.type === 'SUMMONER' && e.hp > 0);
        if (remainingSummoners.length === 0) {
            const hx = Math.floor(COLS / 2) - 1;
            const hy = 4;
            // ぴろりろりーん（上昇メロディ）
            playMelody([
                { f: 659.25, d: 0.12 }, { f: 783.99, d: 0.12 },
                { f: 987.77, d: 0.12 }, { f: 1174.66, d: 0.12 },
                { f: 1318.51, d: 0.3 }
            ]);
            addLog("The seal around the hole has been broken!");
            // ブロックを1個ずつ演出付きで消す
            const blocks = [
                { x: hx - 1, y: hy },  // 左
                { x: hx + 1, y: hy },  // 右
                { x: hx, y: hy + 1 }   // 下
            ];
            blocks.forEach((b, i) => {
                setTimeout(() => {
                    if (map[b.y][b.x] === SYMBOLS.WALL) {
                        map[b.y][b.x] = SYMBOLS.FLOOR;
                    }
                    playSound(1200 + i * 200, 'square', 0.08, 0.15);
                    spawnFloatingText(b.x, b.y, "BREAK!", "#fbbf24");
                    setScreenShake(8, 200);
                }, 600 + i * 400);
            });
            // 最後にUNSEALED!表示
            setTimeout(() => {
                spawnFloatingText(hx, hy, "UNSEALED!", "#fbbf24");
            }, 600 + blocks.length * 400);
        }
    }

    if (killedByPlayer || killedByWisp) {
        if (killedByPlayer) player.totalKills++;
        const _baseExp = enemy.type === 'NORMAL'
            ? (enemy.expValue || 5) * 2   // E(通常敵)は基本経験値2倍
            : (enemy.expValue || 5);
        const _floorBonus = Math.floor(floorLevel / 5); // 5F毎に+1（深層ボーナス）
        gainExp(_baseExp + _floorBonus);

        // ゴールドドロップ
        let goldDrop = 0;
        switch (enemy.type) {
            case 'ENEMY': goldDrop = 5 + Math.floor(Math.random() * 6); break; // 5-10
            case 'ORC': goldDrop = 10 + Math.floor(Math.random() * 11); break; // 10-20
            case 'TURRET': goldDrop = 15; break;
            case 'HOPPER_TURRET': goldDrop = 20; break;
            case 'LAYER': goldDrop = 12; break;
            case 'BREAKER': goldDrop = 20; break;
            case 'MIMIC': goldDrop = 25; break;
            case 'FAIRY_MIMIC': goldDrop = 30; break;
            case 'SUMMONER': goldDrop = 30; break;
            case 'DRAGON': goldDrop = 50; break;
            case 'GOLD': goldDrop = 100; break;
            case 'SNAKE': goldDrop = 15 + Math.floor(Math.random() * 6); break;
            case 'FROST': case 'BLAZE': goldDrop = 8 + Math.floor(Math.random() * 8); break;
            case 'BOMBER': goldDrop = 8 + Math.floor(Math.random() * 8); break;
            default: goldDrop = 3 + Math.floor(Math.random() * 5); break;
        }
        if (goldDrop > 0) {
            player.gold += goldDrop;
            spawnFloatingText(enemy.x, enemy.y, `+${goldDrop}G`, "#fbbf24");
        }

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

    // NECRO_RING: プレイヤーが倒した敵を仲間として蘇らせる
    if (killedByPlayer && hasRing('NECRO_RING') && !enemy.isAlly && !enemy.isFalling) {
        const necroExclude = ['DRAGON', 'GOLD', 'KING', 'SNAKE', 'MIMIC', 'FAIRY_MIMIC'];
        if (!necroExclude.includes(enemy.type)) {
            const revivedHp = Math.max(1, Math.floor(enemy.maxHp * 0.5));
            const revived = {
                type: enemy.type, x: enemy.x, y: enemy.y,
                hp: revivedHp, maxHp: revivedHp,
                flashUntil: performance.now() + 600,
                offsetX: 0, offsetY: 0,
                expValue: 0, stunTurns: 0,
                isAlly: true, _necroRevived: true
            };
            if (enemy.type === 'TURRET' || enemy.type === 'HOPPER_TURRET') revived.dir = enemy.dir || 0;
            enemies.push(revived);
            spawnFloatingText(enemy.x, enemy.y, "REVIVED!", "#c084fc");
            addLog(`💍 Necro Ring: The ${enemy.type} rises as your ally!`);
        }
    }

    // 100階のORC: 撃破者問わず20%の確率でランダムな魔導書をドロップ
    if (enemy.type === 'ORC' && floorLevel === 100 && Math.random() < 0.2) {
        const tomePool = [
            SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH,
            SYMBOLS.HEAL_TOME, SYMBOLS.EXPLOSION, SYMBOLS.BREAKER_TOME
        ];
        const dropped = tomePool[Math.floor(Math.random() * tomePool.length)];
        if (map[enemy.y][enemy.x] === SYMBOLS.FLOOR) {
            map[enemy.y][enemy.x] = dropped;
            spawnFloatingText(enemy.x, enemy.y, "TOME DROP!", "#c084fc");
            addLog("The Orc dropped a tome!");
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
    // BREAKERは攻撃無効だが、殴られた方向へ逃げる（3〜5マス直進）
    if (enemy.type === 'BREAKER') {
        spawnSlash(player.x + dx, player.y + dy);
        SOUNDS.HIT();
        if (isMain) { player.offsetX = dx * 10; player.offsetY = dy * 10; }
        spawnFloatingText(enemy.x, enemy.y, "IMMUNE!", '#f59e0b');
        if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - (hasRing('STAMINA_RING') ? 12 : 20));
        draw(); await new Promise(r => setTimeout(r, 100));
        if (isMain) { player.offsetX = 0; player.offsetY = 0; }
        // プレイヤーと反対方向へ進行方向をセット（3〜5ターン維持）
        const allDirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        const fleeIdx = allDirs.findIndex(d => d.x === dx && d.y === dy);
        if (fleeIdx !== -1) {
            enemy.breakerDir = fleeIdx;
            enemy.breakerForcedTurns = 3 + Math.floor(Math.random() * 3); // 3〜5ターン直進
        }
        return;
    }
    // 眠り状態の敵を攻撃 → 同じsleepGroupの全員を覚醒
    if (enemy.sleeping) {
        enemy.sleeping = false;
        if (enemy.sleepGroup != null) {
            let woken = 0;
            enemies.forEach(e => {
                if (e !== enemy && e.sleepGroup === enemy.sleepGroup && e.sleeping) {
                    e.sleeping = false;
                    woken++;
                }
            });
            if (woken > 0) {
                addLog(`The Orcs wake up in a rage! (${woken} more roused)`);
                spawnFloatingText(enemy.x, enemy.y, "AWAKENED!", "#f97316");
            }
        }
    }

    spawnSlash(player.x + dx, player.y + dy); if (isMain) SOUNDS.HIT();
    if (isMain) { player.offsetX = dx * 10; player.offsetY = dy * 10; }
    const staminaFactor = Math.max(0.1, player.stamina / 100);
    let damage = Math.max(1, Math.floor((2 + player.level + (player.swordCount * 3)) * staminaFactor));
    let isCritical = Math.random() < (hasRing('CRITICAL_RING') ? 0.20 : 0.10); // かいしんの一撃

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
        addLog("✨ CRITICAL HIT! ✨");
        spawnFloatingText(player.x + dx, player.y + dy, "CRITICAL!!", "#fbbf24");
    }

    // 金色敵（メタルスライム風）はダメージを1に固定
    if (enemy.type === 'GOLD') damage = isCritical ? 3 : 1;

    // KING's aura: KINGが生存中は非KING敵へのダメージを軽減（王の守護）
    if (enemy.type !== 'KING' && enemies.some(e => e.type === 'KING' && e.hp > 0 && !e._dead)) {
        damage = Math.max(1, damage - 2);
        spawnFloatingText(enemy.x, enemy.y, "GUARD!", '#fbbf24');
    }

    // フェアリーミミックの正体暴露（攻撃時）
    if (enemy.type === 'FAIRY_MIMIC' && enemy.disguised) {
        enemy.disguised = false;
        enemy.mimicTransitionEnd = performance.now() + 500;
        SOUNDS.MIMIC_REVEAL();
        addLog("It was a FAKE FAIRY! A MIMIC!");
        spawnFloatingText(enemy.x, enemy.y, "FAKE FAIRY!!", "#f472b6");
        setScreenShake(8, 200);
    }

    // ミミックの正体暴露
    if (enemy.type === 'MIMIC' && enemy.disguised) {
        enemy.disguised = false;
        map[enemy.y][enemy.x] = SYMBOLS.FLOOR;
        enemy.mimicTransitionEnd = performance.now() + 500;
        SOUNDS.MIMIC_REVEAL();
        addLog("The hole was a MIMIC!");
        spawnFloatingText(enemy.x, enemy.y, "MIMIC!!", "#c084fc");
        setScreenShake(8, 200);
    }

    enemy.hp -= damage; enemy.flashUntil = performance.now() + 200;
    spawnDamageText(player.x + dx, player.y + dy, damage, isCritical ? '#fbbf24' : '#f87171');
    const _staminaBeforeAttack = player.stamina; // GOLEM_RING判定用に攻撃前スタミナを保存
    if (!player.isInfiniteStamina) player.stamina = Math.max(0, player.stamina - (hasRing('STAMINA_RING') ? 12 : 20));

    // タレットのノックバック・スライド処理
    if ((enemy.type === 'TURRET' || enemy.type === 'HOPPER_TURRET') && enemy.hp > 0) {
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

                if (isRealHole(enemy.x, enemy.y)) {
                    scheduleEnemyFall(enemy, "The Turret slid into the HOLE!");
                    break;
                }
                await new Promise(r => setTimeout(r, 40));
            }

            // 移動後の落下チェック
            if (!enemy._dead && isRealHole(enemy.x, enemy.y)) {
                scheduleEnemyFall(enemy, "The Turret fell into the HOLE!");
            }
        }
    }

    setTimeout(() => { animateBounce(enemy); }, 50);
    await new Promise(r => setTimeout(r, 100));
    player.offsetX = 0; player.offsetY = 0;

    // KNOCKBACK_RING: 攻撃後に敵を1マス押し戻す
    // スタミナ満タン時: ORC含む全対象・穴への落下も発生
    if (hasRing('KNOCKBACK_RING') && enemy.hp > 0 && enemy.type !== 'TURRET' && enemy.type !== 'HOPPER_TURRET' && enemy.type !== 'SNAKE' && enemy.type !== 'DRAGON' && enemy.type !== 'SUMMONER') {
        const _kbFullStamina = _staminaBeforeAttack >= 100;
        if (_kbFullStamina || enemy.type !== 'ORC') {
            const kbx = enemy.x + dx;
            const kby = enemy.y + dy;
            if (_kbFullStamina && isRealHole(kbx, kby)) {
                spawnFloatingText(enemy.x, enemy.y, "KNOCKBACK!", "#38bdf8");
                SOUNDS.HIT();
                scheduleEnemyFall(enemy, `Knocked ${enemy.type} into the hole!`, true);
            } else if (canEnemyMove(kbx, kby, enemy)) {
                enemy.x = kbx;
                enemy.y = kby;
                spawnFloatingText(kbx, kby, "KNOCKBACK!", "#38bdf8");
                SOUNDS.HIT();
                draw();
                await new Promise(r => setTimeout(r, 120));
            }
        }
    }

    // GOLEM_RING: スタミナ満タン時の攻撃でORC（G）と同じ突き飛ばし
    if (hasRing('GOLEM_RING') && enemy.hp > 0 && _staminaBeforeAttack >= 100) {
        const _golemNoKB = ['TURRET', 'HOPPER_TURRET', 'SNAKE', 'DRAGON'];
        if (!_golemNoKB.includes(enemy.type)) {
            spawnFloatingText(enemy.x, enemy.y, "GOLEM SMASH!", "#f97316");
            SOUNDS.FATAL();
            let kx = dx, ky = dy;
            const _isHardWall = (tx, ty) => {
                if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
                return (map[ty][tx] === SYMBOLS.WALL || map[ty][tx] === SYMBOLS.DOOR || map[ty][tx] === SYMBOLS.CORE);
            };
            // 背後が壁なら別方向を探す
            if (_isHardWall(enemy.x + kx, enemy.y + ky)) {
                const cands = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
                for (let ci = cands.length - 1; ci > 0; ci--) {
                    const cj = Math.floor(Math.random() * (ci + 1));
                    [cands[ci], cands[cj]] = [cands[cj], cands[ci]];
                }
                for (const c of cands) {
                    if (enemy.x + c.x === player.x && enemy.y + c.y === player.y) continue;
                    if (!_isHardWall(enemy.x + c.x, enemy.y + c.y)) { kx = c.x; ky = c.y; break; }
                }
            }
            while (true) {
                const nx = enemy.x + kx, ny = enemy.y + ky;
                if (_isHardWall(nx, ny)) { SOUNDS.EXPLODE(); break; }
                // 設置ブロックを破壊
                const bwIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
                if (bwIdx !== -1) {
                    tempWalls.splice(bwIdx, 1);
                    addLog("CRASH! The enemy smashed the block!");
                    SOUNDS.EXPLODE(); setScreenShake(8, 150);
                }
                // 爆弾を起爆
                const ebIdx = bombs.findIndex(b => b.x === nx && b.y === ny);
                if (ebIdx !== -1) {
                    bombs[ebIdx].timer = 0;
                    let hasDet = true;
                    while (hasDet) {
                        hasDet = false;
                        const rb = bombs.filter(b => b.timer <= 0);
                        for (const bomb of rb) { if (bombs.includes(bomb)) { detonateBomb(bomb); hasDet = true; } }
                    }
                    break;
                }
                enemy.x = nx; enemy.y = ny;
                draw();
                await new Promise(r => setTimeout(r, 15));
                if (isRealHole(enemy.x, enemy.y)) {
                    scheduleEnemyFall(enemy, `GOLEM SMASH sends ${enemy.type} into the hole!`, true);
                    break;
                }
            }
            if (enemy.hp <= 0 && !enemy._dead) handleEnemyDeath(enemy, true);
            player.stamina = 0; // 突き飛ばし後はスタミナ0
            updateUI();
        }
    }

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

    // 移動先にプレイヤー設置ブロックがあれば移動キャンセル
    const projectedSegs = [{ x: e.x + dx, y: e.y + dy }, ...(e.body || []).map(s => ({ x: s.x + dx, y: s.y + dy }))];
    const blockedByBlock = projectedSegs.some(seg =>
        tempWalls.some(w => w.type === 'BLOCK' && Math.abs(w.x - seg.x) < 0.8 && Math.abs(w.y - seg.y) < 0.8)
    );
    if (blockedByBlock) {
        dx = 0; dy = 0;
    } else {
        e.x = nextX;
        e.y = nextY;
        if (e.body) {
            e.body.forEach(seg => {
                seg.x += dx;
                seg.y += dy;
            });
        }
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
                const crushDmg = ee.isAlly ? 9999 : 50; // 仲間は即死
                ee.hp -= crushDmg;
                ee.flashUntil = performance.now() + 200;
                spawnDamageText(ee.x, ee.y, crushDmg, '#ef4444');
                if (ee.isAlly) addLog(`The Dragonlord crushes the ally in one blow!`);
                else addLog(`The Dragonlord tramples the ${ee.type}!`);
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
                    // 低確率(3%)でGOLDをORC代わりに召喚（100階で一度だけ）
                    const spawnGold = Math.random() < 0.03 && !hasSpawnedGoldOn100;
                    if (spawnGold) {
                        hasSpawnedGoldOn100 = true;
                        addLog("A golden figure materializes from the shadows...");
                        enemies.push({
                            type: 'GOLD', x: spawnPos.x, y: spawnPos.y,
                            hp: 4, maxHp: 4,
                            flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 100, stunTurns: 0
                        });
                        SOUNDS.GET_ITEM();
                    } else {
                    // オークの召喚
                    addLog("Dragonlord: 'Go, my heavy infantry! Crush them!'");
                    enemies.push({
                        type: 'ORC', x: spawnPos.x, y: spawnPos.y,
                        hp: 50 + floorLevel * 5, maxHp: 50 + floorLevel * 5,
                        flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 40, stunTurns: 0
                    });
                    SOUNDS.LANDING_THUD();
                    }
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
            addLog("Rock spikes burst from the ground!");
        }
        SOUNDS.SELECT();
    }
}

async function knockbackPlayer(kx, ky, baseDamage, destroyIcicles = false) {
    let damage = Math.max(1, baseDamage - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
    if (player.isDefending) damage = Math.max(1, Math.floor(damage * 0.25));

    breakStealth();
    player.hp -= damage;
    player.flashUntil = performance.now() + 200;
    if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
    spawnDamageText(player.x, player.y, damage, '#ededed');
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
        const itemSymbols = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.KEY, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.WAND, SYMBOLS.EXPLOSION, SYMBOLS.BREAKER_TOME, SYMBOLS.HEAL_TOME, SYMBOLS.ESCAPE, SYMBOLS.GUARDIAN];
        if (itemSymbols.includes(nextTile)) {
            pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
            map[ny][nx] = SYMBOLS.FLOOR;
        } else if (nextTile === SYMBOLS.FAIRY) {
            // 妖精タイルの特殊処理: underTileを復元してICE等を保護
            const _kbf = movingFairies.find(f => f.x === nx && f.y === ny &&
                (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y)));
            if (_kbf) {
                map[ny][nx] = (_kbf.underTile != null) ? _kbf.underTile : SYMBOLS.FLOOR;
                if (_kbf.stopped) {
                    pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
                    movingFairies = movingFairies.filter(f => !(f.x === nx && f.y === ny &&
                        (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y))));
                }
            } else {
                map[ny][nx] = SYMBOLS.FLOOR;
                pickedDuringSlide.push({ symbol: nextTile, x: nx, y: ny });
            }
        }

        const blockIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
        if (blockIdx !== -1) {
            const block = tempWalls[blockIdx];
            if (block.type === 'FIRE_BLOCK') {
                // 星ブロック：90度横2方向に炎を出してから破壊
                const perpDirs = kx !== 0
                    ? [{dx:0,dy:-1},{dx:0,dy:1}]   // 横移動 → 上下に発射
                    : [{dx:-1,dy:0},{dx:1,dy:0}];   // 縦移動 → 左右に発射
                for (const d of perpDirs) {
                    launchFlameProjectile(nx, ny, d.dx, d.dy);
                }
                tempWalls.splice(blockIdx, 1);
                addLog("★ CRASH! The star block explodes sideways!");
                SOUNDS.EXPLODE();
                setScreenShake(15, 200);
                // 通常ブロックと同様に突き抜けて飛び続ける
            } else if (block.type === 'ICICLE') {
                if (destroyIcicles) {
                    tempWalls.splice(blockIdx, 1);
                    addLog("CRASH! You smashed the rock spike!");
                    SOUNDS.EXPLODE();
                    setScreenShake(10, 200);
                } else {
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
        // 爆弾に突っ込んだら即爆発
        const slideBombIdx = bombs.findIndex(b => b.x === nx && b.y === ny);
        if (slideBombIdx !== -1) {
            bombs[slideBombIdx].timer = 0;
            let hasDetonation = true;
            while (hasDetonation) {
                hasDetonation = false;
                const readyBombs = bombs.filter(b => b.timer <= 0);
                for (const bomb of readyBombs) {
                    if (bombs.includes(bomb)) {
                        detonateBomb(bomb);
                        hasDetonation = true;
                    }
                }
            }
            break; // 爆発で停止
        }

        player.x = nx;
        player.y = ny;
        slideSteps++;

        const hitEnemies = enemies.filter(targetE => (targetE.x === nx && targetE.y === ny) || ((targetE.type === 'SNAKE' || targetE.type === 'SUMMONER') && targetE.body && targetE.body.some(b => b.x === nx && b.y === ny)));
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
            const mimicKnock = enemies.find(e => e.type === 'MIMIC' && e.disguised && e.x === player.x && e.y === player.y);
            if (mimicKnock) {
                mimicKnock.disguised = false;
                map[mimicKnock.y][mimicKnock.x] = SYMBOLS.FLOOR;
                mimicKnock.mimicTransitionEnd = performance.now() + 500;
                SOUNDS.MIMIC_REVEAL();
                addLog("The hole suddenly attacks! It was a MIMIC!");
                spawnFloatingText(player.x, player.y, "MIMIC!!", "#c084fc");
                SOUNDS.ENEMY_ATTACK();
                setScreenShake(10, 300);
                const mimicDmg = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                player.hp -= mimicDmg;
                player.flashUntil = performance.now() + 300;
                spawnDamageText(player.x, player.y, mimicDmg, '#c084fc');
                SOUNDS.DAMAGE();
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
            } else {
                addLog("You were knocked into the dark hole!");
                isPlayerVisible = false;
                floorLevel++;
                if (pickedDuringSlide.length > 0) await processPickedItems(pickedDuringSlide);
                if (floorLevel >= DEEP_ENDING_FLOOR) { stopBGM(); await triggerEnding2(); return; }
                await startFloorTransition();
                return;
            }
        }
    }
    if (pickedDuringSlide.length > 0) await processPickedItems(pickedDuringSlide);
}

// 敵用の吹き飛ばし処理
async function knockbackEnemy(e, kx, ky, damage) {
    if (!e || e.hp <= 0) return;
    if (e.type === 'BREAKER') return; // BREAKERは吹き飛ばし・ダメージ無効
    if (e.type === 'DRAGON' || e.type === 'SUMMONER') {
        // ドラゴン・サモナーはダメージのみ受け、吹き飛ばされない
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
        if (isRealHole(e.x, e.y)) {
            scheduleEnemyFall(e, "The enemy was knocked into the HOLE!");
            return;
        }

        await new Promise(r => setTimeout(r, 30));
    }
    if (e.hp <= 0) handleEnemyDeath(e);
}

async function enemyTurn() {

    let attackOccurred = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || e.hp <= 0) continue;

        // 毒沼または溶岩
        const tile = map[e.y][e.x];
        if (tile === SYMBOLS.POISON || tile === SYMBOLS.LAVA) {
            // ブレイズは溶岩ダメージ無効、オークは軽減、KEY_RUNNERは全地形免疫
            if (tile === SYMBOLS.LAVA) {
                if (e.type === 'BLAZE' || e.type === 'KEY_RUNNER') {
                    // 無効
                } else if (e.type === 'BOMBER') {
                    // BOMBERは溶岩で即死 → 連鎖爆発
                    e.hp = 0; e.flashUntil = performance.now() + 100;
                    spawnDamageText(e.x, e.y, 0, '#f97316');
                    SOUNDS.LAVA_BURN();
                    handleEnemyDeath(e); continue;
                } else {
                    const damage = (e.type === 'ORC') ? 2 : 10;
                    e.hp -= damage; e.flashUntil = performance.now() + 100;
                    spawnDamageText(e.x, e.y, damage, '#f97316');
                    SOUNDS.LAVA_BURN();
                    if (e.hp <= 0) { handleEnemyDeath(e); continue; }
                }
            } else if (tile === SYMBOLS.POISON) {
                if (e.type !== 'KEY_RUNNER') { // KEY_RUNNERは毒ダメージ・スロー無効
                    const damage = 1;
                    e.hp -= damage; e.flashUntil = performance.now() + 100;
                    spawnDamageText(e.x, e.y, damage, '#a855f7');
                    SOUNDS.DAMAGE();
                    if (e.hp <= 0) { handleEnemyDeath(e); continue; }
                    // 毒沼スロー: 2ターンに1回のみ行動
                    if (e.poisonStagger) { e.poisonStagger = false; continue; }
                    else { e.poisonStagger = true; }
                }
            }
        } else {
            e.poisonStagger = false;
        }

        if (e.stunTurns > 0) {
            e.stunTurns--;
            addLog("Enemy is stunned...");
            continue;
        }

        // 眠り状態: プレイヤーに攻撃されるまで行動しない
        if (e.sleeping) continue;

        // 派閥戦争: 異なる派閥の隣接敵を優先攻撃（プレイヤーは攻撃しない）
        if (e.faction && !e.isAlly) {
            const factionTarget = enemies.find(t =>
                t !== e && !t._dead && t.hp > 0 && t.faction && t.faction !== e.faction &&
                Math.abs(t.x - e.x) <= 1 && Math.abs(t.y - e.y) <= 1
            );
            if (factionTarget) {
                const atkPow = Math.max(1, (e.type === 'ORC' ? 8 : e.type === 'BREAKER' ? 6 : e.type === 'BLAZE' ? 5 : 3) + Math.floor(floorLevel / 20));
                factionTarget.hp -= atkPow;
                factionTarget.flashUntil = performance.now() + 150;
                e.offsetX = (factionTarget.x - e.x) * 8;
                e.offsetY = (factionTarget.y - e.y) * 8;
                spawnDamageText(factionTarget.x, factionTarget.y, atkPow, e.faction === 'CRIMSON' ? '#ef4444' : '#60a5fa');
                SOUNDS.ENEMY_ATTACK();
                await new Promise(r => setTimeout(r, 80));
                e.offsetX = 0; e.offsetY = 0;
                if (factionTarget.hp <= 0) handleEnemyDeath(factionTarget, false);
                continue;
            }
        }

        // 逃走行動（FLEEING_HORDE）: プレイヤーから遠ざかる。追い詰められたら反撃
        if (e.flee && !e.isAlly) {
            const fDist = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
            // KEY_RUNNERは距離1（隣接）でも逃走。それ以外は距離2以上で逃走
            if (fDist > 1 || e.type === 'KEY_RUNNER') {
                // 逃走方向をスコアリングで選択：
                //   score = プレイヤーからのマンハッタン距離
                //         - 直前逆方向ペナルティ（往復スタック防止）
                //         + ランダムノイズ（単調ループ回避）
                const pickFleeDir = (ent) => {
                    const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                    const valid = dirs.filter(d => {
                        const nx = ent.x+d.x, ny = ent.y+d.y;
                        return canEnemyMove(nx, ny, ent) && !enemies.some(t=>t!==ent && t.x===nx && t.y===ny);
                    });
                    if (valid.length === 0) return null;
                    const scored = valid.map(d => {
                        let score = Math.abs((ent.x+d.x)-player.x) + Math.abs((ent.y+d.y)-player.y);
                        // 直前と逆方向のペナルティ（行ったり来たり防止）
                        if (ent.fleeLastDx !== undefined && d.x === -ent.fleeLastDx && d.y === -ent.fleeLastDy) score -= 4;
                        score += Math.random() * 2; // ランダムノイズ
                        return { d, score };
                    });
                    scored.sort((a, b) => b.score - a.score);
                    return scored[0].d;
                };

                const chosen = pickFleeDir(e);
                if (chosen) {
                    if (e.type === 'KEY_RUNNER') { e.trailX = e.x; e.trailY = e.y; }
                    e.fleeLastDx = chosen.x; e.fleeLastDy = chosen.y;
                    e.offsetX = chosen.x * 8; e.offsetY = chosen.y * 8;
                    e.x += chosen.x; e.y += chosen.y;
                    draw(); await new Promise(r => setTimeout(r, 60));
                    e.offsetX = 0; e.offsetY = 0;
                    // KEY_RUNNER: 2歩目
                    if (e.type === 'KEY_RUNNER') {
                        const chosen2 = pickFleeDir(e);
                        if (chosen2) {
                            e.trailX = e.x; e.trailY = e.y;
                            e.fleeLastDx = chosen2.x; e.fleeLastDy = chosen2.y;
                            e.offsetX = chosen2.x * 8; e.offsetY = chosen2.y * 8;
                            e.x += chosen2.x; e.y += chosen2.y;
                            draw(); await new Promise(r => setTimeout(r, 60));
                            e.offsetX = 0; e.offsetY = 0;
                        }
                    }
                }
                continue; // 攻撃しない
            }
            // dist === 1: コーナリングされた → 以降の通常攻撃処理へ落ちる
            if (e.type === 'KEY_RUNNER') continue; // KEY_RUNNERは反撃しない
        }

        // フェアリーミミック固有AI
        if (e.type === 'FAIRY_MIMIC' && !e.isAlly) {
            const fmDist = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
            if (e.disguised) {
                if (fmDist <= 3 && !player.isStealth) {
                    // 距離3以内で正体を現し先制攻撃
                    e.disguised = false;
                    e.mimicTransitionEnd = performance.now() + 500;
                    SOUNDS.MIMIC_REVEAL();
                    addLog("It's a MIMIC! Disguised as a FAIRY!!");
                    spawnFloatingText(e.x, e.y, "FAKE FAIRY!!", "#f472b6");
                    setScreenShake(10, 300);
                    e.offsetX = (player.x - e.x) * 8; e.offsetY = (player.y - e.y) * 8;
                    spawnSlash(player.x, player.y);
                    SOUNDS.ENEMY_ATTACK();
                    const fmAtk0 = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                    player.hp -= fmAtk0;
                    player.flashUntil = performance.now() + 300;
                    spawnDamageText(player.x, player.y, fmAtk0, '#f472b6');
                    SOUNDS.DAMAGE();
                    attackOccurred = true;
                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                    await new Promise(r => setTimeout(r, 200));
                    e.offsetX = 0; e.offsetY = 0;
                } else {
                    // 擬態中: 本物の妖精のようにゆっくり漂う
                    e.moveCooldown = (e.moveCooldown || 6) - 1;
                    if (e.moveCooldown <= 0) {
                        e.moveCooldown = 5 + Math.floor(Math.random() * 5);
                        if (Math.random() < 0.4) {
                            const fmMoves = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                            const fmValid = fmMoves.filter(m => canEnemyMove(e.x+m.x, e.y+m.y, e) && !enemies.some(t=>t!==e&&t.x===e.x+m.x&&t.y===e.y+m.y));
                            if (fmValid.length > 0) {
                                const m = fmValid[Math.floor(Math.random() * fmValid.length)];
                                e.x += m.x; e.y += m.y;
                            }
                        }
                    }
                }
            } else {
                // 正体暴露後: プレイヤーに追跡・攻撃
                if (fmDist === 1 && !player.isStealth) {
                    e.offsetX = (player.x - e.x) * 10; e.offsetY = (player.y - e.y) * 10;
                    spawnSlash(player.x, player.y);
                    SOUNDS.ENEMY_ATTACK();
                    const fmAtk1 = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                    if (player.isDefending) {
                        const fmRed = Math.max(1, Math.floor(fmAtk1 * 0.4));
                        player.hp -= fmRed;
                        spawnDamageText(player.x, player.y, fmRed, '#f472b6');
                    } else {
                        player.hp -= fmAtk1;
                        spawnDamageText(player.x, player.y, fmAtk1, '#f472b6');
                    }
                    player.flashUntil = performance.now() + 300;
                    SOUNDS.DAMAGE();
                    attackOccurred = true;
                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                    await new Promise(r => setTimeout(r, 200));
                    e.offsetX = 0; e.offsetY = 0;
                } else if (fmDist > 1) {
                    e.moveCooldown = (e.moveCooldown || 3) - 1;
                    if (e.moveCooldown <= 0) {
                        e.moveCooldown = 3;
                        const fmSx = Math.sign(player.x - e.x), fmSy = Math.sign(player.y - e.y);
                        if (canEnemyMove(e.x+fmSx, e.y+fmSy, e)) { e.x += fmSx; e.y += fmSy; }
                        else if (canEnemyMove(e.x+fmSx, e.y, e)) e.x += fmSx;
                        else if (canEnemyMove(e.x, e.y+fmSy, e)) e.y += fmSy;
                    }
                }
            }
            continue;
        }

        // ミミック固有AI（味方になった場合は通常の味方AIに任せる）
        if (e.type === 'MIMIC' && !e.isAlly) {
            const mdx = Math.abs(e.x - player.x);
            const mdy = Math.abs(e.y - player.y);
            const mimicDist = mdx + mdy;

            if (e.disguised) {
                // 擬態中：プレイヤーが隣接(距離1)したら擬態解除＆先制攻撃
                if (mimicDist === 1 && !player.isStealth) {
                    e.disguised = false;
                    map[e.y][e.x] = SYMBOLS.FLOOR;
                    e.mimicTransitionEnd = performance.now() + 500; // 点滅演出500ms
                    SOUNDS.MIMIC_REVEAL();
                    addLog("The hole suddenly attacks! It was a MIMIC!");
                    spawnFloatingText(e.x, e.y, "MIMIC!!", "#c084fc");
                    setScreenShake(10, 300);
                    e.offsetX = (player.x - e.x) * 10; e.offsetY = (player.y - e.y) * 10;
                    spawnSlash(player.x, player.y);
                    SOUNDS.ENEMY_ATTACK();
                    const mimicAtk = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                    player.hp -= mimicAtk;
                    player.flashUntil = performance.now() + 300;
                    spawnDamageText(player.x, player.y, mimicAtk, '#c084fc');
                    SOUNDS.DAMAGE();
                    attackOccurred = true;
                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                    await new Promise(r => setTimeout(r, 200));
                    e.offsetX = 0; e.offsetY = 0;
                } else {
                    // 擬態中の移動（10ターンおき、通路には入らない）
                    e.moveCooldown = (e.moveCooldown || 10) - 1;
                    if (e.moveCooldown <= 0) {
                        e.moveCooldown = 10;
                        const moves = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                        const validMoves = moves.filter(m => {
                            const nx = e.x + m.x, ny = e.y + m.y;
                            if (!canEnemyMove(nx, ny, e)) return false;
                            // 通路（左右or上下が壁で挟まれた1マス幅）には移動しない
                            const wallLR = isWallAt(nx - 1, ny) && isWallAt(nx + 1, ny);
                            const wallUD = isWallAt(nx, ny - 1) && isWallAt(nx, ny + 1);
                            if (wallLR || wallUD) return false;
                            return true;
                        });
                        if (validMoves.length > 0) {
                            const m = validMoves[Math.floor(Math.random() * validMoves.length)];
                            map[e.y][e.x] = SYMBOLS.FLOOR; // 元の位置を床に戻す
                            e.x += m.x; e.y += m.y;
                            map[e.y][e.x] = SYMBOLS.STAIRS; // 新しい位置を偽の穴にする
                        }
                    }
                }
            } else {
                // 正体後：プレイヤーが離れたら再擬態する（距離8以上）
                if (mimicDist >= 8) {
                    // 再擬態：現在地が床なら穴に戻す
                    if (map[e.y][e.x] === SYMBOLS.FLOOR) {
                        e.disguised = true;
                        e.mimicTransitionEnd = performance.now() + 500; // 点滅演出500ms
                        map[e.y][e.x] = SYMBOLS.STAIRS;
                        e.moveCooldown = 10;
                        SOUNDS.MIMIC_DISGUISE();
                        addLog("The Mimic disguised itself as a hole again...");
                        spawnFloatingText(e.x, e.y, "...!", "#c084fc");
                    }
                } else if (mimicDist < 8 && !player.isStealth) {
                    if (mimicDist === 1) {
                        // 攻撃
                        e.offsetX = (player.x - e.x) * 10; e.offsetY = (player.y - e.y) * 10;
                        spawnSlash(player.x, player.y);
                        SOUNDS.ENEMY_ATTACK();
                        const mimicAtk = Math.max(1, Math.floor(floorLevel / 2 + 8) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                        if (player.isDefending) {
                            const reduced = Math.max(1, Math.floor(mimicAtk * 0.4));
                            player.hp -= reduced;
                            spawnDamageText(player.x, player.y, reduced, '#c084fc');
                        } else {
                            player.hp -= mimicAtk;
                            spawnDamageText(player.x, player.y, mimicAtk, '#c084fc');
                        }
                        player.flashUntil = performance.now() + 300;
                        SOUNDS.DAMAGE();
                        attackOccurred = true;
                        if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                        await new Promise(r => setTimeout(r, 200));
                        e.offsetX = 0; e.offsetY = 0;
                    } else {
                        // 10ターンに1歩移動して追跡
                        e.moveCooldown = (e.moveCooldown || 10) - 1;
                        if (e.moveCooldown <= 0) {
                            e.moveCooldown = 10;
                            const sx = Math.sign(player.x - e.x);
                            const sy = Math.sign(player.y - e.y);
                            if (canEnemyMove(e.x + sx, e.y + sy, e)) { e.x += sx; e.y += sy; }
                            else if (canEnemyMove(e.x + sx, e.y, e)) { e.x += sx; }
                            else if (canEnemyMove(e.x, e.y + sy, e)) { e.y += sy; }
                        }
                    }
                }
            }
            continue;
        }

        // 召喚師AI（味方になった場合は召喚しない）
        if (e.type === 'SUMMONER' && !e.isAlly) {
            e.summonCooldown = (e.summonCooldown || 5) - 1;
            if (e.summonCooldown <= 0) {
                // 召喚上限チェック: この召喚師が出した生存中の敵を数える
                const summonedAlive = enemies.filter(se => se.summonedBy === e && se.hp > 0).length;
                if (summonedAlive < 10) {
                    // ランダムな床位置を探す（プレイヤーから距離3以上）
                    let spawnPos = null;
                    for (let t = 0; t < 50; t++) {
                        const sx = Math.floor(Math.random() * COLS);
                        const sy = Math.floor(Math.random() * ROWS);
                        if (map[sy][sx] !== SYMBOLS.FLOOR) continue;
                        if (Math.abs(sx - player.x) + Math.abs(sy - player.y) < 3) continue;
                        if (enemies.some(oe => oe.x === sx && oe.y === sy)) continue;
                        if (sx === player.x && sy === player.y) continue;
                        spawnPos = { x: sx, y: sy };
                        break;
                    }
                    if (spawnPos) {
                        // フロアレベルに応じた敵を抽選（NORMAL/ORC/BLAZE/FROST）
                        const roll = Math.random();
                        let sType, sHpVal, sExp;
                        if (roll < 0.25) {
                            sType = 'ORC'; sHpVal = 40 + floorLevel * 5; sExp = 40;
                        } else if (roll < 0.45) {
                            sType = 'BLAZE'; sHpVal = 15 + floorLevel * 2; sExp = 15;
                        } else if (roll < 0.65) {
                            sType = 'FROST'; sHpVal = 15 + floorLevel * 2; sExp = 15;
                        } else {
                            sType = 'NORMAL'; sHpVal = 15 + floorLevel * 2; sExp = 15;
                        }
                        const newEnemy = {
                            type: sType,
                            x: spawnPos.x, y: spawnPos.y,
                            hp: sHpVal, maxHp: sHpVal,
                            flashUntil: 0, offsetX: 0, offsetY: 0,
                            expValue: sExp,
                            stunTurns: 0,
                            summonedBy: e
                        };
                        enemies.push(newEnemy);
                        SOUNDS.SUMMON();
                        spawnFloatingText(e.x, e.y, "SUMMON!", "#a855f7");
                        spawnFloatingText(spawnPos.x, spawnPos.y, "!!", "#a855f7");
                    }
                }
                e.summonCooldown = 5;
            }
            continue;
        }
        if (e.type === 'SUMMONER' && e.isAlly) continue; // 味方召喚師は何もしない

        // タレット・ドラゴンはその場を動かない
        if (e.type === 'TURRET') continue;

        // HOPPER_TURRET: レーザーと直角方向へランダムにぴょんぴょん移動
        if (e.type === 'HOPPER_TURRET') {
            if (e.hopTimer == null) e.hopTimer = 1 + Math.floor(Math.random() * 3);
            e.hopTimer--;
            if (e.hopTimer <= 0) {
                // レーザー方向(dir)に対して90°の2方向を候補にする
                const perpMoves = (e.dir === 0 || e.dir === 2)
                    ? [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }]   // 上下向き → 左右に移動
                    : [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }];  // 左右向き → 上下に移動
                // ランダムに順番を決める
                if (Math.random() < 0.5) perpMoves.reverse();
                let hopped = false;
                for (const { dx, dy } of perpMoves) {
                    const nx = e.x + dx, ny = e.y + dy;
                    if (canEnemyMove(nx, ny, e) && !enemies.some(o => o !== e && o.hp > 0 && o.x === nx && o.y === ny)) {
                        e.x = nx; e.y = ny;
                        animateBounce(e);
                        hopped = true;
                        // 氷の床に乗ったらそのまま同方向にスライド（1コマずつ描画）
                        while (map[e.y][e.x] === SYMBOLS.ICE) {
                            const sx = e.x + dx, sy = e.y + dy;
                            if (sx < 0 || sx >= COLS || sy < 0 || sy >= ROWS) break;
                            if (!canEnemyMove(sx, sy, e)) break;
                            if (enemies.some(o => o !== e && o.hp > 0 && o.x === sx && o.y === sy)) break;
                            e.x = sx; e.y = sy;
                            SOUNDS.ICE_SLIDE();
                            draw();
                            await new Promise(r => setTimeout(r, 40));
                        }
                        break;
                    }
                }
                e.hopTimer = 2 + Math.floor(Math.random() * 3); // 次のホップまで2〜4ターン
            }
            continue;
        }

        // ===== いかれたG: プレイヤー・敵・味方問わず最近傍の存在に突撃 =====
        if (e.type === 'CRAZY_G') {
            // 全ターゲット候補（自分以外の全エンティティ）
            const crazyTargets = [];
            if (!player.isStealth) crazyTargets.push({ x: player.x, y: player.y, isPlayer: true });
            for (const other of enemies) {
                if (other === e || other.hp <= 0 || other._dead) continue;
                crazyTargets.push({ x: other.x, y: other.y, isEnemy: true, obj: other });
            }
            if (crazyTargets.length === 0) continue;

            // 最近傍を選択
            let crazyBest = crazyTargets[0], crazyMin = Infinity;
            for (const t of crazyTargets) {
                const d = Math.abs(t.x - e.x) + Math.abs(t.y - e.y);
                if (d < crazyMin) { crazyMin = d; crazyBest = t; }
            }

            if (crazyMin === 1) {
                // 隣接 → 攻撃
                e.offsetX = (crazyBest.x - e.x) * 10; e.offsetY = (crazyBest.y - e.y) * 10;
                spawnSlash(crazyBest.x, crazyBest.y);
                SOUNDS.ENEMY_ATTACK();
                if (crazyBest.isPlayer) {
                    addLog("The Crazy G's blow sends you flying!");
                    await knockbackPlayer(player.x - e.x, player.y - e.y, 10 + Math.floor(floorLevel / 2), true);
                    attackOccurred = true;
                } else if (crazyBest.isEnemy) {
                    const target = crazyBest.obj;
                    const dmg = 30 + Math.floor(floorLevel / 2);
                    target.hp -= dmg; target.flashUntil = performance.now() + 200;
                    spawnDamageText(target.x, target.y, dmg, '#4ade80');
                    SOUNDS.HIT();
                    if (target.hp <= 0) handleEnemyDeath(target);
                    attackOccurred = true;
                }
                await new Promise(r => setTimeout(r, 60));
                e.offsetX = 0; e.offsetY = 0;
            } else {
                // 接近
                const cdx = crazyBest.x - e.x, cdy = crazyBest.y - e.y;
                const csx = cdx === 0 ? 0 : cdx / Math.abs(cdx), csy = cdy === 0 ? 0 : cdy / Math.abs(cdy);
                if (Math.abs(cdx) > Math.abs(cdy)) {
                    if (canEnemyMove(e.x + csx, e.y, e)) e.x += csx;
                    else if (canEnemyMove(e.x, e.y + csy, e)) e.y += csy;
                } else {
                    if (canEnemyMove(e.x, e.y + csy, e)) e.y += csy;
                    else if (canEnemyMove(e.x + csx, e.y, e)) e.x += csx;
                }
                if (isRealHole(e.x, e.y)) scheduleEnemyFall(e, "The Crazy G fell into the HOLE!");
            }
            continue;
        }

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

            // プレイヤーがコアのちょうど1マス上にいる場合、ランダムでジャンプ着地攻撃
            const playerAboveCore = dungeonCore &&
                player.y === dungeonCore.y - 1 &&
                player.x === dungeonCore.x &&
                !player.isStealth &&
                !e.chargingTackle &&
                Math.random() < 0.4;
            if (playerAboveCore) {
                addLog("The DRAGONLORD leaps into the air!");
                SOUNDS.RUMBLE();

                // ジャンプ上昇（2タイル分）
                const jumpHeight = -TILE_SIZE * 2;
                const jumpUp = 10;
                for (let i = 0; i < jumpUp; i++) {
                    e.offsetY = jumpHeight * Math.sin((i / jumpUp) * Math.PI * 0.5);
                    draw();
                    await new Promise(r => setTimeout(r, 20));
                }
                e.offsetY = jumpHeight;

                // 滞空
                await new Promise(r => setTimeout(r, 120));

                addLog("CRASH! The Dragonlord SLAMS down!");

                // 着地下降
                const jumpDown = 8;
                for (let i = 0; i < jumpDown; i++) {
                    e.offsetY = jumpHeight * (1 - i / jumpDown);
                    draw();
                    await new Promise(r => setTimeout(r, 18));
                }
                e.offsetY = 0;

                // 着地衝撃
                SOUNDS.LANDING_THUD();
                SOUNDS.EXPLODE();
                setScreenShake(60, 1000);
                spawnFloatingText(player.x, player.y, "SHOCKWAVE!", "#f97316");

                // 主人公を1〜2マスランダムにずらす
                if (!player.isStealth) {
                    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
                    const dir = dirs[Math.floor(Math.random() * dirs.length)];
                    const steps = 1 + Math.floor(Math.random() * 2);
                    for (let s = 0; s < steps; s++) {
                        const nx = player.x + dir.x;
                        const ny = player.y + dir.y;
                        if (!isWallAt(nx, ny)) { player.x = nx; player.y = ny; }
                        else break;
                    }
                    player.flashUntil = performance.now() + 300;
                    breakStealth();
                }

                draw();
                await new Promise(r => setTimeout(r, 400));
                attackOccurred = true;
            } else if (e.chargingTackle) {
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

                let damage = Math.max(5, 20 - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                if (player.isDefending) damage = Math.max(1, Math.floor(damage * 0.25));
                breakStealth();
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
            // ドラゴンが近くにいる場合はおびえて逃げる
            const nearDragon = enemies.find(t => !t.isAlly && t.type === 'DRAGON' && t.hp > 0 &&
                Math.abs((t.x + 5) - e.x) + Math.abs(t.y - e.y) <= 7);
            if (nearDragon) {
                spawnFloatingText(e.x, e.y, "FEAR!", "#a78bfa");
                const fleeX = e.x >= nearDragon.x + 5 ? 1 : -1;
                const fleeY = e.y >= nearDragon.y ? 1 : -1;
                for (const [mx, my] of [[fleeX, fleeY], [fleeX, 0], [0, fleeY]]) {
                    const nx = e.x + mx, ny = e.y + my;
                    if (!isWallAt(nx, ny) && !enemies.some(o => o !== e && o.x === nx && o.y === ny)) {
                        e.x = nx; e.y = ny; break;
                    }
                }
                continue;
            }

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

                    // ミミックが擬態中に攻撃された場合、正体を暴く（プレイヤー攻撃と同様）
                    if (allyBestTarget.type === 'MIMIC' && allyBestTarget.disguised) {
                        allyBestTarget.disguised = false;
                        map[allyBestTarget.y][allyBestTarget.x] = SYMBOLS.FLOOR;
                        allyBestTarget.mimicTransitionEnd = performance.now() + 500;
                        SOUNDS.MIMIC_REVEAL();
                        addLog("The hole was a MIMIC!");
                        spawnFloatingText(allyBestTarget.x, allyBestTarget.y, "MIMIC!!", "#c084fc");
                        setScreenShake(8, 200);
                    }

                    // 味方の攻撃力計算 (オークなら強い)
                    let dmg = (e.type === 'ORC' ? 15 : (e.type === 'BREAKER' ? 12 : (e.type === 'LAYER' ? 6 : (e.type === 'SNAKE' ? 10 : (e.type === 'MIMIC' ? 12 : (e.type === 'SUMMONER' ? 8 : 5)))))) + Math.floor(floorLevel / 2);
                    allyBestTarget.hp -= dmg;
                    allyBestTarget.flashUntil = performance.now() + 100;
                    spawnDamageText(allyBestTarget.x, allyBestTarget.y, dmg, '#ededed');
                    SOUNDS.HIT();
                    attackOccurred = true;

                    if (allyBestTarget.hp <= 0) handleEnemyDeath(allyBestTarget);
                    else if (e.type === 'ORC' && allyBestTarget.type !== 'DRAGON' && allyBestTarget.type !== 'SUMMONER') {
                        // 味方オークによる突き飛ばし（ドラゴン・サモナーは吹き飛ばせない）
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
                            const ebIdx = bombs.findIndex(b => b.x === nx && b.y === ny);
                            if (ebIdx !== -1) {
                                bombs[ebIdx].timer = 0;
                                let hasDet = true;
                                while (hasDet) {
                                    hasDet = false;
                                    const rb = bombs.filter(b => b.timer <= 0);
                                    for (const bomb of rb) { if (bombs.includes(bomb)) { detonateBomb(bomb); hasDet = true; } }
                                }
                                break;
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
                            await new Promise(r => setTimeout(r, 15));
                            if (isRealHole(allyBestTarget.x, allyBestTarget.y)) {
                                addLog("The enemy was knocked into the hole!");
                                allyBestTarget.hp = 0; break;
                            }
                        }
                        if (allyBestTarget.hp <= 0) handleEnemyDeath(allyBestTarget);
                    }
                    await new Promise(r => setTimeout(r, 40));
                    e.offsetX = 0; e.offsetY = 0;
                } else {
                    // 敵に接近
                    const oldPos = { x: e.x, y: e.y };
                    const dx = allyBestTarget.x - e.x, dy = allyBestTarget.y - e.y;
                    let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);

                    // 味方BREAKERの移動判定（壁を壊して進める）
                    const allyBreakerTryMove = (nx, ny) => {
                        if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) return false;
                        if (enemies.some(oe => oe !== e && oe.x === nx && oe.y === ny)) return false;
                        if (map[ny][nx] === SYMBOLS.WALL) {
                            map[ny][nx] = SYMBOLS.FLOOR;
                            SOUNDS.WALL_BREAK(); setScreenShake(8, 200);
                            return true;
                        }
                        return canEnemyMove(nx, ny, e);
                    };
                    const tryMoveAlly = e.type === 'BREAKER' ? allyBreakerTryMove : (nx, ny) => canEnemyMove(nx, ny, e);

                    let moved = false;
                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (tryMoveAlly(e.x + sx, e.y)) { e.x += sx; moved = true; }
                        else if (tryMoveAlly(e.x, e.y + sy)) { e.y += sy; moved = true; }
                    } else {
                        if (tryMoveAlly(e.x, e.y + sy)) { e.y += sy; moved = true; }
                        else if (tryMoveAlly(e.x + sx, e.y)) { e.x += sx; moved = true; }
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
                        while (e.type !== 'FROST' && e.type !== 'BLAZE' && e.type !== 'BREAKER' && e.type !== 'LAYER' && map[e.y][e.x] === SYMBOLS.ICE) {
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
                            if (isRealHole(e.x, e.y)) {
                                scheduleEnemyFall(e, "An ally slid into the HOLE!");
                                break;
                            }
                            await new Promise(r => setTimeout(r, 15));
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

                    // 味方BREAKERは壁を壊して進む
                    const allyBreakerFollow = (nx, ny) => {
                        if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) return false;
                        if (nx === player.x && ny === player.y) return false;
                        if (enemies.some(oe => oe !== e && oe.x === nx && oe.y === ny)) return false;
                        if (map[ny][nx] === SYMBOLS.WALL) {
                            map[ny][nx] = SYMBOLS.FLOOR;
                            SOUNDS.WALL_BREAK(); setScreenShake(8, 200);
                            return true;
                        }
                        return canEnemyMove(nx, ny, e);
                    };
                    const tryFollowMove = e.type === 'BREAKER' ? allyBreakerFollow : (nx, ny) => canEnemyMove(nx, ny, e);

                    if (Math.abs(dx) > Math.abs(dy)) {
                        if (tryFollowMove(e.x + sx, e.y)) { e.x += sx; moved = true; }
                        else if (tryFollowMove(e.x, e.y + sy)) { e.y += sy; moved = true; }
                    } else {
                        if (tryFollowMove(e.x, e.y + sy)) { e.y += sy; moved = true; }
                        else if (tryFollowMove(e.x + sx, e.y)) { e.x += sx; moved = true; }
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
                        while (e.type !== 'FROST' && e.type !== 'BLAZE' && e.type !== 'BREAKER' && e.type !== 'LAYER' && map[e.y][e.x] === SYMBOLS.ICE) {
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
                            if (isRealHole(e.x, e.y)) {
                                scheduleEnemyFall(e, "An ally slid into the HOLE!");
                                break;
                            }
                            await new Promise(r => setTimeout(r, 15));
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
            if (isRealHole(e.x, e.y)) {
                scheduleEnemyFall(e, "An ally fell into the HOLE!");
            }
            continue;
        }
        // BOMBER: 最寄りの仲間BOMBERを探して群れる。プレイヤーには絶対近づかない
        if (e.type === 'BOMBER') {
            const bomberCanMove = (nx, ny) =>
                !(nx === player.x && ny === player.y) && canEnemyMove(nx, ny, e);
            let nearestBomber = null, nearestDist = Infinity;
            for (const other of enemies) {
                if (other === e || other.type !== 'BOMBER' || other.hp <= 0) continue;
                const d = Math.abs(other.x - e.x) + Math.abs(other.y - e.y);
                if (d < nearestDist) { nearestDist = d; nearestBomber = other; }
            }
            if (nearestBomber && nearestDist > 1) {
                // 仲間に向かって移動
                const dx = nearestBomber.x - e.x, dy = nearestBomber.y - e.y;
                const sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);
                if (Math.abs(dx) > Math.abs(dy)) {
                    if (bomberCanMove(e.x + sx, e.y)) e.x += sx;
                    else if (bomberCanMove(e.x, e.y + sy)) e.y += sy;
                } else {
                    if (bomberCanMove(e.x, e.y + sy)) e.y += sy;
                    else if (bomberCanMove(e.x + sx, e.y)) e.x += sx;
                }
            } else {
                // 仲間がいない or 既に隣接 → ランダム移動
                const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
                dirs.sort(() => Math.random() - 0.5);
                for (const d of dirs) {
                    if (bomberCanMove(e.x + d.dx, e.y + d.dy)) { e.x += d.dx; e.y += d.dy; break; }
                }
            }
            if (isRealHole(e.x, e.y)) scheduleEnemyFall(e, "The BOMBER fell into the HOLE!");
            continue;
        }

        // 横移動専用敵（SIDE_SCROLL）: Space Invaders風
        if (e.behavior === 'SIDE_SCROLL') {
            // 炎ブロック行まで降りた or 主人公が近づいたら通常追跡に切り替え
            const fireBlockMinY = tempWalls.reduce((min, w) => w.type === 'FIRE_BLOCK' ? Math.min(min, w.y) : min, Infinity);
            const distToPlayer = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
            if (e.y >= fireBlockMinY || distToPlayer <= 8) {
                e.behavior = null;
                // fall through to normal AI below
            } else {
                const nextX = e.x + e.dir;
                if (canEnemyMove(nextX, e.y, e)) {
                    e.x = nextX;
                } else {
                    // 左右の壁に到達 → 1列下に降りて方向転換
                    e.dir = -e.dir;
                    if (canEnemyMove(e.x, e.y + 1, e)) e.y += 1;
                }
                continue;
            }
        }

        // 通常の敵：プレイヤー（姿が見えれば）または近くの味方を狙う
        const targets = [];
        if (!player.isStealth) targets.push({ x: player.x, y: player.y, isPlayer: true });
        enemies.filter(ally => ally.isAlly).forEach(ally => targets.push({ x: ally.x, y: ally.y, isAlly: true, obj: ally }));

        // ターゲットがいない（ステルス中かつ味方がいない）場合は待機
        // BREAKERはターゲット不在でも自律的に動き続ける
        // 家族持ちNORMALは巣の周辺をうろつく
        if (targets.length === 0 && e.type !== 'BREAKER') {
            if (e.type === 'NORMAL' && e.familyId != null && floorLevel >= 101) {
                const distHome = Math.abs(e.x - e.homeX) + Math.abs(e.y - e.homeY);
                const wanderDirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                if (distHome > 5) {
                    // 巣に近づく方向を優先
                    wanderDirs.sort((a,b) => {
                        const dA = Math.abs(e.homeX-(e.x+a.x)) + Math.abs(e.homeY-(e.y+a.y));
                        const dB = Math.abs(e.homeX-(e.x+b.x)) + Math.abs(e.homeY-(e.y+b.y));
                        return dA - dB;
                    });
                } else {
                    // ランダムうろつき
                    wanderDirs.sort(() => Math.random() - 0.5);
                }
                for (const d of wanderDirs) {
                    if (canEnemyMove(e.x+d.x, e.y+d.y, e)) { e.x+=d.x; e.y+=d.y; break; }
                }
            }
            continue;
        }

        // 最も近いターゲットを探す
        let bestTarget = targets[0]; // デフォルトはプレイヤー
        let minDist = Math.abs(player.x - e.x) + Math.abs(player.y - e.y);

        targets.forEach(t => {
            const d = Math.abs(t.x - e.x) + Math.abs(t.y - e.y);
            if (d < minDist) { minDist = d; bestTarget = t; }
        });

        // オークは距離に関係なく探知する。隠密の指輪装備時は探知範囲を縮小
        const baseDetect = (e.type === 'ORC' || e.type === 'MADMAN') ? 999 : 8;
        const detectRange = (e.type !== 'ORC' && hasRing('STEALTH_RING')) ? 5 : baseDetect;

        if (e.type === 'GOLD' && minDist <= detectRange) {
            // GOLDはとにかくプレイヤーから逃げ回る
            const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            let bestMove = { x: e.x, y: e.y, score: minDist };
            dirs.forEach(d => {
                if (canEnemyMove(e.x + d.x, e.y + d.y, e)) {
                    const nd = Math.abs(player.x - (e.x + d.x)) + Math.abs(player.y - (e.y + d.y));
                    if (nd > bestMove.score) bestMove = { x: e.x + d.x, y: e.y + d.y, score: nd };
                }
            });
            if (bestMove.x !== e.x || bestMove.y !== e.y) { SOUNDS.GOLD_FLIGHT(); e.x = bestMove.x; e.y = bestMove.y; }
            if (!enemies.includes(e)) continue;
        } else if (e.type === 'BREAKER') {
            // BREAKERの移動AI: 直進優先で遠くまで掘り進む
            const allDirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

            // 初回: ランダムな進行方向を割り当て
            if (e.breakerDir == null) {
                e.breakerDir = Math.floor(Math.random() * 4);
            }

            // 進行方向の候補リストを構築（優先順位付き）
            const curDir = allDirs[e.breakerDir];
            // 90度ターンの2方向（ランダム順）
            const perpDirs = allDirs.filter(d => d.x !== curDir.x && d.y !== curDir.y && !(d.x === -curDir.x && d.y === -curDir.y));
            if (Math.random() < 0.5) perpDirs.reverse();
            // 逆方向（最後の手段）
            const reverseDir = allDirs.find(d => d.x === -curDir.x && d.y === -curDir.y);

            // 優先順: 直進 > 横 > 逆走
            const orderedDirs = [curDir, ...perpDirs, reverseDir];

            // 殴られて逃走中のカウントダウン
            const isForced = e.breakerForcedTurns && e.breakerForcedTurns > 0;
            if (isForced) {
                e.breakerForcedTurns--;
            }

            // 外壁に近い場合は方向転換を促す（端から3マス以内）※逃走中は無視
            const nearEdge = e.x <= 3 || e.x >= COLS - 4 || e.y <= 3 || e.y >= ROWS - 4;
            if (nearEdge && !isForced) {
                // マップ中心方向を最優先に
                const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
                const toCenterDx = cx - e.x, toCenterDy = cy - e.y;
                orderedDirs.sort((a, b) => {
                    const scoreA = a.x * toCenterDx + a.y * toCenterDy;
                    const scoreB = b.x * toCenterDx + b.y * toCenterDy;
                    return scoreB - scoreA;
                });
            }

            // たまに（15%）ランダムに方向転換して探索範囲を広げる ※逃走中は無視
            if (!nearEdge && !isForced && Math.random() < 0.15) {
                e.breakerDir = Math.floor(Math.random() * 4);
                orderedDirs[0] = allDirs[e.breakerDir];
            }

            let moved = false;
            const tryMove = (d) => {
                const nx = e.x + d.x, ny = e.y + d.y;
                if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) return false;
                if (nx === player.x && ny === player.y) return false;
                if (enemies.some(oe => oe !== e && oe.x === nx && oe.y === ny)) return false;
                if (map[ny][nx] === SYMBOLS.STAIRS || map[ny][nx] === SYMBOLS.DOOR || map[ny][nx] === SYMBOLS.MERCHANT) return false;
                if (map[ny][nx] === SYMBOLS.WALL) {
                    map[ny][nx] = SYMBOLS.FLOOR;
                    e.x = nx; e.y = ny;
                    SOUNDS.WALL_BREAK();
                    setScreenShake(8, 200);
                    addLog("CRASH! The Breaker smashed through a wall!");
                    if (floorLevel === 4 && !pendingF4Tutorial) pendingF4BreakerTutorial = true; // 4Fで壁破壊を検知
                    // 壁から何か出現する判定（4Fチュートリアルでは無効、1フロア2個まで）
                    const dropRoll = Math.random();
                    if (floorLevel === 4 || floorLevel === 10) {
                        // 4F・10Fではドロップなし
                    } else if (dropRoll < 0.02 && wallDropCount < 2) {
                        // アイテム出現（2%、上限2個/フロア）: 壊した壁の元の位置にアイテムを落とす
                        const dropItems = [SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.HEAL_TOME, SYMBOLS.BREAKER_TOME];
                        const dropItem = dropItems[Math.floor(Math.random() * dropItems.length)];
                        // Wが移動済みなので、壊した壁の位置（nx,ny）にはWがいる → 1マス手前（元の位置）に落とす
                        const dropX = nx - d.x, dropY = ny - d.y;
                        if (dropX >= 1 && dropX < COLS - 1 && dropY >= 1 && dropY < ROWS - 1 &&
                            map[dropY][dropX] === SYMBOLS.FLOOR && !(dropX === player.x && dropY === player.y)) {
                            map[dropY][dropX] = dropItem;
                            wallDropCount++;
                            spawnFloatingText(dropX, dropY, "FOUND!", '#fbbf24');
                            addLog("Something was buried in the wall!");
                        }
                    } else if (dropRoll < 0.04) {
                        // 敵出現（2%）: 壊した壁の元の位置に敵を出す
                        const dropX = nx - d.x, dropY = ny - d.y;
                        if (dropX >= 1 && dropX < COLS - 1 && dropY >= 1 && dropY < ROWS - 1 &&
                            map[dropY][dropX] === SYMBOLS.FLOOR && !(dropX === player.x && dropY === player.y) &&
                            !enemies.some(oe => oe.x === dropX && oe.y === dropY)) {
                            enemies.push({
                                type: 'BOMBER', x: dropX, y: dropY,
                                hp: 1, maxHp: 1,
                                flashUntil: 0, offsetX: 0, offsetY: 0, expValue: 12,
                                stunTurns: 0
                            });
                            spawnFloatingText(dropX, dropY, "!?", '#ef4444');
                            addLog("An enemy emerged from the rubble!");
                        }
                    }
                    return true;
                } else if (canEnemyMove(nx, ny, e)) {
                    e.x = nx; e.y = ny;
                    return true;
                }
                return false;
            };

            for (const d of orderedDirs) {
                if (tryMove(d)) {
                    // 移動成功した方向を記憶
                    e.breakerDir = allDirs.indexOf(d);
                    if (e.breakerDir === -1) e.breakerDir = allDirs.findIndex(ad => ad.x === d.x && ad.y === d.y);
                    moved = true;
                    break;
                }
            }
            // 隣接していたら攻撃（逃げられなかった場合、ステルス中は攻撃しない）
            if (!moved && minDist === 1 && bestTarget && bestTarget.isPlayer && !player.isStealth) {
                e.offsetX = (bestTarget.x - e.x) * 10; e.offsetY = (bestTarget.y - e.y) * 10;
                spawnSlash(bestTarget.x, bestTarget.y);
                SOUNDS.ENEMY_ATTACK();
                let damage = Math.max(1, (Math.floor(floorLevel / 2) + 6) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                if (player.isDefending) {
                    if (Math.random() < 0.03) { SOUNDS.PARRY(); spawnFloatingText(player.x, player.y, "PARRY!", "#fff"); damage = 0; }
                    else damage = Math.max(1, Math.floor(damage * 0.25));
                }
                if (damage > 0) {
                    breakStealth();
                    SOUNDS.DAMAGE();
                    player.hp -= damage; player.flashUntil = performance.now() + 200;
                    if (player.hp > 0) animateBounce(player);
                    spawnDamageText(player.x, player.y, damage, '#ededed');
                    if (player.hp <= 0) { player.hp = 0; updateUI(); }
                }
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                attackOccurred = true;
                await new Promise(r => setTimeout(r, 60));
                e.offsetX = 0; e.offsetY = 0;
            }
        } else if (e.type === 'LAYER') {
            // LAYERの移動AI: 複数アルゴリズムで複雑な迷路を生成
            const allDirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

            // 初期化: 移動アルゴリズムとパラメータ
            if (e.layerDir == null) {
                e.layerDir = Math.floor(Math.random() * 4);
                // アルゴリズム: 'STRAIGHT'=直進, 'ZIGZAG'=ジグザグ, 'SPIRAL'=螺旋, 'RANDOM_WALK'=ランダム歩行
                const algos = ['STRAIGHT', 'ZIGZAG', 'SPIRAL', 'RANDOM_WALK'];
                e.layerAlgo = algos[Math.floor(Math.random() * algos.length)];
                e.layerSteps = 0;        // 現アルゴリズムでの歩数
                e.layerSegLen = 3 + Math.floor(Math.random() * 5); // セグメント長
                e.layerSpiral = 0;       // 螺旋用: 現在の辺の長さ
                e.layerSpiralSide = 0;   // 螺旋用: 辺カウント
            }

            e.layerSteps++;

            // 一定歩数でアルゴリズムを切り替え（複雑な軌跡を描く）
            if (e.layerSteps > 8 + Math.floor(Math.random() * 12)) {
                const algos = ['STRAIGHT', 'ZIGZAG', 'SPIRAL', 'RANDOM_WALK'];
                e.layerAlgo = algos[Math.floor(Math.random() * algos.length)];
                e.layerSteps = 0;
                e.layerSegLen = 3 + Math.floor(Math.random() * 5);
                e.layerSpiral = 0;
                e.layerSpiralSide = 0;
            }

            // アルゴリズムに応じた方向決定
            let chosenDir = null;
            const curDir = allDirs[e.layerDir];

            if (e.layerAlgo === 'STRAIGHT') {
                // 直進優先、壁に当たったら90度ターン
                chosenDir = curDir;
            } else if (e.layerAlgo === 'ZIGZAG') {
                // セグメント長ごとに左右交互に90度ターン
                if (e.layerSteps % e.layerSegLen === 0) {
                    // 現在の方向に対して垂直方向
                    const perpDirs = allDirs.filter(d => d.x !== curDir.x && d.y !== curDir.y && !(d.x === -curDir.x && d.y === -curDir.y));
                    const turnIdx = Math.floor(e.layerSteps / e.layerSegLen) % 2;
                    chosenDir = perpDirs[turnIdx] || perpDirs[0];
                } else {
                    chosenDir = curDir;
                }
            } else if (e.layerAlgo === 'SPIRAL') {
                // 螺旋: 一定歩数直進→右折→繰り返し（辺が徐々に伸びる）
                if (e.layerSpiral <= 0) {
                    // 右折（時計回り）
                    const turnMap = { '0,-1': { x: 1, y: 0 }, '1,0': { x: 0, y: 1 }, '0,1': { x: -1, y: 0 }, '-1,0': { x: 0, y: -1 } };
                    const key = `${curDir.x},${curDir.y}`;
                    chosenDir = turnMap[key] || curDir;
                    e.layerSpiralSide++;
                    e.layerSpiral = 2 + Math.floor(e.layerSpiralSide / 2);
                } else {
                    chosenDir = curDir;
                    e.layerSpiral--;
                }
            } else {
                // RANDOM_WALK: 毎ターン逆走以外のランダム方向
                const candidates = allDirs.filter(d => !(d.x === -curDir.x && d.y === -curDir.y));
                chosenDir = candidates[Math.floor(Math.random() * candidates.length)];
            }

            // 端に近い場合は中心方向を優先
            const nearEdge = e.x <= 2 || e.x >= COLS - 3 || e.y <= 2 || e.y >= ROWS - 3;
            if (nearEdge) {
                const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
                const toCenterDx = cx - e.x, toCenterDy = cy - e.y;
                allDirs.sort((a, b) => (b.x * toCenterDx + b.y * toCenterDy) - (a.x * toCenterDx + a.y * toCenterDy));
                chosenDir = allDirs[0];
            }

            // 穴（階段）を探して最も近いものを記録
            let nearestStair = null;
            let nearestStairDist = Infinity;
            for (let sy = 1; sy < ROWS - 1; sy++) {
                for (let sx = 1; sx < COLS - 1; sx++) {
                    if (map[sy][sx] === SYMBOLS.STAIRS) {
                        const sd = Math.abs(sx - e.x) + Math.abs(sy - e.y);
                        if (sd < nearestStairDist) { nearestStairDist = sd; nearestStair = { x: sx, y: sy }; }
                    }
                }
            }

            // 各方向の「広さスコア」を計算（進んだ先の直線上の空きマス数を遠くまで見る）
            const dirScore = (d) => {
                const nx = e.x + d.x, ny = e.y + d.y;
                if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) return -1;
                let score = 0;
                // 進行方向の直線上をどこまで進めるか（最大10マス先まで見る）
                for (let r = 1; r <= 10; r++) {
                    const fx = nx + d.x * r, fy = ny + d.y * r;
                    if (fx <= 0 || fx >= COLS - 1 || fy <= 0 || fy >= ROWS - 1) break;
                    if (map[fy][fx] === SYMBOLS.WALL) break;
                    if (tempWalls.some(w => w.x === fx && w.y === fy)) { score += 1; break; } // tempWallは壊せるので少しだけ加算
                    score += 2;
                }
                // 周囲の空きスペース（5マス先まで4方向を見る）
                for (let r = 1; r <= 5; r++) {
                    for (const ad of allDirs) {
                        const cx = nx + ad.x * r, cy = ny + ad.y * r;
                        if (cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS &&
                            map[cy][cx] !== SYMBOLS.WALL &&
                            !tempWalls.some(w => w.x === cx && w.y === cy)) {
                            score++;
                        }
                    }
                }
                // 壁の近さボーナス（隣に壁1マスがあると少しプラス、ウィスプが回りやすい配置になる）
                for (const ad of allDirs) {
                    const wx = nx + ad.x, wy = ny + ad.y;
                    if (wx >= 0 && wx < COLS && wy >= 0 && wy < ROWS && map[wy][wx] === SYMBOLS.WALL) {
                        score += 1;
                    }
                }
                // 逆走ペナルティ: 直前の方向と逆なら大きく減点
                if (d.x === -curDir.x && d.y === -curDir.y) {
                    score -= 10;
                }
                // 穴（階段）への接近ボーナス: 近づくなら強くプラス、遠ざかるならマイナス
                if (nearestStair) {
                    const curDist = Math.abs(e.x - nearestStair.x) + Math.abs(e.y - nearestStair.y);
                    const newDist = Math.abs(nx - nearestStair.x) + Math.abs(ny - nearestStair.y);
                    if (newDist < curDist) score += 14;
                    else if (newDist > curDist) score -= 5;
                }
                return score;
            };

            // 方向候補リスト: 広さスコアで並べ替え
            const perpDirsAll = allDirs.filter(d => d.x !== chosenDir.x && d.y !== chosenDir.y && !(d.x === -chosenDir.x && d.y === -chosenDir.y));
            if (Math.random() < 0.5) perpDirsAll.reverse();
            const reverseOfChosen = allDirs.find(d => d.x === -chosenDir.x && d.y === -chosenDir.y);
            let tryDirs = [chosenDir, ...perpDirsAll, reverseOfChosen];
            // スコア順でソート（chosenDirに小さなボーナス、広い方向を強く優先）
            tryDirs.sort((a, b) => {
                const sa = dirScore(a) + (a === chosenDir ? 1 : 0);
                const sb = dirScore(b) + (b === chosenDir ? 1 : 0);
                return sb - sa;
            });

            let moved = false;
            let crushedWall = false; // tempWallを壊して進んだフラグ
            const oldX = e.x, oldY = e.y;
            for (const d of tryDirs) {
                const nx = e.x + d.x, ny = e.y + d.y;
                if (nx <= 0 || nx >= COLS - 1 || ny <= 0 || ny >= ROWS - 1) continue;
                if (nx === player.x && ny === player.y) continue;
                if (enemies.some(oe => oe !== e && oe.x === nx && oe.y === ny)) continue;
                // 穴（STAIRS）には乗らない
                if (map[ny][nx] === SYMBOLS.STAIRS) continue;
                // tempWallがあれば壊して進む
                const twIdx = tempWalls.findIndex(w => w.x === nx && w.y === ny);
                if (twIdx !== -1) {
                    tempWalls.splice(twIdx, 1);
                    SOUNDS.WALL_BREAK();
                    spawnFloatingText(nx, ny, "CRUSH!", '#a78bfa');
                    e.x = nx; e.y = ny;
                    e.layerDir = allDirs.findIndex(ad => ad.x === d.x && ad.y === d.y);
                    if (e.layerDir === -1) e.layerDir = 0;
                    moved = true;
                    crushedWall = true;
                    break;
                }
                // 爆弾があれば壊して進む（tempWallと同様）
                const bombIdx = bombs.findIndex(b => b.x === nx && b.y === ny);
                if (bombIdx !== -1) {
                    bombs[bombIdx].timer = 0;
                    // 即爆発（連鎖処理含む）
                    let hasDetonation = true;
                    while (hasDetonation) {
                        hasDetonation = false;
                        const readyBombs = bombs.filter(b => b.timer <= 0);
                        for (const bomb of readyBombs) {
                            if (bombs.includes(bomb)) {
                                detonateBomb(bomb);
                                hasDetonation = true;
                            }
                        }
                    }
                    e.x = nx; e.y = ny;
                    e.layerDir = allDirs.findIndex(ad => ad.x === d.x && ad.y === d.y);
                    if (e.layerDir === -1) e.layerDir = 0;
                    moved = true;
                    crushedWall = true;
                    break;
                }
                if (canEnemyMove(nx, ny, e)) {
                    e.x = nx; e.y = ny;
                    e.layerDir = allDirs.findIndex(ad => ad.x === d.x && ad.y === d.y);
                    if (e.layerDir === -1) e.layerDir = 0;
                    moved = true;
                    break;
                }
            }

            // 移動後、元いた場所にtempWallを設置（壊して進んだ場合は置かない＝同じ場所の往復を防ぐ）
            if (moved && !crushedWall) {
                if (oldX > 1 && oldX < COLS - 2 && oldY > 1 && oldY < ROWS - 2) {
                    // 仲間が隣接している場合はブロックを置かない（仲間を封鎖しないため）
                    const allyNearby = enemies.some(ae => ae.isAlly && ae.hp > 0 &&
                        Math.abs(ae.x - oldX) <= 1 && Math.abs(ae.y - oldY) <= 1);
                    if (!allyNearby &&
                        !tempWalls.some(w => w.x === oldX && w.y === oldY) &&
                        map[oldY][oldX] !== SYMBOLS.WALL && map[oldY][oldX] !== SYMBOLS.STAIRS &&
                        !(oldX === player.x && oldY === player.y)) {
                        tempWalls.push({ x: oldX, y: oldY, hp: 2 });
                        SOUNDS.SELECT(); SOUNDS.MOVE();
                        spawnFloatingText(oldX, oldY, "BLOCK!", '#a78bfa');
                    }
                }
            }

            // 隣接していたら攻撃
            if (!moved && minDist === 1 && bestTarget.isPlayer) {
                e.offsetX = (bestTarget.x - e.x) * 10; e.offsetY = (bestTarget.y - e.y) * 10;
                spawnSlash(bestTarget.x, bestTarget.y);
                SOUNDS.ENEMY_ATTACK();
                const _kingAura = enemies.some(k => k.type === 'KING' && k.hp > 0 && !k._dead);
                let damage = Math.max(1, (Math.floor(floorLevel / 2) + 3 + (_kingAura ? 3 : 0)) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                if (player.isDefending) {
                    if (Math.random() < 0.03) { SOUNDS.PARRY(); spawnFloatingText(player.x, player.y, "PARRY!", "#fff"); damage = 0; }
                    else damage = Math.max(1, Math.floor(damage * 0.25));
                }
                if (damage > 0) {
                    breakStealth();
                    SOUNDS.DAMAGE();
                    player.hp -= damage; player.flashUntil = performance.now() + 200;
                    if (player.hp > 0) animateBounce(player);
                    spawnDamageText(player.x, player.y, damage, _kingAura ? '#fbbf24' : '#ededed');
                    if (player.hp <= 0) { player.hp = 0; updateUI(); }
                }
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                attackOccurred = true;
                await new Promise(r => setTimeout(r, 60));
                e.offsetX = 0; e.offsetY = 0;
            }
        } else if (minDist === 1) {
            // 攻撃演出
            if (e.type === 'ORC') {
                // オーク専用：溜め演出を大幅に強化
                const kx = bestTarget.x - e.x, ky = bestTarget.y - e.y;
                const baseOX = -kx * 18, baseOY = -ky * 18; // 1マスの9割近く身を引く

                SOUNDS.SELECT(); // 溜め開始の合図

                // グッと身を引き、小刻みに震えて力を溜める
                for (let i = 0; i < 4; i++) {
                    e.offsetX = baseOX + (Math.random() - 0.5) * 4;
                    e.offsetY = baseOY + (Math.random() - 0.5) * 4;
                    draw();
                    await new Promise(r => setTimeout(r, 20));
                }

                // 限界まで溜めて赤く光る（フラッシュ演出）
                e.flashUntil = performance.now() + 100;
                e.offsetX = baseOX; e.offsetY = baseOY;
                draw();
                await new Promise(r => setTimeout(r, 50));

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
                let damage = Math.max(1, (Math.floor(floorLevel / 2) + (e.type === 'SNAKE' ? 5 : (e.type === 'ORC' ? 10 : (e.type === 'MADMAN' ? 8 : (e.type === 'BREAKER' ? 6 : (e.type === 'LAYER' ? 3 : 1)))))) - player.armorCount - (hasRing('TOUGH_RING') ? 1 : 0));
                if (player.isDefending) {
                    if (Math.random() < 0.03) { SOUNDS.PARRY(); spawnFloatingText(player.x, player.y, "PARRY!", "#fff"); damage = 0; }
                    else damage = Math.max(1, Math.floor(damage * 0.25));
                }
                if (damage > 0) {
                    if (e.type === 'ORC') {
                        addLog("The Orc's mighty blow sends you flying!");
                        await knockbackPlayer(player.x - e.x, player.y - e.y, 10 + Math.floor(floorLevel / 2), true);
                    } else if (e.type === 'MADMAN') {
                        // 狂人: 叫び声ログ + 20%で二連撃
                        const madCries = ['"AAAAARGH!!"', '"Kill... kill you..."', '"Let me out... LET ME OUT!!"', '"I trust no one... no one anymore..."'];
                        addLog(`The MADMAN screams: ${madCries[Math.floor(Math.random() * madCries.length)]}`);
                        SOUNDS.DAMAGE(); setScreenShake(6, 150);
                        player.hp -= damage; player.flashUntil = performance.now() + 200;
                        if (player.hp > 0) animateBounce(player);
                        spawnDamageText(player.x, player.y, damage, '#ef4444');
                        if (player.hp <= 0) { player.hp = 0; updateUI(); }
                        // 20%で狂乱の二連撃
                        if (player.hp > 0 && Math.random() < 0.20) {
                            await new Promise(r => setTimeout(r, 80));
                            const dmg2 = Math.max(1, Math.floor(damage * 0.6));
                            addLog("The MADMAN screams and strikes again!");
                            SOUNDS.DAMAGE();
                            player.hp -= dmg2; player.flashUntil = performance.now() + 200;
                            spawnDamageText(player.x, player.y, dmg2, '#ef4444');
                        }
                    } else {
                        const fatal = Math.random() < 0.05;
                        if (fatal) { damage *= 3; SOUNDS.FATAL(); setScreenShake(15, 400); addLog("💥 FATAL BLOW! 💥"); }
                        else SOUNDS.DAMAGE();
                        player.hp -= damage; player.flashUntil = performance.now() + 200;
                        if (player.hp > 0) animateBounce(player); // ダメージで跳ねる
                        spawnDamageText(player.x, player.y, damage, fatal ? '#ff0000' : '#ededed');
                        if (player.hp <= 0) { player.hp = 0; updateUI(); }
                    }
                }
                if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
            } else {
                // 味方への攻撃（ダメージは控えめにして仲間が即死しにくくする）
                const dmg = Math.max(1, 2 + Math.floor(floorLevel / 3));
                bestTarget.obj.hp -= dmg;
                bestTarget.obj.flashUntil = performance.now() + 100;
                spawnDamageText(bestTarget.x, bestTarget.y, dmg, '#f87171');
                if (bestTarget.obj.hp <= 0) handleEnemyDeath(bestTarget.obj);
            }
            attackOccurred = true;
            await new Promise(r => setTimeout(r, 60));
            e.offsetX = 0; e.offsetY = 0;
        } else if ((e.type === 'FROST' || e.type === 'BLAZE') && minDist > detectRange) {
            // FROST/BLAZE: ターゲットが遠くてもBREAKERが近ければ逃げる
            const nearBreaker = enemies.find(ob => ob.type === 'BREAKER' && !ob._dead &&
                Math.abs(ob.x - e.x) + Math.abs(ob.y - e.y) <= 5);
            if (nearBreaker) {
                const oldPos = { x: e.x, y: e.y };
                const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
                // BREAKERから遠ざかる方向を優先
                dirs.sort((a, b) => {
                    const distA = Math.abs(nearBreaker.x - (e.x + a.x)) + Math.abs(nearBreaker.y - (e.y + a.y));
                    const distB = Math.abs(nearBreaker.x - (e.x + b.x)) + Math.abs(nearBreaker.y - (e.y + b.y));
                    if (distB !== distA) return distB - distA;
                    return Math.random() - 0.5;
                });
                let moved = false;
                for (const d of dirs) {
                    if (canEnemyMove(e.x + d.x, e.y + d.y, e)) {
                        e.x += d.x; e.y += d.y; moved = true; break;
                    }
                }
                if (moved && !e._dead) {
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
        } else if (!e.isAlly && movingFairies.some(f => {
            const screenOk = f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y);
            const distE = Math.abs(f.x - e.x) + Math.abs(f.y - e.y);
            return screenOk && distE <= 3;
        })) {
            // 妖精守護範囲内の敵は範囲外へ逃走する
            const nearFairy = movingFairies.find(f => {
                const screenOk = f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y);
                return screenOk && Math.abs(f.x - e.x) + Math.abs(f.y - e.y) <= 3;
            });
            if (nearFairy) {
                const dirs = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
                let bestDir = null;
                let bestDist = Math.abs(nearFairy.x - e.x) + Math.abs(nearFairy.y - e.y);
                for (const d of dirs) {
                    const nx = e.x + d.x, ny = e.y + d.y;
                    if (!canEnemyMove(nx, ny, e)) continue;
                    const nd = Math.abs(nearFairy.x - nx) + Math.abs(nearFairy.y - ny);
                    if (nd > bestDist) { bestDist = nd; bestDir = d; }
                }
                if (bestDir) { e.x += bestDir.x; e.y += bestDir.y; }
            }
        } else if (minDist <= detectRange) {
            // 接近
            const oldPos = { x: e.x, y: e.y };
            const dx = bestTarget.x - e.x, dy = bestTarget.y - e.y;
            let sx = dx === 0 ? 0 : dx / Math.abs(dx), sy = dy === 0 ? 0 : dy / Math.abs(dy);
            let moved = false;

            // 妖精守護ゾーン（距離2以内）には踏み込まない
            const inFairyZone = (nx, ny) => movingFairies.some(f =>
                (f.screenX === -1 || (f.screenX === currentScreen.x && f.screenY === currentScreen.y)) &&
                Math.abs(f.x - nx) + Math.abs(f.y - ny) <= 2
            );

            // 通常の移動
            if (Math.abs(dx) > Math.abs(dy)) {
                if (canEnemyMove(e.x + sx, e.y, e) && !inFairyZone(e.x + sx, e.y)) { e.x += sx; moved = true; }
                else if (canEnemyMove(e.x, e.y + sy, e) && !inFairyZone(e.x, e.y + sy)) { e.y += sy; moved = true; }
            } else {
                if (canEnemyMove(e.x, e.y + sy, e) && !inFairyZone(e.x, e.y + sy)) { e.y += sy; moved = true; }
                else if (canEnemyMove(e.x + sx, e.y, e) && !inFairyZone(e.x + sx, e.y)) { e.x += sx; moved = true; }
            }



            if (moved) {
                if (e.type === 'SNAKE') {
                    SOUNDS.SNAKE_MOVE();
                    for (let i = e.body.length - 1; i > 0; i--) e.body[i] = { ...e.body[i - 1] };
                    e.body[0] = oldPos;
                }

                // 敵の氷スライド (フロストとブレイズは滑らない)
                let esx = e.x - oldPos.x, esy = e.y - oldPos.y;
                while (e.type !== 'FROST' && e.type !== 'BLAZE' && e.type !== 'BREAKER' && e.type !== 'LAYER' && map[e.y][e.x] === SYMBOLS.ICE) {
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
                    if (isRealHole(e.x, e.y)) {
                        scheduleEnemyFall(e, "An enemy slid into the HOLE!");
                        break;
                    }
                    await new Promise(r => setTimeout(r, 15));
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
                if (!e._dead && isRealHole(e.x, e.y)) {
                    scheduleEnemyFall(e, "An enemy fell into the HOLE!");
                }
            }
        }
    }

    if (!attackOccurred && enemies.length > 0) await new Promise(r => setTimeout(r, 50));

    // 深層(101F+)の家族NORMAL敵：隣接ペアでbreedTimerを加算、閾値で繁殖
    if (floorLevel >= 101) {
        const BREED_THRESHOLD = 20;
        const FAMILY_CAP = 5;
        const spawnQueue = [];
        for (const e of enemies) {
            if (e.type !== 'NORMAL' || e.familyId == null || e._dead || e.hp <= 0) continue;
            e.breedTimer = (e.breedTimer || 0) + 1;
            if (e.breedTimer >= BREED_THRESHOLD) {
                e.breedTimer = 0;
                const hasAdjacentSibling = enemies.some(o =>
                    o !== e && o.type === 'NORMAL' && o.familyId === e.familyId && !o._dead &&
                    Math.abs(o.x - e.x) + Math.abs(o.y - e.y) === 1
                );
                if (hasAdjacentSibling) {
                    const familySize = enemies.filter(o => o.familyId === e.familyId && !o._dead).length;
                    if (familySize < FAMILY_CAP) {
                        const bDirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
                        bDirs.sort(() => Math.random() - 0.5);
                        for (const d of bDirs) {
                            const nx = e.x + d.x, ny = e.y + d.y;
                            if (canEnemyMove(nx, ny, e) && !(nx === player.x && ny === player.y)) {
                                spawnQueue.push({ x: nx, y: ny, familyId: e.familyId, homeX: e.homeX, homeY: e.homeY });
                                break;
                            }
                        }
                    }
                }
            }
        }
        for (const sp of spawnQueue) {
            const child = { type:'NORMAL', x:sp.x, y:sp.y, hp:3+floorLevel, maxHp:3+floorLevel, flashUntil:0, offsetX:0, offsetY:0, expValue:5, stunTurns:0, familyId:sp.familyId, homeX:sp.homeX, homeY:sp.homeY, breedTimer:0 };
            enemies.push(child);
            spawnFloatingText(sp.x, sp.y, "♥", '#f472b6');
        }
    }

    // ターンの最後にレーザー判定
    await applyLaserDamage();

    // 炎の飛翔体を移動
    await moveFlameProjectiles();

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
                addLog("Rock spikes burst from the ground! Sharp rock pierces your body!");
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
                addLog("Rock spikes burst from the ground!");
                SOUNDS.EXPLODE();
                setScreenShake(10, 200);
            }
            // つららを耐久度2の障害物として配置
            tempWalls.push({ x: trap.x, y: trap.y, hp: 2, type: 'ICICLE' });
        }
    }

    // ターンの最後にもチェック（近づいてきた敵を仲間にする）
    processFairyCharm();

    // 遭難冒険者のアニメーション：数ターンに一度ジャンプして向きを変える
    if (merchantState && map[merchantState.y] && map[merchantState.y][merchantState.x] === SYMBOLS.MERCHANT) {
        merchantState.nextAction--;
        if (merchantState.nextAction <= 0) {
            merchantState.facing = merchantState.facing === 'LEFT' ? 'RIGHT' : 'LEFT';
            merchantState.jumpUntil = performance.now() + 300;
            merchantState.nextAction = 2 + Math.floor(Math.random() * 4); // 2〜5ターン後に次のアクション
        }
    }

    // 遭難した冒険者（商人）の逃走判定
    if (merchantState && floorLevel !== 10 && map[merchantState.y] && map[merchantState.y][merchantState.x] === SYMBOLS.MERCHANT) {
        const mx = merchantState.x, my = merchantState.y;
        const threatenedByEnemy = enemies.some(e => !e.isAlly && e.hp > 0 && Math.abs(e.x - mx) <= 1 && Math.abs(e.y - my) <= 1);
        const nearWisp = wisps.find(w => Math.abs(w.x - mx) + Math.abs(w.y - my) <= 3);

        // 脅威（隣接敵 or 3マス以内ウィスプ）があれば逃げを試みる
        const threat = threatenedByEnemy ? { x: mx + (enemies.find(e => !e.isAlly && e.hp > 0 && Math.abs(e.x - mx) <= 1 && Math.abs(e.y - my) <= 1)?.x - mx || 0), y: my + (enemies.find(e => !e.isAlly && e.hp > 0 && Math.abs(e.x - mx) <= 1 && Math.abs(e.y - my) <= 1)?.y - my || 0) }
                       : nearWisp ? nearWisp : null;
        if (threat) {
            // 脅威から遠ざかる方向へ1マス移動を試みる
            const moves = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
            moves.sort((a, b) => {
                const distA = Math.abs(mx + a.dx - threat.x) + Math.abs(my + a.dy - threat.y);
                const distB = Math.abs(mx + b.dx - threat.x) + Math.abs(my + b.dy - threat.y);
                return distB - distA;
            });
            let moved = false;
            for (const move of moves) {
                const nx = mx + move.dx, ny = my + move.dy;
                if (nx < 1 || nx >= COLS - 1 || ny < 1 || ny >= ROWS - 1) continue;
                if (map[ny][nx] !== SYMBOLS.FLOOR) continue;
                if (enemies.some(e => e.x === nx && e.y === ny && e.hp > 0)) continue;
                if (wisps.some(w => w.x === nx && w.y === ny)) continue;
                if (isTileInLaser(nx, ny)) continue;
                map[my][mx] = SYMBOLS.FLOOR;
                map[ny][nx] = SYMBOLS.MERCHANT;
                merchantState.x = nx;
                merchantState.y = ny;
                moved = true;
                break;
            }
            // 逃げ場がなければ、隣接している敵と戦う
            if (!moved && threatenedByEnemy) {
                const adjacentEnemy = enemies.find(e => !e.isAlly && e.hp > 0 && Math.abs(e.x - mx) <= 1 && Math.abs(e.y - my) <= 1 && !(e.x === mx && e.y === my));
                if (adjacentEnemy) {
                    const adx = adjacentEnemy.x - mx;
                    const ady = adjacentEnemy.y - my;
                    // 攻撃モーション（プレイヤーと同じ）
                    merchantState.offsetX = adx * 10;
                    merchantState.offsetY = ady * 10;
                    setTimeout(() => { if (merchantState) { merchantState.offsetX = 0; merchantState.offsetY = 0; } }, 100);
                    spawnSlash(adjacentEnemy.x, adjacentEnemy.y);
                    animateBounce(merchantState);
                    // ダメージを与える（商人の攻撃力: 8）
                    const mAtk = 8;
                    adjacentEnemy.hp -= mAtk;
                    adjacentEnemy.flashUntil = performance.now() + 100;
                    spawnDamageText(adjacentEnemy.x, adjacentEnemy.y, mAtk, '#fbbf24');
                    SOUNDS.HIT && SOUNDS.HIT();
                    if (adjacentEnemy.hp <= 0) {
                        handleEnemyDeath(adjacentEnemy, false);
                    }
                }
            }
        }
    }

    floorTurnCount++;

}

async function applyLaserDamage() {
    for (const e of enemies) {
        if ((e.type === 'TURRET' || e.type === 'HOPPER_TURRET') && e.hp > 0 && !e.isFalling && !e.isAlly) {
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
                            if (oe.type === 'BOMBER') {
                                // BOMBERはレーザーで即死 → 連鎖爆発
                                oe.hp = 0; oe.flashUntil = performance.now() + 100;
                                spawnFloatingText(oe.x, oe.y, "ZAP!", "#f87171");
                                handleEnemyDeath(oe);
                            } else {
                            oe.hp -= enemyLaserDmg; oe.flashUntil = performance.now() + 100;
                            spawnDamageText(oe.x, oe.y, enemyLaserDmg, '#f87171');
                            SOUNDS.DAMAGE();
                            if (oe.hp <= 0) handleEnemyDeath(oe);
                            }
                        } else if ((oe.type === 'SNAKE' || oe.type === 'SUMMONER') && oe.body && oe.body.some(s => s.x === lx && s.y === ly)) {
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

// 炎ブロックから炎を発射（攻撃方向と同じ方向）
// 爆弾星ブロックから爆弾を発射し、着弾点で爆発させる
async function launchBombProjectile(fromX, fromY, dx, dy) {
    const bp = { x: fromX + dx, y: fromY + dy, dx, dy };
    // 開始位置が壁なら即爆発（ブロック位置で）
    if (bp.x < 0 || bp.x >= COLS || bp.y < 0 || bp.y >= ROWS || isWallAt(bp.x, bp.y)) {
        detonateBomb({ x: fromX, y: fromY });
        return;
    }
    // 開始位置に敵またはプレイヤーがいれば即そこで爆発
    if (enemies.some(e => e.x === bp.x && e.y === bp.y && e.hp > 0 && !e._dead) ||
        (player.x === bp.x && player.y === bp.y)) {
        detonateBomb({ x: bp.x, y: bp.y });
        return;
    }
    bombProjectiles.push(bp);
    // 1マスずつ飛ばしてアニメーション
    while (true) {
        draw(performance.now());
        await new Promise(r => setTimeout(r, 55));
        const nx = bp.x + bp.dx;
        const ny = bp.y + bp.dy;
        // 範囲外 or 壁に当たったら現在地で爆発
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || isWallAt(nx, ny)) break;
        // 敵に当たったら敵のいる位置で爆発
        if (enemies.some(e => e.x === nx && e.y === ny && e.hp > 0 && !e._dead)) { bp.x = nx; bp.y = ny; break; }
        // プレイヤーに当たったら爆発
        if (player.x === nx && player.y === ny) { bp.x = nx; bp.y = ny; break; }
        bp.x = nx;
        bp.y = ny;
    }
    // 飛翔体を消して爆発
    const bpIdx = bombProjectiles.indexOf(bp);
    if (bpIdx !== -1) bombProjectiles.splice(bpIdx, 1);
    draw(performance.now());
    detonateBomb({ x: bp.x, y: bp.y });
    await new Promise(r => setTimeout(r, 300));
}

function launchFlameProjectile(fromX, fromY, dx, dy, fromIceStar = false) {
    const startX = fromX + dx;
    const startY = fromY + dy;
    if (startX < 0 || startX >= COLS || startY < 0 || startY >= ROWS) return;
    // 開始位置が炎ブロックなら即連鎖（isWallAt より先に判定）
    const startChain = tempWalls.find(w => w.type === 'FIRE_BLOCK' && w.x === startX && w.y === startY);
    if (startChain) {
        if (!startChain.fired) {
            startChain.fired = true;
            const allDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
            for (const d of allDirs) {
                if (!(d.dx === -dx && d.dy === -dy)) {
                    launchFlameProjectile(startX, startY, d.dx, d.dy);
                }
            }
        }
        return;
    }
    if (isWallAt(startX, startY)) return;
    // 開始位置に既にプレイヤーがいる場合は即ダメージ
    if (player.x === startX && player.y === startY && !player.isShielded && !hasRing('FIRE_RING')) {
        const dmg = 8;
        player.hp -= dmg;
        player.flashUntil = performance.now() + 200;
        if (player.hp > 0) animateBounce(player);
        spawnDamageText(startX, startY, dmg, '#ef4444');
        addLog("🔥 Hit by a fire block flame! (-8 HP)");
        SOUNDS.DAMAGE();
        if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); }
        return;
    }
    // 開始位置の敵はアニメーション付きで当たるよう即殺しない → 通常プロジェクタイルとして追加
    flameProjectiles.push({ x: startX, y: startY, dx, dy, life: 40, fromIceStar });
}

// 炎の飛翔体を1マス前進させ、衝突判定を行う
async function moveFlameProjectiles() {
    // 1ターン内で全炎を終点まで飛ばす（1マスずつアニメーション）
    while (flameProjectiles.length > 0) {
        let anyMoved = false;
        for (let i = flameProjectiles.length - 1; i >= 0; i--) {
            const fp = flameProjectiles[i];
            // 現在位置に敵がいれば即ヒット（隣接敵への一瞬表示後に当たる）
            const atCurrent = enemies.find(e => e.x === fp.x && e.y === fp.y && e.hp > 0 && !e._dead && !e.isAlly);
            if (atCurrent) {
                const dmg = atCurrent.hp;
                atCurrent.hp -= dmg;
                atCurrent.flashUntil = performance.now() + 100;
                spawnDamageText(fp.x, fp.y, dmg, '#f97316');
                addLog("🔥 Flames hit the enemy!");
                if (atCurrent.hp <= 0) handleEnemyDeath(atCurrent);
                flameProjectiles.splice(i, 1);
                continue;
            }
            fp.life--;
            if (fp.life <= 0) { flameProjectiles.splice(i, 1); continue; }
            const nx = fp.x + fp.dx;
            const ny = fp.y + fp.dy;
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
                flameProjectiles.splice(i, 1);
                continue;
            }
            // 炎ブロックへの命中 → 入射方向以外の3方向に連鎖発射
            const chainBlock = tempWalls.find(w => w.type === 'FIRE_BLOCK' && w.x === nx && w.y === ny);
            if (chainBlock) {
                if (!chainBlock.fired) {
                    chainBlock.fired = true;
                    const allDirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
                    for (const d of allDirs) {
                        if (!(d.dx === -fp.dx && d.dy === -fp.dy)) {
                            launchFlameProjectile(nx, ny, d.dx, d.dy);
                        }
                    }
                }
                anyMoved = true;
                flameProjectiles.splice(i, 1);
                continue;
            }
            if (isWallAt(nx, ny)) {
                flameProjectiles.splice(i, 1);
                continue;
            }
            fp.x = nx; fp.y = ny;
            anyMoved = true;
            // プレイヤーへのダメージ
            if (player.x === nx && player.y === ny && !player.isShielded) {
                if (!hasRing('FIRE_RING')) {
                    const dmg = 8;
                    player.hp -= dmg;
                    player.flashUntil = performance.now() + 200;
                    if (player.hp > 0) animateBounce(player);
                    spawnDamageText(nx, ny, dmg, '#ef4444');
                    addLog("🔥 Hit by a fire block flame! (-8 HP)");
                    SOUNDS.DAMAGE();
                    if (player.hp <= 0) { player.hp = 0; updateUI(); triggerGameOver(); return; }
                }
                flameProjectiles.splice(i, 1);
                continue;
            }
            // 敵へのダメージ（味方以外）
            const hitEnemy = enemies.find(e => e.x === nx && e.y === ny && e.hp > 0 && !e._dead && !e.isAlly);
            if (hitEnemy) {
                const dmg = hitEnemy.hp;
                hitEnemy.hp -= dmg;
                hitEnemy.flashUntil = performance.now() + 100;
                spawnDamageText(nx, ny, dmg, '#f97316');
                addLog("🔥 Flames hit the enemy!");
                if (hitEnemy.hp <= 0) handleEnemyDeath(hitEnemy);
                flameProjectiles.splice(i, 1);
                continue;
            }
        }
        if (anyMoved || flameProjectiles.length > 0) {
            draw(performance.now());
            await new Promise(r => setTimeout(r, 40)); // 1マス飛ぶごとに40msのアニメーション
        }
        if (!anyMoved) break;
    }
    // 炎の飛翔が終わったら発射済みフラグをリセット（*が戻る）
    tempWalls.forEach(w => { if (w.type === 'FIRE_BLOCK') w.fired = false; });
}

// 指定座標が本物の穴（STAIRS）かどうか（擬態中ミミックの偽穴を除外）
function isRealHole(x, y) {
    if (map[y][x] !== SYMBOLS.STAIRS) return false;
    return !enemies.some(e => e.type === 'MIMIC' && e.disguised && e.x === x && e.y === y);
}

function canEnemyMove(x, y, mover = null) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    // lavaBound フラグ付きの敵（53Fの溶岩専用BLAZE）は溶岩タイル以外に移動不可
    if (mover && mover.lavaBound && map[y][x] !== SYMBOLS.LAVA) return false;
    const tile = map[y][x];
    const isObstacle = [
        SYMBOLS.WALL, SYMBOLS.DOOR, SYMBOLS.BLOCK, SYMBOLS.BLOCK_CRACKED, SYMBOLS.LAVA,
        SYMBOLS.KEY, SYMBOLS.SWORD, SYMBOLS.ARMOR, SYMBOLS.WAND, SYMBOLS.FAIRY,
        SYMBOLS.SPEED, SYMBOLS.CHARM, SYMBOLS.STEALTH, SYMBOLS.TOME,
        SYMBOLS.MERCHANT
    ].includes(tile);
    // ミミックが擬態中の穴には敵が移動できない（本物の穴には落ちてOK）
    if (tile === SYMBOLS.STAIRS && enemies.some(e => e.type === 'MIMIC' && e.disguised && e.x === x && e.y === y)) return false;
    // ブレイズとオークは溶岩を障害物と見なさない
    if (isObstacle) {
        if (tile === SYMBOLS.LAVA && mover && (mover.type === 'BLAZE' || mover.type === 'ORC' || mover.type === 'KEY_RUNNER')) {
            // 移動を許可
        } else {
            return false;
        }
    }
    if (tempWalls.some(w => w.x === x && w.y === y)) return false;
    if (bombs.some(b => b.x === x && b.y === y)) return false;
    if (player.x === x && player.y === y) return false;

    // レーザーの経路は避ける (移動する本人のレーザーは無視。CRAZY_Gは狂ってるので気にしない)
    if (isTileInLaser(x, y, mover) && !(mover && mover.type === 'CRAZY_G')) return false;

    return !enemies.some(e => {
        if (e === mover) return false; // 自分自身は無視
        if (e.x === x && e.y === y) return true;
        if (e.type === 'SNAKE' || e.type === 'DRAGON' || e.type === 'SUMMONER') return (e.body && e.body.some(seg => seg.x === x && seg.y === y));
        return false;
    });
}

window.debugWin = triggerEnding; // コンソールからデバッグ可能に
window.debugWin2 = triggerEnding2; // 第二エンディングデバッグ用

// URLパラメーターによるデバッグ起動
(function() {
    const p = new URLSearchParams(location.search);
    if (p.get('debug') === '2') setTimeout(() => triggerEnding2(), 500);
    if (p.get('debug') === '1') setTimeout(() => triggerEnding(), 500);
})();

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
    stopBGM();
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
        if ((e.type === 'TURRET' || e.type === 'HOPPER_TURRET') && e.hp > 0 && !e.isFalling) {
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

async function startGame(startFloor = 1, isTestMode = false) {
    if (startFloor === 1 && !isTestMode && gameState !== 'OPENING') {
        await playOpeningSequence();
        return;
    }
    // 画面の揺れと状態をリセット
    screenShake.x = 0; screenShake.y = 0; screenShake.until = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    player = {
        x: 0, y: 0, hp: 30, maxHp: 30, level: startFloor, exp: 0, nextExp: 10,
        stamina: 100, swordCount: 0, armorCount: 0,
        hasteTomes: 0, charmTomes: 0, stealthTomes: 0, healTomes: 0, explosionTomes: 0, guardianTomes: 0, escapeTomes: 0, breakerTomes: isTestMode ? 3 : 0,
        isSpeeding: false, isStealth: false, isExtraTurn: false, isShielded: false, isBreaker: false,
        facing: 'LEFT',
        totalKills: 0, offsetX: 0, offsetY: 0, flashUntil: 0,
        hasSword: false, hasKey: false, isDefending: false,
        hasWand: (startFloor >= 2),
        itemInHand: null,
        fairyCount: 0,
        isInfiniteStamina: false,
        gold: 0,
        ownedRings: [],
        equippedRings: [null, null]
    };

    // レベルに合わせてステータスを補正
    player.maxHp = 20 + (player.level * 10);
    player.hp = player.maxHp;
    player.nextExp = player.level <= 5 ? player.level * 7 : player.level * 10;

    // テストプレイ（ステージセレクト）用：壁破壊の魔導書を所持 & ゴールド大量 & 全指輪所持 & 妖精3匹
    if (isTestMode) {
        player.breakerTomes = 3;
        player.gold = 9999;
        player.ownedRings = RINGS.map(r => r.id);
        player.fairyCount = 3;
    }

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
    floorLevel = startFloor; turnCount = 0; tempWalls = []; wisps = []; pendingF4Tutorial = false; pendingF4BreakerTutorial = false;
    initMap(); // 描画エラーを防ぐため、先に構造だけ初期化しておく
    updateUI();

    // 演出の準備：最初から画面を真っ暗にしておく（一瞬のチラつき防止）
    transition.active = true;
    transition.alpha = 1;
    transition.mode = 'FALLING';

    gameState = 'PLAYING';
    await startFloorTransition(); // 着地後に changeBGMTrack() が呼ばれる
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
    const deepUnlocked = localStorage.getItem('deep_unlocked') === '1';
    const saveRaw = localStorage.getItem('minimal_rogue_save');

    // 101F以上のセーブがある → 深層を普通にロード
    if (saveRaw) {
        try {
            const parsed = JSON.parse(saveRaw);
            if (parsed.floorLevel >= 101) {
                if (loadGame()) {
                    screenShake.x = 0; screenShake.y = 0; screenShake.until = 0;
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    isPlayerVisible = false;
                    gameOverAlpha = 0;
                    turnCount = 0;
                    tempWalls = []; wisps = []; bombs = [];
                    initMap();
                    updateUI();
                    transition.active = true;
                    transition.alpha = 1;
                    transition.mode = 'FALLING';
                    gameState = 'PLAYING';
                    await startFloorTransition();
                }
                return;
            }
        } catch(e) {}
    }

    // 深層解放済みで100F以下のセーブ（またはセーブなし）→ 深層スタート
    if (deepUnlocked) {
        await startDeepRun();
        return;
    }

    // 通常ゲームのセーブをロード
    if (loadGame()) {
        screenShake.x = 0; screenShake.y = 0; screenShake.until = 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        isPlayerVisible = false;
        gameOverAlpha = 0;
        turnCount = 0;
        tempWalls = []; wisps = []; bombs = [];
        initMap();
        updateUI();
        transition.active = true;
        transition.alpha = 1;
        transition.mode = 'FALLING';
        gameState = 'PLAYING';
        await startFloorTransition();
    }
}

async function startDeepRun() {
    // 深層への落下演出
    isProcessing = true;
    gameState = 'ENDING_SEQ';
    transition.active = true;
    transition.mode = 'BLACK_OUT';
    transition.alpha = 1.0;
    transition.text = '';

    // 初回のみイントロを表示
    const deepStorySeen = localStorage.getItem('deep_story_seen') === '1';
    if (!deepStorySeen) {
        await showStoryPages([
            ["You survived the dungeon.", "", "あなたはダンジョンを生き延びた。"],
            ["But something calls from below.", "", "しかし、何かが下から呼んでいる。"],
            ["Deeper.", "", "もっと深く。"],
            ["Much deeper.", "", "はるか深くへ。"],
        ], false, false, 3000);
        localStorage.setItem('deep_story_seen', '1');
    }

    // 100F以下のセーブは深層開始前にクリア
    const saveData = localStorage.getItem('minimal_rogue_save');
    if (saveData) {
        try {
            const parsed = JSON.parse(saveData);
            if (parsed.floorLevel <= 100) localStorage.removeItem('minimal_rogue_save');
        } catch(e) {}
    }

    await new Promise(r => setTimeout(r, 500));
    isProcessing = false;
    transition.active = false;

    // 101Fからスタート
    await startGame(101);
}

window.addEventListener('keydown', async e => {
    // エンディング演出中は全入力をブロック
    if (endingSkipLock) {
        e.preventDefault();
        return;
    }

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
            stopBGM();
            gameState = 'TITLE';
            // CONTINUEを初期選択にして誤ってNEW GAMEを選ばないようにする
            titleSelection = localStorage.getItem('minimal_rogue_save') !== null ? 1 : 0;
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
        if (gameState === 'TITLE') {
            // 秘密シーケンス検出（タイトル画面のみ）
            titleSecretBuffer.push(e.key === 'ArrowUp' ? 'ArrowUp' : e.key);
            if (titleSecretBuffer.length > TITLE_SECRET_SEQ.length) titleSecretBuffer.shift();
            if (titleSecretBuffer.join(',') === TITLE_SECRET_SEQ.join(',')) {
                testModeVisible = !testModeVisible;
                titleSecretBuffer = [];
                if (!testModeVisible && titleSelection >= 2) titleSelection = 0;
                SOUNDS.SELECT();
                return;
            }
            const count = testModeVisible ? 4 : 2;
            titleSelection = (titleSelection + count - 1) % count;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'MENU') { menuSelection = (menuSelection + 2) % 3; SOUNDS.SELECT(); return; }
        if (gameState === 'INVENTORY') {
            const items = [player.breakerTomes, player.charmTomes, player.escapeTomes, player.explosionTomes, player.guardianTomes, player.hasteTomes, player.healTomes, player.stealthTomes, player.fairyCount].filter(c => c > 0);
            const count = Math.max(1, items.length);
            inventorySelection = (inventorySelection + count - 1) % count;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'SHOP') {
            shopSelection = (shopSelection + shopStock.length - 1) % shopStock.length;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'RINGS') {
            if (ringEquipPhase === 'SLOT') {
                ringSlotSelection = (ringSlotSelection + 1) % 2;
            } else {
                const owned = RINGS.filter(r => player.ownedRings.includes(r.id));
                const count = owned.length + 1; // +1 for 「外す」
                ringEquipSelection = (ringEquipSelection + count - 1) % count;
            }
            SOUNDS.SELECT(); return;
        }
    }
    if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        if (gameState === 'TITLE') {
            // 秘密シーケンス検出（タイトル画面のみ）
            titleSecretBuffer.push('ArrowDown');
            if (titleSecretBuffer.length > TITLE_SECRET_SEQ.length) titleSecretBuffer.shift();
            if (titleSecretBuffer.join(',') === TITLE_SECRET_SEQ.join(',')) {
                testModeVisible = !testModeVisible;
                titleSecretBuffer = [];
                if (!testModeVisible && titleSelection >= 2) titleSelection = 0;
                SOUNDS.SELECT();
                return;
            }
            const count = testModeVisible ? 4 : 2;
            titleSelection = (titleSelection + 1) % count;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'MENU') { menuSelection = (menuSelection + 1) % 3; SOUNDS.SELECT(); return; }
        if (gameState === 'INVENTORY') {
            const items = [player.breakerTomes, player.charmTomes, player.escapeTomes, player.explosionTomes, player.guardianTomes, player.hasteTomes, player.healTomes, player.stealthTomes, player.fairyCount].filter(c => c > 0);
            const count = Math.max(1, items.length);
            inventorySelection = (inventorySelection + 1) % count;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'SHOP') {
            shopSelection = (shopSelection + 1) % shopStock.length;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'RINGS') {
            if (ringEquipPhase === 'SLOT') {
                ringSlotSelection = (ringSlotSelection + 1) % 2;
            } else {
                const owned = RINGS.filter(r => player.ownedRings.includes(r.id));
                const count = owned.length + 1; // +1 for 「外す」
                ringEquipSelection = (ringEquipSelection + 1) % count;
            }
            SOUNDS.SELECT(); return;
        }
    }
    if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (['TITLE', 'STATUS'].includes(gameState)) e.preventDefault();
        if (gameState === 'TITLE' && titleSelection === 2) {
            testFloor = (testFloor - 2 + 100) % 100 + 1;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'TITLE' && titleSelection === 3) {
            deepTestFloor = deepTestFloor > 101 ? deepTestFloor - 1 : 999;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'STATUS') { statusPage = (statusPage + 2) % 3; SOUNDS.SELECT(); return; }
    }
    if (e.key === 'ArrowRight' || e.key === 'd') {
        if (['TITLE', 'STATUS'].includes(gameState)) e.preventDefault();
        if (gameState === 'TITLE' && titleSelection === 2) {
            testFloor = (testFloor % 100) + 1;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'TITLE' && titleSelection === 3) {
            deepTestFloor = deepTestFloor < 999 ? deepTestFloor + 1 : 101;
            SOUNDS.SELECT(); return;
        }
        if (gameState === 'STATUS') { statusPage = (statusPage + 1) % 3; SOUNDS.SELECT(); return; }
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

    if (gameState === 'CONFIRM_NEWGAME') {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            newGameConfirmSelection = 0; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            newGameConfirmSelection = 1; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'Escape') {
            gameState = 'TITLE'; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'Enter') {
            if (newGameConfirmSelection === 1) {
                startGame();
            } else {
                gameState = 'TITLE';
            }
            SOUNDS.SELECT(); e.preventDefault();
        }
        return;
    }

    if (gameState === 'CONFIRM_BUY') {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            shopConfirmSelection = 0; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'ArrowRight' || e.key === 'd') {
            shopConfirmSelection = 1; SOUNDS.SELECT(); e.preventDefault();
        }
        if (e.key === 'Enter') {
            if (shopConfirmSelection === 0) {
                // YES: 購入実行
                const item = shopStock[shopSelection];
                // 指輪の二重購入を防止（上流チェックの安全弁）
                const alreadyOwned = item.type === 'ring' && player.ownedRings.includes(RINGS[item.ringIndex].id);
                if (!alreadyOwned) {
                    player.gold -= item.cost;
                    hasPurchasedFromMerchant = true;
                    if (item.type === 'ring') {
                        const ring = RINGS[item.ringIndex];
                        player.ownedRings.push(ring.id);
                        SOUNDS.GET_ITEM();
                        addLog(`Bought ${ring.nameJa} (${ring.name})!`);
                        spawnFloatingText(player.x, player.y, ring.nameJa, "#fff");
                    } else if (item.type === 'sword') {
                        player.swordCount++;
                        SOUNDS.GET_ITEM();
                        addLog("Bought a SWORD! (Attack: +3)");
                        spawnFloatingText(player.x, player.y, "ATTACK UP", "#38bdf8");
                    } else if (item.type === 'armor') {
                        player.armorCount++;
                        SOUNDS.GET_ITEM();
                        addLog(`Bought ARMOR! (Defense: ${player.armorCount})`);
                        spawnFloatingText(player.x, player.y, "DEFENSE UP", "#38bdf8");
                    } else if (item.type === 'tome') {
                        player[item.tomeType]++;
                        SOUNDS.GET_ITEM();
                        addLog(`Bought ${item.nameJa}!`);
                        spawnFloatingText(player.x, player.y, item.nameJa, "#fbbf24");
                    }
                    updateUI();
                }
            } else {
                SOUNDS.SELECT();
            }
            gameState = 'SHOP';
            e.preventDefault();
        }
        if (e.key.toLowerCase() === 'x' || e.key === 'Escape') {
            gameState = 'SHOP'; SOUNDS.SELECT(); e.preventDefault();
        }
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
        if (gameState === 'STATUS' && statusPage === 2) {
            toggleBGM();
            return;
        }
        if (gameState === 'TITLE') {
            const hasSave = localStorage.getItem('minimal_rogue_save') !== null;
            if (titleSelection === 0 && hasSave) {
                gameState = 'CONFIRM_NEWGAME';
                newGameConfirmSelection = 0;
                SOUNDS.SELECT();
            } else if (titleSelection === 0) {
                startGame();
                SOUNDS.SELECT();
            } else if (titleSelection === 1 && (hasSave || localStorage.getItem('deep_unlocked') === '1')) {
                continueGame();
                SOUNDS.SELECT();
            } else if (titleSelection === 2) {
                startGame(testFloor, true);
                SOUNDS.SELECT();
            } else if (titleSelection === 3) {
                startGame(deepTestFloor, true);
                SOUNDS.SELECT();
            }
            return;
        } else if (gameState === 'MENU') {
            if (menuSelection === 0) gameState = 'INVENTORY';
            else if (menuSelection === 1) { gameState = 'RINGS'; ringEquipPhase = 'SLOT'; ringSlotSelection = 0; ringEquipSelection = 0; ringScrollOffset = 0; }
            else if (menuSelection === 2) { gameState = 'STATUS'; statusPage = 0; }
            SOUNDS.SELECT();
            return;
        } else if (gameState === 'SHOP') {
            const item = shopStock[shopSelection];
            if (!item) return;
            const canBuy = player.gold >= item.cost;
            const isOwnedRing = item.type === 'ring' && player.ownedRings.includes(RINGS[item.ringIndex].id);
            if (canBuy && !isOwnedRing) {
                gameState = 'CONFIRM_BUY';
                shopConfirmSelection = 0;
                SOUNDS.SELECT();
            }
            return;
        } else if (gameState === 'RINGS') {
            if (ringEquipPhase === 'SLOT') {
                // スロット決定 → 指輪選択フェーズへ
                ringEquipPhase = 'RING';
                ringEquipSelection = 0;
                ringScrollOffset = 0;
                SOUNDS.SELECT();
            } else {
                // 指輪決定
                const ownedRings = RINGS.filter(r => player.ownedRings.includes(r.id));
                const listItems = [null, ...ownedRings]; // index0=外す
                const chosen = listItems[ringEquipSelection];
                if (chosen === null) {
                    // 外す
                    const prev = player.equippedRings[ringSlotSelection];
                    player.equippedRings[ringSlotSelection] = null;
                    if (prev) addLog(`Slot ${ringSlotSelection + 1} の指輪を外した。`);
                } else {
                    // 同じ指輪が他スロットに入っていたら外す
                    const otherSlot = 1 - ringSlotSelection;
                    if (player.equippedRings[otherSlot] === chosen.id) {
                        player.equippedRings[otherSlot] = null;
                    }
                    player.equippedRings[ringSlotSelection] = chosen.id;
                    SOUNDS.GET_ITEM();
                    addLog(`Slot ${ringSlotSelection + 1} に ${chosen.nameJa} を装備した！`);
                }
                // スロット選択に戻る
                ringEquipPhase = 'SLOT';
                SOUNDS.SELECT();
            }
            return;
        } else if (gameState === 'INVENTORY') {
            const fullItems = [
                { id: 'FAIRY', count: player.fairyCount },
                { id: 'BREAKER', count: player.breakerTomes },
                { id: 'CHARM', count: player.charmTomes },
                { id: 'ESCAPE', count: player.escapeTomes },
                { id: 'EXPLOSION', count: player.explosionTomes },
                { id: 'GUARDIAN', count: player.guardianTomes },
                { id: 'HASTE', count: player.hasteTomes },
                { id: 'HEAL', count: player.healTomes },
                { id: 'STEALTH', count: player.stealthTomes },
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
                } else if (selectedItem.id === 'ESCAPE') {
                    gameState = 'CONFIRM_ESCAPE';
                    menuSelection = 1; // デフォルトはNO
                    SOUNDS.SELECT();
                } else if (selectedItem.id === 'HEAL') {
                    gameState = 'PLAYING';
                    useHealTome();
                } else if (selectedItem.id === 'GUARDIAN' && !player.isShielded) {
                    gameState = 'PLAYING';
                    useGuardianTome();
                } else if (selectedItem.id === 'BREAKER' && !player.isBreaker) {
                    gameState = 'PLAYING';
                    useBreakerTome();
                } else if (selectedItem.id === 'FAIRY') {
                    gameState = 'PLAYING';
                    useFairy();
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

    if (e.key === '7' || e.key.toLowerCase() === 'b') {
        if (gameState === 'PLAYING' && !isProcessing && player.breakerTomes > 0 && !player.isBreaker) {
            useBreakerTome();
        }
        return;
    }

    if (e.key === '8' || e.key.toLowerCase() === 'f') {
        if (gameState === 'PLAYING' && !isProcessing && player.fairyCount > 0) {
            useFairy();
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
        else if (gameState === 'SHOP') {
            gameState = 'PLAYING'; SOUNDS.SELECT();
            if (!hasShownMerchantEpilogue && hasPurchasedFromMerchant) {
                hasShownMerchantEpilogue = true;
                const showOnTop = player.y >= Math.floor(ROWS / 2);
                if (floorLevel === 10) {
                    await showStoryPages([
                        ["「ありがとうよ。", "これで死者の世界に渡れるよ……」"],
                        ["死者の国へ渡るための船賃を、棺に入れる風習がある。", "男はそのために、金が必要だったらしい。"]
                    ], false, showOnTop);
                } else if (merchantPatternIndex >= 0) {
                    await showStoryPages(MERCHANT_PATTERNS[merchantPatternIndex].epilogue, false, showOnTop);
                }
            }
        }
        else if (gameState === 'RINGS') {
            if (ringEquipPhase === 'RING') {
                ringEquipPhase = 'SLOT'; // フェーズ2→スロット選択に戻る
            } else {
                gameState = 'MENU'; // フェーズ1→メニューに戻る
            }
            SOUNDS.SELECT();
        }
        return;
    }
    if (e.key === 'Escape') {
        if (gameState === 'SHOP') {
            gameState = 'PLAYING'; SOUNDS.SELECT();
            if (!hasShownMerchantEpilogue && hasPurchasedFromMerchant) {
                hasShownMerchantEpilogue = true;
                const showOnTop = player.y >= Math.floor(ROWS / 2);
                if (floorLevel === 10) {
                    await showStoryPages([
                        ["「ありがとうよ。", "これで死者の世界に渡れるよ……」"],
                        ["死者の国へ渡るための船賃を、棺に入れる風習がある。", "男はそのために、金が必要だったらしい。"]
                    ], false, showOnTop);
                } else if (merchantPatternIndex >= 0) {
                    await showStoryPages(MERCHANT_PATTERNS[merchantPatternIndex].epilogue, false, showOnTop);
                }
            }
            return;
        }
        if (gameState === 'RINGS') {
            if (ringEquipPhase === 'RING') { ringEquipPhase = 'SLOT'; }
            else { gameState = 'MENU'; }
            SOUNDS.SELECT(); return;
        }
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

// @ キーでプレイヤーカラーを切り替え
window.addEventListener('keydown', e => {
    if (e.key === '@') {
        playerColorIndex = (playerColorIndex + 1) % PLAYER_COLORS.length;
        SOUNDS.COLOR_CHANGE();
        e.preventDefault();
    }
});

// F8: デバッグ用エンディング起動
window.addEventListener('keydown', e => {
    if (e.key === 'F8') { stopBGM(); triggerEnding(); }
    if (e.key === 'F9') { stopBGM(); triggerEnding2(); }
});

// スクリーンショット: P キーで Canvas を PNG としてダウンロード
window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'p') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const link = document.createElement('a');
        link.download = `rogue-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
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
            } else if (e.body) {
                if (e.body.some(b => Math.abs(b.x - player.x) + Math.abs(b.y - player.y) <= range)) {
                    inRange = true;
                }
            }

            if (inRange) targets.add(e);
        }
    });

    if (targets.size > 0) {
        const charmImmune = ['DRAGON', 'TURRET', 'HOPPER_TURRET', 'SUMMONER', 'CRAZY_G'];
        targets.forEach(enemy => {
            if (charmImmune.includes(enemy.type)) {
                spawnFloatingText(enemy.x, enemy.y, "RESIST!", "#ff6b6b");
            } else {
                enemy.isAlly = true;
                // 擬態中のミミックをチャームした場合、擬態解除してSTAIRSタイルを除去
                if (enemy.type === 'MIMIC' && enemy.disguised) {
                    enemy.disguised = false;
                    map[enemy.y][enemy.x] = SYMBOLS.FLOOR;
                    enemy.mimicTransitionEnd = performance.now() + 500;
                }
                // KEY_RUNNERをチャームした場合、その場にカギを落とす
                if (enemy.holdsKey) {
                    keyDropUnderTile = map[enemy.y][enemy.x];
                    map[enemy.y][enemy.x] = SYMBOLS.KEY;
                    enemy.holdsKey = false;
                    enemy.trailX = null; enemy.trailY = null;
                    addLog("🔑 The thief dropped the key!");
                    spawnFloatingText(enemy.x, enemy.y, "KEY DROP!", "#fbbf24");
                    playMelody([{ f: 880, d: 0.1 }, { f: 1108, d: 0.1 }, { f: 1320, d: 0.2 }]);
                }
                spawnFloatingText(enemy.x, enemy.y, "CHARMED!!", "#60a5fa");
                charmedCount++;
            }
        });
        if (charmedCount > 0) {
            addLog(`📜 Charmed ${charmedCount} enemies! They joined you!`);
            SOUNDS.CHARM();
        } else {
            addLog("All enemies resisted the charm!");
            SOUNDS.DAMAGE();
        }
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

    // 範囲内の敵に大ダメージ（bodyセグメントも判定対象）
    for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (e.type === 'BREAKER') continue; // BREAKERは爆発無効
        let inRange = Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= range;
        if (!inRange && e.body) {
            inRange = e.body.some(seg => Math.abs(seg.x - player.x) + Math.abs(seg.y - player.y) <= range);
        }
        if (inRange) {
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

async function useBreakerTome() {
    await animateTomeRead();
    player.breakerTomes--;
    player.isBreaker = true;
    SOUNDS.WALL_BREAK();
    addLog("Recited the Breaker Tome! You can smash walls on this floor!");
    spawnFloatingText(player.x, player.y, "WALL BREAKER!!", "#f59e0b");
    updateUI();
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

// isProcessing が例外で永久ロックするのを防ぐ安全弁
window.addEventListener('unhandledrejection', event => {
    console.error('[Game] Unhandled async error:', event.reason);
    if (isProcessing) {
        isProcessing = false;
        console.warn('[Game] isProcessing was stuck; reset to false.');
    }
});

updateUI();
requestAnimationFrame(gameLoop);
addLog("Game Ready.");
