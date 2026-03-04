"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const W = COLS * CELL; // 280
const H = ROWS * CELL; // 560

const PIECES: { shape: number[][]; color: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "#22d3ee" }, // I
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#fbbf24",
  }, // O
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "#a78bfa",
  }, // T
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "#34d399",
  }, // S
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "#f87171",
  }, // Z
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "#60a5fa",
  }, // J
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "#fb923c",
  }, // L
];

type Grid = (string | null)[][];

function makeGrid(): Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
}

function canPlace(
  grid: Grid,
  shape: number[][],
  px: number,
  py: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = px + c;
      const y = py + r;
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && grid[y][x]) return false;
    }
  }
  return true;
}

function mergePiece(
  grid: Grid,
  shape: number[][],
  px: number,
  py: number,
  color: string,
): Grid {
  const next = grid.map((row) => [...row]);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = px + c;
      const y = py + r;
      if (y >= 0) next[y][x] = color;
    }
  }
  return next;
}

function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((c) => c === null));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
  return { grid: kept, cleared };
}

const SCORE_TABLE = [0, 100, 300, 500, 800];
const SPAWN_X = Math.floor(COLS / 2) - 1;
const SPAWN_Y = -2;

function randomPiece() {
  return { ...PIECES[Math.floor(Math.random() * PIECES.length)] };
}

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const stateRef = useRef({
    grid: makeGrid(),
    piece: randomPiece(),
    nextPiece: randomPiece(),
    px: SPAWN_X,
    py: SPAWN_Y,
    score: 0,
    lines: 0,
    level: 1,
    alive: false,
    lastDrop: 0,
  });
  const rafRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<"idle" | "playing" | "dead">("idle");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { grid, piece, px, py } = stateRef.current;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Grid lines
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

    // Placed blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = grid[r][c];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 5);
      }
    }

    // Ghost piece
    let ghostY = py;
    while (canPlace(grid, piece.shape, px, ghostY + 1)) ghostY++;
    if (ghostY !== py) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = piece.color;
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue;
          ctx.fillRect(
            (px + c) * CELL + 1,
            (ghostY + r) * CELL + 1,
            CELL - 2,
            CELL - 2,
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    // Active piece
    ctx.fillStyle = piece.color;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        if (py + r < 0) continue;
        ctx.fillStyle = piece.color;
        ctx.fillRect(
          (px + c) * CELL + 1,
          (py + r) * CELL + 1,
          CELL - 2,
          CELL - 2,
        );
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect((px + c) * CELL + 1, (py + r) * CELL + 1, CELL - 2, 5);
      }
    }
  }, []);

  const lockAndSpawn = useCallback(() => {
    const s = stateRef.current;
    const merged = mergePiece(s.grid, s.piece.shape, s.px, s.py, s.piece.color);
    const { grid: newGrid, cleared } = clearLines(merged);
    s.score += SCORE_TABLE[cleared] * s.level;
    s.lines += cleared;
    s.level = Math.floor(s.lines / 10) + 1;
    setScore(s.score);
    setLines(s.lines);
    setLevel(s.level);
    s.piece = s.nextPiece;
    s.nextPiece = randomPiece();
    s.px = SPAWN_X;
    s.py = SPAWN_Y;
    s.grid = newGrid;
    if (!canPlace(newGrid, s.piece.shape, s.px, s.py)) {
      s.alive = false;
      setPhase("dead");
    }
  }, []);

  const tick = useCallback(
    function tickFrame(ts: number) {
      const s = stateRef.current;
      if (!s.alive) return;
      const speed = Math.max(80, 600 - (s.level - 1) * 55);
      if (ts - s.lastDrop >= speed) {
        s.lastDrop = ts;
        if (canPlace(s.grid, s.piece.shape, s.px, s.py + 1)) {
          s.py++;
        } else {
          lockAndSpawn();
        }
      }
      draw();
      rafRef.current = requestAnimationFrame(tickFrame);
    },
    [draw, lockAndSpawn],
  );

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stateRef.current = {
      grid: makeGrid(),
      piece: randomPiece(),
      nextPiece: randomPiece(),
      px: SPAWN_X,
      py: SPAWN_Y,
      score: 0,
      lines: 0,
      level: 1,
      alive: true,
      lastDrop: 0,
    };
    setScore(0);
    setLines(0);
    setLevel(1);
    setPhase("playing");
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.alive) return;
      switch (e.key) {
        case "ArrowLeft":
          if (canPlace(s.grid, s.piece.shape, s.px - 1, s.py)) s.px--;
          break;
        case "ArrowRight":
          if (canPlace(s.grid, s.piece.shape, s.px + 1, s.py)) s.px++;
          break;
        case "ArrowDown":
          if (canPlace(s.grid, s.piece.shape, s.px, s.py + 1)) s.py++;
          break;
        case "ArrowUp":
        case "x":
        case "X": {
          const rot = rotate(s.piece.shape);
          if (canPlace(s.grid, rot, s.px, s.py))
            s.piece = { ...s.piece, shape: rot };
          break;
        }
        case " ": {
          while (canPlace(s.grid, s.piece.shape, s.px, s.py + 1)) s.py++;
          lockAndSpawn();
          break;
        }
        default:
          return;
      }
      e.preventDefault();
      draw();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw, lockAndSpawn]);

  const move = (action: "left" | "right" | "rotate" | "down" | "drop") => {
    const s = stateRef.current;
    if (!s.alive) return;
    switch (action) {
      case "left":
        if (canPlace(s.grid, s.piece.shape, s.px - 1, s.py)) s.px--;
        break;
      case "right":
        if (canPlace(s.grid, s.piece.shape, s.px + 1, s.py)) s.px++;
        break;
      case "rotate": {
        const rot = rotate(s.piece.shape);
        if (canPlace(s.grid, rot, s.px, s.py))
          s.piece = { ...s.piece, shape: rot };
        break;
      }
      case "down":
        if (canPlace(s.grid, s.piece.shape, s.px, s.py + 1)) s.py++;
        break;
      case "drop":
        while (canPlace(s.grid, s.piece.shape, s.px, s.py + 1)) s.py++;
        lockAndSpawn();
        break;
    }
    draw();
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
    touchRef.current = null;
    const adx = Math.abs(dx),
      ady = Math.abs(dy);
    if (Math.max(adx, ady) < 15) {
      move("rotate");
    } else if (adx > ady) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "drop" : "rotate");
    }
  };

  const Btn =
    "flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700/80 text-slate-200 text-lg active:bg-slate-600 transition-colors select-none touch-manipulation";

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex gap-5 text-sm text-slate-400">
        <span>
          Score: <span className="font-bold text-amber-300">{score}</span>
        </span>
        <span>
          Lines: <span className="font-bold text-slate-200">{lines}</span>
        </span>
        <span>
          Lv: <span className="font-bold text-slate-200">{level}</span>
        </span>
      </div>

      <div className="relative" style={{ maxWidth: W }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="rounded-xl border border-slate-700"
          style={{
            display: "block",
            width: "100%",
            maxWidth: W,
            touchAction: "none",
          }}
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
              className="rounded-lg bg-amber-500 px-8 py-3 text-sm font-semibold text-slate-900 active:scale-95 transition-transform touch-manipulation"
            >
              {phase === "dead" ? "Play Again" : "Start Game"}
            </button>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex flex-col items-center gap-2">
        <button className={Btn} onPointerDown={() => move("rotate")}>
          ↻
        </button>
        <div className="flex gap-2">
          <button className={Btn} onPointerDown={() => move("left")}>
            ◄
          </button>
          <button className={Btn} onPointerDown={() => move("down")}>
            ▼
          </button>
          <button className={Btn} onPointerDown={() => move("right")}>
            ►
          </button>
        </div>
        <button
          className="flex h-12 w-40 items-center justify-center rounded-xl bg-slate-700/80 text-sm font-semibold text-slate-200 active:bg-slate-600 transition-colors select-none touch-manipulation"
          onPointerDown={() => move("drop")}
        >
          Hard Drop ⬇
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Arrows · ↑/X rotate · Space drop · swipe on board · or tap buttons
      </p>
    </div>
  );
}
