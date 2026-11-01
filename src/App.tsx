import React, { useEffect, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  useChessStore,
  selectActiveBoardShapes,
} from './state/useChessStore';
import { parseUci, materialBalance } from './chess/utils';
import { LEVELS, getLevel } from './engine/levels';
import { cpFor } from './engine/score';
import { GAME_MODE_LABELS, type GameMode } from './storage/db';
import { EvalBar } from './components/EvalBar';
import { InteractiveBoard } from './components/InteractiveBoard';
import {
  BoardQuickControls,
  MoveHistoryAndControls,
} from './components/MoveHistoryAndControls';
import { CoachPanel } from './components/CoachPanel';
import { TrainingLabPanel } from './components/TrainingLabPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PostGameReportView } from './components/PostGameReportView';
import { ProfilePanel } from './components/ProfilePanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Toaster } from './components/Toaster';

const EMPTY_SQUARES: Square[] = [];

function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const App: React.FC = () => {
  const theme = useChessStore((s) => s.theme);
  const activeTab = useChessStore((s) => s.activeTab);
  const focusBoardMode = useChessStore((s) => s.focusBoardMode);
  const boardTheme = useChessStore((s) => s.boardTheme);
  const mode = useChessStore((s) => s.mode);
  const playerColor = useChessStore((s) => s.playerColor);
  const orientation = useChessStore((s) => s.orientation);
  const opponentLevelId = useChessStore((s) => s.opponentLevelId);
  const analysisDepth = useChessStore((s) => s.analysisDepth);
  const engineStatus = useChessStore((s) => s.engineStatus);
  const engineLabel = useChessStore((s) => s.engineLabel);
  const engineError = useChessStore((s) => s.engineError);
  const isOpponentThinking = useChessStore((s) => s.isOpponentThinking);
  const isAnalyzingMove = useChessStore((s) => s.isAnalyzingMove);

  const fens = useChessStore((s) => s.fens);
  const moves = useChessStore((s) => s.moves);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const gameOver = useChessStore((s) => s.gameOver);
  const statusBanner = useChessStore((s) => s.statusBanner);
  const liveEvaluation = useChessStore((s) => s.liveEvaluation);
  const liveLines = useChessStore((s) => s.liveLines);
  const moveEvaluations = useChessStore((s) => s.moveEvaluations);
  const variant = useChessStore((s) => s.variant);
  const teachingPause = useChessStore((s) => s.teachingPause);
  const clockEnabled = useChessStore((s) => s.clockEnabled);
  const whiteClockMs = useChessStore((s) => s.whiteClockMs);
  const blackClockMs = useChessStore((s) => s.blackClockMs);
  const postGameReport = useChessStore((s) => s.postGameReport);
  const playerStats = useChessStore((s) => s.playerStats);

  const showVisualAids = useChessStore((s) => s.showVisualAids);
  const showBestMoveArrow = useChessStore((s) => s.showBestMoveArrow);
  const showThreatArrows = useChessStore((s) => s.showThreatArrows);
  const showSquareLabelsOnBoard = useChessStore((s) => s.showSquareLabelsOnBoard);
  const customHighlightShapes = useChessStore((s) => s.customHighlightShapes);
  const activeChallenge = useChessStore((s) => s.activeChallenge);
  const personalMistakes = useChessStore((s) => s.personalMistakes);

  const shapes = useMemo(() => {
    return selectActiveBoardShapes({
      showVisualAids,
      mode,
      gameOver,
      variant,
      activeChallenge,
      viewingPly,
      moveEvaluations,
      showBestMoveArrow,
      showThreatArrows,
      customHighlightShapes,
      moves,
      fens,
      playerColor,
      liveLines,
    } as any);
  }, [
    showVisualAids,
    mode,
    gameOver,
    variant,
    activeChallenge,
    viewingPly,
    moveEvaluations,
    showBestMoveArrow,
    showThreatArrows,
    customHighlightShapes,
    moves,
    fens,
    playerColor,
    liveLines,
  ]);

  const initApp = useChessStore((s) => s.initApp);
  const startNewGame = useChessStore((s) => s.startNewGame);
  const setTheme = useChessStore((s) => s.setTheme);
  const setActiveTab = useChessStore((s) => s.setActiveTab);
  const setMode = useChessStore((s) => s.setMode);
  const setOpponentLevel = useChessStore((s) => s.setOpponentLevel);
  const setAnalysisDepth = useChessStore((s) => s.setAnalysisDepth);
  const playUserMove = useChessStore((s) => s.playUserMove);
  const tickClock = useChessStore((s) => s.tickClock);
  const retryFromTeachingPause = useChessStore((s) => s.retryFromTeachingPause);
  const resumeFromTeachingPause = useChessStore((s) => s.resumeFromTeachingPause);

  const handleSelectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth <= 860) {
      setTimeout(() => {
        document.getElementById('coach-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    void initApp();
  }, [initApp]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!clockEnabled) return;
    const id = setInterval(() => tickClock(Date.now()), 250);
    return () => clearInterval(id);
  }, [clockEnabled, tickClock]);

  const displayedFen = variant?.active
    ? variant.fens[variant.stepIndex]
    : fens[viewingPly] ?? fens[fens.length - 1];

  const chess = new Chess(displayedFen);
  const stm = chess.turn();
  const isAtLatestPly = viewingPly === moves.length;

  const lastMove = useMemo<[Square, Square] | null>(() => {
    if (variant?.active && variant.stepIndex > 0) {
      const u = variant.uciMoves[variant.stepIndex - 1];
      if (u) {
        const p = parseUci(u);
        return [p.from, p.to];
      }
    } else if (!variant?.active && viewingPly > 0) {
      const m = moves[viewingPly - 1];
      if (m) {
        const p = parseUci(m.uci);
        return [p.from, p.to];
      }
    }
    return null;
  }, [variant, viewingPly, moves]);

  const activeEval = moveEvaluations[viewingPly];
  const vulnerableSquares =
    !variant?.active && (mode !== 'no_aid' || gameOver) && activeEval
      ? activeEval.vulnerableSquares
      : EMPTY_SQUARES;

  const evalDelta = activeEval
    ? {
        cp: cpFor(activeEval.scoreAfter, 'w') - cpFor(activeEval.scoreBefore, 'w'),
        text: activeEval.deltaText,
      }
    : null;

  const canMoveOnBoard =
    variant?.active
      ? !chess.isGameOver()
      : !gameOver &&
        !isOpponentThinking &&
        !teachingPause?.active &&
        isAtLatestPly &&
        stm === playerColor;

  const currentLevel = getLevel(opponentLevelId);
  const matDiffPlayer = materialBalance(chess, playerColor);
  const topColor = orientation === 'w' ? 'b' : 'w';
  const bottomColor = orientation;

  const topIsPlayer = topColor === playerColor;
  const bottomIsPlayer = bottomColor === playerColor;

  const topNameFull = topIsPlayer
    ? `Tú (${playerColor === 'w' ? 'Blancas ♔' : 'Negras ♚'})`
    : `Entrenador Stockfish (${topColor === 'w' ? 'Blancas ♔' : 'Negras ♚'} · ${currentLevel.name})`;
  const topNameShort = topIsPlayer
    ? `Tú (${playerColor === 'w' ? 'Blancas' : 'Negras'})`
    : `Stockfish Nv.${currentLevel.index}`;

  const bottomNameFull = bottomIsPlayer
    ? `Tú (${playerColor === 'w' ? 'Blancas ♔' : 'Negras ♚'})`
    : `Entrenador Stockfish (${bottomColor === 'w' ? 'Blancas ♔' : 'Negras ♚'} · ${currentLevel.name})`;
  const bottomNameShort = bottomIsPlayer
    ? `Tú (${playerColor === 'w' ? 'Blancas' : 'Negras'})`
    : `Stockfish Nv.${currentLevel.index}`;

  return (
    <div className="app-shell" data-theme={theme}>
      <Toaster />
      {/* Cabecera Superior Unificada y Limpia */}
      <header className={`top-header ${isScrolled ? 'top-header--scrolled' : ''}`}>
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true">♞</div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">Chess Coach AI</h1>
              <div
                className={`engine-badge engine-badge--${engineStatus}`}
                title={engineError ?? engineLabel}
              >
                <span className="engine-badge__dot" />
                <span>
                  {engineStatus === 'loading'
                    ? 'Cargando…'
                    : engineStatus === 'thinking' || isAnalyzingMove || isOpponentThinking
                      ? 'Calculando…'
                      : engineStatus === 'error'
                        ? 'Error motor'
                        : 'Stockfish 19'}
                </span>
              </div>
            </div>
            <span className="brand-subtitle">{GAME_MODE_LABELS[mode].subtitle}</span>
          </div>
        </div>

        <div className="header-controls">
          <label className="header-select-group header-select-group--desktop-only" title="Elegir si juegas con piezas Blancas o Negras">
            <span>Tus piezas</span>
            <select
              value={playerColor}
              onChange={(e) => void startNewGame({ color: e.target.value as 'w' | 'b' })}
              aria-label="Seleccionar si juegas con blancas o negras"
            >
              <option value="w">♔ Blancas</option>
              <option value="b">♚ Negras</option>
            </select>
          </label>

          <label className="header-select-group header-select-group--desktop-only">
            <span>Modo</span>
            <select
              value={mode}
              onChange={(e) => void setMode(e.target.value as GameMode)}
              aria-label="Seleccionar modo de juego"
            >
              {(Object.keys(GAME_MODE_LABELS) as GameMode[]).map((m) => (
                <option key={m} value={m}>
                  {GAME_MODE_LABELS[m].title}
                </option>
              ))}
            </select>
          </label>

          <label className="header-select-group header-select-group--desktop-only">
            <span>Rival</span>
            <select
              value={opponentLevelId}
              onChange={(e) => setOpponentLevel(e.target.value)}
              aria-label="Seleccionar fuerza del rival"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.index}. {lvl.name}
                </option>
              ))}
            </select>
          </label>

          <label className="header-select-group header-select-group--desktop-only">
            <span>Análisis</span>
            <select
              value={analysisDepth}
              onChange={(e) => setAnalysisDepth(Number(e.target.value))}
              aria-label="Seleccionar profundidad de análisis"
            >
              {[8, 10, 12, 13, 15, 17, 20].map((d) => (
                <option key={d} value={d}>
                  Prof. {d}
                </option>
              ))}
            </select>
          </label>

          <span className={`turn-pill ${stm === 'w' ? 'turn-pill--white' : 'turn-pill--black'}`}>
            Turno: {stm === 'w' ? 'Blancas' : 'Negras'}
            {chess.inCheck() && !chess.isCheckmate() ? ' · ¡JAQUE!' : ''}
            {chess.isCheckmate() ? ' · ¡MATE!' : ''}
          </span>

          <button
            type="button"
            className="btn btn--ghost btn--xs theme-toggle-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Cambiar entre tema oscuro y claro"
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>

          <button
            type="button"
            className="btn btn--ghost btn--xs header-settings-shortcut"
            onClick={() => handleSelectTab('settings')}
            title="Configuración de nivel y modo"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Área principal de 2 columnas bien diferenciadas */}
      <main className={`main-workspace ${focusBoardMode ? 'main-workspace--focus-board' : ''}`}>
        {/* Columna izquierda: Exclusivamente Tablero + Jugadores + Barra de Acción Rápida */}
        <div className="board-column">
          {/* Jugador superior */}
          <div className={`player-bar ${!gameOver && stm === topColor ? 'player-bar--active-turn' : ''}`}>
            <div className="player-bar__info">
              <span className={`piece-badge piece-badge--${topColor}`}>
                {topColor === 'w' ? '♔' : '♚'}
              </span>
              <div>
                <strong className="player-bar__name">
                  <span className="player-name--full">{topNameFull}</span>
                  <span className="player-name--short">{topNameShort}</span>
                </strong>
                <small className="block-sub">
                  {topIsPlayer
                    ? matDiffPlayer > 0
                      ? `Ventaja: +${matDiffPlayer}`
                      : 'Piezas activas'
                    : matDiffPlayer < 0
                      ? `Ventaja: +${Math.abs(matDiffPlayer)}`
                      : `Nivel ${currentLevel.index}/9`}
                </small>
              </div>
            </div>
            <div className="player-bar__right">
              {!topIsPlayer && isOpponentThinking && (
                <span className="thinking-chip">Pensando…</span>
              )}
              {clockEnabled && (
                <span className={`clock-chip ${stm === topColor ? 'clock-chip--active' : ''}`}>
                  ⏱ {formatClock(topColor === 'w' ? whiteClockMs : blackClockMs)}
                </span>
              )}
            </div>
          </div>

          {/* Contenedor del tablero + barra de evaluación */}
          <div className={`board-stage ${engineStatus === 'loading' ? 'board-stage--loading' : ''}`}>
            {engineStatus === 'loading' && (
              <div className="board-loading-overlay" role="status" aria-live="polite">
                <span className="board-loading-overlay__spinner" aria-hidden="true" />
                <span>Cargando Stockfish 19…</span>
              </div>
            )}
            <EvalBar
              score={liveEvaluation}
              orientation={orientation}
              hidden={mode === 'no_aid' && !gameOver}
              depth={liveLines?.depth}
              delta={evalDelta}
            />
            <InteractiveBoard
              fen={displayedFen}
              orientation={orientation}
              playerColor={playerColor}
              canMove={canMoveOnBoard}
              allowBothSides={Boolean(variant?.active)}
              lastMove={lastMove}
              shapes={shapes}
              vulnerableSquares={vulnerableSquares}
              isVariantMode={Boolean(variant?.active)}
              showSquareLabels={showSquareLabelsOnBoard}
              boardTheme={boardTheme}
              onMove={(from, to, promo) => playUserMove(from, to, promo)}
            />
          </div>

          {/* Jugador inferior + Leyenda compacta integrada */}
          <div className={`player-bar ${!gameOver && stm === bottomColor ? 'player-bar--active-turn' : ''}`}>
            <div className="player-bar__info">
              <span className={`piece-badge piece-badge--${bottomColor}`}>
                {bottomColor === 'w' ? '♔' : '♚'}
              </span>
              <div>
                <strong className="player-bar__name">
                  <span className="player-name--full">{bottomNameFull}</span>
                  <span className="player-name--short">{bottomNameShort}</span>
                </strong>
                <small className="block-sub">
                  {bottomIsPlayer && matDiffPlayer > 0
                    ? `Ventaja: +${matDiffPlayer} · ${statusBanner}`
                    : statusBanner}
                </small>
              </div>
            </div>
            <div className="player-bar__right">
              {(mode !== 'no_aid' || gameOver) && showVisualAids && (
                <div className="board-mini-legend" aria-label="Colores de las flechas">
                  <span><i className="legend-dot legend-dot--green" /> Mejor</span>
                  <span><i className="legend-dot legend-dot--blue" /> Tu jugada</span>
                  <span><i className="legend-dot legend-dot--red" /> Peligro</span>
                </div>
              )}
              {clockEnabled && (
                <span className={`clock-chip ${stm === bottomColor ? 'clock-chip--active' : ''}`}>
                  ⏱ {formatClock(bottomColor === 'w' ? whiteClockMs : blackClockMs)}
                </span>
              )}
            </div>
          </div>

          {/* Tarjeta del Profesor estilo Chess.com Game Review directamente bajo el tablero */}
          {(mode !== 'no_aid' || gameOver) && (
            <div
              className={`coach-mini-bubble ${teachingPause?.active ? 'coach-mini-bubble--pause' : ''}`}
              role="status"
              aria-live="polite"
            >
              <div className="coach-mini-bubble__avatar" aria-hidden="true">🎓</div>
              <div className="coach-mini-bubble__body">
                {teachingPause?.active ? (
                  <>
                    <div className="coach-mini-bubble__top">
                      <span
                        className="coach-mini-bubble__badge"
                        style={{ backgroundColor: teachingPause.evaluation.classification.meta.color }}
                      >
                        {teachingPause.evaluation.classification.meta.symbol}{' '}
                        {teachingPause.evaluation.classification.meta.label}
                      </span>
                      <strong className="coach-mini-bubble__move">
                        Jugaste {teachingPause.evaluation.playedSanEs} · Mejor era {teachingPause.evaluation.bestSanEs}
                      </strong>
                    </div>
                    <p className="coach-mini-bubble__text">{teachingPause.message}</p>
                    <div className="coach-mini-bubble__actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--xs"
                        onClick={() => void retryFromTeachingPause()}
                      >
                        ↩ Reintentar jugada
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => void resumeFromTeachingPause()}
                      >
                        Continuar →
                      </button>
                    </div>
                  </>
                ) : activeEval ? (
                  <>
                    <div className="coach-mini-bubble__top">
                      <span
                        className="coach-mini-bubble__badge"
                        style={{ backgroundColor: activeEval.classification.meta.color }}
                      >
                        {activeEval.classification.meta.symbol} {activeEval.classification.meta.label}
                      </span>
                      <strong className="coach-mini-bubble__move">
                        {activeEval.moveNumber}{activeEval.mover === 'w' ? '.' : '...'} {activeEval.playedSanEs}
                      </strong>
                      {!activeEval.classification.isTopEngineMove && (
                        <span className="coach-mini-bubble__best">
                          Mejor: <b>{activeEval.bestSanEs}</b>
                        </span>
                      )}
                      <button
                        type="button"
                        className="coach-mini-bubble__more"
                        onClick={() => handleSelectTab('coach')}
                      >
                        Ver análisis ↓
                      </button>
                    </div>
                    <p className="coach-mini-bubble__text">{activeEval.whatHappened}</p>
                  </>
                ) : (
                  <div className="coach-mini-bubble__top">
                    <span className="coach-mini-bubble__badge coach-mini-bubble__badge--ready">
                      Stockfish 19
                    </span>
                    <span className="coach-mini-bubble__text">
                      {statusBanner || 'Mueve una pieza. La flecha verde te indica la mejor jugada.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra limpia de controles rápidos debajo del tablero */}
          <BoardQuickControls />
        </div>

        {/* Columna derecha: Navegación + Cinta de Jugadas + Panel Activo */}
        <div id="coach-section" className="coach-column">
          <nav className="workspace-tabs" aria-label="Secciones del entrenador">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'coach' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSelectTab('coach')}
            >
              <span className="tab-btn__icon">🎓</span>
              <span className="tab-btn__label">Profesor</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'lab' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSelectTab('lab')}
            >
              <span className="tab-btn__icon">🧪</span>
              <span className="tab-btn__label">Laboratorio</span>
              {personalMistakes.some((m) => !m.mastered) && <span className="tab-dot" />}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'analysis' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSelectTab('analysis')}
            >
              <span className="tab-btn__icon">⚙</span>
              <span className="tab-btn__label">Motor</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'report' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSelectTab('report')}
            >
              <span className="tab-btn__icon">📊</span>
              <span className="tab-btn__label">Informe</span>
              {postGameReport && <span className="tab-dot" />}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'profile' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSelectTab('profile')}
            >
              <span className="tab-btn__icon">👤</span>
              <span className="tab-btn__label">Perfil ({playerStats.totalGames})</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'settings' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSelectTab('settings')}
            >
              <span className="tab-btn__icon">🎚</span>
              <span className="tab-btn__label">Niveles</span>
            </button>
          </nav>

          {/* Cinta horizontal de jugadas y gráfico desplegable */}
          <MoveHistoryAndControls />

          <div className="tab-content-area" key={activeTab}>
            {activeTab === 'coach' && <CoachPanel />}
            {activeTab === 'lab' && <TrainingLabPanel />}
            {activeTab === 'analysis' && <AnalysisPanel />}
            {activeTab === 'report' && <PostGameReportView />}
            {activeTab === 'profile' && <ProfilePanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </div>
        </div>
      </main>
    </div>
  );
};
