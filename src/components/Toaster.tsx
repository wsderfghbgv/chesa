import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useChessStore } from '../state/useChessStore';
import { REASON_TEXT } from '../chess/utils';

type ToastKind = 'success' | 'info' | 'warn' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  leaving: boolean;
}

const TOAST_ICON: Record<ToastKind, string> = {
  success: '✓',
  info: 'ℹ',
  warn: '!',
  error: '✕',
};

const TOAST_LIFETIME_MS = 4200;
const TOAST_EXIT_MS = 260;

/**
 * Notificaciones flotantes no intrusivas (solo capa visual).
 * Observa el estado existente del store (motor, fin de partida) sin modificar la lógica del juego.
 */
export const Toaster: React.FC = () => {
  const engineStatus = useChessStore((s) => s.engineStatus);
  const engineError = useChessStore((s) => s.engineError);
  const gameOver = useChessStore((s) => s.gameOver);
  const gameOverReason = useChessStore((s) => s.gameOverReason);
  const winner = useChessStore((s) => s.winner);
  const playerColor = useChessStore((s) => s.playerColor);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const prevStatusRef = useRef(engineStatus);
  const prevGameOverRef = useRef(gameOver);
  const timersRef = useRef<number[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    const tm = window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, TOAST_EXIT_MS);
    timersRef.current.push(tm);
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = ++idRef.current;
      setToasts((list) => [...list.slice(-2), { id, kind, title, message, leaving: false }]);
      const tm = window.setTimeout(() => dismiss(id), TOAST_LIFETIME_MS);
      timersRef.current.push(tm);
    },
    [dismiss],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Motor listo / error del motor
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = engineStatus;
    if (prev === 'loading' && engineStatus === 'ready') {
      push('success', 'Stockfish 19 listo', 'El motor de análisis está preparado.');
    }
  }, [engineStatus, push]);

  useEffect(() => {
    if (engineError) push('error', 'Error del motor', engineError);
  }, [engineError, push]);

  // Fin de partida
  useEffect(() => {
    const prev = prevGameOverRef.current;
    prevGameOverRef.current = gameOver;
    if (!prev && gameOver) {
      const reason = gameOverReason ? REASON_TEXT[gameOverReason] : 'Partida terminada';
      if (winner === playerColor) {
        push('success', '¡Victoria!', `${reason}. Revisa el informe para ver tus mejores jugadas.`);
      } else if (winner === null || winner === undefined) {
        push('info', 'Tablas', reason);
      } else {
        push('warn', 'Derrota', `${reason}. El informe te muestra qué mejorar.`);
      }
    }
  }, [gameOver, gameOverReason, winner, playerColor, push]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-live="polite" aria-label="Notificaciones">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.kind} ${t.leaving ? 'toast--leaving' : ''}`}
          role={t.kind === 'error' ? 'alert' : 'status'}
        >
          <span className="toast__icon" aria-hidden="true">{TOAST_ICON[t.kind]}</span>
          <div className="toast__body">
            <strong className="toast__title">{t.title}</strong>
            {t.message && <span className="toast__message">{t.message}</span>}
          </div>
          <button
            type="button"
            className="toast__close"
            onClick={() => dismiss(t.id)}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
          <span className="toast__progress" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
};

