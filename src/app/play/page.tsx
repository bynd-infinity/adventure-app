import { ScreenMusic } from "@/components/audio/ScreenMusic";
import { HomeLobbyForms } from "@/components/home/HomeLobbyForms";

export default function PlayPage() {
  return (
    <div
      className="crt-screen relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/backgrounds/title-screen.png')",
      }}
    >
      <div className="crt-scanlines pointer-events-none absolute inset-0 z-[3]" aria-hidden />
      <div className="crt-vignette pointer-events-none absolute inset-0 z-[4]" aria-hidden />
      <div className="absolute inset-0 bg-black/65" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 text-white">
        <ScreenMusic variant="lobby" />
        <main className="flex w-full max-w-4xl flex-col items-center gap-10">
          <div className="text-center">
            <h1 className="title-joust phosphor-glow text-4xl md:text-5xl">Country Squire</h1>
            <p className="campaign-subtitle mt-2 text-sm text-violet-200/90 md:text-base">
              Blackglass House
            </p>
            <p className="mt-3 max-w-lg text-zinc-300">
              Start a session, set difficulty and hook, then explore. Join with a code
              if a friend already opened the ledger.
            </p>
          </div>
          <HomeLobbyForms />
        </main>
      </div>
    </div>
  );
}
