# Minimal Rogue RPG — AI Modification Guide

## Overview
Turn-based roguelike in a single HTML/CSS/JS stack. Canvas rendering + Web Audio API (synthesized sounds, no external sound libs).
- **Goal:** Descend to B100F, destroy the Dungeon Core
- **Post-clear:** "Deep" mode (B101F+), endless with second ending possible
- **Map:** 25 rows × 40 columns, tile-based

## File Structure
```
index.html   — canvas, HUD elements, loads script.js
style.css    — layout only (dark theme, no game logic)
script.js    — everything: data, logic, rendering (~19000 lines)
bgm_*.mp3    — background music tracks (HTML Audio)
```

## Key Constants (script.js top)
```js
TILE_SIZE = 20    // pixels per tile
ROWS = 25         // map height
COLS = 40         // map width
```

## SYMBOLS (tile types)
```js
SYMBOLS.WALL      '#'   SYMBOLS.FLOOR     '.'
SYMBOLS.STAIRS    '>'   SYMBOLS.DOOR      '+'
SYMBOLS.ICE       '~'   SYMBOLS.LAVA      '^'
SYMBOLS.POISON    '%'   SYMBOLS.GRASS     ','
SYMBOLS.BLOCK     'B'   SYMBOLS.CORE      'C'   // Boss core (100F)
SYMBOLS.MERCHANT  'M'   SYMBOLS.FIRE_BLOCK 'F'
```

---

## Enemy System

### Enemy object shape
```js
{
  type: 'NORMAL',   // string key — see list below
  x: 5, y: 10,
  hp: 10, maxHp: 10,
  expValue: 5,
  faction: 'CRIMSON' | 'COBALT' | undefined,  // faction overrides color
  isAlly: false,    // allied to player (charmed)
  holdsKey: false,  // drops key on death
  // ... type-specific fields
}
```

### Enemy types
| type | symbol | notes |
|------|--------|-------|
| NORMAL | e | basic melee |
| ORC | G | higher HP/ATK, tutorial on floor 12 |
| LAYER | L | avoids holes (STAIRS) |
| BREAKER | W | destroys walls |
| GOLD | $ | rare, high gold drop (floor 15+) |
| BOMBER | X | explodes on death; drops 1G |
| CRAZY_G | G (purple) | fast, high HP=player.hp, 200+floor×10G drop |
| MIMIC | > | disguises as stairs |
| TURRET | T | fires lasers in fixed direction |
| BLAZE | B | fire-elemental |
| FROST | F | ice-elemental |
| DRAGON | D | boss at 100F |
| SNAKE | S | poison |
| KING | K | floor 50 boss |
| FAIRY_MIMIC | * | disguises as fairy |
| SUMMONER | Σ | summons minions, floor 88 boss |

### Faction system
- `faction: 'CRIMSON'` → rendered green (`#4ade80`)
- `faction: 'COBALT'`  → rendered purple (`#a855f7`)
- Faction enemies of opposing factions fight each other
- Enemies **without** a faction render in their default red/white color
- On faction floors, always assign a faction to ALL enemies (see Floor 33 pattern)

---

## Floor System

### Fixed stages (no random wind)
```js
const fixedStages = [7, 25, 33, 35, 40, 50, 66, 75, 80, 88, 100];
```

### Wind floors
Set inside `initMap()` after dungeon generation:
```js
isWindFloor = true;
windTimer = 4;  // starts from turn 1
```
Wind pushes the player downward each turn. Floors 7, 25, 33 are guaranteed wind.
Random wind chance starts at floor 10 (`floorLevel >= 10`).

### Fixed floor patterns (inside `initMap()`)
Each fixed floor has `if (floorLevel === N) { ... return; }` that builds the entire map
and returns early, skipping random generation.

| Floor | Type | Notes |
|-------|------|-------|
| 7 | Wind | random dungeon + wind from turn 1 |
| 12 | Normal | guaranteed CRAZY_G spawn added post-gen |
| 13 | Scroll walls | walls scroll right→left every turn; protected row y=3; crushed at x=1 = death |
| 20 | Faction | fixed layout, CRIMSON left / COBALT right |
| 25 | Wind | random dungeon + wind |
| 33 | Wind+Faction | random dungeon + wind + faction post-processing |
| 35 | Ice | fixed ice stage |
| 40 | Special | special layout |
| 50 | Boss | KING fight |
| 66 | Faction | faction stage |
| 75 | Special | special layout |
| 78 | Faction | faction stage (player disguise) |
| 80 | Special | special layout |
| 88 | Boss | SUMMONER fight |
| 100 | Boss | DRAGON + DungeonCore |

### Adding a new fixed floor — checklist
1. Add the floor number to `fixedStages` array (prevents random wind on it)
2. Inside `initMap()`, add `if (floorLevel === N) { ... return; }` block
3. Build map with `map[y][x] = SYMBOLS.FLOOR` etc., place enemies in `enemies` array
4. If faction floor: assign `.faction` to every enemy
5. If wind floor: set `isWindFloor = true; windTimer = 4;` before `return`

### Adding post-processing to a random floor (like floor 33)
```js
if (floorLevel === N) {
  // runs after normal random gen
  enemies.forEach(e => { if (!e.faction) e.faction = e.x < midX ? 'CRIMSON' : 'COBALT'; });
  // add extra enemies...
}
```

---

## Player Object
```js
player = {
  x, y,
  hp, maxHp,        // current / max HP
  level, exp, nextExp,
  stamina,          // 0-100; depletes on sprinting, -5 on being hit
  hasKey,           // carries the floor key
  gold,
  rings: [null, null],   // equipped ring IDs (2 slots)
  inventory: [],    // item objects
  attack, defense,
  // flags: isStealth, isInfiniteStamina, isShielded, ...
}
```

## Rings (RINGS array)
Each ring: `{ id, name, nameJa, desc, descJa, cost, symbol, color }`
Ring effects are applied in `handleAction`, `enemyTurn`, `handleEnemyDeath`, etc.
Check with `hasRing('RING_ID')`.

---

## Key Functions Reference

| Function | Location | Purpose |
|----------|----------|---------|
| `initMap()` | ~1284 | Generates entire floor (call at floor transition) |
| `handleAction(dx, dy)` | ~12868 | Processes one player turn (async) |
| `enemyTurn()` | ~15489 | Processes all enemy actions (async) |
| `handleEnemyDeath(enemy, byPlayer)` | ~14472 | Death, drops, exp, rings (async) |
| `scheduleEnemyFall(enemy, msg)` | ~14464 | Triggers enemy hole-fall (async-safe) |
| `draw(now)` | ~10710 | Renders one frame |
| `addLog(msg)` | ~11433 | Appends line to the message log |
| `spawnFloatingText(x, y, text, color, duration)` | ~10653 | Shows floating UI text |
| `gainExp(amount)` | ~17798 | Adds EXP and handles level-up |
| `canEnemyMove(x, y, mover)` | ~17752 | Checks if tile is walkable for enemy |
| `isRealHole(x, y)` | ~17747 | True if tile is a real STAIRS (not MIMIC) |
| `isWallAt(x, y)` | ~8787 | True if tile blocks movement |
| `enemyGroundBFS(sx, sy, tx, ty)` | ~13974 | Returns first step toward target |
| `saveGame()` / `loadGame()` | ~1106 / ~969 | localStorage persistence |

---

## Audio

### Synthesized SFX (no files needed)
```js
SOUNDS.BANG()        // impact
SOUNDS.DEFEAT()      // enemy dies
SOUNDS.LEVEL_UP()    // level up fanfare
// ... see SOUNDS object (~line 139)
```
Add new sounds by adding a method to the `SOUNDS` object using `audioCtx` oscillators.

### BGM
MP3 files listed in `BGM_TRACKS` array. Plays randomly with fade-out.
Boss BGM: `playBossBGM(src)`.

---

## Debug Shortcuts
```
http://localhost:9000/?debug=2   → trigger ending 2
http://localhost:9000/?debug=1   → trigger ending 1
F8  → ending 1 (in-game key)
F9  → ending 2 (in-game key)
↑↑↓↓ on title screen → secret test menu (floor select)
```
```js
// In browser console:
localStorage.setItem('deep_unlocked', '1')  // unlock Deep mode
```

## localStorage Keys
| Key | Value |
|-----|-------|
| `minimal_rogue_save` | full save JSON |
| `floor100_story_seen` | "1" if 100F story shown |
| `deep_unlocked` | "1" if first ending cleared |
| `minimal_rogue_deaths` | death count (number) |

---

## Common Pitfalls

- **`handleEnemyDeath` is async** — always `await` it if ordering matters
- **`canEnemyMove` does NOT block STAIRS** — enemies can walk onto holes; use `isRealHole` separately if needed
- **Faction floors must color ALL enemies** — any enemy without `.faction` renders red (default)
- **`fixedStages` array** — always add new fixed floors here to suppress random wind
- **`isWindFloor` must be set before `return`** in fixed floor blocks, or after random gen in post-processing
- **`spawnFloatingText` duration** — default 400ms; use 1200–1800 for important messages
- **`CRAZY_G` is always purple** — the pulsing purple effect is hardcoded; don't set `.faction` on it
- **After editing script.js** — validate with: `node --check script.js`
