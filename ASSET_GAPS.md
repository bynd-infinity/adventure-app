# Country Squire — asset checklist (gaps vs. repo)

Use this as the master list for art/audio/UI still missing or only referenced in code. Paths are under `public/` unless noted.

## Room backgrounds (exploration + battle)

| Room | Config path | In repo? | Notes |
|------|-------------|----------|--------|
| Entrance Hall | `/backgrounds/entrance-hall.png` | Yes | Also used as global fallback. |
| Registry Gallery | `/backgrounds/registry-gallery.png` | **No** | Falls back via `CAMPAIGN_ROOM_BACKGROUND_FALLBACK` to entrance hall. |
| Library | `/backgrounds/library.png` | Yes | |
| Servants' Corridor | `/backgrounds/servants-corridor.png` | **No** | Fallback: dining-room in config. |
| Dining Room | `/backgrounds/dining-room.png` | Yes | |
| Boss Room | `/backgrounds/boss-room.png` | **No** | Fallback: entrance hall. |

**Battle view:** Uses the same URLs as exploration (`battleViewBackdropForRoom`). Optional future **dedicated battle plates** (cropped 16:9, opponent zone clear, floor line):

- `/backgrounds/battle-entrance-hall.png`
- `/backgrounds/battle-registry-gallery.png`
- `/backgrounds/battle-library.png`
- `/backgrounds/battle-servants-corridor.png`
- `/backgrounds/battle-dining-room.png`
- `/backgrounds/battle-boss-room.png`

(Not wired until files exist; swap in `campaignAssets.ts` when ready.)

## Title / shell

| Asset | Path | In repo? |
|-------|------|----------|
| Title / session backdrop | `/backgrounds/title-screen.png` | Yes |

## Character portraits (classes)

| Class | Path | In repo? |
|-------|------|----------|
| Blade | `/characters/bladeperson.png` | Yes |
| Spark | `/characters/sparkperson.png` | Yes |
| Shadow | `/characters/shadowperson.png` | Yes |
| Guard | `/characters/guardperson.png` | Yes |

**Unused / extra in repo:** `/characters/ghost.png`, `/characters/zombie-doll.png` (not wired in `CLASS_CHARACTER_IMAGE`; optional alternates or future classes).

**Battle strike frames (phase 2):** optional per-class attack PNGs. Register paths in `CLASS_CHARACTER_STRIKE_IMAGE` in `src/config/characters.ts` (e.g. `Blade: "/characters/bladeperson-strike.png"`). When omitted, strike uses idle art + CSS `battle-arena-hero--strike`.

**Optional upgrade (extra juice):** second pose for wind-up-only or hit-react variants — extend `BattlePlayerPhase` + assets if needed.

## Enemy sprites

All paths below are referenced in `ENEMY_SPRITE_BY_TEMPLATE`; **`public/enemies/` does not exist in the repo yet** — add folder + files.

| Template id | Path |
|---------------|------|
| restless_spirit | `/enemies/restless-spirit.png` |
| cursed_doll | `/enemies/cursed-doll.png` |
| shadow_figure | `/enemies/shadow-figure.png` |
| possessed_armor | `/enemies/possessed-armor.png` |
| portrait_sentry | `/enemies/portrait-sentry.png` |
| service_lurker | `/enemies/service-lurker.png` |
| bound_spirit | `/enemies/bound-spirit.png` |

**Boss-specific:** ensure bound spirit / boss encounters have a distinct, larger-readable sprite for the arena (same file OK if framed as “boss” in UI).

## Audio (not present in project)

- UI: menu click, decision lock, journal page.
- Combat: hit, miss, crit, enemy wind-up, victory sting, defeat.
- Ambient: per-room loop (low) or house-wide drone.
- Meta villain: short sting when interrupt line fires.

## UI / branding

- Favicon / app icon (Next metadata can point to `/public/icon.png` when added).
- Optional CRT overlay texture (currently CSS-only).
- Loading / connecting state art for lobby (optional).

## Campaign content not yet backed by unique art

Story/config references **Chapel of Measure** and **Clockwork Stair** in older docs; current `RoomId` set is six rooms + boss — if those locations ship later, they need backgrounds, battle plates, and enemy pools like other wings.

## Priority order for a polish pass

1. **`public/enemies/*.png`** — combat reads empty without them.
2. **Missing room PNGs** — registry, servants, boss (stop relying on fallbacks).
3. **Optional battle plates** — stronger Pokémon-style read without changing layout.
4. **SFX** — biggest perceived gain after sprites.
5. **Extra character poses** — nice-to-have for battle sequence juice.
