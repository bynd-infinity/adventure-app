# Balance & pacing

Authoritative numbers live in `src/config/balance.ts`. Edit that file to tune the game; this page explains what each group controls.

## Combat base (`BASE_DAMAGE`, `DAMAGE_VARIANCE`)

- **`BASE_DAMAGE`**: Default damage before rolls and tier bonuses.
- **`DAMAGE_VARIANCE`**: Half-width of the uniform variance band used in attack resolution (see `resolveAttackDamage` / player attack by tier in `GameRuntime.tsx`).

## HUD motion (`UI_PULSE_MS`, `UI_SHAKE_MS`)

- **`UI_PULSE_MS`**: Duration of the impact pulse overlay after clues, damage, rewards, and meta lines.
- **`UI_SHAKE_MS`**: Duration of the light screen shake on heavy beats.

## Per-room timing (`ROOM_TIMING_PROFILE`)

Each `RoomId` has a `TimingProfile`:

| Field | Role |
| --- | --- |
| `decisionLockMs` | Delay after choosing a scene decision before the roll resolves (tension beat). |
| `combatTransitionMs` | Fade / transition into combat after a fight is triggered. |
| `combatWindupMs` | Player attack wind-up before impact. |
| `combatImpactMs` | Pause on impact before HP updates. |
| `combatEnemyWindupMs` | Pause before enemy counter narration. |
| `combatResolveGapMs` | Gap after enemy line before re-enabling controls. |

Boss and high-pressure rooms typically use slightly longer locks and transitions; service corridors use shorter beats.

## Boss ending logic

Boss completion cards are **not** tuned here. Priority and copy are defined in `src/lib/game/bossOutcome.ts` (see `bossOutcomeTierFromFlags` / `bossOutcomeCardFromFlags`).
