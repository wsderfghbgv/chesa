import React, { useState } from 'react';
import { useChessStore, type MoveHistoryItem } from '../state/useChessStore';
import { formatScore } from '../engine/score';
import { parseUci } from '../chess/utils';
import { EvalChart } from './EvalChart';

/**
 * Barra compacta de controles rápidos situada directamente debajo del tablero
 * para que la columna izquierda quede limpia y sin exceso de cajas.
 */
export const BoardQuickControls: React.FC = () => {
  const moves = useChessStore((s) => s.moves);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const mode = useChessStore((s) => s.mode);
  const playerColor = useChessStore((s) => s.playerColor);
  const gameOver = useChessStore((s) => s.gameOver);
  const variant = useChessStore((s) => s.variant);
  const focusBoardMode = useChessStore((s) => s.focusBoardMode);
  const boardTheme = useChessStore((s) => s.boardTheme);
  const isAutoPlaying = useChessStore((s) => s.isAutoPlaying);

  const selectPly = useChessStore((s) => s.selectPly);
  const stepVariant = useChessStore((s) => s.stepVariant);
  const startNewGame = useChessStore((s) => s.startNewGame);
  const undoMovePair = useChessStore((s) => s.undoMovePair);
  const resignGame = useChessStore((s) => s.resignGame);
  const offerDraw = useChessStore((s) => s.offerDraw);
  const finishAndReviewNow = useChessStore((s) => s.finishAndReviewNow);
  const setActiveTab = useChessStore((s) => s.setActiveTab);
  const flipBoard = useChessStore((s) => s.flipBoard);
  const toggleFocusBoardMode = useChessStore((s) => s.toggleFocusBoardMode);
  const cycleBoardTheme = useChessStore((s) => s.cycleBoardTheme);
  const toggleAutoPlay = useChessStore((s) => s.toggleAutoPlay);
  const customHighlightShapes = useChessStore((s) => s.customHighlightShapes);
  const setCustomHighlightShapes = useChessStore((s) => s.setCustomHighlightShapes);
  const toggleMoveHighlightArrow = useChessStore((s) => s.toggleMoveHighlightArrow);

  const currentViewedMove = viewingPly > 0 ? moves[viewingPly - 1] : null;

  const boardThemeLabel: Record<'emerald' | 'wood' | 'midnight' | 'ocean', string> = {
    emerald: 'Esmeralda',
    wood: 'Madera',
    midnight: 'Medianoche',
    ocean: 'Océano',
  };

  const isVariantActive = Boolean(variant?.active);
  const maxVariantIndex = variant ? variant.fens.length - 1 : 0;
  const currentVariantStep = variant ? variant.stepIndex : 0;

  const handleNavFirst = () => {
    if (isVariantActive) {
      void stepVariant(-currentVariantStep);
    } else {
      void selectPly(0);
    }
  };

  const handleNavPrev = () => {
    if (isVariantActive) {
      void stepVariant(-1);
    } else {
      void selectPly(viewingPly - 1);
    }
  };

  const handleNavNext = () => {
    if (isVariantActive) {
      void stepVariant(1);
    } else {
      void selectPly(viewingPly + 1);
    }
  };

  const handleNavLast = () => {
    if (isVariantActive) {
      void stepVariant(maxVariantIndex - currentVariantStep);
    } else {
      void selectPly(moves.length);
    }
  };

  const canGoBack = isVariantActive ? currentVariantStep > 0 : viewingPly > 0;
  const canGoForward = isVariantActive ? currentVariantStep < maxVariantIndex : viewingPly < moves.length;
  const canUndo = (mode !== 'no_aid' || gameOver) && moves.length > 0 && !isVariantActive;

  return (
    <div className="board-toolbar" role="toolbar" aria-label="Controles de partida y navegación">
      <div className="board-toolbar__nav" role="group" aria-label="Navegar jugadas">
        <button
          type="button"
          className="icon-btn"
          title={isVariantActive ? 'Ir al inicio de la variante' : 'Ir al inicio de la partida'}
          disabled={!canGoBack}
          onClick={handleNavFirst}
        >
          ⏮
        </button>
        <button
          type="button"
          className="icon-btn"
          title={isVariantActive ? 'Paso anterior de la variante' : 'Jugada anterior'}
          disabled={!canGoBack}
          onClick={handleNavPrev}
        >
          ◀
        </button>
        <span className="board-toolbar__ply">
          {isVariantActive
            ? `Rama ${currentVariantStep}/${maxVariantIndex}`
            : moves.length === 0
              ? 'Inicio'
              : `${viewingPly}/${moves.length}`}
        </span>
        <button
          type="button"
          className="icon-btn"
          title={isVariantActive ? 'Paso siguiente de la variante' : 'Jugada siguiente'}
          disabled={!canGoForward}
          onClick={handleNavNext}
        >
          ▶
        </button>
        <button
          type="button"
          className="icon-btn"
          title={isVariantActive ? 'Ir al final de la variante' : 'Ir a la jugada actual'}
          disabled={!canGoForward}
          onClick={handleNavLast}
        >
          ⏭
        </button>
        {moves.length > 0 && !isVariantActive && (
          <button
            type="button"
            className={`btn ${isAutoPlaying ? 'btn--accent' : 'btn--ghost'} btn--xs auto-play-btn`}
            onClick={toggleAutoPlay}
            title={isAutoPlaying ? 'Pausar reproducción automática' : 'Reproducir automáticamente toda la partida'}
          >
            {isAutoPlaying ? '⏸ Pausa' : '▶ Auto'}
          </button>
        )}
      </div>

      <div className="board-toolbar__actions">
        {customHighlightShapes && customHighlightShapes.length > 0 && (
          <button
            type="button"
            className="btn btn--accent btn--xs"
            onClick={() => setCustomHighlightShapes([])}
            title="Quitar las flechas y casillas señaladas del tablero"
          >
            ✕ Quitar flechas
          </button>
        )}
        {currentViewedMove && (
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => {
              const p = parseUci(currentViewedMove.uci);
              toggleMoveHighlightArrow(p.from, p.to, 'blue');
            }}
            title={`Sombrear con flecha la jugada ${currentViewedMove.sanEs} en el tablero (o clic derecho en el tablero)`}
          >
            🏹 Sombrear jugada
          </button>
        )}
        <span className="board-color-chip" title={`Color con el que estás jugando (${playerColor === 'w' ? 'Blancas' : 'Negras'})`}>
          Tú: <strong>{playerColor === 'w' ? '♔ Blancas' : '♚ Negras'}</strong>
        </span>
        <button
          type="button"
          className="btn btn--primary btn--xs"
          onClick={() => void startNewGame({ color: playerColor })}
        >
          ↻ Nueva
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--xs"
          onClick={() => void startNewGame({ color: playerColor === 'w' ? 'b' : 'w' })}
          title="Cambiar de color y empezar nueva partida"
        >
          ⇄ {playerColor === 'w' ? 'Negras ♚' : 'Blancas ♔'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--xs"
          onClick={flipBoard}
          title="Girar orientación del tablero"
        >
          ⇅ Girar
        </button>
        <button
          type="button"
          className={`btn ${focusBoardMode ? 'btn--primary' : 'btn--ghost'} btn--xs`}
          onClick={toggleFocusBoardMode}
          title={focusBoardMode ? 'Restaurar vista habitual del tablero' : 'Agrandar tablero para máxima visibilidad'}
        >
          {focusBoardMode ? '🗗 Normal' : '🗖 Grande'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--xs"
          onClick={cycleBoardTheme}
          title={`Cambiar estilo visual de las casillas del tablero (Actual: ${boardThemeLabel[boardTheme]})`}
        >
          🎨 {boardThemeLabel[boardTheme]}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--xs"
          disabled={!canUndo}
          onClick={() => void undoMovePair()}
          title={
            mode === 'no_aid' && !gameOver
              ? 'No disponible en modo sin ayuda'
              : 'Deshacer tu último movimiento'
          }
        >
          ↩ Deshacer
        </button>

        {!gameOver && moves.length > 0 && mode !== 'challenge' && mode !== 'find_best' && (
          <>
            {mode === 'no_aid' && (
              <button
                type="button"
                className="btn btn--accent btn--xs"
                onClick={() => void finishAndReviewNow()}
                title="Terminar partida sin ayuda y ver qué hiciste bien"
              >
                📊 Ver resumen
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => void offerDraw()}
              title="Ofrecer tablas"
            >
              ½ Tablas
            </button>
            <button
              type="button"
              className="btn btn--danger btn--xs"
              onClick={() => void resignGame()}
              title="Abandonar partida"
            >
              🏳 Rendirse
            </button>
          </>
        )}

        {gameOver && (
          <>
            <button
              type="button"
              className="btn btn--primary btn--xs"
              onClick={() => setActiveTab('report')}
            >
              📊 Ver resumen
            </button>
            <button
              type="button"
              className="btn btn--accent btn--xs"
              onClick={() => void startNewGame({ mode: 'rematch' })}
            >
              ⚔ Revancha
            </button>
          </>
        )}

        {(mode !== 'no_aid' || gameOver) && (
          <div className="board-mini-legend" aria-label="Colores de las flechas">
            <span>
              <i className="legend-dot legend-dot--green" /> Mejor
            </span>
            <span>
              <i className="legend-dot legend-dot--blue" /> Jugada
            </span>
            <span>
              <i className="legend-dot legend-dot--red" /> Peligro
            </span>
            <span
              className="drawing-help-pill"
              title="Clic derecho: dibuja flechas y sombrea casillas. Mayús: rojo, Alt: azul. Clic izquierdo en tablero: borrar."
            >
              🎨 Clic derecho dibuja flechas
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Cinta horizontal limpia con el historial de jugadas y gráfico desplegable,
 * ubicada en la columna derecha para no recargar el área del tablero.
 */
export const MoveHistoryAndControls: React.FC = () => {
  const moves = useChessStore((s) => s.moves);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const moveEvaluations = useChessStore((s) => s.moveEvaluations);
  const mode = useChessStore((s) => s.mode);
  const gameOver = useChessStore((s) => s.gameOver);
  const variant = useChessStore((s) => s.variant);

  const selectPly = useChessStore((s) => s.selectPly);
  const stepVariant = useChessStore((s) => s.stepVariant);
  const exitVariant = useChessStore((s) => s.exitVariant);
  const toggleMoveHighlightArrow = useChessStore((s) => s.toggleMoveHighlightArrow);

  const [showChart, setShowChart] = useState(false);

  // Agrupar jugadas por pares (blancas / negras).
  const pairs: Array<{ moveNumber: number; white?: MoveHistoryItem; black?: MoveHistoryItem }> = [];
  for (const m of moves) {
    if (m.color === 'w') {
      pairs.push({ moveNumber: m.moveNumber, white: m });
    } else {
      const last = pairs[pairs.length - 1];
      if (last && !last.black && last.moveNumber === m.moveNumber) {
        last.black = m;
      } else {
        pairs.push({ moveNumber: m.moveNumber, black: m });
      }
    }
  }

  const showEvalBadges = mode !== 'no_aid' || gameOver;
  const canShowChart = (mode !== 'no_aid' || gameOver) && Object.keys(moveEvaluations).length > 0;

  return (
    <div className="history-ribbon-card">
      {/* Barra de exploración de variante cuando está activa */}
      {variant?.active && (
        <div className="variant-banner" role="region" aria-label="Explorador de variantes">
          <div className="variant-banner__top">
            <span className="pill pill--variant">Rama de análisis · {variant.label}</span>
            <button type="button" className="btn btn--primary btn--xs" onClick={exitVariant}>
              ↩ Volver a la partida
            </button>
          </div>
          <div className="variant-banner__moves">
            <button
              type="button"
              className={`var-chip ${variant.stepIndex === 0 ? 'var-chip--active' : ''}`}
              onClick={() => void stepVariant(-variant.stepIndex)}
            >
              Inicio
            </button>
            {variant.sanMoves.map((san, idx) => {
              const step = idx + 1;
              return (
                <button
                  key={`${step}-${san}`}
                  type="button"
                  className={`var-chip ${variant.stepIndex === step ? 'var-chip--active' : ''}`}
                  onClick={() => void stepVariant(step - variant.stepIndex)}
                >
                  {san}
                </button>
              );
            })}
            {variant.analysis?.lines[0] && (
              <span className="variant-eval">
                Eval: {formatScore(variant.analysis.lines[0].score, 'w')}
              </span>
            )}
          </div>
          <div className="variant-banner__nav">
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              disabled={variant.stepIndex <= 0}
              onClick={() => void stepVariant(-1)}
            >
              ◀ Anterior
            </button>
            <span className="variant-step-counter">
              Paso {variant.stepIndex} / {variant.sanMoves.length}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              disabled={variant.stepIndex >= variant.sanMoves.length}
              onClick={() => void stepVariant(1)}
            >
              Siguiente ▶
            </button>
          </div>
        </div>
      )}

      <div className="history-ribbon">
        <span className="history-ribbon__label">Jugadas:</span>
        <div className="history-ribbon__track" role="log" aria-label="Jugadas de la partida">
          {pairs.length === 0 ? (
            <span className="moves-empty">Mueve una pieza en el tablero para comenzar…</span>
          ) : (
            pairs.map((row) => {
              const wEv = row.white && showEvalBadges ? moveEvaluations[row.white.ply] : undefined;
              const bEv = row.black && showEvalBadges ? moveEvaluations[row.black.ply] : undefined;
              return (
                <span
                  key={`${row.moveNumber}-${row.white?.ply ?? row.black?.ply}`}
                  className="history-pair-chip"
                >
                  <span className="history-pair-chip__num">{row.moveNumber}.</span>
                  {row.white && (
                    <button
                      type="button"
                      className={`move-inline-btn ${
                        viewingPly === row.white.ply && !variant ? 'move-inline-btn--active' : ''
                      }`}
                      onClick={() => {
                        if (viewingPly === row.white!.ply) {
                          const p = parseUci(row.white!.uci);
                          toggleMoveHighlightArrow(p.from, p.to, 'blue');
                        } else {
                          void selectPly(row.white!.ply);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const p = parseUci(row.white!.uci);
                        toggleMoveHighlightArrow(p.from, p.to, 'blue');
                      }}
                      title={`${row.white.sanEs} (Clic: ver · Clic derecho: sombrear con flecha)`}
                    >
                      {row.white.sanEs}
                      {wEv && (
                        <b
                          style={{ color: wEv.classification.meta.color }}
                          title={wEv.classification.meta.label}
                        >
                          {wEv.classification.meta.symbol}
                        </b>
                      )}
                    </button>
                  )}
                  {row.black && (
                    <button
                      type="button"
                      className={`move-inline-btn ${
                        viewingPly === row.black.ply && !variant ? 'move-inline-btn--active' : ''
                      }`}
                      onClick={() => {
                        if (viewingPly === row.black!.ply) {
                          const p = parseUci(row.black!.uci);
                          toggleMoveHighlightArrow(p.from, p.to, 'blue');
                        } else {
                          void selectPly(row.black!.ply);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const p = parseUci(row.black!.uci);
                        toggleMoveHighlightArrow(p.from, p.to, 'blue');
                      }}
                      title={`${row.black.sanEs} (Clic: ver · Clic derecho: sombrear con flecha)`}
                    >
                      {row.black.sanEs}
                      {bEv && (
                        <b
                          style={{ color: bEv.classification.meta.color }}
                          title={bEv.classification.meta.label}
                        >
                          {bEv.classification.meta.symbol}
                        </b>
                      )}
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>

        {canShowChart && (
          <button
            type="button"
            className={`btn btn--xs ${showChart ? 'btn--secondary' : 'btn--ghost'}`}
            onClick={() => setShowChart((v) => !v)}
            title="Mostrar u ocultar gráfico de ventaja de la partida"
          >
            📈 {showChart ? 'Ocultar gráfico' : 'Gráfico'}
          </button>
        )}
      </div>

      {showChart && canShowChart && (
        <div className="history-ribbon__chart">
          <EvalChart compact />
        </div>
      )}
    </div>
  );
};
