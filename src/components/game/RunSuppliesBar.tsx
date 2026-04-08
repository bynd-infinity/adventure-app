import type { RunSuppliesState } from "@/config/runSurvival";

type RunSuppliesBarProps = {
  supplies: RunSuppliesState;
  explorationMode: boolean;
  onSanctuaryRest: () => void;
  restDisabled?: boolean;
};

export function RunSuppliesBar({
  supplies,
  explorationMode,
  onSanctuaryRest,
  restDisabled = false,
}: RunSuppliesBarProps) {
  return (
    <div className="pointer-events-auto absolute right-3 top-[11.5rem] z-[52] max-w-[11rem] rounded-md border border-amber-900/45 bg-zinc-950/88 px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-sm md:right-5 md:top-[12.5rem] md:max-w-xs md:text-[11px]">
      <p className="mb-1.5 font-semibold uppercase tracking-[0.14em] text-amber-200/90">
        Supplies
      </p>
      <ul className="space-y-0.5 text-zinc-400">
        <li>
          Tonic <span className="text-zinc-200">{supplies.tonic}</span>
          <span className="ml-1 text-zinc-600">(combat)</span>
        </li>
        <li>
          Revival balm{" "}
          <span className="text-zinc-200">{supplies.revivalBalm}</span>
        </li>
        <li>
          Sanctuary rest{" "}
          <span className="text-zinc-200">{supplies.sanctuaryRestCharges}</span>
        </li>
      </ul>
      {explorationMode ? (
        <button
          type="button"
          disabled={restDisabled || supplies.sanctuaryRestCharges <= 0}
          onClick={onSanctuaryRest}
          className="mt-2 w-full rounded border border-amber-700/50 bg-amber-950/40 px-2 py-1.5 text-[10px] font-medium text-amber-100/95 hover:bg-amber-900/45 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Rest (restore living HP)
        </button>
      ) : null}
      <p className="mt-2 border-t border-zinc-800 pt-1.5 leading-snug text-zinc-600">
        Downed allies stay down unless you use balm. Rest does not revive.
      </p>
    </div>
  );
}
