import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TypingPassage, KeystrokeLogEntry, TypingRunResult } from '../../types';
import {
  buildRunResult,
  computeTypingStats,
  validateTypingResult,
} from '../../services/typingGame';

interface Props {
  passage: TypingPassage;
  periodKey: string;
  startAt?: number;
  disabled?: boolean;
  onProgress?: (progress: number) => void;
  onComplete: (result: TypingRunResult) => void;
}

type Phase = 'waiting' | 'ready' | 'typing' | 'done';

export const TypingTest: React.FC<Props> = ({
  passage,
  periodKey,
  startAt,
  disabled = false,
  onProgress,
  onComplete,
}) => {
  const text = passage.text;
  const [typed, setTyped] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [phase, setPhase] = useState<Phase>(startAt ? 'waiting' : 'ready');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [cheatError, setCheatError] = useState<string | null>(null);

  const startMsRef = useRef<number | null>(null);
  const keystrokeLogRef = useRef<KeystrokeLogEntry[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    setTyped('');
    setErrorCount(0);
    setPhase(startAt ? 'waiting' : 'ready');
    setCountdown(null);
    setLiveWpm(0);
    setLiveAccuracy(100);
    setCheatError(null);
    startMsRef.current = null;
    keystrokeLogRef.current = [];
  }, [passage.id, startAt]);

  useEffect(() => {
    if (!startAt) return;
    const tick = () => {
      const now = Date.now();
      const remaining = startAt - now;
      if (remaining > 3000) {
        setPhase('waiting');
        setCountdown(null);
      } else if (remaining > 0) {
        setPhase('waiting');
        setCountdown(Math.ceil(remaining / 1000));
      } else {
        setPhase('ready');
        setCountdown(null);
        inputRef.current?.focus();
      }
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startAt]);

  useEffect(() => {
    if (phase === 'ready' && !disabled) {
      inputRef.current?.focus();
    }
  }, [phase, disabled]);

  const updateLiveStats = useCallback(
    (currentTyped: string, errors: number) => {
      if (!startMsRef.current) return;
      const stats = computeTypingStats(text, currentTyped, startMsRef.current, Date.now(), errors);
      setLiveWpm(stats.wpm);
      setLiveAccuracy(stats.accuracy);
      const progress = text.length > 0 ? (currentTyped.length / text.length) * 100 : 0;
      onProgressRef.current?.(progress);
    },
    [text]
  );

  const finishRun = useCallback(
    (finalTyped: string, errors: number) => {
      const endMs = Date.now();
      const startMs = startMsRef.current ?? endMs;
      const result = buildRunResult(
        passage.id,
        periodKey,
        text,
        finalTyped,
        errors,
        startMs,
        endMs,
        keystrokeLogRef.current
      );

      const validation = validateTypingResult(text, result);
      if (!validation.valid) {
        setCheatError(validation.reason ?? 'Invalid run');
        setPhase('done');
        return;
      }

      setPhase('done');
      onComplete(result);
    },
    [passage.id, periodKey, text, onComplete]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || phase === 'done' || phase === 'waiting') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Tab' || e.metaKey || e.ctrlKey || e.altKey) {
      e.preventDefault();
      return;
    }

    const now = Date.now();

    if (phase === 'ready' && !startMsRef.current) {
      startMsRef.current = now;
      setPhase('typing');
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (typed.length === 0) return;
      keystrokeLogRef.current.push({ key: 'Backspace', at: now });
      const next = typed.slice(0, -1);
      setTyped(next);
      updateLiveStats(next, errorCount);
      return;
    }

    if (e.key.length !== 1) return;

    e.preventDefault();
    const expected = text[typed.length];
    if (expected === undefined) return;

    keystrokeLogRef.current.push({ key: e.key, at: now });

    if (e.key === expected) {
      const next = typed + e.key;
      setTyped(next);
      updateLiveStats(next, errorCount);
      if (next.length === text.length) {
        finishRun(next, errorCount);
      }
    } else {
      const nextErrors = errorCount + 1;
      setErrorCount(nextErrors);
      updateLiveStats(typed, nextErrors);
    }
  };

  const blockClipboard = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setCheatError('Paste is not allowed — type each letter yourself.');
  };

  const renderPassage = () => {
    const chars = text.split('');
    return chars.map((char, i) => {
      let className = 'text-gray-400';
      if (i < typed.length) {
        className = 'text-emerald-700 bg-emerald-50';
      } else if (i === typed.length && phase !== 'waiting') {
        className = 'text-blue-900 bg-blue-100 border-b-2 border-blue-500';
      }
      return (
        <span key={i} className={className}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase">WPM</div>
          <div className="text-2xl font-bold text-blue-900 tabular-nums">{liveWpm}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase">Accuracy</div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">{liveAccuracy}%</div>
        </div>
        <div>
          <div className="text-xs font-bold text-gray-400 uppercase">Progress</div>
          <div className="text-2xl font-bold text-gray-700 tabular-nums">
            {Math.round((typed.length / text.length) * 100)}%
          </div>
        </div>
      </div>

      {phase === 'waiting' && countdown !== null && countdown <= 3 && (
        <div className="text-center py-8">
          <div className="text-6xl font-bold text-blue-900 animate-pulse">{countdown}</div>
          <p className="text-gray-500 mt-2">Get ready…</p>
        </div>
      )}

      {phase === 'waiting' && (countdown === null || countdown > 3) && (
        <div className="text-center py-8 text-gray-500">
          <p className="font-medium">Waiting for the race to start…</p>
          {startAt && (
            <p className="text-sm mt-1">Starts in {Math.max(0, Math.ceil((startAt - Date.now()) / 1000))}s</p>
          )}
        </div>
      )}

      <div
        className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-lg leading-relaxed font-mono select-none"
        onCopy={(e) => e.preventDefault()}
      >
        {renderPassage()}
      </div>

      <div
        ref={inputRef}
        tabIndex={0}
        role="textbox"
        aria-label="Typing input"
        className="outline-none fixed opacity-0 pointer-events-none w-0 h-0 overflow-hidden"
        onKeyDown={handleKeyDown}
        onPaste={blockClipboard}
        onDrop={(e) => e.preventDefault()}
        onDragOver={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />

      {phase !== 'waiting' && phase !== 'done' && (
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="w-full py-2 text-sm text-blue-600 font-medium hover:underline"
        >
          Click here if typing does not start
        </button>
      )}

      {phase === 'ready' && !disabled && (
        <p className="text-center text-sm text-gray-500">Start typing the highlighted character to begin.</p>
      )}

      {cheatError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {cheatError}
        </div>
      )}
    </div>
  );
};
