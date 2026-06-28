import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ShinyText } from "@/components/ShinyText";
import { VideoBackground } from "@/components/VideoBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Contest Reminder — Never miss a coding contest again" },
      {
        name: "description",
        content:
          "Get automatic Google Calendar reminders for LeetCode, Codeforces, CodeChef, and AtCoder contests.",
      },
      { property: "og:title", content: "Contest Reminder" },
      {
        property: "og:description",
        content: "Never miss a coding contest again.",
      },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-black text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <VideoBackground />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white">
            <div className="h-2.5 w-2.5 rounded-full bg-white" />
          </div>
          <span className="text-base font-medium tracking-tight">Contest Reminder</span>
        </div>
        <button className="lg:hidden" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center px-6 pt-20 pb-16 text-center md:pt-28">
        <p className="text-xs tracking-tight text-white/80 uppercase md:text-sm">
          Sync Once · Stay Ready Forever
        </p>
        <h1
          className="mt-6 font-medium tracking-tighter text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
          style={{ lineHeight: 0.85 }}
        >
          <span className="block text-white">Never miss</span>
          <ShinyText text="a contest." className="block" />
        </h1>

        <p className="mt-8 max-w-xl text-sm text-white/80 md:text-base">
          One click connects your Google Calendar to LeetCode, Codeforces, CodeChef, and AtCoder.
        </p>

        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="group mt-10 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-gray-100 md:px-8 md:py-4"
        >
          <GoogleIcon />
          Continue with Google
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>

      </main>
    </div>
  );
}
