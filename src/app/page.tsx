import Link from "next/link";

export default function Home() {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/backgrounds/title-screen.png')",
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center text-white">
        <main className="flex w-full max-w-2xl flex-col items-center gap-10 px-6 py-16 text-center">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
              Adventure App
            </h1>
            <p className="mt-3 text-lg text-zinc-300 md:text-xl">
              Multiplayer Adventure Engine
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <Link
              href="/play"
              className="rounded-lg border border-violet-400/70 bg-violet-900/45 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-violet-100 hover:bg-violet-800/55"
            >
              Start
            </Link>
            <Link
              href="/play"
              className="rounded-lg border border-zinc-300/40 bg-zinc-900/65 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-100 hover:bg-zinc-800/75"
            >
              Join Game
            </Link>
            <Link
              href="/play"
              className="rounded-lg border border-zinc-300/40 bg-zinc-900/65 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-100 hover:bg-zinc-800/75"
            >
              Solo Run
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
