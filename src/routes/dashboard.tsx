import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, LogOut, Clock, Bell, Check } from "lucide-react";
import { VideoBackground } from "@/components/VideoBackground";
import { ShinyText } from "@/components/ShinyText";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Contest Reminder" },
      { name: "description", content: "Manage platforms and reminders." },
    ],
  }),
  component: Dashboard,
});

const PLATFORMS = [
  {
    id: "leetcode",
    name: "LeetCode",
    logo: "https://leetcode.com/static/images/LeetCode_logo_rvs.png",
    color: "#FFA116",
  },
  {
    id: "codeforces",
    name: "Codeforces",
    logo: "https://codeforces.org/s/0/apple-icon-180x180.png",
    color: "#1F8ACB",
  },
  {
    id: "codechef",
    name: "CodeChef",
    logo: "https://cdn.codechef.com/images/cc-logo.png",
    color: "#5B4638",
  },
  {
    id: "atcoder",
    name: "AtCoder",
    logo: "https://img.atcoder.jp/assets/atcoder.png",
    color: "#222222",
  },
];

const REMINDER_OPTIONS = [
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "Custom", value: -1 },
];

const CONTESTS = [
  {
    platform: "leetcode",
    name: "LeetCode Weekly Contest 472",
    date: "Sun, Jul 5, 2026",
    time: "08:00 IST",
    durationMin: 90,
    startsInMs: 1000 * 60 * 60 * 26,
    status: "Will be Added Automatically",
  },
  {
    platform: "codeforces",
    name: "Codeforces Round #1085 (Div. 2)",
    date: "Fri, Jul 3, 2026",
    time: "20:35 IST",
    durationMin: 135,
    startsInMs: 1000 * 60 * 60 * 12,
    status: "Scheduled",
  },
  {
    platform: "atcoder",
    name: "AtCoder Beginner Contest 410",
    date: "Sat, Jul 4, 2026",
    time: "17:30 IST",
    durationMin: 100,
    startsInMs: 1000 * 60 * 60 * 20,
    status: "Will be Added Automatically",
  },
  {
    platform: "codechef",
    name: "CodeChef Starters 196",
    date: "Wed, Jul 1, 2026",
    time: "20:00 IST",
    durationMin: 120,
    startsInMs: 1000 * 60 * 60 * 3,
    status: "Scheduled",
  },
];

function useCountdown(startMs: number) {
  const [remaining, setRemaining] = useState(startMs);
  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function ContestCard({ c }: { c: (typeof CONTESTS)[number] }) {
  const platform = PLATFORMS.find((p) => p.id === c.platform)!;
  const countdown = useCountdown(c.startsInMs);
  return (
    <div className="liquid-glass group rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1">
      {/* ambient platform glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: platform.color }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 p-2 ring-1 ring-white/20"
            style={{ boxShadow: `0 8px 32px ${platform.color}55` }}
          >
            <img src={platform.logo} alt={platform.name} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {platform.name}
            </p>
            <h3 className="mt-0.5 text-[15px] font-medium leading-tight text-white">
              {c.name}
            </h3>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium backdrop-blur ${
            c.status === "Scheduled"
              ? "bg-white/10 text-white/80 ring-1 ring-white/15"
              : "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30"
          }`}
        >
          {c.status === "Scheduled" ? "Scheduled" : "Auto-add"}
        </span>
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-3">
        {[
          { k: "Date", v: c.date },
          { k: "Start", v: c.time },
          { k: "Duration", v: `${c.durationMin} min` },
        ].map((cell) => (
          <div
            key={cell.k}
            className="rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-inset ring-white/5"
          >
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/35">{cell.k}</p>
            <p className="mt-1 text-[13px] text-white/90">{cell.v}</p>
          </div>
        ))}
      </div>

      <div className="relative mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] px-4 py-3 ring-1 ring-inset ring-white/10">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Clock className="h-3.5 w-3.5" />
          Starts in
        </div>
        <span className="font-mono text-[15px] tabular-nums tracking-tight text-white">
          {countdown}
        </span>
      </div>
    </div>
  );
}


function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-white" : "bg-white/15"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-black transition-all ${
          on ? "left-[22px]" : "left-0.5 bg-white"
        }`}
      />
    </button>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    leetcode: true,
    codeforces: true,
    codechef: false,
    atcoder: false,
  });
  const [reminder, setReminder] = useState(15);

  const anyEnabled = Object.values(enabled).some(Boolean);

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

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border border-gray-700 bg-black/30 px-2 py-1.5 pr-4 backdrop-blur sm:flex">
            <img
              src="https://i.pravatar.cc/64?img=12"
              alt="profile"
              className="h-7 w-7 rounded-full"
            />
            <div className="text-xs leading-tight">
              <p className="font-medium text-white">Aarav Sharma</p>
              <p className="text-white/60">aarav@gmail.com</p>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-20">
        {/* Hero */}
        <section className="pt-6 pb-12 text-center">
          <p className="text-xs tracking-tight text-white/80 uppercase md:text-sm">
            Your dashboard · synced with Google Calendar
          </p>
          <h1
            className="mt-5 font-medium tracking-tighter text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ lineHeight: 0.85 }}
          >
            <span className="block text-white">Never miss</span>
            <ShinyText text="a contest." className="block" />
          </h1>
        </section>

        {/* Platforms */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-medium tracking-tight">Choose your platforms</h2>
              <p className="mt-1 text-sm text-white/60">
                Enable a platform and we'll quietly add every future contest to your calendar.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORMS.map((p) => {
              const on = enabled[p.id];
              return (
                <div
                  key={p.id}
                  className="liquid-glass group rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1"
                >

                  <div
                    className="absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-20 blur-3xl transition group-hover:opacity-40"
                    style={{ background: p.color }}
                  />
                  <div className="relative flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2"
                      style={{ boxShadow: `0 0 30px ${p.color}55` }}
                    >
                      <img src={p.logo} alt={p.name} className="h-full w-full object-contain" />
                    </div>
                    <Toggle on={on} onChange={(v) => setEnabled({ ...enabled, [p.id]: v })} />
                  </div>
                  <h3 className="relative mt-4 text-lg font-medium">{p.name}</h3>
                  <p className="relative mt-2 min-h-[48px] text-xs leading-relaxed text-white/60">
                    {on
                      ? "All future contests will be added to your Google Calendar with your reminder time."
                      : "Toggle on to start receiving calendar reminders."}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Reminder */}
        <section className="liquid-glass mt-12 rounded-3xl p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <div className="flex items-center gap-2 text-white/60">
                <Bell className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Global reminder</span>
              </div>
              <h2 className="mt-2 text-xl font-medium tracking-tight">
                Remind me before every contest
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Every future contest from your selected platforms will use this reminder time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((o) => {
                const active = reminder === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setReminder(o.value)}
                    className={`rounded-full border px-4 py-2 text-xs transition ${
                      active
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Upcoming Contests */}
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-medium tracking-tight">Upcoming contests</h2>
              <p className="mt-1 text-sm text-white/60">
                {anyEnabled
                  ? "Synced from your enabled platforms."
                  : "Enable a platform above to see your contests."}
              </p>
            </div>
            <span className="hidden text-xs text-white/50 sm:block">{CONTESTS.length} this week</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {CONTESTS.map((c) => (
              <ContestCard key={c.name} c={c} />
            ))}
          </div>
        </section>

        {/* Settings */}
        <section className="liquid-glass mt-12 rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-medium tracking-tight">Settings</h2>
          <div className="mt-5 divide-y divide-white/10">
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-white/60">Connected as aarav@gmail.com</p>
                </div>
              </div>
              <button className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300 ring-1 ring-emerald-400/30">
                <Check className="h-3.5 w-3.5" /> Connected
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Logout</p>
                  <p className="text-xs text-white/60">Sign out of Contest Reminder</p>
                </div>
              </div>
              <button
                onClick={() => navigate({ to: "/" })}
                className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-gray-100"
              >
                Sign out <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
