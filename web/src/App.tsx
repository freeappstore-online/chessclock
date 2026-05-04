import { useState, useRef, useCallback, useEffect } from "react";

// ── Time Controls ──

interface TimeControl {
  label: string;
  minutes: number;
  increment: number;
  tag: string;
}

const TIME_CONTROLS: TimeControl[] = [
  { label: "1 min", minutes: 1, increment: 0, tag: "Bullet" },
  { label: "1|1", minutes: 1, increment: 1, tag: "Bullet" },
  { label: "2|1", minutes: 2, increment: 1, tag: "Bullet" },
  { label: "3 min", minutes: 3, increment: 0, tag: "Blitz" },
  { label: "3|2", minutes: 3, increment: 2, tag: "Blitz" },
  { label: "5 min", minutes: 5, increment: 0, tag: "Blitz" },
  { label: "5|3", minutes: 5, increment: 3, tag: "Blitz" },
  { label: "10 min", minutes: 10, increment: 0, tag: "Rapid" },
  { label: "10|5", minutes: 10, increment: 5, tag: "Rapid" },
  { label: "15|10", minutes: 15, increment: 10, tag: "Rapid" },
  { label: "30 min", minutes: 30, increment: 0, tag: "Classical" },
  { label: "60 min", minutes: 60, increment: 0, tag: "Classical" },
];

type Player = 0 | 1;
type GameState = "idle" | "running" | "paused" | "ended";

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimeDetail(ms: number): string {
  if (ms <= 0) return "0:00.0";
  if (ms < 20000) {
    const totalTenths = Math.ceil(ms / 100);
    const seconds = Math.floor(totalTenths / 10);
    const tenths = totalTenths % 10;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}.${tenths}`;
  }
  return formatTime(ms);
}

// ── App ──

export function App() {
  const [screen, setScreen] = useState<"setup" | "clock">("setup");
  const [timeControl, setTimeControl] = useState<TimeControl>(TIME_CONTROLS[5]!);

  if (screen === "setup") {
    return (
      <Setup
        selected={timeControl}
        onSelect={setTimeControl}
        onStart={() => setScreen("clock")}
      />
    );
  }

  return (
    <Clock
      timeControl={timeControl}
      onBack={() => setScreen("setup")}
    />
  );
}

// ── Setup Screen ──

function Setup({
  selected,
  onSelect,
  onStart,
}: {
  selected: TimeControl;
  onSelect: (tc: TimeControl) => void;
  onStart: () => void;
}) {
  const tags = [...new Set(TIME_CONTROLS.map((tc) => tc.tag))];

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--color-paper)" }}>
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        <h1
          className="text-3xl font-bold text-center mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Chess Clock
        </h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--color-muted)" }}>
          Pick a time control
        </p>

        <div className="space-y-5 mb-8">
          {tags.map((tag) => (
            <div key={tag}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted)" }}>
                {tag}
              </p>
              <div className="flex flex-wrap gap-2">
                {TIME_CONTROLS.filter((tc) => tc.tag === tag).map((tc) => {
                  const active = tc.label === selected.label;
                  return (
                    <button
                      key={tc.label}
                      onClick={() => onSelect(tc)}
                      className="px-4 py-2.5 text-sm font-semibold transition-all duration-100"
                      style={{
                        borderRadius: "var(--radius-btn)",
                        background: active ? "var(--color-accent)" : "var(--color-panel)",
                        color: active ? "#fff" : "var(--color-ink)",
                        border: `1.5px solid ${active ? "var(--color-accent)" : "var(--color-line)"}`,
                      }}
                    >
                      {tc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 text-lg font-bold text-white transition-all duration-100 active:scale-[0.98]"
          style={{
            borderRadius: "var(--radius-card)",
            background: "var(--color-accent)",
          }}
        >
          Start
        </button>

        <div className="text-center mt-6">
          <a
            href="https://freeappstore.online"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline"
            style={{ color: "var(--color-muted)" }}
          >
            Part of FreeAppStore — free forever
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Clock Screen ──

function Clock({
  timeControl,
  onBack,
}: {
  timeControl: TimeControl;
  onBack: () => void;
}) {
  const initialMs = timeControl.minutes * 60 * 1000;
  const incrementMs = timeControl.increment * 1000;

  const [times, setTimes] = useState<[number, number]>([initialMs, initialMs]);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [state, setState] = useState<GameState>("idle");
  const [moves, setMoves] = useState<[number, number]>([0, 0]);
  const intervalRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      cancelAnimationFrame(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    setTimes((prev) => {
      const next: [number, number] = [...prev];
      if (activePlayer !== null) {
        next[activePlayer] = Math.max(0, next[activePlayer]! - delta);
        if (next[activePlayer]! <= 0) {
          setState("ended");
          return next;
        }
      }
      return next;
    });

    intervalRef.current = requestAnimationFrame(tick);
  }, [activePlayer]);

  useEffect(() => {
    if (state === "running" && activePlayer !== null) {
      lastTickRef.current = performance.now();
      intervalRef.current = requestAnimationFrame(tick);
    }
    return stopInterval;
  }, [state, activePlayer, tick, stopInterval]);

  const handleTap = (player: Player) => {
    if (state === "ended") return;

    // First tap starts the clock — black's side (player 1) taps to start white's clock
    if (state === "idle") {
      setActivePlayer(0);
      setState("running");
      return;
    }

    if (state === "paused") return;

    // Only the active player can tap (to end their turn)
    if (activePlayer !== player) return;

    stopInterval();

    // Add increment
    setTimes((prev) => {
      const next: [number, number] = [...prev];
      next[player] = next[player]! + incrementMs;
      return next;
    });

    setMoves((prev) => {
      const next: [number, number] = [...prev];
      next[player] = next[player]! + 1;
      return next;
    });

    // Switch to other player
    const other: Player = player === 0 ? 1 : 0;
    setActivePlayer(other);
  };

  const handlePause = () => {
    if (state === "running") {
      stopInterval();
      setState("paused");
    } else if (state === "paused") {
      setState("running");
    }
  };

  const handleReset = () => {
    stopInterval();
    setTimes([initialMs, initialMs]);
    setActivePlayer(null);
    setState("idle");
    setMoves([0, 0]);
  };

  const isLow = (ms: number) => ms < 30000 && ms > 0;
  const winner = state === "ended" ? (times[0]! <= 0 ? 1 : 0) : null;

  return (
    <div className="h-full flex flex-col">
      {/* Player 2 (top, rotated 180) */}
      <button
        onClick={() => handleTap(1)}
        className="flex-1 flex flex-col items-center justify-center transition-colors duration-100 relative"
        style={{
          transform: "rotate(180deg)",
          background:
            state === "ended" && winner === 1
              ? "var(--color-accent)"
              : activePlayer === 1
                ? "var(--color-ink)"
                : "var(--color-panel)",
          color:
            state === "ended" && winner === 1
              ? "#fff"
              : activePlayer === 1
                ? "var(--color-paper)"
                : "var(--color-ink)",
        }}
      >
        <span
          className="font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 12vw, 6rem)",
            color: isLow(times[1]!) && activePlayer === 1 ? "#ef4444" : "inherit",
          }}
        >
          {activePlayer === 1 && state === "running"
            ? formatTimeDetail(times[1]!)
            : formatTime(times[1]!)}
        </span>
        <span className="text-sm font-medium mt-1" style={{ opacity: 0.5 }}>
          {moves[1]} move{moves[1] !== 1 ? "s" : ""}
        </span>
        {state === "ended" && winner === 1 && (
          <span className="absolute top-4 left-4 text-sm font-bold">WIN</span>
        )}
      </button>

      {/* Center controls */}
      <div
        className="flex items-center justify-center gap-4 py-3 px-4 z-10"
        style={{ background: "var(--color-paper)" }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          style={{ background: "var(--color-panel)", color: "var(--color-muted)" }}
          title="Back"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <button
          onClick={handleReset}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
          style={{ background: "var(--color-panel)", color: "var(--color-muted)" }}
          title="Reset"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </button>

        {state !== "idle" && state !== "ended" && (
          <button
            onClick={handlePause}
            className="w-12 h-12 flex items-center justify-center rounded-full transition-colors"
            style={{
              background: state === "paused" ? "var(--color-accent)" : "var(--color-panel)",
              color: state === "paused" ? "#fff" : "var(--color-muted)",
            }}
            title={state === "paused" ? "Resume" : "Pause"}
          >
            {state === "paused" ? (
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
              </svg>
            )}
          </button>
        )}

        <div className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
          {timeControl.label}
        </div>
      </div>

      {/* Player 1 (bottom) */}
      <button
        onClick={() => handleTap(0)}
        className="flex-1 flex flex-col items-center justify-center transition-colors duration-100 relative"
        style={{
          background:
            state === "ended" && winner === 0
              ? "var(--color-accent)"
              : activePlayer === 0
                ? "var(--color-ink)"
                : "var(--color-panel)",
          color:
            state === "ended" && winner === 0
              ? "#fff"
              : activePlayer === 0
                ? "var(--color-paper)"
                : "var(--color-ink)",
        }}
      >
        {state === "ended" && winner === 0 && (
          <span className="absolute top-4 right-4 text-sm font-bold">WIN</span>
        )}
        <span
          className="font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 12vw, 6rem)",
            color: isLow(times[0]!) && activePlayer === 0 ? "#ef4444" : "inherit",
          }}
        >
          {activePlayer === 0 && state === "running"
            ? formatTimeDetail(times[0]!)
            : formatTime(times[0]!)}
        </span>
        <span className="text-sm font-medium mt-1" style={{ opacity: 0.5 }}>
          {moves[0]} move{moves[0] !== 1 ? "s" : ""}
        </span>
      </button>

      {/* Idle overlay */}
      {state === "idle" && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(0,0,0,0.15)" }}
        >
          <p className="text-lg font-semibold text-white px-6 py-3 rounded-xl" style={{ background: "rgba(0,0,0,0.6)" }}>
            Tap either side to start
          </p>
        </div>
      )}
    </div>
  );
}
