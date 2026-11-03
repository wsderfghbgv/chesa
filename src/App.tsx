import React, { useEffect, useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import {
  useChessStore,
  selectActiveBoardShapes,
} from './state/useChessStore';
import { parseUci, materialBalance, getCapturedPieces } from './chess/utils';
import { LEVELS, getLevel } from './engine/levels';
import { cpFor } from './engine/score';
import { GAME_MODE_LABELS, type GameMode } from './storage/db';
import { EvalBar } from './components/EvalBar';
import { InteractiveBoard } from './components/InteractiveBoard';
import { PlayerCard } from './components/PlayerCard';
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
  const selectPly = useChessStore((s) => s.selectPly);
  const flipBoard = useChessStore((s) => s.flipBoard);
  const setCustomHighlightShapes = useChessStore((s) => s.setCustomHighlightShapes);
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        void selectPly(Math.max(0, viewingPly - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        void selectPly(Math.min(moves.length, viewingPly + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        void selectPly(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        void selectPly(moves.length);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        flipBoard();
      } else if (e.key === 'c' || e.key === 'C') {
        setCustomHighlightShapes([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectPly, viewingPly, moves.length, flipBoard, setCustomHighlightShapes]);

  const displayedFen = variant?.active
    ? variant.fens[variant.stepIndex]
    : fens[viewingPly] ?? fens[fens.length - 1];

  const chess = new Chess(displayedFen);
  const stm = chess.turn();
  const isAtLatestPly = viewingPly === moves.length;

  const { capturedByWhite, capturedByBlack } = useMemo(
    () => getCapturedPieces(chess),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayedFen],
  );

  const activeBadge = useMemo(() => {
    if (mode === 'no_aid' && !gameOver) return null;
    const ev = moveEvaluations[viewingPly];
    const mv = moves[viewingPly - 1];
    if (!ev || !mv) return null;
    return {
      square: (mv.uci.slice(2, 4) as Square),
      category: ev.classification.category,
    };
  }, [moveEvaluations, viewingPly, moves, mode, gameOver]);

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
          <label className="header-select-group header-select-group--desktop-only header-select-group--color" title="Elegir si juegas con piezas Blancas o Negras">
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

          <label className="header-select-group header-select-group--mode" title="Cambiar modo de juego o entrenamiento">
            <span className="header-select-label">Modo</span>
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

          <label className="header-select-group header-select-group--desktop-only header-select-group--rival">
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

          <label className="header-select-group header-select-group--desktop-only header-select-group--depth">
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
          <PlayerCard
            name={topIsPlayer ? 'Tú' : currentLevel.botName}
            titleBadge={topIsPlayer ? undefined : currentLevel.botTitle}
            rating={topIsPlayer ? 1200 : currentLevel.botElo}
            avatarIcon={topIsPlayer ? '♟' : currentLevel.botAvatar}
            avatarColor={topIsPlayer ? undefined : currentLevel.botColor}
            quote={topIsPlayer ? undefined : currentLevel.botQuote}
            color={topColor}
            isThinking={!topIsPlayer && isOpponentThinking}
            isActiveTurn={!gameOver && stm === topColor}
            capturedPieces={topColor === 'w' ? capturedByWhite : capturedByBlack}
            materialDiff={
              topIsPlayer
                ? matDiffPlayer > 0
                  ? matDiffPlayer
                  : 0
                : matDiffPlayer < 0
                  ? Math.abs(matDiffPlayer)
                  : 0
            }
            clockMs={topColor === 'w' ? whiteClockMs : blackClockMs}
            clockEnabled={clockEnabled}
            statusText={
              !topIsPlayer && isOpponentThinking
                ? 'Calculando…'
                : !topIsPlayer
                  ? `Nivel ${currentLevel.index}/9`
                  : undefined
            }
          />

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
              activeBadge={activeBadge}
              vulnerableSquares={vulnerableSquares}
              isVariantMode={Boolean(variant?.active)}
              showSquareLabels={showSquareLabelsOnBoard}
              boardTheme={boardTheme}
              onMove={(from, to, promo) => playUserMove(from, to, promo)}
            />
          </div>

          {/* Jugador inferior */}
          <PlayerCard
            name={bottomIsPlayer ? 'Tú' : currentLevel.botName}
            titleBadge={bottomIsPlayer ? undefined : currentLevel.botTitle}
            rating={bottomIsPlayer ? 1200 : currentLevel.botElo}
            avatarIcon={bottomIsPlayer ? '♟' : currentLevel.botAvatar}
            avatarColor={bottomIsPlayer ? undefined : currentLevel.botColor}
            quote={bottomIsPlayer ? undefined : currentLevel.botQuote}
            color={bottomColor}
            isThinking={!bottomIsPlayer && isOpponentThinking}
            isActiveTurn={!gameOver && stm === bottomColor}
            capturedPieces={bottomColor === 'w' ? capturedByWhite : capturedByBlack}
            materialDiff={
              bottomIsPlayer
                ? matDiffPlayer > 0
                  ? matDiffPlayer
                  : 0
                : matDiffPlayer < 0
                  ? Math.abs(matDiffPlayer)
                  : 0
            }
            clockMs={bottomColor === 'w' ? whiteClockMs : blackClockMs}
            clockEnabled={clockEnabled}
            statusText={bottomIsPlayer ? statusBanner : undefined}
          />

          {/* Tarjeta de Pausa Pedagógica del Profesor: Solo cuando hay una pausa activa */}
          {teachingPause?.active && (
            <div
              className="coach-mini-bubble coach-mini-bubble--pause"
              role="alert"
              aria-live="polite"
            >
              <div className="coach-mini-bubble__avatar" aria-hidden="true">
                🎓
              </div>
              <div className="coach-mini-bubble__body">
                <div className="coach-mini-bubble__top">
                  <span
                    className="coach-mini-bubble__badge"
                    style={{ backgroundColor: teachingPause.evaluation.classification.meta.color }}
                  >
                    {teachingPause.evaluation.classification.meta.symbol}{' '}
                    {teachingPause.evaluation.classification.meta.label}
                  </span>
                  <strong className="coach-mini-bubble__move">
                    Jugaste {teachingPause.evaluation.playedSanEs} · Mejor era{' '}
                    {teachingPause.evaluation.bestSanEs}
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
              </div>
            </div>
          )}

          {/* Barra limpia de controles rápidos debajo del tablero */}
          <BoardQuickControls />
        </div>

        {/* Columna derecha: Navegación + Cinta de Jugadas + Panel Activo */}
        <div id="coach-section" className="coach-column">
          <div className="coach-sticky-header">
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
                <span className="tab-btn__label">Modos y Niveles</span>
              </button>
            </nav>

            {/* Cinta horizontal de jugadas y gráfico desplegable */}
            <MoveHistoryAndControls />
          </div>

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
