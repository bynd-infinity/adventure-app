import { HomeLobbyForms } from "@/components/home/HomeLobbyForms";

export default function PlayPage() {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/backgrounds/title-screen.png')",
      }}
    >
      <div className="absolute inset-0 bg-black/65" aria-hidden />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12 text-white">
        <main className="flex w-full max-w-4xl flex-col items-center gap-10">
          <div className="text-center">
            <h1 className="text-4xl font-semibold tracking-tight">Lobby Setup</h1>
            <p className="mt-2 text-zinc-300">
              Create a party, run solo, or join with a code.
            </p>
          </div>
          <HomeLobbyForms />
        </main>
      </div>
    </div>
  );
}
