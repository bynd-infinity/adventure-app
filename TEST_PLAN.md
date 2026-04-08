# Country Squire Playtest Plan

## Goal
Run deterministic checks before friend testing to validate progression, endings, and moment-to-moment feel.

## Core Checks

1. `Hook: Debt Collector` full run reaches boss room.
2. `Hook: Missing Heir` full run reaches boss room.
3. `Hook: Broken Oath` full run reaches boss room.
4. `Severed` ending path: collect required clues/flags, choose script at boss.
5. `Successor` ending path: choose chain at boss and pass guard check.
6. `Bound Bargain` ending path: choose seal path and win boss combat.
7. Loss path: fail through damage/combat to defeat card.
8. Room unlock flow: registry + library unlock servants corridor.
9. Room unlock flow: servants corridor + dining unlock boss room.
10. Decision feel check: verify decision delay and combat staging are readable.

## Regression Checks

- Lobby: host/non-host ready flow, start gate.
- Class select: portraits and stat panel visible.
- Journal: new clues unlock correctly (`registry_names_staged`, `twist_party_listed`).
- Combat: impact animation and log order still coherent.
- Build/lint: clean before each friend test drop.

## Friend Feedback Prompts

- Where were you confused about what to do next?
- Which room felt strongest?
- Did class choice feel meaningful?
- Did combat feel too slow, too fast, or right?
- Would you play another run?
