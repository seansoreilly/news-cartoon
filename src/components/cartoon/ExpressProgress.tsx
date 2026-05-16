import React, { useEffect, useState } from 'react';
import type { ExpressPhase } from '../../hooks/useExpressGenerate';

interface ExpressProgressProps {
  phase: ExpressPhase;
  active: boolean;
}

const PHASES: Array<{
  key: Exclude<ExpressPhase, 'idle' | 'done'>;
  label: string;
  hint: string;
}> = [
  { key: 'news', label: 'News', hint: 'Fetching top articles…' },
  { key: 'concept', label: 'Concept', hint: 'Brainstorming cartoon ideas…' },
  { key: 'script', label: 'Script', hint: 'Composing panel descriptions…' },
  { key: 'image', label: 'Image', hint: 'Rendering with Gemini…' },
];

const formatElapsed = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const phaseIndex = (phase: ExpressPhase): number => {
  switch (phase) {
    case 'news':
      return 0;
    case 'concept':
      return 1;
    case 'script':
      return 2;
    case 'image':
      return 3;
    default:
      return -1;
  }
};

const ExpressProgress: React.FC<ExpressProgressProps> = ({ phase, active }) => {
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      setStartedAt(null);
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setStartedAt(start);
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Date.now() - start);
    }, 250);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active && phase === 'idle') return null;

  const activeIndex = phaseIndex(phase);
  const currentHint = activeIndex >= 0 ? PHASES[activeIndex].hint : 'Finishing up…';

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 bg-white/70 backdrop-blur-sm border border-amber-200 rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <p className="text-sm font-semibold text-amber-900">{currentHint}</p>
        </div>
        <span className="text-xs font-mono text-gray-500 tabular-nums" aria-label="Elapsed time">
          {startedAt !== null ? formatElapsed(elapsed) : '00:00'}
        </span>
      </div>

      <ol className="flex items-center gap-1.5" aria-label="Generation phases">
        {PHASES.map((p, i) => {
          const done = activeIndex > i;
          const current = activeIndex === i;
          return (
            <React.Fragment key={p.key}>
              <li className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors duration-300 ${
                    done
                      ? 'bg-amber-500 text-white'
                      : current
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400 ring-offset-1'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-xs font-medium ${
                    current ? 'text-amber-900' : done ? 'text-amber-700' : 'text-gray-400'
                  }`}
                >
                  {p.label}
                </span>
              </li>
              {i < PHASES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`flex-1 h-0.5 rounded-full transition-colors duration-500 ${
                    done ? 'bg-amber-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
};

export default ExpressProgress;
