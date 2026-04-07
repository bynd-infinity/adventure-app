import { HomeLobbyForms } from "@/components/home/HomeLobbyForms";

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
        <main className="flex flex-col items-center gap-10 px-6 py-16 text-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Adventure App</h1>
            <p className="mt-2 text-lg text-zinc-400">
              Multiplayer Adventure Engine
            </p>
          </div>
          <HomeLobbyForms />
        </main>
      </div>
    </div>
  );
}
