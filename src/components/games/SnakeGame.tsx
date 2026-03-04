"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 20;
const ROWS = 20;
const CELL = 20;
const W = COLS * CELL;
const H = ROWS * CELL;
const TICK_MS = 140;

type Dir = "U" | "D" | "L" | "R";
type Pt = { x: number; y: number };

const OPP: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };

function randFood(snake: Pt[]): Pt {
  let p: Pt;
  do {
    p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pt[],
    dir: "R" as Dir,
    next: "R" as Dir,
    food: { x: 5, y: 5 } as Pt,
    alive: false,
    score: 0,
    lastTick: 0,
  });
  const rafRef = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<"idle" | "playing" | "dead">("idle");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { snake, food } = gameRef.current;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) {
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
    }
    ctx.stroke();

    // Food
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL / 2 - 3,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Snake
    snake.forEach((s, i) => {
      const fade = 1 - (i / snake.length) * 0.55;
      ctx.fillStyle = i === 0 ? "#22d3ee" : `rgba(6,182,212,${fade})`;
      const pad = i === 0 ? 1 : 2;
      ctx.fillRect(
        s.x * CELL + pad,
        s.y * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2,
      );
    });
  }, []);

  const tick = useCallback(
    function tickFrame(ts: number) {
      const g = gameRef.current;
      if (!g.alive) return;

      if (ts - g.lastTick >= TICK_MS) {
        g.lastTick = ts;
        g.dir = g.next;
        const head = { ...g.snake[0] };
        if (g.dir === "U") head.y--;
        if (g.dir === "D") head.y++;
        if (g.dir === "L") head.x--;
        if (g.dir === "R") head.x++;

        if (
          head.x < 0 ||
          head.x >= COLS ||
          head.y < 0 ||
          head.y >= ROWS ||
          g.snake.some((s) => s.x === head.x && s.y === head.y)
        ) {
          g.alive = false;
          draw();
          setPhase("dead");
          return;
        }

        g.snake.unshift(head);
        if (head.x === g.food.x && head.y === g.food.y) {
          g.score++;
          setScore(g.score);
          g.food = randFood(g.snake);
        } else {
          g.snake.pop();
        }
      }

      draw();
      rafRef.current = requestAnimationFrame(tickFrame);
    },
    [draw],
  );

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const snake = [{ x: 10, y: 10 }];
    gameRef.current = {
      snake,
      dir: "R",
      next: "R",
      food: randFood(snake),
      alive: true,
      score: 0,
      lastTick: 0,
    };
    setScore(0);
    setPhase("playing");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "U",
        ArrowDown: "D",
        ArrowLeft: "L",
        ArrowRight: "R",
        w: "U",
        s: "D",
        a: "L",
        d: "R",
        W: "U",
        S: "D",
        A: "L",
        D: "R",
      };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      const g = gameRef.current;
      if (g.dir !== OPP[d]) g.next = d;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const steer = (d: Dir) => {
    const g = gameRef.current;
    if (g.dir !== OPP[d]) g.next = d;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    steer(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : dy > 0 ? "D" : "U",
    );
    touchRef.current = null;
  };

  const BtnCls =
    "flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/80 text-slate-200 text-lg active:bg-slate-600 transition-colors select-none touch-manipulation";

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <p className="text-sm text-slate-400">
        Score: <span className="font-bold text-cyan-300">{score}</span>
      </p>

      <div className="relative w-full" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-xl border border-slate-700"
          style={{ display: "block", touchAction: "none" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
        {(phase === "idle" || phase === "dead") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/85 backdrop-blur-sm">
            {phase === "dead" && (
              <>
                <p className="text-xl font-bold text-rose-400">Game Over</p>
                <p className="text-sm text-slate-300">Score: {score}</p>
              </>
            )}
            <button
              onClick={start}
              className="rounded-lg bg-cyan-600 px-8 py-3 text-sm font-semibold text-white active:scale-95 transition-transform touch-manipulation"
            >
              {phase === "dead" ? "Play Again" : "Start Game"}
            </button>
          </div>
        )}
      </div>

      {/* On-screen D-pad for tablets/phones */}
      <div className="grid grid-cols-3 gap-2">
        <div />
        <button className={BtnCls} onPointerDown={() => steer("U")}>
          ▲
        </button>
        <div />
        <button className={BtnCls} onPointerDown={() => steer("L")}>
          ◄
        </button>
        <div />
        <button className={BtnCls} onPointerDown={() => steer("R")}>
          ►
        </button>
        <div />
        <button className={BtnCls} onPointerDown={() => steer("D")}>
          ▼
        </button>
        <div />
      </div>

      <p className="text-xs text-slate-500">
        Arrow keys · WASD · swipe · or use the pad above
      </p>
    </div>
  );
}
