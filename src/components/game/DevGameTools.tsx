"use client";

import type { RoomId } from "@/lib/story/rooms";
import type { CampaignHookId } from "@/lib/game/bossOutcome";
import { explorationCanExitRoom } from "@/lib/game/explorationResolve";
import type { ExplorationPacingContext } from "@/lib/game/explorationResolve";

const ROOMS: { id: RoomId; label: string }[] = [
  { id: "entrance_hall", label: "Hall" },
  { id: "registry_gallery", label: "Registry" },
  { id: "library", label: "Library" },
  { id: "servants_corridor", label: "Servants" },
  { id: "dining_room", label: "Dining" },
  { id: "boss_room", label: "Boss" },
];

type DevGameToolsProps = {
  currentRoom: RoomId;
  roomPacing: ExplorationPacingContext;
  storyFlags: Record<string, boolean>;
  onJumpRoom: (room: RoomId) => void;
  onReplaceStoryFlags: (next: Record<string, boolean>) => void;
  onMergeStoryFlags: (patch: Record<string, boolean>) => void;
};

export function DevGameTools({
  currentRoom,
  roomPacing,
  storyFlags,
  onJumpRoom,
  onReplaceStoryFlags,
  onMergeStoryFlags,
}: DevGameToolsProps) {
  function setHook(h: CampaignHookId) {
    onMergeStoryFlags({
      hook_debt_collector: h === "hook_debt_collector",
      hook_missing_heir: h === "hook_missing_heir",
      hook_broken_oath: h === "hook_broken_oath",
    });
  }

  return (
    <div className="pointer-events-auto fixed bottom-2 left-2 z-[60] max-w-[min(100vw-1rem,22rem)] rounded border border-amber-800/50 bg-black/85 px-2 py-1.5 font-mono text-[10px] text-zinc-300 shadow-lg backdrop-blur-sm">
      <details>
        <summary className="cursor-pointer select-none font-semibold uppercase tracking-wide text-amber-600/90">
          Dev tools
        </summary>
        <div className="mt-2 space-y-2 border-t border-zinc-700/50 pt-2">
          <div>
            <div className="mb-0.5 text-zinc-500">Jump room</div>
            <div className="flex flex-wrap gap-1">
              {ROOMS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                  onClick={() => onJumpRoom(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-zinc-500">Campaign hook</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() => setHook("hook_debt_collector")}
              >
                Debt
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() => setHook("hook_missing_heir")}
              >
                Heir
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() => setHook("hook_broken_oath")}
              >
                Oath
              </button>
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-zinc-500">Boss outcome flags</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() =>
                  onMergeStoryFlags({
                    ending_successor: true,
                    ending_severed: false,
                    read_house_sigil: false,
                    registry_names_staged: false,
                    twist_party_listed: false,
                    boss_seal_path: false,
                  })
                }
              >
                +Successor
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() =>
                  onMergeStoryFlags({
                    ending_successor: false,
                    read_house_sigil: true,
                    registry_names_staged: true,
                    twist_party_listed: true,
                    boss_seal_path: false,
                  })
                }
              >
                +Severed set
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() =>
                  onMergeStoryFlags({
                    ending_successor: false,
                    read_house_sigil: false,
                    registry_names_staged: false,
                    twist_party_listed: false,
                    boss_seal_path: true,
                  })
                }
              >
                +Seal path
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-rose-800/70"
                onClick={() => onReplaceStoryFlags({})}
              >
                Clear flags
              </button>
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-zinc-500">Clue flags</div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() => onMergeStoryFlags({ found_letter_fragment: true })}
              >
                +Letter
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() => onMergeStoryFlags({ registry_packet_found: true })}
              >
                +Registry pkt
              </button>
              <button
                type="button"
                className="rounded border border-zinc-600/60 bg-zinc-900/90 px-1.5 py-0.5 hover:border-amber-700/70"
                onClick={() =>
                  onMergeStoryFlags({
                    read_house_sigil: true,
                    registry_names_staged: true,
                  })
                }
              >
                +Sigil+names
              </button>
            </div>
          </div>
          <div>
            <div className="font-semibold uppercase tracking-wide text-zinc-500">
              story flags
            </div>
            <pre className="mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap break-all text-zinc-400">
              {Object.keys(storyFlags).length === 0
                ? "—"
                : JSON.stringify(storyFlags, null, 0)}
            </pre>
            <div className="mt-1 text-zinc-500">
              room {currentRoom} · i={roomPacing.interactionCount} combat=
              {roomPacing.combatTriggered
                ? roomPacing.combatResolved
                  ? "done"
                  : "on"
                : "no"}{" "}
              S/I/L
              {roomPacing.usedSearch ? "1" : "0"}
              {roomPacing.usedInspect ? "1" : "0"}
              {roomPacing.usedListen ? "1" : "0"} exit=
              {explorationCanExitRoom(roomPacing) ? "ok" : "no"}
              {currentRoom === "entrance_hall"
                ? ` sch=${roomPacing.entranceSearchPasses}`
                : ""}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
