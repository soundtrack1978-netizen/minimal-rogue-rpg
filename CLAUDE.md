# Minimal Rogue RPG — AI Modification Guide

## Overview
Turn-based roguelike in a single HTML/CSS/JS stack. Canvas rendering + Web Audio API (synthesized sounds, no external sound libs).
- **Goal:** Descend to B100F, destroy the Dungeon Core
- **Post-clear:** "Deep" mode (B101F+), endless with second ending possible
- **Map:** 25 rows × 40 columns, tile-based

## File Structure
```
index.html   — canvas, HUD elements, loads script.js (update `?v=N` on release)
style.css    — layout only (dark theme, no game logic)
script.js    — everything: data, logic, rendering (~20000 lines)
bgm_*.mp3    — background music tracks (HTML Audio)
```

**Workflow tip:** this is a single-page HTML file — just open `index.html` in a browser to test. No build step. Bump `?v=NN` in the script tag when you want to bust the browser cache after editing.

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
| LAYER | L | avoids holes (STAIRS); places blocks while fleeing |
| BREAKER | W | destroys walls; skips faction combat unless opp is last survivor |
| GOLD | $ | rare, high gold drop (floor 15+) |
| BOMBER | X | explodes on death; drops 1G |
| CRAZY_G | G (purple) | fast, high HP=player.hp, 200+floor×10G drop |
| MIMIC | > | disguises as stairs |
| FAIRY_MIMIC | * | disguises as fairy |
| TURRET | T | fires lasers in fixed direction; stationary |
| HOPPER_TURRET | T (orange) | turret that hops perpendicular to its laser |
| SPAWNER | [E] | purple block that periodically spawns minions |
| BLAZE | B | fire-elemental, leaves LAVA on move |
| FROST | F | ice-elemental, leaves ICE on move |
| DRAGON | D | boss at 100F |
| SNAKE | S | poison, multi-segment (head+body) |
| KING | K | floor 50 boss; buffs nearby enemies |
| MADMAN | @ | red flickering @-mimic enemy; excluded from carrying key |
| KEY_RUNNER | K (red) | carries key and flees; special AI |
| WISP_ENEMY | w | wisp-controlled enemy |
| SUMMONER | Σ | summons minions, floor 88 boss |
| HEALER | H | heals same-faction allies; avoids enemies; 2-turn cooldown |

### Faction system
- `faction: 'CRIMSON'` → rendered green (`#4ade80`)
- `faction: 'COBALT'`  → rendered purple (`#a855f7`)
- Faction enemies of opposing factions fight each other
- Enemies **without** a faction render in their default red/white color
- On faction floors, always assign a faction to ALL enemies (see Floor 33 pattern)

### Enemy AI loop order (inside `enemyTurn()`)
Order of branching per enemy — earlier branches pre-empt later ones (search comments in file to locate each block):
1. `e.sleeping` → skip turn entirely
2. **HEALER slow check** (`_slowSkip`) → HEALER acts every 2nd turn only
3. **3% universal random action** → 1-step random 4-dir move, skips normal AI (excludes TURRET/HOPPER_TURRET/SPAWNER/DRAGON/KING/CORE/MIMIC/FAIRY_MIMIC/SNAKE)
4. **Faction victory cluster** (`oppAlive === false`) → surviving faction roams in a pack (never freezes)
5. **Faction combat AI** (`e.faction && !e.isAlly && !BREAKER && !HEALER`) — but BREAKER & HEALER join when opposing faction has exactly 1 survivor (last-stand rule)
6. **HEALER special AI** → heal adjacent same-faction allies, flee threats, never step adjacent to a threat
7. **Normal AI** (chase player, TURRET fire, etc.)

### Common enemy fields (add to any enemy object)
| field | purpose |
|-------|---------|
| `flashUntil` | white flash on hit (ms timestamp) |
| `healGlowUntil` | soft green glow for 2.5s when healed |
| `stunTurns` | skip turn while > 0 |
| `_slowSkip` | HEALER-specific alternating turn skip |
| `_chaseLastDist`, `_chaseStuck` | pursuit stalemate detection in faction combat |
| `_fleeLastDx/Dy` | prevent flee oscillation |
| `faction` | `'CRIMSON' \| 'COBALT' \| undefined` |
| `isAlly` | charmed, treats player as ally |
| `holdsKey` | drops key on death |
| `family*` (familyId, homeX, homeY, breedTimer) | deep-floor family groups |

---

## Floor System

### Fixed stages list (all stages with a specific layout / mechanic)
Defined in `script.js` as the `FIXED_STAGES` array (~line 839): each entry is `{ floor, title, suppressWind? }`.
- `FIXED_STAGE_FLOORS` = array of floor numbers (derived)
- `FIXED_WIND_SUPPRESS_FLOORS` = subset where the random-wind roll (3% on floor≥10) is suppressed

**When adding a new fixed stage:** add a `{ floor: N, title: '...', suppressWind: true? }` entry to `FIXED_STAGES` — that auto-registers it in the TITLE → FIXED STAGE select menu AND controls wind suppression.

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
1. Add an entry to `FIXED_STAGES` array (`{ floor: N, title: '...', suppressWind: true }` if no random wind should roll)
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

Line numbers drift as the file grows — always re-confirm with `grep -n "^function NAME"` before relying on them.

| Function | Location | Purpose |
|----------|----------|---------|
| `initMap()` | ~1362 | Generates entire floor (call at floor transition) |
| `handleAction(dx, dy)` | ~14470 | Processes one player turn (async) |
| `enemyTurn()` | ~17126 | Processes all enemy actions (async) — see AI loop order above |
| `handleEnemyDeath(enemy, byPlayer)` | ~16106 | Death, drops, exp, rings (async) |
| `scheduleEnemyFall(enemy, msg)` | ~16098 | Triggers enemy hole-fall (async-safe) |
| `draw(now)` | ~11857 | Renders one frame |
| `addLog(msg)` | ~12626 | Appends line to the message log (left-bottom panel) |
| `spawnFloatingText(x, y, text, color, duration)` | ~11799 | Shows floating UI text. Supports `rise`/`font` when pushed directly to `damageTexts` |
| `gainExp(amount)` | ~19729 | Adds EXP and handles level-up |
| `canEnemyMove(x, y, mover)` | ~19682 | Checks if tile is walkable for enemy |
| `isRealHole(x, y)` | ~19677 | True if tile is a real STAIRS (not MIMIC) |
| `isWallAt(x, y)` | ~9835 | True if tile blocks movement |
| `enemyGroundBFS(sx, sy, tx, ty)` | ~15604 | Returns first step toward target |
| `saveGame()` / `loadGame()` | ~1188 / ~1051 | localStorage persistence |

---

## Audio

### Synthesized SFX (no files needed)
```js
SOUNDS.BANG()        // impact
SOUNDS.DEFEAT()      // enemy dies
SOUNDS.LEVEL_UP()    // level up fanfare
SOUNDS.HEAL()        // bright ascending — reserved for Heal Tome
SOUNDS.HEAL_SOFT()   // gentle short sine — HEALER enemy heals
// ... see SOUNDS object (~line 139)
```
Add new sounds by adding a method to the `SOUNDS` object using `audioCtx` oscillators. Helpers: `playSound(freq,type,duration,vol)`, `playMelody([{f,d},...])`.

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
- **`FIXED_STAGES` array** — always add new fixed floors here to suppress random wind AND expose them in the title-menu FIXED STAGE select
- **`isWindFloor` must be set before `return`** in fixed floor blocks, or after random gen in post-processing
- **`spawnFloatingText` duration** — default 400ms; use 1200–1800 for important messages
- **`CRAZY_G` is always purple** — the pulsing purple effect is hardcoded; don't set `.faction` on it
- **HEALER edge cases** — if you add a new enemy-vs-enemy AI branch, add `&& e.type !== 'HEALER'` to preserve HEALER's pacifist AI (except for the "last opposing survivor" override). Same for BREAKER (keeps it wandering). See `enemyTurn()` comment markers.
- **3% random-action roll** — every non-static enemy takes a random 1-step move on 3% of its turns. If you write an AI that depends on turn-by-turn continuity (chained state), remember it may be preempted.
- **After editing script.js** — validate with: `node --check script.js` (catches syntax errors before reload)

---

## How to add a new enemy type (quick recipe)

1. **Pick a single-letter symbol** (avoid clashing with SYMBOLS or existing enemy letters)
2. **Spawn logic** — decide where it appears:
   - Fixed floor only → add `enemies.push({ type: 'FOO', ... })` inside the `if (floorLevel === N) { ... }` block
   - Random floors → add an `else if` branch in the enemy-roll cascade inside `initMap()` (single-screen at ~line 9280, multi-screen at ~line 2080)
3. **Rendering** — add an `else if (e.type === 'FOO')` branch in the enemy draw code (around line 12240+), set `eColor` and `eChar`
4. **AI** — add logic inside `enemyTurn()`. Respect the AI loop order: place the branch where it fits (before or after faction/HEALER blocks as appropriate), always end with `continue;` to skip normal AI
5. **Drops / death** — extend `handleEnemyDeath()` if needed
6. **Exclusions (if static)** — add to the `_staticTypes` array in the 3%-random-action block so it doesn't wander
7. Update this file's enemy table
