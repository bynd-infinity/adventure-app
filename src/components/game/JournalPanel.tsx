"use client";

type JournalEntryView = {
  id: string;
  title: string;
  text: string;
};

type JournalPanelProps = {
  open: boolean;
  onClose: () => void;
  entries: JournalEntryView[];
};

export function JournalPanel({ open, onClose, entries }: JournalPanelProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[51] bg-black/35 backdrop-blur-[2px]"
        aria-label="Close journal"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[52] flex h-full w-[min(22rem,92vw)] flex-col border-l border-violet-800/50 bg-zinc-950/92 shadow-2xl backdrop-blur-md"
        aria-label="Journal"
      >
        <div className="flex items-center justify-between border-b border-violet-800/40 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">
            Case notes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-600/60 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {entries.length === 0 ? (
            <p className="text-sm italic text-zinc-500">Nothing recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-lg border border-violet-900/35 bg-zinc-900/50 p-3"
                >
                  <h3 className="text-sm font-semibold text-violet-100">{e.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{e.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
