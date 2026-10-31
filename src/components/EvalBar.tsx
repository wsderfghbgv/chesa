import React from 'react';
import { type Color, type Score, cpFor, formatScore, isMateFor } from '../engine/score';

interface EvalBarProps {
  score: Score | null;
  orientation: Color;
  hidden?: boolean;
  depth?: number;
  delta?: {
    cp: number;
    text: string;
  } | null;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, orientation, hidden, depth, delta }) => {
  if (hidden) {
    return (
      <div
        className="eval-bar eval-bar--hidden"
        title="Barra de evaluación oculta en Modo Entrenamiento sin ayuda"
        aria-label="Evaluación oculta durante la partida"
      >
        <span className="eval-bar__hidden-label">Sin pistas</span>
      </div>
    );
  }

  const cpWhite = score ? cpFor(score, 'w') : 0;
  // Escala sigmoide suave para que +400 cp ocupe ~88 % de la barra.
  const whitePct = Math.max(4, Math.min(96, Math.round(50 + 46 * Math.tanh(cpWhite / 320))));
  const topIsBlack = orientation === 'w';
  const label = formatScore(score, 'w');
  const isMate = score ? isMateFor(score, 'w') || isMateFor(score, 'b') : false;

  return (
    <div
      className={`eval-bar ${topIsBlack ? '' : 'eval-bar--flipped'}`}
      role="meter"
      aria-label={`Evaluación del motor: ${label}${depth ? ` (profundidad ${depth})` : ''}`}
      title={`Evaluación Stockfish (blancas): ${label}${depth ? ` · Profundidad ${depth}` : ''}${cpWhite > 20 ? ' · Ventaja Blanca' : cpWhite < -20 ? ' · Ventaja Negra' : ' · Posición igualada'}`}
    >
      <div className="eval-bar__black" style={{ height: `${100 - whitePct}%` }} />
      <div className="eval-bar__white" style={{ height: `${whitePct}%` }} />
      <div className="eval-bar__labels">
        <span
          className={`eval-bar__score ${cpWhite >= 0 ? 'eval-bar__score--light' : 'eval-bar__score--dark'} ${isMate ? 'eval-bar__score--mate' : ''}`}
        >
          {label}
        </span>
        {delta && Math.abs(delta.cp) >= 20 && (
          <span
            className={`eval-bar__delta ${delta.cp > 0 ? 'eval-bar__delta--gain' : 'eval-bar__delta--loss'}`}
            title={`Cambio de evaluación en esta jugada: ${delta.text}`}
          >
            {delta.cp > 0 ? `+${(delta.cp / 100).toFixed(1)}` : `${(delta.cp / 100).toFixed(1)}`}
          </span>
        )}
      </div>
    </div>
  );
};

