'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const COLS = 28;
const ROWS = 28;
const CELL = 11;
const W = COLS * CELL; // 308
const H = ROWS * CELL; // 308

// Cell states: 0=empty 1=spore 2=young 3=moss 4=old
const PALETTE = ['#0f172a', '#bbf7d0', '#4ade80', '#22c55e', '#15803d'];
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

type Cell = 0 | 1 | 2 | 3 | 4;

export default function Moss60Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Cell[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]),
  );
  const phaseRef = useRef<'idle' | 'playing' | 'done'>('idle');
  const spreadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timeLeft, setTimeLeft] = useState(60);
  const [coverage, setCoverage] = useState(0);
  const [, tick] = useState(0); // forces re-renders for phase changes

  const forceUpdate = useCallback(() => tick(n => n + 1), []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grid = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = PALETTE[grid[r][c]];
        ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
      }
    }
  }, []);

  const getCoverage = useCallback(() => {
    const filled = gridRef.current.flat().filter(v => v > 0).length;
    return Math.round((filled / (ROWS * COLS)) * 100);
  }, []);

  const stopGame = useCallback(() => {
    if (spreadIntervalRef.current) clearInterval(spreadIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    spreadIntervalRef.current = null;
    countdownIntervalRef.current = null;
    phaseRef.current = 'done';
    setCoverage(getCoverage());
    forceUpdate();
  }, [getCoverage, forceUpdate]);

  const doSpread = useCallback(() => {
    const grid = gridRef.current;
    const next = grid.map(row => [...row]) as Cell[][];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        if (v === 1) {
          next[r][c] = 2; // spore → young
        } else if (v === 2) {
          next[r][c] = 3; // young → moss
          // spread to 1–2 neighbours
          const shuffled = [...DIRS].sort(() => Math.random() - 0.5);
          let sprouts = 0;
          for (const [dr, dc] of shuffled) {
            if (sprouts >= 2) break;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && next[nr][nc] === 0) {
              next[nr][nc] = 1;
              sprouts++;
            }
          }
        } else if (v === 3 && Math.random() < 0.35) {
          next[r][c] = 4; // moss → old
          // old moss can still spread slowly
          const [dr, dc] = DIRS[Math.floor(Math.random() * 4)];
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && next[nr][nc] === 0) {
            next[nr][nc] = 1;
          }
        }
      }
    }
    gridRef.current = next;
    setCoverage(getCoverage());
    draw();
  }, [draw, getCoverage]);

  const startGame = useCallback(() => {
    if (spreadIntervalRef.current) clearInterval(spreadIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);
    phaseRef.current = 'playing';
    setTimeLeft(60);
    setCoverage(0);
    draw();
    forceUpdate();

    spreadIntervalRef.current = setInterval(doSpread, 350);

    let t = 60;
    countdownIntervalRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) stopGame();
    }, 1000);
  }, [draw, doSpread, stopGame, forceUpdate]);

  useEffect(() => {
    draw();
    return () => {
      if (spreadIntervalRef.current) clearInterval(spreadIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [draw]);

  const plant = useCallback(
    (clientX: number, clientY: number) => {
      if (phaseRef.current !== 'playing') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const c = Math.floor(((clientX - rect.left) / rect.width) * COLS);
      const r = Math.floor(((clientY - rect.top) / rect.height) * ROWS);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
      if (gridRef.current[r][c] === 0) {
        gridRef.current[r][c] = 3; // plant directly as moss
        draw();
      }
    },
    [draw],
  );

  const phase = phaseRef.current;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-6 text-sm text-slate-400">
        <span>
          Time: <span className="font-bold text-emerald-300">{timeLeft}s</span>
        </span>
        <span>
          Coverage: <span className="font-bold text-emerald-300">{coverage}%</span>
        </span>
      </div>

      <div className="relative w-full" style={{ maxWidth: W + 40 }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-xl border border-emerald-900/60"
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            touchAction: 'none',
            cursor: 'crosshair',
          }}
          onClick={e => plant(e.clientX, e.clientY)}
          onTouchStart={e => {
            e.preventDefault();
            Array.from(e.touches).forEach(t => plant(t.clientX, t.clientY));
          }}
          onTouchMove={e => {
            e.preventDefault();
            Array.from(e.touches).forEach(t => plant(t.clientX, t.clientY));
          }}
        />

        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-slate-950/85 backdrop-blur-sm">
            {phase === 'done' && (
              <>
                <p className="text-xl font-bold text-emerald-400">Time&apos;s up!</p>
                <p className="text-sm text-slate-300">
                  You covered <span className="font-bold text-emerald-300">{coverage}%</span> of the garden
                </p>
              </>
            )}
            {phase === 'idle' && (
              <p className="px-6 text-center text-sm text-slate-400">
                Tap the garden to plant moss. Watch it spread...
              </p>
            )}
            <button
              onClick={startGame}
              className="rounded-lg bg-emerald-600 px-8 py-3 text-sm font-semibold text-white active:scale-95 transition-transform touch-manipulation"
            >
              {phase === 'done' ? 'Grow Again' : 'Start Growing'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">Tap · drag · watch it spread · 60 seconds</p>
    </div>
  );
}
