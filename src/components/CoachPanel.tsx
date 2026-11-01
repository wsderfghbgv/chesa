import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { useChessStore } from '../state/useChessStore';
import { formatScore, describeScore } from '../engine/score';
import { parseUci, uciToSan } from '../chess/utils';
import { describeMoveNaturally, humanizeChessText } from '../chess/humanLanguage';
import { MOTIF_LABELS, type ExplanationLevel } from '../coach/explain';
import { isSpeechSupported } from '../coach/soundAndSpeech';
import { EasyExplanation } from './EasyExplanation';
import { CoachAvatarWidget } from './CoachAvatarWidget';

export const CoachPanel: React.FC = () => {
  const mode = useChessStore((s) => s.mode);
  const playerColor = useChessStore((s) => s.playerColor);
  const orientation = useChessStore((s) => s.orientation);
  const gameOver = useChessStore((s) => s.gameOver);
  const fens = useChessStore((s) => s.fens);
  const moves = useChessStore((s) => s.moves);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const selectedEvalPly = useChessStore((s) => s.selectedEvalPly);
  const moveEvaluations = useChessStore((s) => s.moveEvaluations);
  const isAnalyzingMove = useChessStore((s) => s.isAnalyzingMove);
  const isOpponentThinking = useChessStore((s) => s.isOpponentThinking);
  const liveLines = useChessStore((s) => s.liveLines);
  const liveEvaluation = useChessStore((s) => s.liveEvaluation);
  const posAnalysisByPly = useChessStore((s) => s.posAnalysisByPly);
  const teachingPause = useChessStore((s) => s.teachingPause);
  const activeChallenge = useChessStore((s) => s.activeChallenge);
  const activeOpeningTrainer = useChessStore((s) => s.activeOpeningTrainer);
  const activeEndgameDrill = useChessStore((s) => s.activeEndgameDrill);
  const activeThinkingCheck = useChessStore((s) => s.activeThinkingCheck);
  const thinkingCheckEnabled = useChessStore((s) => s.thinkingCheckEnabled);
  const soundEnabled = useChessStore((s) => s.soundEnabled);
  const voiceEnabled = useChessStore((s) => s.voiceEnabled);
  const explanationLevel = useChessStore((s) => s.explanationLevel);
  const showVisualAids = useChessStore((s) => s.showVisualAids);
  const simpleLanguageMode = useChessStore((s) => s.simpleLanguageMode);
  const showSquareLabelsOnBoard = useChessStore((s) => s.showSquareLabelsOnBoard);

  const setExplanationLevel = useChessStore((s) => s.setExplanationLevel);
  const toggleVisualOption = useChessStore((s) => s.toggleVisualOption);
  const toggleSimpleLanguageMode = useChessStore((s) => s.toggleSimpleLanguageMode);
  const toggleSquareLabelsOnBoard = useChessStore((s) => s.toggleSquareLabelsOnBoard);
  const customHighlightShapes = useChessStore((s) => s.customHighlightShapes);
  const setCustomHighlightShapes = useChessStore((s) => s.setCustomHighlightShapes);
  const toggleSound = useChessStore((s) => s.toggleSound);
  const toggleVoice = useChessStore((s) => s.toggleVoice);
  const toggleThinkingCheck = useChessStore((s) => s.toggleThinkingCheck);
  const answerThinkingCheck = useChessStore((s) => s.answerThinkingCheck);
  const speakText = useChessStore((s) => s.speakText);
  const stopSpeech = useChessStore((s) => s.stopSpeech);
  const finishAndReviewNow = useChessStore((s) => s.finishAndReviewNow);
  const startOpeningDrill = useChessStore((s) => s.startOpeningDrill);
  const exitOpeningDrill = useChessStore((s) => s.exitOpeningDrill);
  const exitEndgameDrill = useChessStore((s) => s.exitEndgameDrill);
  const resumeFromTeachingPause = useChessStore((s) => s.resumeFromTeachingPause);
  const retryFromTeachingPause = useChessStore((s) => s.retryFromTeachingPause);
  const startVariantFromEval = useChessStore((s) => s.startVariantFromEval);
  const nextChallengePuzzle = useChessStore((s) => s.nextChallengePuzzle);
  const setActiveTab = useChessStore((s) => s.setActiveTab);
  const mistakePracticeQueue = useChessStore((s) => s.mistakePracticeQueue);
  const mistakePracticeIndex = useChessStore((s) => s.mistakePracticeIndex);
  const practicePersonalMistake = useChessStore((s) => s.practicePersonalMistake);

  const [showHint, setShowHint] = useState(false);
  const [showLiveHint, setShowLiveHint] = useState(false);

  const isUciHighlighted = (uci?: string | null) => {
    if (!uci || !customHighlightShapes || customHighlightShapes.length === 0) return false;
    const p = parseUci(uci);
    return customHighlightShapes.some((sh) => sh.orig === p.from && sh.dest === p.to);
  };

  const highlightUciOnBoard = (
    uci: string,
    brush: 'green' | 'blue' | 'yellow' = 'green',
    doScroll = true,
  ) => {
    const p = parseUci(uci);
    setCustomHighlightShapes([
      { orig: p.from, dest: p.to, brush },
      { orig: p.from, brush: 'yellow' },
      { orig: p.to, brush },
    ]);
    if (doScroll && typeof window !== 'undefined' && window.innerWidth <= 720) {
      const boardEl = document.querySelector('.board-stage');
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          boardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const toggleHighlightUciOnBoard = (
    uci: string,
    brush: 'green' | 'blue' | 'yellow' = 'green',
  ) => {
    if (isUciHighlighted(uci)) {
      setCustomHighlightShapes([]);
      return;
    }
    highlightUciOnBoard(uci, brush, true);
  };

  const handlePreviewHover = (
    uci: string,
    brush: 'green' | 'blue' | 'yellow' = 'green',
  ) => {
    if (!isUciHighlighted(uci)) {
      highlightUciOnBoard(uci, brush, false);
    }
  };

  const handlePreviewLeave = (uci: string) => {
    if (!isUciHighlighted(uci)) {
      setCustomHighlightShapes([]);
    }
  };

  // 1) En modo sin ayuda DURANTE la partida:
  if (mode === 'no_aid' && !gameOver && !activeOpeningTrainer) {
    return (
      <section className="panel-card coach-panel" aria-label="Panel del profesor">
        <div className="coach-panel__header">
          <div>
            <span className="eyebrow">Entrenador Gran Maestro</span>
            <h3>Modo 4 · Entrenamiento sin ayuda</h3>
          </div>
          <span className="pill pill--neutral">Sin pistas en vivo</span>
        </div>
        <div className="coach-empty">
          <p>
            Estás jugando sin asistencia ni barra de evaluación para simular condiciones reales de
            torneo con las <strong>{playerColor === 'w' ? 'Blancas' : 'Negras'}</strong>.{' '}
            <strong>Stockfish 19 está evaluando todas tus jugadas en segundo plano.</strong>
          </p>
          <p>
            Cuando termine la partida (o cuando decidas concluir con el botón de abajo), verás el{' '}
            <strong>Resumen Completo de la Partida</strong> con todo lo que hiciste bien y las
            recomendaciones explicadas de forma clara para tus{' '}
            <strong>{playerColor === 'w' ? 'Blancas' : 'Negras'}</strong>.
          </p>
          {moves.length > 0 && (
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void finishAndReviewNow()}
              >
                📊 Finalizar ahora y ver resumen de la partida y qué hice bien →
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2) Entrenador de Repertorio de Aperturas (Repetición Espaciada):
  if (activeOpeningTrainer) {
    const { line, currentStepIndex, mistakesInRun, completed, feedback } = activeOpeningTrainer;
    const expectedStep = line.steps[currentStepIndex];
    const currentFen = fens[fens.length - 1];
    const humanExpected = expectedStep
      ? describeMoveNaturally(currentFen, expectedStep.uci, orientation)
      : null;

    return (
      <section className="panel-card coach-panel" aria-label="Entrenador de aperturas">
        <div className="coach-panel__header">
          <div>
            <span className="eyebrow">
              Entrenador de Aperturas · Repetición Espaciada ({line.eco})
            </span>
            <h3>{line.name}</h3>
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--secondary btn--xs"
              onClick={() => void startOpeningDrill(line)}
            >
              ↻ Repetir línea
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => setActiveTab('lab')}
            >
              📚 Repertorio
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => void exitOpeningDrill()}
            >
              ✕ Salir
            </button>
          </div>
        </div>

        <div className="challenge-box">
          <div className="challenge-meta">
            <span>
              Color con el que entrenas: <strong>{line.playerColor === 'w' ? '♔ Blancas' : '♚ Negras'}</strong>
            </span>
            <span>
              Progreso:{' '}
              <strong>
                {Math.min(currentStepIndex, line.steps.length)} / {line.steps.length} pasos
              </strong>
            </span>
            <span>
              Desviaciones: <strong>{mistakesInRun}</strong>
            </span>
          </div>

          {feedback && (
            <div className={`alert-box ${completed ? 'alert-box--success' : 'alert-box--warn'}`}>
              <p><EasyExplanation text={feedback} /></p>
            </div>
          )}

          {!completed && expectedStep && (
            <div className="coach-block coach-block--best">
              <h4>Tu siguiente jugada teórica en el tablero ({line.playerColor === 'w' ? 'Blancas' : 'Negras'})</h4>
              {showHint && humanExpected ? (
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {humanExpected.pieceIcon} {humanExpected.naturalSummary}
                  </p>
                  <p><EasyExplanation text={expectedStep.comment} /></p>
                </div>
              ) : (
                <p>
                  Realiza el movimiento teórico sobre el tablero con tus{' '}
                  <strong>{line.playerColor === 'w' ? 'Blancas' : 'Negras'}</strong> o pulsa el botón
                  para que el profesor te dibuje una <strong>flecha verde en el tablero</strong>.
                </p>
              )}
              <div className="btn-row" style={{ marginTop: '0.45rem' }}>
                <button
                  type="button"
                  className={`btn ${isUciHighlighted(expectedStep.uci) ? 'btn--accent' : 'btn--primary'} btn--xs`}
                  onClick={() => {
                    if (isUciHighlighted(expectedStep.uci)) {
                      setCustomHighlightShapes([]);
                      setShowHint(false);
                    } else {
                      setShowHint(true);
                      highlightUciOnBoard(expectedStep.uci, 'green');
                    }
                  }}
                  title={
                    isUciHighlighted(expectedStep.uci)
                      ? 'Ocultar flecha del tablero'
                      : 'Señalar con flecha en el tablero qué pieza mover'
                  }
                >
                  {isUciHighlighted(expectedStep.uci)
                    ? '✕ Ocultar flecha teórica'
                    : '🟢 Señalar con flecha en el tablero qué pieza mover'}
                </button>
              </div>
            </div>
          )}

          <div className="coach-two-col">
            <div className="coach-block coach-block--good">
              <h4>Objetivo estratégico</h4>
              <p><EasyExplanation text={line.strategicGoal} /></p>
            </div>
            <div className="coach-block coach-block--watch">
              <h4>Celada / error típico a vigilar</h4>
              <p><EasyExplanation text={line.typicalTrapWarning} /></p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 3) Modos 3 (Desafío) y 5 (Juega la mejor jugada)
  if ((mode === 'challenge' || mode === 'find_best') && activeChallenge) {
    const { puzzle, status, feedback, attempts } = activeChallenge;
    const humanSolution = puzzle.solutionUci[0]
      ? describeMoveNaturally(puzzle.fen, puzzle.solutionUci[0], orientation)
      : null;

    return (
      <section className="panel-card coach-panel" aria-label="Desafío del entrenador">
        <div className="coach-panel__header">
          <div>
            <span className="eyebrow">
              {mistakePracticeQueue.length > 0
                ? `🎯 Practicar mis errores · Ejercicio ${mistakePracticeIndex + 1} de ${mistakePracticeQueue.length}`
                : mode === 'challenge'
                  ? 'Modo 3 · Desafío Táctico/Estratégico'
                  : 'Modo 5 · Juega la mejor jugada'}
            </span>
            <h3>{puzzle.title}</h3>
          </div>
          <span className="pill pill--accent">{MOTIF_LABELS[puzzle.motif]}</span>
        </div>

        <div className="challenge-box">
          <div className="challenge-meta">
            <span>Dificultad: <strong>{puzzle.difficulty}</strong></span>
            <span>Juegas con: <strong>{puzzle.playerColor === 'w' ? '♔ Blancas' : '♚ Negras'}</strong></span>
            <span>Intentos: <strong>{attempts}</strong></span>
          </div>
          <p className="challenge-prompt"><EasyExplanation text={puzzle.prompt} /></p>

          {feedback && (
            <div className={`alert-box ${status === 'solved' ? 'alert-box--success' : 'alert-box--warn'}`}>
              <p><EasyExplanation text={feedback} /></p>
            </div>
          )}

          {showHint && status !== 'solved' && (
            <div className="coach-block coach-block--subtle">
              <strong>Pista del profesor:</strong>
              <p><EasyExplanation text={puzzle.hint} /></p>
              {humanSolution && (
                <p style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                  💡 Fíjate en tu {humanSolution.pieceIcon} <strong>{humanSolution.pieceName}</strong> ({humanSolution.visualGuide})
                </p>
              )}
              {puzzle.solutionUci[0] && (
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  style={{ marginTop: '0.35rem' }}
                  onClick={() =>
                    setCustomHighlightShapes([
                      { orig: parseUci(puzzle.solutionUci[0]).from, brush: 'yellow' },
                    ])
                  }
                >
                  👁 Iluminar en el tablero con qué pieza se juega
                </button>
              )}
            </div>
          )}

          {status === 'solved' && (
            <div className="coach-block">
              <strong>Concepto clave trabajado:</strong>
              <p><EasyExplanation text={puzzle.conceptToStudy} /></p>
            </div>
          )}

          <div className="btn-row">
            {status !== 'solved' && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setShowHint((v) => !v)}
              >
                {showHint ? 'Ocultar pista' : '💡 Pedir pista'}
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setShowHint(false);
                setCustomHighlightShapes([]);
                void nextChallengePuzzle();
              }}
            >
              {mistakePracticeQueue.length > 0
                ? mistakePracticeIndex + 1 < mistakePracticeQueue.length
                  ? 'Siguiente error de la partida →'
                  : 'Terminar práctica de errores ✓'
                : 'Siguiente posición →'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setActiveTab('lab')}
            >
              🧪 Mis Errores
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Comprobar si estamos en vivo en el turno del jugador
  const currentFen = fens[viewingPly] ?? fens[fens.length - 1];
  const currentChess = new Chess(currentFen);
  const currentStm = currentChess.turn();
  const isPlayerTurnNow =
    !gameOver &&
    viewingPly === moves.length &&
    currentStm === playerColor &&
    !isOpponentThinking;

  // Jugada recomendada en vivo para el color del jugador en su turno
  const liveTopUci = isPlayerTurnNow
    ? liveLines?.lines[0]?.pv[0] ?? posAnalysisByPly[viewingPly]?.lines[0]?.pv[0] ?? null
    : null;
  const liveTopMove =
    isPlayerTurnNow && liveTopUci
      ? describeMoveNaturally(currentFen, liveTopUci, orientation)
      : null;
  const liveTopSan =
    isPlayerTurnNow && liveTopUci
      ? uciToSan(currentFen, liveTopUci)
      : null;

  const lastMoveItem = moves.length > 0 ? moves[moves.length - 1] : null;
  const humanLastMove = lastMoveItem
    ? describeMoveNaturally(lastMoveItem.fenBefore, lastMoveItem.uci, orientation)
    : null;

  // Seleccionar la evaluación correspondiente al ply visualizado.
  // Priorizamos evaluaciones del jugador para no mostrar jugadas del rival como "tu jugada".
  const playerEvals = Object.values(moveEvaluations)
    .filter((e) => e.mover === playerColor)
    .sort((a, b) => b.ply - a.ply);

  const activeEval =
    moveEvaluations[viewingPly] ??
    (selectedEvalPly ? moveEvaluations[selectedEvalPly] : null) ??
    playerEvals[0] ??
    Object.values(moveEvaluations).sort((a, b) => b.ply - a.ply)[0] ??
    null;

  const isUserMove = activeEval ? activeEval.mover === playerColor : true;
  const playerName = playerColor === 'w' ? 'Blancas ♔' : 'Negras ♚';
  const rivalName = playerColor === 'w' ? 'Negras ♚' : 'Blancas ♔';
  const evalColorName = activeEval?.mover === 'w' ? 'Blancas ♔' : 'Negras ♚';

  const humanPlayed = activeEval
    ? describeMoveNaturally(activeEval.fenBefore, activeEval.playedUci, orientation)
    : null;
  const humanBest = activeEval
    ? describeMoveNaturally(activeEval.fenBefore, activeEval.bestUci, orientation)
    : null;

  return (
    <section className="panel-card coach-panel" aria-label="Panel del profesor">
      {/* Cabecera limpia con selector de nivel y botones de preferencias tipo píldora */}
      <div className="coach-panel__header">
        <div>
          <span className="eyebrow">
            Profesor Virtual · Jugando con {playerName}
          </span>
          <h3>
            {isUserMove
              ? `Análisis de tu jugada (${playerName})`
              : `Análisis de la jugada rival (${evalColorName})`}
          </h3>
        </div>
        <div className="level-Seg" role="group" aria-label="Nivel de detalle de las explicaciones">
          {(['basico', 'intermedio', 'avanzado'] as ExplanationLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              className={`seg-btn ${explanationLevel === lvl ? 'seg-btn--active' : ''}`}
              onClick={() => setExplanationLevel(lvl)}
            >
              {lvl === 'basico' ? 'Básico' : lvl === 'intermedio' ? 'Intermedio' : 'Avanzado'}
            </button>
          ))}
        </div>
      </div>

      {/* Barra compacta de opciones de ayuda en una sola línea limpia */}
      <div className="coach-QuickOptions" role="group" aria-label="Opciones visuales y de ayuda">
        <button
          type="button"
          className={`opt-pill ${simpleLanguageMode ? 'opt-pill--active' : ''}`}
          onClick={toggleSimpleLanguageMode}
          title="Explicar jugadas sin coordenadas con frases sencillas"
        >
          ✨ Sin coordenadas
        </button>
        <button
          type="button"
          className={`opt-pill ${showSquareLabelsOnBoard ? 'opt-pill--active' : ''}`}
          onClick={toggleSquareLabelsOnBoard}
          title="Mostrar nombres de casillas (a1..h8) dentro del tablero"
        >
          🗺 Casillas en tablero
        </button>
        <button
          type="button"
          className={`opt-pill ${showVisualAids ? 'opt-pill--active' : ''}`}
          onClick={() => toggleVisualOption('showVisualAids')}
          title="Mostrar flechas de ayuda sobre el tablero"
        >
          🟢 Flechas guía
        </button>
        <button
          type="button"
          className={`opt-pill ${thinkingCheckEnabled ? 'opt-pill--active' : ''}`}
          onClick={toggleThinkingCheck}
          title="Activar pregunta de reflexión antes de mover"
        >
          🧠 Pregunta previa
        </button>
        <button
          type="button"
          className={`opt-pill ${soundEnabled ? 'opt-pill--active' : ''}`}
          onClick={toggleSound}
          title="Sonidos del tablero"
        >
          🔊 Sonidos
        </button>
        {isSpeechSupported() && (
          <button
            type="button"
            className={`opt-pill ${voiceEnabled ? 'opt-pill--active' : ''}`}
            onClick={toggleVoice}
            title="Leer recomendaciones en voz alta automáticamente"
          >
            🗣 Voz auto
          </button>
        )}
      </div>

      {/* Profesor Virtual con Voz: Avatar Animado, Subtítulos y Q&A */}
      <CoachAvatarWidget />

      {/* Banner destacado cuando termina una partida */}
      {gameOver && (
        <div className="alert-box alert-box--success coach-gameover-banner">
          <div>
            <strong>🏁 Partida finalizada:</strong> Revisa tu resumen completo y todo lo que hiciste bien con tus {playerName}.
          </div>
          <button
            type="button"
            className="btn btn--primary btn--xs"
            onClick={() => setActiveTab('report')}
          >
            📊 Ver Resumen Completo →
          </button>
        </div>
      )}

      {/* Guía activa si está en un ejercicio del Laboratorio de Finales */}
      {activeEndgameDrill && (
        <div className="coach-block coach-block--best">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>♔ Laboratorio de Finales: {activeEndgameDrill.title}</h4>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => void exitEndgameDrill()}
            >
              Salir del final
            </button>
          </div>
          <p><EasyExplanation text={activeEndgameDrill.objectiveText} /></p>
          <ul className="bullet-list" style={{ marginTop: '0.35rem' }}>
            {activeEndgameDrill.techniqueSteps.map((st, idx) => (
              <li key={idx}><EasyExplanation text={st} /></li>
            ))}
          </ul>
        </div>
      )}

      {/* Pregunta antes de Mover */}
      {thinkingCheckEnabled && activeThinkingCheck && !gameOver && (
        <div className="coach-block coach-block--lesson" role="region" aria-label="Pregunta antes de mover">
          <h4>🧠 Pregunta rápida antes de mover con tus {playerName}</h4>
          <p><strong><EasyExplanation text={activeThinkingCheck.question.questionText} /></strong></p>
          <div className="thinking-options-list">
            {activeThinkingCheck.question.options.map((opt) => {
              const isSelected = activeThinkingCheck.selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`btn btn--xs ${
                    isSelected
                      ? opt.isCorrect
                        ? 'btn--primary'
                        : 'btn--danger'
                      : 'btn--secondary'
                  }`}
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => answerThinkingCheck(opt.id)}
                >
                  {simpleLanguageMode ? humanizeChessText(opt.label) : opt.label}
                </button>
              );
            })}
          </div>
          {activeThinkingCheck.selectedOptionId && (
            <p style={{ marginTop: '0.4rem', fontWeight: 600 }}>
              <EasyExplanation
                text={
                  activeThinkingCheck.question.options.find(
                    (o) => o.id === activeThinkingCheck.selectedOptionId,
                  )?.feedback ?? ''
                }
              />
            </p>
          )}
        </div>
      )}

      {/* Pausa pedagógica en Modo 2 */}
      {teachingPause?.active && (
        <div className="teaching-pause-banner" role="alert">
          <div className="teaching-pause-banner__title">
            ✋ Pausa didáctica del entrenador
          </div>
          <p><EasyExplanation text={teachingPause.message} /></p>
          <div className="btn-row">
            <button type="button" className="btn btn--secondary btn--xs" onClick={() => void retryFromTeachingPause()}>
              ↩ Deshacer y probar la flecha verde
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={() => void startVariantFromEval(teachingPause.evaluation, 'best_alternative')}
            >
              🔍 Ver demostración
            </button>
            <button type="button" className="btn btn--primary btn--xs" onClick={() => void resumeFromTeachingPause()}>
              Continuar partida →
            </button>
          </div>
        </div>
      )}

      {isAnalyzingMove && (
        <div className="analyzing-strip" role="status">
          <span className="spinner-dot" /> Analizando tu jugada con Stockfish…
        </div>
      )}

      {/* GUÍA EN VIVO: Si es tu turno en la partida real, te dice qué hacer con TU color */}
      {isPlayerTurnNow && (
        <div className="coach-live-turn-card" role="region" aria-label="Recomendación para tu turno actual">
          <div className="coach-live-turn-card__header">
            <div className="coach-live-turn-badge">
              <span
                className={`piece-badge piece-badge--${playerColor}`}
                style={{ width: '1.75rem', height: '1.75rem', fontSize: '1.05rem' }}
              >
                {playerColor === 'w' ? '♔' : '♚'}
              </span>
              <div>
                <strong>
                  🎯 Tu turno con las {playerName} (Turno {Math.floor(moves.length / 2) + 1})
                </strong>
                <small className="block-sub">
                  El rival juega con las {rivalName}.
                </small>
              </div>
            </div>
            <span className="pill pill--accent">
              {describeScore(liveEvaluation ?? { kind: 'cp', value: 0 }, playerColor)}
            </span>
          </div>

          {lastMoveItem && (
            <p className="coach-live-last-move">
              <strong>Último movimiento del rival ({lastMoveItem.color === 'w' ? 'Blancas ♔' : 'Negras ♚'}):</strong>{' '}
              {humanLastMove ? `${humanLastMove.pieceIcon} ${humanLastMove.naturalSummary}` : lastMoveItem.sanEs}{' '}
              <small>({lastMoveItem.sanEs})</small>
            </p>
          )}

          {liveTopMove && liveTopUci ? (
            <div className="visual-move-card visual-move-card--best" style={{ marginTop: '0.4rem' }}>
              <div className="visual-move-card__header">
                <span className="legend-dot legend-dot--green" />
                <span>
                  Recomendación para tus {playerName} (Flecha Verde en el tablero):
                </span>
              </div>
              <div className="visual-move-card__body">
                <span className="visual-piece-big">{liveTopMove.pieceIcon}</span>
                <div>
                  <strong className="visual-move-card__headline">
                    {simpleLanguageMode ? liveTopMove.visualGuide : `${liveTopMove.pieceName} (${liveTopSan})`}
                  </strong>
                  <small className="block-sub">{liveTopMove.naturalSummary}</small>
                </div>
              </div>
              <div className="btn-row" style={{ marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className={`btn ${isUciHighlighted(liveTopUci) ? 'btn--accent' : 'btn--primary'} btn--xs`}
                  onMouseEnter={() => handlePreviewHover(liveTopUci, 'green')}
                  onMouseLeave={() => handlePreviewLeave(liveTopUci)}
                  onClick={() => toggleHighlightUciOnBoard(liveTopUci, 'green')}
                  title={
                    isUciHighlighted(liveTopUci)
                      ? 'Ocultar señalización de jugada del tablero'
                      : 'Señalar en el tablero con flecha verde la jugada recomendada'
                  }
                >
                  {isUciHighlighted(liveTopUci)
                    ? '✕ Ocultar señalización de jugada'
                    : `🟢 Señalar mi jugada de las ${playerColor === 'w' ? 'Blancas' : 'Negras'} en el tablero`}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  onClick={() => setShowLiveHint((v) => !v)}
                >
                  💡 {showLiveHint ? 'Ocultar consejo' : 'Consejo de posición'}
                </button>
              </div>
              {showLiveHint && (
                <p className="coach-live-hint-text" style={{ marginTop: '0.4rem' }}>
                  <EasyExplanation
                    text={`Con tus ${playerName}, busca activar tus piezas y mantener el centro coordinado. Valoración: ${describeScore(liveEvaluation ?? { kind: 'cp', value: 0 }, playerColor)}.`}
                  />
                </p>
              )}
            </div>
          ) : (
            <div className="analyzing-strip" style={{ marginTop: '0.45rem' }}>
              <span className="spinner-dot" /> Calculando la mejor recomendación para tus {playerName}…
            </div>
          )}
        </div>
      )}

      {/* ANÁLISIS DE LA JUGADA (EVALUACIÓN) */}
      {!activeEval && !isPlayerTurnNow ? (
        <div className="coach-empty">
          <p>
            <strong>Haz tu primera jugada con las {playerName} en el tablero.</strong> El profesor te mostrará aquí:
          </p>
          <ul className="coach-checklist">
            <li><strong>🟢 Flecha Verde:</strong> Qué pieza era mejor mover con tus {playerName} y hacia dónde.</li>
            <li><strong>💡 Recomendación directa:</strong> El consejo clave para tu color en lenguaje claro.</li>
            <li><strong>✅ Qué hiciste bien y qué vigilar:</strong> Resumen ordenado adaptado a tus piezas.</li>
          </ul>
        </div>
      ) : activeEval && (
        <div className="coach-clean-stack">
          {/* ZONA 1: Tarjeta Unificada de Comparación (Tu Jugada vs Recomendada) */}
          <div className="coach-comparison-card">
            <div className="coach-comparison-card__top">
              <div className="coach-comparison-card__badge-group">
                <span
                  className="category-badge"
                  style={{ backgroundColor: activeEval.classification.meta.color }}
                >
                  {activeEval.classification.meta.symbol} {activeEval.classification.meta.label}
                </span>
                <span className="coach-stat-pill">
                  {isUserMove
                    ? `Tu jugada con ${playerName} · Turno ${activeEval.moveNumber}`
                    : `Jugada del rival (${evalColorName}) · Turno ${activeEval.moveNumber}`}
                </span>
                <span className="coach-stat-pill">
                  Precisión <strong>{activeEval.classification.moveAccuracy}%</strong>
                </span>
                <span className="coach-stat-pill" title={activeEval.deltaText}>
                  Eval (tus {playerName}): <strong>{formatScore(activeEval.scoreBefore, playerColor)} → {formatScore(activeEval.scoreAfter, playerColor)}</strong>
                </span>
              </div>

              {isSpeechSupported() && (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() =>
                      speakText(
                        humanizeChessText(
                          `${humanPlayed ? humanPlayed.naturalSummary : activeEval.playedSanEs}, clasificada como ${activeEval.classification.meta.label}. Recomendación para tus ${playerName}: ${activeEval.recommendation}. Lo que hiciste bien: ${activeEval.whatYouDidWell}`,
                        ),
                      )
                    }
                  >
                    🔊 Escuchar
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={stopSpeech}
                    title="Detener voz"
                  >
                    ⏹
                  </button>
                </div>
              )}
            </div>

            <div className="coach-comparison-grid">
              {/* Columna Azul: Lo que se movió */}
              <div className="visual-move-card visual-move-card--played">
                <div className="visual-move-card__header">
                  <span className="legend-dot legend-dot--blue" />
                  <span>
                    {isUserMove
                      ? `Tu jugada (${playerName} · Flecha Azul)`
                      : `Jugada del rival (${evalColorName} · Flecha Azul)`}
                  </span>
                </div>
                <div className="visual-move-card__body">
                  <span className="visual-piece-big">{humanPlayed?.pieceIcon ?? '♟'}</span>
                  <div>
                    <strong className="visual-move-card__headline">
                      {simpleLanguageMode && humanPlayed
                        ? humanPlayed.naturalSummary
                        : `${humanPlayed?.pieceName ?? ''} (${activeEval.playedSanEs})`}
                    </strong>
                    <small className="block-sub">Notación: {activeEval.playedSanEs}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn ${isUciHighlighted(activeEval.playedUci) ? 'btn--accent' : 'btn--ghost'} btn--xs`}
                  onMouseEnter={() => handlePreviewHover(activeEval.playedUci, 'blue')}
                  onMouseLeave={() => handlePreviewLeave(activeEval.playedUci)}
                  onClick={() => toggleHighlightUciOnBoard(activeEval.playedUci, 'blue')}
                  title={
                    isUciHighlighted(activeEval.playedUci)
                      ? 'Ocultar flecha azul de la jugada realizada'
                      : 'Señalar en el tablero la jugada realizada'
                  }
                >
                  {isUciHighlighted(activeEval.playedUci)
                    ? '✕ Ocultar jugada señalada'
                    : isUserMove
                      ? `🔵 Señalar mi jugada (${playerName}) en el tablero`
                      : `🔵 Señalar jugada del rival (${evalColorName}) en el tablero`}
                </button>
              </div>

              {/* Columna Verde: La mejor jugada recomendada */}
              <div className="visual-move-card visual-move-card--best">
                <div className="visual-move-card__header">
                  <span className="legend-dot legend-dot--green" />
                  <span>
                    {isUserMove
                      ? activeEval.playedUci === activeEval.bestUci
                        ? `¡Jugaste la mejor opción con tus ${playerName}!`
                        : `Recomendada para tus ${playerName} (Flecha Verde)`
                      : `Mejor opción que tenía el rival (${evalColorName} · Flecha Verde)`}
                  </span>
                </div>
                <div className="visual-move-card__body">
                  <span className="visual-piece-big">{humanBest?.pieceIcon ?? '★'}</span>
                  <div>
                    <strong className="visual-move-card__headline">
                      {simpleLanguageMode && humanBest
                        ? humanBest.visualGuide
                        : `${humanBest?.pieceName ?? ''} (${activeEval.bestSanEs})`}
                    </strong>
                    <small className="block-sub">
                      Notación: {activeEval.bestSanEs} (eval: {formatScore(activeEval.bestScore, playerColor)})
                    </small>
                  </div>
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className={`btn ${isUciHighlighted(activeEval.bestUci) ? 'btn--accent' : 'btn--primary'} btn--xs`}
                    onMouseEnter={() => handlePreviewHover(activeEval.bestUci, 'green')}
                    onMouseLeave={() => handlePreviewLeave(activeEval.bestUci)}
                    onClick={() => toggleHighlightUciOnBoard(activeEval.bestUci, 'green')}
                    title={
                      isUciHighlighted(activeEval.bestUci)
                        ? 'Ocultar flecha de la mejor jugada recomendada'
                        : 'Iluminar en el tablero la mejor opción calculada'
                    }
                  >
                    {isUciHighlighted(activeEval.bestUci)
                      ? '✕ Ocultar recomendación señalada'
                      : isUserMove
                        ? `🟢 Iluminar recomendación de las ${playerName}`
                        : `🟢 Iluminar mejor jugada del rival`}
                  </button>
                  {activeEval.bestUci !== activeEval.playedUci && (
                    <button
                      type="button"
                      className="btn btn--accent btn--xs"
                      onClick={() => void startVariantFromEval(activeEval, 'best_alternative')}
                      title="Ver en el tablero la mejor jugada que recomendaba el motor sin alterar la partida"
                    >
                      👁 Ver mejor jugada
                    </button>
                  )}
                  {activeEval.bestLine && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--xs"
                      onClick={() => void startVariantFromEval(activeEval, 'best_alternative')}
                    >
                      ▶ Demostración
                    </button>
                  )}
                  {activeEval.classification.meta.isMistake && isUserMove && (
                    <button
                      type="button"
                      className="btn btn--secondary btn--xs"
                      onClick={() =>
                        void practicePersonalMistake({
                          id: `mistake-${activeEval.ply}`,
                          gameId: 'current',
                          createdAt: new Date().toISOString(),
                          ply: activeEval.ply,
                          moveNumber: activeEval.moveNumber,
                          playerColor: activeEval.mover,
                          playedUci: activeEval.playedUci,
                          playedSanEs: activeEval.playedSanEs,
                          bestSanEs: activeEval.bestSanEs,
                          bestUci: activeEval.bestUci,
                          fenBefore: activeEval.fenBefore,
                          cpLoss: activeEval.cpLoss,
                          categoryLabel: activeEval.classification.meta.label,
                          categoryColor: activeEval.classification.meta.color,
                          motifs: activeEval.motifs,
                          whatHappened: activeEval.whatHappened,
                          bestAlternativeExplain: activeEval.bestAlternativeExplain,
                          recommendation: activeEval.recommendation,
                          mastered: false,
                          solvedCount: 0,
                          attemptsCount: 0,
                        })
                      }
                      title="Convertir esta posición en un ejercicio interactivo para resolver en el tablero"
                    >
                      🎯 Practicar este error
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ZONA 2: Recomendación Principal y Explicación del Profesor */}
          <div className="coach-hero-advice">
            <div className="coach-hero-advice__title">
              <span>
                {isUserMove
                  ? `💡 Recomendación del Profesor para tus ${playerName}`
                  : `💡 Análisis de la jugada del rival (${evalColorName}) para tus ${playerName}`}
              </span>
              <span className="pill pill--phase">Fase: {activeEval.phase}</span>
            </div>

            {!isUserMove && (
              <p className="coach-rival-move-note">
                ℹ️ Esta jugada fue realizada por el Entrenador Stockfish con las <strong>{evalColorName}</strong>.{' '}
                Presta atención a cómo responder con tus <strong>{playerName}</strong>.
              </p>
            )}

            <p className="coach-hero-advice__main">
              <EasyExplanation text={activeEval.recommendation} />
            </p>
            <p className="coach-hero-advice__sub">
              <strong>¿Qué pasó en la posición?</strong>{' '}
              <EasyExplanation text={activeEval.whatHappened} />
            </p>
            <div className="coach-hero-advice__quote">
              🎓 <em>«<EasyExplanation text={activeEval.coachLesson} />»</em>
            </div>

            {/* Observaciones tácticas y oportunidades concretas (Sección 4) */}
            {activeEval.tacticalObservations && activeEval.tacticalObservations.length > 0 && (
              <div className="coach-tactical-obs-list">
                <span className="coach-tactical-obs-tag">⚡ Observaciones tácticas identificadas por Stockfish 19:</span>
                <ul className="bullet-list">
                  {activeEval.tacticalObservations.map((obs, idx) => (
                    <li key={idx}><EasyExplanation text={obs} /></li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ZONA 3: Dos tarjetas claras — Qué hiciste bien vs Qué vigilar */}
          <div className="coach-two-col">
            <div className="coach-block coach-block--good">
              <h4>{isUserMove ? `✅ Lo que hiciste bien con tus ${playerName}` : `🎯 Oportunidades para tus ${playerName}`}</h4>
              <p><EasyExplanation text={activeEval.whatYouDidWell} /></p>
            </div>
            <div className="coach-block coach-block--watch">
              <h4>{isUserMove ? `⚠️ Lo que debes vigilar con tus ${playerName}` : `⚠️ Amenazas del rival a vigilar`}</h4>
              <p><EasyExplanation text={activeEval.whatToWatch} /></p>
            </div>
          </div>

          {/* ZONA 4: Desplegable limpio para profundizar sin saturar la vista principal */}
          <details
            className="coach-details-drawer"
            open={explanationLevel === 'avanzado'}
          >
            <summary className="coach-details-drawer__summary">
              <span>🔍 Ver explicación detallada de la alternativa y plan de pensamiento</span>
              <div className="motif-inline-list">
                {activeEval.motifs.map((m) => (
                  <span key={m} className="pill pill--motif">
                    {MOTIF_LABELS[m]}
                  </span>
                ))}
              </div>
            </summary>

            <div className="coach-details-drawer__body">
              <div className="coach-two-col">
                <div className="coach-block coach-block--best">
                  <h4>Por qué era fuerte la flecha verde</h4>
                  <p><EasyExplanation text={activeEval.bestAlternativeExplain} /></p>
                  {activeEval.continuationLine && (
                    <div className="variant-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => void startVariantFromEval(activeEval, 'played_continuation')}
                      >
                        🔍 Ver cómo responde el rival en el tablero
                      </button>
                    </div>
                  )}
                </div>

                <div className="coach-block">
                  <h4>Qué considerar antes de mover</h4>
                  <p><EasyExplanation text={activeEval.whatToConsider} /></p>
                </div>
              </div>

              {activeEval.equallyGoodNote && (
                <div className="equally-good-banner" style={{ marginTop: '0.5rem' }}>
                  ✓ <EasyExplanation text={activeEval.equallyGoodNote} />
                </div>
              )}

              {activeEval.llmExplanation && (
                <div className="coach-block coach-block--llm" style={{ marginTop: '0.5rem' }}>
                  <h4>Nota complementaria IA</h4>
                  <p><EasyExplanation text={activeEval.llmExplanation} /></p>
                </div>
              )}
            </div>
          </details>
        </div>
      )}
    </section>
  );
};
