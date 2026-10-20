"use client";

import { useEffect, useRef, useState } from "react";

type Clock = {
  now: number;
  offset: number;
};

export function Timer({
  deadlineAt,
  serverNow,
  paused,
  onExpire,
}: {
  deadlineAt: string;
  serverNow: string;
  paused: boolean;
  onExpire: () => void;
}) {
  const [clock, setClock] = useState<Clock>(() => ({
    now: new Date(serverNow).getTime(),
    offset: 0,
  }));
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const nextOffset = new Date(serverNow).getTime() - Date.now();
    expiredRef.current = false;

    // Sincroniza o relógio local com o horário do servidor ao receber a questão.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock({ now: Date.now(), offset: nextOffset });
  }, [serverNow]);

  useEffect(() => {
    if (paused) {
      return;
    }

    const interval = window.setInterval(() => {
      setClock((current) => ({ ...current, now: Date.now() }));
    }, 100);

    return () => window.clearInterval(interval);
  }, [paused]);

  const deadline = new Date(deadlineAt).getTime();
  const remainingMs = Math.max(0, deadline - (clock.now + clock.offset));
  const remaining = Math.ceil(remainingMs / 1000);
  const progress = Math.max(0, Math.min(100, (remainingMs / 20000) * 100));

  useEffect(() => {
    if (paused || expiredRef.current) {
      return;
    }

    if (remainingMs <= 0) {
      expiredRef.current = true;
      onExpireRef.current();
    }
  }, [paused, remainingMs]);

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-white/45 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Tempo</span>
        <span
          role="timer"
          aria-live="off"
          aria-label={`Tempo restante: ${remaining} segundos`}
          className={`font-mono text-lg font-semibold tabular-nums ${
            remaining <= 5 ? "text-[var(--color-danger)]" : ""
          }`}
        >
          {remaining}s
        </span>
      </div>
      <div
        className="timer-track mt-2"
        role="progressbar"
        aria-label="Progresso do tempo"
        aria-valuemin={0}
        aria-valuemax={20}
        aria-valuenow={remaining}
      >
        <div className="timer-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
