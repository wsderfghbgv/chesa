/**
 * Gráfico Interactivo de Ventaja (Curva de Evaluación por Jugada).
 *
 * Muestra la evolución de la ventaja de Blancas/Negras a lo largo de toda la partida
 * y permite hacer clic en cualquier punto para saltar instantáneamente a esa jugada en el tablero.
 */
import React, { useId } from 'react';
import { useChessStore } from '../state/useChessStore';
import { scoreToCp, formatScore } from '../engine/score';

interface EvalChartProps {
  compact?: boolean;
}

export const EvalChart: React.FC<EvalChartProps> = ({ compact = false }) => {
  const moves = useChessStore((s) => s.moves);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const moveEvaluations = useChessStore((s) => s.moveEvaluations);
  const posAnalysisByPly = useChessStore((s) => s.posAnalysisByPly);
  const mode = useChessStore((s) => s.mode);
  const gameOver = useChessStore((s) => s.gameOver);
  const selectPly = useChessStore((s) => s.selectPly);
  const gradId = useId();

  // En modo sin ayuda ocultamos la curva durante la partida; al terminar se desbloquea por completo.
  if (mode === 'no_aid' && !gameOver) return null;
  if (moves.length === 0) return null;

  const width = 560;
  const height = compact ? 86 : 124;
  const midY = height / 2;
  const padX = 16;
  const usableW = width - padX * 2;

  // Construir puntos por cada ply (0 .. moves.length)
  const points: Array<{
    ply: number;
    x: number;
    y: number;
    cpWhite: number;
    sanEs: string;
    label: string;
    colorDot?: string;
    isMistake?: boolean;
  }> = [];

  const totalPlies = moves.length;
  for (let ply = 0; ply <= totalPlies; ply++) {
    const m = ply > 0 ? moves[ply - 1] : null;
    const ev = moveEvaluations[ply];
    const cachedPos = posAnalysisByPly[ply];

    let cpWhite = 20;
    let label = 'Posición inicial (+0.2)';
    if (ev) {
      cpWhite = scoreToCp(ev.scoreAfter);
      label = `${ev.moveNumber}${ev.mover === 'w' ? '.' : '...'} ${ev.playedSanEs} (${ev.classification.meta.label}: ${formatScore(ev.scoreAfter, 'w')})`;
    } else if (cachedPos?.lines[0]?.score) {
      cpWhite = scoreToCp(cachedPos.lines[0].score);
      label = m
        ? `${m.moveNumber}${m.color === 'w' ? '.' : '...'} ${m.sanEs} (${formatScore(cachedPos.lines[0].score, 'w')})`
        : label;
    } else if (ply > 0 && points[ply - 1]) {
      cpWhite = points[ply - 1].cpWhite;
      label = m ? `${m.moveNumber}${m.color === 'w' ? '.' : '...'} ${m.sanEs}` : '';
    }

    // Acotar visualmente a [-700, +700] cp para una escala clara
    const clamped = Math.max(-700, Math.min(700, cpWhite));
    const norm = clamped / 700; // -1 .. +1
    const x = totalPlies === 0 ? padX : padX + (ply / totalPlies) * usableW;
    const y = midY - norm * (midY - 10);

    points.push({
      ply,
      x,
      y,
      cpWhite,
      sanEs: m?.sanEs ?? 'Inicio',
      label,
      colorDot: ev ? ev.classification.meta.color : undefined,
      isMistake: ev ? ev.classification.meta.isMistake : false,
    });
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${midY} L ${points[0].x.toFixed(1)} ${midY} Z`;

  return (
    <div className="eval-chart-box" aria-label="Gráfico interactivo de ventaja">
      <div className="eval-chart-box__header">
        <span className="eval-chart-box__title">
          📈 Curva de ventaja (haz clic en un punto para ir a esa jugada)
        </span>
        <span className="eval-chart-box__legend">
          Arriba: ventaja Blanca · Abajo: ventaja Negra
        </span>
      </div>
      <svg
        className="eval-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Curva de evaluación por jugada"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Línea de igualdad 0.0 */}
        <line
          x1={padX}
          y1={midY}
          x2={width - padX}
          y2={midY}
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeDasharray="4 3"
        />

        {/* Área y curva */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.2" />

        {/* Indicador vertical del ply seleccionado actualmente */}
        {points[viewingPly] && (
          <line
            x1={points[viewingPly].x}
            y1={6}
            x2={points[viewingPly].x}
            y2={height - 6}
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
        )}

        {/* Puntos interactivos */}
        {points.map((pt) => {
          const isSelected = pt.ply === viewingPly;
          const r = isSelected ? 5.5 : pt.isMistake ? 4.2 : 3;
          const fill = isSelected
            ? '#38bdf8'
            : pt.colorDot ?? '#10b981';
          return (
            <circle
              key={pt.ply}
              cx={pt.x}
              cy={pt.y}
              r={r}
              fill={fill}
              stroke="#0f172a"
              strokeWidth="1"
              style={{ cursor: 'pointer' }}
              onClick={() => void selectPly(pt.ply)}
            >
              <title>{pt.label}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
};
