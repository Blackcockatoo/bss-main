'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

// Loaded client-side only — all games use canvas / browser APIs
const SnakeGame    = dynamic(() => import('@/components/games/SnakeGame'),    { ssr: false });
const TetrisGame   = dynamic(() => import('@/components/games/TetrisGame'),   { ssr: false });
const SacredGames  = dynamic(() => import('@/components/games/SacredGames'),  { ssr: false });
const Moss60Game   = dynamic(() => import('@/components/games/Moss60Game'),   { ssr: false });

type GameId = 'moss60' | 'sacred' | 'snake' | 'tetris';

// Order: Moss60 first, Sacred Games second (swapped from original Sacred → Moss order).
// ASMR removed — accessible via the Classroom Quest / school section.
const GAMES = [
  {
    id: 'moss60'  as GameId,
    title: 'Moss 60',
    desc: 'Grow a garden of moss in 60 seconds.',
    icon: '🌿',
    border: 'border-emerald-700/50',
    bg: 'bg-emerald-950/30',
    textCls: 'text-emerald-300',
    btnCls: 'bg-emerald-600 hover:bg-emerald-500',
  },
  {
    id: 'sacred'  as GameId,
    title: 'Sacred Games',
    desc: 'Ancient symbols. Find all eight pairs.',
    icon: '✦',
    border: 'border-purple-700/50',
    bg: 'bg-purple-950/30',
    textCls: 'text-purple-300',
    btnCls: 'bg-purple-600 hover:bg-purple-500',
  },
  {
    id: 'snake'   as GameId,
    title: 'Snake',
    desc: 'Classic snake. Touch · swipe · keys.',
    icon: '🐍',
    border: 'border-cyan-700/50',
    bg: 'bg-cyan-950/30',
    textCls: 'text-cyan-300',
    btnCls: 'bg-cyan-600 hover:bg-cyan-500',
  },
  {
    id: 'tetris'  as GameId,
    title: 'Tetris',
    desc: 'Stack the blocks. Level up.',
    icon: '⬛',
    border: 'border-amber-700/50',
    bg: 'bg-amber-950/30',
    textCls: 'text-amber-300',
    btnCls: 'bg-amber-500 hover:bg-amber-400',
  },
] as const;

export default function GamesPage() {
  const [active, setActive] = useState<GameId | null>(null);
  const activeGame = GAMES.find(g => g.id === active);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl p-4 pb-28">
      <header className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Arcade</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-100">Games</h1>
        <p className="mt-1 text-sm text-slate-400">Pick a game and play</p>
      </header>

      {/* Game cards — 2-column on mobile, 4-column on wider screens */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GAMES.map(game => (
          <button
            key={game.id}
            onClick={() => setActive(game.id)}
            className={[
              'flex flex-col items-start gap-2 rounded-xl border p-4 text-left',
              'transition-all active:scale-95 touch-manipulation',
              game.border, game.bg,
              active === game.id ? 'ring-2 ring-white/20' : '',
            ].join(' ')}
          >
            <span className="text-3xl">{game.icon}</span>
            <span className={`text-sm font-semibold ${game.textCls}`}>{game.title}</span>
            <span className="text-xs text-slate-400 leading-tight">{game.desc}</span>
          </button>
        ))}
      </div>

      {/* Link back to Classroom Quest (school section) */}
      <div className="mt-6">
        <Link
          href="/veil/school-quest"
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-400"
        >
          ← Classroom Quest
        </Link>
      </div>

      {/* Full-screen game overlay */}
      {active && activeGame && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950">
          {/* Header bar */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-800/80 px-4 py-3">
            <button
              onClick={() => setActive(null)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 active:scale-95 transition-transform touch-manipulation"
              aria-label="Back to games"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xl">{activeGame.icon}</span>
            <h2 className={`text-base font-semibold ${activeGame.textCls}`}>
              {activeGame.title}
            </h2>
          </div>

          {/* Game area — scrollable so tall games (Tetris) work on small screens */}
          <div className="flex-1 overflow-y-auto">
            {active === 'moss60'  && <Moss60Game />}
            {active === 'sacred'  && <SacredGames />}
            {active === 'snake'   && <SnakeGame />}
            {active === 'tetris'  && <TetrisGame />}
          </div>
        </div>
      )}
    </main>
  );
}
