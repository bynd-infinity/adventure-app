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
        <main className="flex w-full max-w-4xl flex-col items-center gap-10">
          <div className="text-center">
            <h1 className="title-joust phosphor-glow text-4xl md:text-5xl">Country Squire</h1>
            <p className="campaign-subtitle mt-2 text-sm text-violet-200/90 md:text-base">
              Session Hall
            </p>
            <p className="mt-3 text-zinc-300">
              Start a run or join a friend&apos;s session with a code.
            </p>
          </div>
          <HomeLobbyForms />
        </main>
      </div>
    </div>
  );
}
