import React, { useEffect, useMemo } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  useChessStore,
  selectActiveBoardShapes,
} from './state/useChessStore';
import { parseUci, materialBalance } from './chess/utils';
import { LEVELS, getLevel } from './engine/levels';
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

  return (
    <div className="app-shell" data-theme={theme}>
      {/* Cabecera Superior Unificada y Limpia */}
      <header className="top-header">
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
          <label className="header-select-group" title="Elegir si juegas con piezas Blancas o Negras">
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

          <label className="header-select-group">
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

          <label className="header-select-group">
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

          <label className="header-select-group">
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
            {theme === 'dark' ? '☀ Claro' : '🌙 Oscuro'}
          </button>
        </div>
      </header>

      {/* Área principal de 2 columnas bien diferenciadas */}
      <main className={`main-workspace ${focusBoardMode ? 'main-workspace--focus-board' : ''}`}>
        {/* Columna izquierda: Exclusivamente Tablero + Jugadores + Barra de Acción Rápida */}
        <div className="board-column">
          {/* Jugador superior */}
          <div className="player-bar">
            <div className="player-bar__info">
              <span className={`piece-badge piece-badge--${topColor}`}>
                {topColor === 'w' ? '♔' : '♚'}
              </span>
              <div>
                <strong>
                  {topColor === playerColor
                    ? `Tú (${playerColor === 'w' ? 'Blancas ♔' : 'Negras ♚'})`
                    : `Entrenador Stockfish (${topColor === 'w' ? 'Blancas ♔' : 'Negras ♚'} · ${currentLevel.name})`}
                </strong>
                <small className="block-sub">
                  {topColor === playerColor
                    ? matDiffPlayer > 0
                      ? `Ventaja material: +${matDiffPlayer}`
                      : 'Piezas activas'
                    : matDiffPlayer < 0
                      ? `Ventaja material: +${Math.abs(matDiffPlayer)}`
                      : `Nivel ${currentLevel.index}/9`}
                </small>
              </div>
            </div>
            <div className="player-bar__right">
              {topColor !== playerColor && isOpponentThinking && (
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
          <div className="board-stage">
            <EvalBar
              score={liveEvaluation}
              orientation={orientation}
              hidden={mode === 'no_aid' && !gameOver}
              depth={liveLines?.depth}
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
              onMove={(from, to, promo) => void playUserMove(from, to, promo)}
            />
          </div>

          {/* Jugador inferior + Leyenda compacta integrada */}
          <div className="player-bar">
            <div className="player-bar__info">
              <span className={`piece-badge piece-badge--${bottomColor}`}>
                {bottomColor === 'w' ? '♔' : '♚'}
              </span>
              <div>
                <strong>
                  {bottomColor === playerColor
                    ? `Tú (${playerColor === 'w' ? 'Blancas ♔' : 'Negras ♚'})`
                    : `Entrenador Stockfish (${bottomColor === 'w' ? 'Blancas ♔' : 'Negras ♚'} · ${currentLevel.name})`}
                </strong>
                <small className="block-sub">
                  {bottomColor === playerColor && matDiffPlayer > 0
                    ? `Ventaja material: +${matDiffPlayer} · ${statusBanner}`
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

          {/* Barra limpia de controles rápidos debajo del tablero */}
          <BoardQuickControls />
        </div>

        {/* Columna derecha: Navegación + Cinta de Jugadas + Panel Activo */}
        <div className="coach-column">
          <nav className="workspace-tabs" aria-label="Secciones del entrenador">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'coach' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('coach')}
            >
              🎓 Profesor
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'lab' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('lab')}
            >
              🧪 Laboratorio
              {personalMistakes.some((m) => !m.mastered) && <span className="tab-dot" />}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'analysis' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              ⚙ Motor
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'report' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              📊 Informe
              {postGameReport && <span className="tab-dot" />}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'profile' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              👤 Perfil ({playerStats.totalGames})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'settings' ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              🎚 Niveles
            </button>
          </nav>

          {/* Cinta horizontal de jugadas y gráfico desplegable */}
          <MoveHistoryAndControls />

          <div className="tab-content-area">
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
