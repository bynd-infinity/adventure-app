import { HomeLobbyForms } from "@/components/home/HomeLobbyForms";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 py-16 text-white">
      <main className="flex flex-col items-center gap-10 px-6 text-center">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Adventure App</h1>
          <p className="mt-2 text-lg text-zinc-400">
            Multiplayer Adventure Engine
          </p>
        </div>
        <HomeLobbyForms />
      </main>
    </div>
  );
}
