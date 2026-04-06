type GamePageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { sessionId } = await params;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-950 px-6 text-white">
      <main className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">Game</h1>
        <p className="text-zinc-400">Session: {sessionId}</p>
      </main>
    </div>
  );
}
