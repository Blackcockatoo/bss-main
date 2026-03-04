'use client';

import { useCallback, useState } from 'react';

const SYMBOL_DEFS = [
  { sym: '✦', cls: 'text-purple-400' },
  { sym: '☽', cls: 'text-blue-300' },
  { sym: '✴', cls: 'text-amber-400' },
  { sym: '⚡', cls: 'text-yellow-300' },
  { sym: '◈', cls: 'text-cyan-400' },
  { sym: '◉', cls: 'text-rose-400' },
  { sym: '❋', cls: 'text-emerald-400' },
  { sym: '⌬', cls: 'text-indigo-400' },
];

interface Card {
  id: number;
  symIdx: number;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards(): Card[] {
  const pairs = SYMBOL_DEFS.flatMap((_, i) => [
    { id: i * 2,     symIdx: i, flipped: false, matched: false },
    { id: i * 2 + 1, symIdx: i, flipped: false, matched: false },
  ]);
  return shuffle(pairs);
}

export default function SacredGames() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'won'>('idle');

  const begin = useCallback(() => {
    setCards(makeCards());
    setSelected([]);
    setMoves(0);
    setLocked(false);
    setPhase('playing');
  }, []);

  const flip = (id: number) => {
    if (locked || selected.length >= 2) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const updated = cards.map(c => (c.id === id ? { ...c, flipped: true } : c));
    const newSel = [...selected, id];
    setSelected(newSel);

    if (newSel.length === 2) {
      setMoves(m => m + 1);
      const c1 = updated.find(c => c.id === newSel[0])!;
      const c2 = updated.find(c => c.id === newSel[1])!;

      if (c1.symIdx === c2.symIdx) {
        const final = updated.map(c =>
          c.id === newSel[0] || c.id === newSel[1] ? { ...c, matched: true } : c,
        );
        setCards(final);
        setSelected([]);
        if (final.every(c => c.matched)) setPhase('won');
      } else {
        setCards(updated);
        setLocked(true);
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === newSel[0] || c.id === newSel[1] ? { ...c, flipped: false } : c,
            ),
          );
          setSelected([]);
          setLocked(false);
        }, 900);
      }
    } else {
      setCards(updated);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="text-5xl">✦</div>
        <h2 className="text-xl font-semibold text-purple-300">Sacred Games</h2>
        <p className="max-w-xs text-sm text-slate-400">
          Ancient symbols are hidden. Flip two cards at a time — find all eight matching pairs to win.
        </p>
        <button
          onClick={begin}
          className="rounded-lg bg-purple-600 px-8 py-3 text-sm font-semibold text-white active:scale-95 transition-transform touch-manipulation"
        >
          Begin
        </button>
      </div>
    );
  }

  if (phase === 'won') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="text-5xl">✦</div>
        <p className="text-xl font-bold text-purple-300">All pairs found!</p>
        <p className="text-sm text-slate-400">Completed in {moves} moves</p>
        <button
          onClick={begin}
          className="rounded-lg bg-purple-600 px-8 py-3 text-sm font-semibold text-white active:scale-95 transition-transform touch-manipulation"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <p className="text-sm text-slate-400">
        Moves: <span className="font-bold text-purple-300">{moves}</span>
      </p>
      <div className="grid grid-cols-4 gap-2" style={{ maxWidth: 320 }}>
        {cards.map(card => {
          const def = SYMBOL_DEFS[card.symIdx];
          return (
            <button
              key={card.id}
              onClick={() => flip(card.id)}
              className={[
                'flex h-16 w-16 items-center justify-center rounded-xl border text-2xl',
                'transition-all duration-200 select-none touch-manipulation',
                card.matched
                  ? 'border-emerald-700/40 bg-emerald-950/30 opacity-40'
                  : card.flipped
                    ? 'border-purple-500/60 bg-purple-950/50'
                    : 'border-slate-600 bg-slate-800 hover:bg-slate-700 active:scale-95',
              ].join(' ')}
            >
              {card.flipped || card.matched ? (
                <span className={def.cls}>{def.sym}</span>
              ) : (
                <span className="text-slate-600 text-lg">?</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Tap cards to reveal the symbols</p>
    </div>
  );
}
