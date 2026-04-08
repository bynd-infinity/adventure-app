import Link from "next/link";
import { EightBitAudioLab } from "@/components/options/EightBitAudioLab";

export default function OptionsPage() {
  return (
    <div
      className="relative min-h-screen bg-[length:auto_100%] bg-top bg-no-repeat md:bg-cover md:bg-center"
      style={{
        backgroundImage: "url('/backgrounds/title-screen.png')",
      }}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden />
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-10 text-white md:py-16">
        <div className="mb-6 w-full max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300/90 underline-offset-4 hover:text-emerald-200 hover:underline"
          >
            ← Back to title
          </Link>
        </div>
        <main className="flex w-full max-w-4xl flex-1 flex-col items-center">
          <EightBitAudioLab />
        </main>
      </div>
    </div>
  );
}
