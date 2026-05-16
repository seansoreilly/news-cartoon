import React, { useMemo } from 'react';
import { useLocationStore } from '../../store/locationStore';
import { useNewsStore } from '../../store/newsStore';
import { useCartoonStore } from '../../store/cartoonStore';
import { usePreferencesStore } from '../../store/preferencesStore';

const STEPS = ['Location', 'News', 'Concept', 'Image'] as const;

type StepState = 'completed' | 'current' | 'locked';

interface WorkflowProgressProps {
  onReset?: () => void;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ onReset }) => {
  const location = useLocationStore((s) => s.location);
  const selectedArticles = useNewsStore((s) => s.selectedArticles);
  const selectedConceptIndex = useCartoonStore((s) => s.selectedConceptIndex);
  const imagePath = useCartoonStore((s) => s.imagePath);
  const simpleMode = usePreferencesStore((s) => s.simpleMode);
  const setSimpleMode = usePreferencesStore((s) => s.setSimpleMode);

  const states: StepState[] = useMemo(() => {
    const completed = [
      Boolean(location?.name && location.name.trim() !== ''),
      selectedArticles.length > 0,
      selectedConceptIndex !== null,
      Boolean(imagePath),
    ];
    const firstIncomplete = completed.findIndex((c) => !c);
    return completed.map((isComplete, i) => {
      if (isComplete) return 'completed';
      if (i === firstIncomplete) return 'current';
      return 'locked';
    });
  }, [location, selectedArticles, selectedConceptIndex, imagePath]);

  const currentIndex = states.indexOf('current');
  const hasProgress = states.some((s) => s === 'completed');

  const handleReset = (): void => {
    if (onReset) onReset();
  };

  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={simpleMode}
      onClick={() => setSimpleMode(!simpleMode)}
      className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors min-h-[44px] px-2"
      aria-label={simpleMode ? 'Switch to step-by-step mode' : 'Switch to express mode'}
    >
      <span aria-hidden="true">⚡</span>
      <span className="hidden sm:inline">Express</span>
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ backgroundColor: simpleMode ? 'rgb(217, 119, 6)' : 'rgb(209, 213, 219)' }}
      >
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
          style={{ transform: simpleMode ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
        />
      </span>
    </button>
  );

  return (
    <nav
      aria-label="Workflow progress"
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6 md:-mt-8 mb-6 px-4 sm:px-6 md:px-8 py-3 bg-white/80 backdrop-blur-lg border-b border-white/50 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        {simpleMode ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <span aria-hidden="true" className="text-base">
              ⚡
            </span>
            <span>Express mode</span>
          </div>
        ) : (
          <>
            {/* Mobile: compact label */}
            <div className="md:hidden flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold">
                {currentIndex >= 0 ? currentIndex + 1 : STEPS.length}
              </span>
              <span>
                {currentIndex >= 0 ? STEPS[currentIndex] : 'Done'}
                <span className="text-gray-400 font-normal ml-1">
                  · {Math.max(currentIndex, 0) + (currentIndex < 0 ? 0 : 1)}/{STEPS.length}
                </span>
              </span>
            </div>

            {/* Desktop: full pill rail */}
            <ol className="hidden md:flex flex-1 items-center">
              {STEPS.map((label, index) => {
                const state = states[index];
                return (
                  <React.Fragment key={label}>
                    <li
                      aria-current={state === 'current' ? 'step' : undefined}
                      className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${
                        state === 'current'
                          ? 'bg-purple-600 text-white shadow-md scale-105'
                          : state === 'completed'
                            ? 'bg-purple-100 text-purple-700'
                            : 'text-gray-400'
                      }`}
                    >
                      {state === 'completed' ? (
                        <svg
                          className="w-4 h-4 mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 mr-1.5 rounded-full text-xs font-bold ${
                            state === 'current'
                              ? 'bg-white/25 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                      )}
                      {label}
                    </li>
                    {index < STEPS.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={`flex-1 h-0.5 mx-2 transition-colors duration-500 ${
                          states[index] === 'completed' ? 'bg-purple-400' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </ol>
          </>
        )}

        <div className="flex items-center gap-2">
          {hasProgress && onReset && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs sm:text-sm font-medium text-gray-500 hover:text-purple-700 underline underline-offset-2 decoration-gray-300 hover:decoration-purple-400 transition-colors min-h-[44px] px-2"
              aria-label="Start workflow over"
            >
              Start over
            </button>
          )}
          {toggle}
        </div>
      </div>
    </nav>
  );
};

export default WorkflowProgress;
