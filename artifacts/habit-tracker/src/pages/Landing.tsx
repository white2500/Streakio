import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { UPGRADE_COPY } from "@/lib/features";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <header className="flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2">
          <img src={`${basePath}/logo.svg`} alt="Streakio" className="h-7 w-auto" />
        </div>
        <button
          onClick={() => setLocation("/sign-in")}
          data-testid="link-sign-in"
          className="text-sm font-medium text-white/60 hover:text-white transition-colors"
        >
          Sign in
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md"
        >
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Track your habits.
            <br />
            Every single day.
          </h1>
          <p className="mt-4 text-base text-white/50">
            A focused monthly habit tracker. Check off your days, build
            momentum, and watch the grid fill up.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => setLocation("/sign-up")}
              data-testid="button-get-started"
              className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-black active:scale-[.98] transition-transform"
            >
              Get started free
            </button>
            <button
              onClick={() => setLocation("/sign-in")}
              className="w-full rounded-xl border border-white/15 py-3.5 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
            >
              I already have an account
            </button>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-neutral-950 p-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Premium, one-time
            </p>
            <p className="mt-1 text-sm text-white/60">
              {UPGRADE_COPY.subheadline}
            </p>
            <ul className="mt-3 space-y-1.5">
              {UPGRADE_COPY.benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-center gap-2 text-sm text-white/70"
                >
                  <Check className="h-3.5 w-3.5 text-white/40 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </main>

      <footer className="px-6 pb-8-safe pt-4 text-center text-xs text-white/30">
        Free to use. Upgrade any time.
      </footer>
    </div>
  );
}
