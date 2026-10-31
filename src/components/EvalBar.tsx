import React from 'react';
import { type Color, type Score, cpFor, formatScore } from '../engine/score';

interface EvalBarProps {
  score: Score | null;
  orientation: Color;
  hidden?: boolean;
  depth?: number;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, orientation, hidden, depth }) => {
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

  return (
    <div
      className={`eval-bar ${topIsBlack ? '' : 'eval-bar--flipped'}`}
      role="meter"
      aria-label={`Evaluación del motor: ${label}${depth ? ` (profundidad ${depth})` : ''}`}
      title={`Evaluación Stockfish (vista blancas): ${label}${depth ? ` · Profundidad ${depth}` : ''}`}
    >
      <div className="eval-bar__black" style={{ height: `${100 - whitePct}%` }} />
      <div className="eval-bar__white" style={{ height: `${whitePct}%` }} />
      <span className={`eval-bar__score ${cpWhite >= 0 ? 'eval-bar__score--light' : 'eval-bar__score--dark'}`}>
        {label}
      </span>
    </div>
  );
};

