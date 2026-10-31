import React from 'react';
import { useChessStore } from '../state/useChessStore';
import { CATEGORIES, type MoveCategory } from '../coach/classify';
import { EvalChart } from './EvalChart';
import { isSpeechSupported } from '../coach/soundAndSpeech';
import { EasyExplanation } from './EasyExplanation';

const CATEGORY_ORDER: MoveCategory[] = [
  'brillante',
  'excelente',
  'mejor',
  'buena',
  'libro',
  'imprecision',
  'error',
  'error_grave',
];

export const PostGameReportView: React.FC = () => {
  const report = useChessStore((s) => s.postGameReport);
  const rematchComparison = useChessStore((s) => s.rematchComparison);
  const selectPly = useChessStore((s) => s.selectPly);
  const setActiveTab = useChessStore((s) => s.setActiveTab);
  const startNewGame = useChessStore((s) => s.startNewGame);
  const speakText = useChessStore((s) => s.speakText);
  const loadChallengePuzzle = useChessStore((s) => s.loadChallengePuzzle);
  const loadVerificationChallengeFromReport = useChessStore((s) => s.loadVerificationChallengeFromReport);
  const startPracticeMistakesFromCurrentGame = useChessStore((s) => s.startPracticeMistakesFromCurrentGame);
  const analyzeCurrentGameFull = useChessStore((s) => s.analyzeCurrentGameFull);
  const cancelBatchAnalysis = useChessStore((s) => s.cancelBatchAnalysis);
  const batchAnalysisProgress = useChessStore((s) => s.batchAnalysisProgress);
  const moves = useChessStore((s) => s.moves);
  const moveEvaluations = useChessStore((s) => s.moveEvaluations);

  if (!report) {
    return (
      <section className="panel-card" aria-label="Informe de la partida">
        <span className="eyebrow">Informe post-partida y Plan Personalizado</span>
        <h3>Aún no hay una partida finalizada</h3>
        <p className="muted-text">
          En cuanto concluya tu partida actual (o selecciones una partida guardada desde la pestaña
          «Perfil y Progreso»), aquí aparecerá el análisis completo con tus mejores jugadas,
          errores decisivos, fortalezas, debilidades recurrentes y un plan de entrenamiento a medida.
        </p>
      </section>
    );
  }

  const { trainingPlan } = report;
  const analyzedCount = Object.keys(moveEvaluations).length;
  const totalMovesCount = moves.length;
  const canDeepAnalyze = totalMovesCount > 0 && analyzedCount < totalMovesCount;

  const handleJumpToMove = (ply: number) => {
    void selectPly(ply);
    setActiveTab('coach');
  };

  const handleStartMistakePractice = () => {
    void startPracticeMistakesFromCurrentGame();
    setActiveTab('coach');
  };

  const whiteAccuracy = report.whiteStats?.accuracyPercent ?? (report.playerColor === 'w' ? report.accuracyPercent : 0);
  const blackAccuracy = report.blackStats?.accuracyPercent ?? (report.playerColor === 'b' ? report.accuracyPercent : 0);
  const whiteAcpl = report.whiteStats?.averageCpLoss ?? (report.playerColor === 'w' ? report.averageCpLoss : 0);
  const blackAcpl = report.blackStats?.averageCpLoss ?? (report.playerColor === 'b' ? report.averageCpLoss : 0);

  return (
    <section className="panel-card report-panel" aria-label="Informe completo de la partida">
      {/* Cabecera principal */}
      <div className="report-panel__header">
        <div>
          <span className="eyebrow">Informe de Análisis Post-Partida · Game Review</span>
          <h3>
            Resultado: <span className="report-result-badge">{report.result}</span> ({report.reasonText})
          </h3>
        </div>
        <div className="btn-row">
          {isSpeechSupported() && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                speakText(
                  `Resumen de la partida. Resultado ${report.result}. Tu precisión fue del ${report.accuracyPercent} por ciento, con ${report.goodMovesTotal} jugadas positivas de ${report.playerMoveCount}. Lo que hiciste bien: ${report.strengths.join('. ')}.`,
                )
              }
            >
              🔊 Escuchar resumen
            </button>
          )}
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={handleStartMistakePractice}
          >
            🎯 Practicar mis errores
          </button>
          {batchAnalysisProgress ? (
            <button
              type="button"
              className="btn btn--warn btn--sm"
              onClick={cancelBatchAnalysis}
            >
              ⏹ Detener análisis ({batchAnalysisProgress.currentPly}/{batchAnalysisProgress.totalPlies})
            </button>
          ) : (
            canDeepAnalyze && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => void analyzeCurrentGameFull()}
              >
                🔍 Analizar con Stockfish 19 ({analyzedCount}/{totalMovesCount})
              </button>
            )
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void startNewGame({ mode: 'rematch' })}
          >
            ⚔ Jugar revancha
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void startNewGame()}
          >
            ↻ Nueva partida
          </button>
        </div>
      </div>

      {/* Banner de progreso de análisis por lotes con Stockfish 19 */}
      {batchAnalysisProgress && (
        <div className="batch-analysis-banner">
          <div className="batch-analysis-banner__info">
            <span className="spinner-inline" />
            <span>
              Analizando partida completa con <strong>Stockfish 19 WASM</strong>: jugada{' '}
              {batchAnalysisProgress.currentPly} de {batchAnalysisProgress.totalPlies}…
            </span>
          </div>
          <div className="batch-analysis-banner__bar">
            <div
              className="batch-analysis-banner__fill"
              style={{
                width: `${Math.round((batchAnalysisProgress.currentPly / batchAnalysisProgress.totalPlies) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 1. Módulo Dual de Precisión (Blancas vs Negras - Estilo Chess.com / Lichess) */}
      <div className="report-dual-overview">
        <div className={`report-side-card ${report.playerColor === 'w' ? 'report-side-card--player' : ''}`}>
          <div className="report-side-card__top">
            <span className="report-side-card__icon">♔</span>
            <div>
              <span className="report-side-card__name">Blancas</span>
              {report.playerColor === 'w' && <span className="pill pill--accent pill--xs">Tú</span>}
            </div>
          </div>
          <div className="report-side-card__accuracy">
            <span className="report-side-card__number">{whiteAccuracy}%</span>
            <span className="report-side-card__label">Precisión</span>
          </div>
          <div className="report-side-card__stats">
            <span>Pérdida media: <strong>{whiteAcpl} cp</strong></span>
            <span>Aciertos: <strong>{report.whiteStats?.goodMovesTotal ?? 0} / {report.whiteStats?.moveCount ?? 0}</strong></span>
          </div>
        </div>

        <div className="report-dual-vs">
          <span className="report-dual-vs__pill">VS</span>
        </div>

        <div className={`report-side-card ${report.playerColor === 'b' ? 'report-side-card--player' : ''}`}>
          <div className="report-side-card__top">
            <span className="report-side-card__icon">♚</span>
            <div>
              <span className="report-side-card__name">Negras</span>
              {report.playerColor === 'b' && <span className="pill pill--accent pill--xs">Tú</span>}
            </div>
          </div>
          <div className="report-side-card__accuracy">
            <span className="report-side-card__number">{blackAccuracy}%</span>
            <span className="report-side-card__label">Precisión</span>
          </div>
          <div className="report-side-card__stats">
            <span>Pérdida media: <strong>{blackAcpl} cp</strong></span>
            <span>Aciertos: <strong>{report.blackStats?.goodMovesTotal ?? 0} / {report.blackStats?.moveCount ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Tabla comparativa de clasificaciones por bando (Lichess/Chess.com) */}
      <div className="report-classification-table-card">
        <h4>Clasificación de jugadas (Blancas vs Negras)</h4>
        <div className="report-cat-table">
          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORIES[cat];
            const wCount = report.whiteStats?.counts[cat] ?? 0;
            const bCount = report.blackStats?.counts[cat] ?? 0;
            return (
              <div key={cat} className="report-cat-row">
                <span className="report-cat-count report-cat-count--w">{wCount}</span>
                <div className="report-cat-badge" style={{ borderColor: meta.color }}>
                  <span className="report-cat-badge__sym" style={{ backgroundColor: meta.color }}>
                    {meta.symbol}
                  </span>
                  <span className="report-cat-badge__text">{meta.label}</span>
                </div>
                <span className="report-cat-count report-cat-count--b">{bCount}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Tarjetas de momentos clave de la partida */}
      <div className="report-highlights-grid">
        {report.bestMoveOfGame && (
          <div className="highlight-card highlight-card--best">
            <div className="highlight-card__header">
              <span className="highlight-card__icon">🌟</span>
              <strong>Mejor jugada de la partida</strong>
            </div>
            <p className="highlight-card__move">
              Jugada {report.bestMoveOfGame.moveNumber} ({report.bestMoveOfGame.mover === 'w' ? 'Blancas' : 'Negras'}):{' '}
              <strong>{report.bestMoveOfGame.playedSanEs}</strong>
            </p>
            <p className="highlight-card__desc">
              <EasyExplanation text={report.bestMoveOfGame.whatYouDidWell || report.bestMoveOfGame.whatHappened} />
            </p>
            <button
              type="button"
              className="btn btn--secondary btn--xs"
              onClick={() => handleJumpToMove(report.bestMoveOfGame!.ply)}
            >
              👁 Ver jugada en el tablero
            </button>
          </div>
        )}

        {report.criticalMoment && (
          <div className="highlight-card highlight-card--critical">
            <div className="highlight-card__header">
              <span className="highlight-card__icon">⚡</span>
              <strong>Momento más crítico</strong>
            </div>
            <p className="highlight-card__move">
              Jugada {report.criticalMoment.moveNumber} ({report.criticalMoment.mover === 'w' ? 'Blancas' : 'Negras'}):{' '}
              <strong>{report.criticalMoment.playedSanEs}</strong>
            </p>
            <p className="highlight-card__desc">
              <EasyExplanation text={report.criticalMoment.whatHappened} />
            </p>
            <button
              type="button"
              className="btn btn--secondary btn--xs"
              onClick={() => handleJumpToMove(report.criticalMoment!.ply)}
            >
              👁 Ver momento crítico
            </button>
          </div>
        )}

        {report.mainMistake && (
          <div className="highlight-card highlight-card--mistake">
            <div className="highlight-card__header">
              <span className="highlight-card__icon">⚠️</span>
              <strong>Principal error cometido</strong>
            </div>
            <p className="highlight-card__move">
              Jugada {report.mainMistake.moveNumber}: jugaste <strong>{report.mainMistake.playedSanEs}</strong> (mejor era{' '}
              <strong>{report.mainMistake.bestSanEs}</strong>)
            </p>
            <p className="highlight-card__desc">
              <EasyExplanation text={report.mainMistake.whatHappened} />
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary btn--xs"
                onClick={() => handleJumpToMove(report.mainMistake!.ply)}
              >
                👁 Ver en tablero
              </button>
              <button
                type="button"
                className="btn btn--accent btn--xs"
                onClick={handleStartMistakePractice}
              >
                🎯 Practicar este error
              </button>
            </div>
          </div>
        )}

        <div className="highlight-card highlight-card--stats">
          <div className="highlight-card__header">
            <span className="highlight-card__icon">📊</span>
            <strong>Estadísticas de la partida</strong>
          </div>
          <ul className="stats-mini-list">
            <li>
              <span>Apertura / Teoría:</span>
              <strong>{report.openingMovesCount ?? 0} jugadas</strong>
            </li>
            <li>
              <span>Movimientos tácticos:</span>
              <strong>{report.tacticalMovesCount ?? 0} jugadas</strong>
            </li>
            <li>
              <span>Apertura jugada:</span>
              <strong>{report.opening ? `${report.opening.eco} · ${report.opening.name}` : 'Esquema libre'}</strong>
            </li>
            <li>
              <span>Total de turnos completos:</span>
              <strong>{report.totalFullMoves} jugadas</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* Banner de invitación a practicar errores */}
      <div className="practice-mistakes-banner">
        <div className="practice-mistakes-banner__content">
          <span className="eyebrow">Entrenamiento con tus propios fallos</span>
          <h4>🎯 Practica tus errores en el tablero interactivo</h4>
          <p>
            El entrenador ha convertido las jugadas imprecisas y erróneas de esta partida en ejercicios tácticos.
            Intenta resolver cada posición moviendo las piezas sobre el tablero para encontrar la mejor alternativa calculada por Stockfish.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--accent btn--lg"
          onClick={handleStartMistakePractice}
        >
          🎯 Comenzar práctica de errores →
        </button>
      </div>

      {/* Gráfico interactivo de ventaja de toda la partida */}
      <EvalChart />

      {/* Comparativa de Modo 6 (Revancha) si aplica */}
      {rematchComparison && (
        <div className="rematch-comparison-card">
          <h4>Comparativa de Revancha (frente a la partida anterior)</h4>
          <div className="rematch-metrics">
            <div>
              <span>Resultado anterior → actual:</span>
              <strong>
                {rematchComparison.previousResult} → {report.result}
              </strong>
            </div>
            <div>
              <span>Precisión:</span>
              <strong>
                {rematchComparison.previousAccuracy}% → {report.accuracyPercent}% (
                {report.accuracyPercent - rematchComparison.previousAccuracy >= 0 ? '+' : ''}
                {report.accuracyPercent - rematchComparison.previousAccuracy}%)
              </strong>
            </div>
            <div>
              <span>Pérdida media (ACPL):</span>
              <strong>
                {rematchComparison.previousAcpl} cp → {report.averageCpLoss} cp
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Bloque destacado: Resumen de la partida y qué hiciste bien */}
      <div className="coach-block coach-block--good">
        <h4>🌟 Resumen de tu actuación</h4>
        <p>
          Realizaste <strong>{report.goodMovesTotal}</strong> jugadas positivas de un total de{' '}
          <strong>{report.playerMoveCount}</strong> turnos propios con tus{' '}
          <strong>{report.playerColor === 'w' ? 'Blancas' : 'Negras'}</strong>, alcanzando una precisión global del{' '}
          <strong>{report.accuracyPercent}%</strong> (pérdida media de {report.averageCpLoss} centipeones).
        </p>
        <ul className="bullet-list" style={{ marginTop: '0.35rem' }}>
          {report.strengths.map((st, idx) => (
            <li key={idx}>{st}</li>
          ))}
        </ul>
      </div>

      <p className="engine-disclaimer">{report.methodologyNote}</p>

      {/* Mejores jugadas, errores decisivos, oportunidades perdidas y momentos clave */}
      <div className="report-two-col">
        <div className="report-section">
          <h4>Mejores jugadas de tu partida</h4>
          {report.bestMoves.length === 0 ? (
            <p className="muted-text">No se registraron jugadas destacadas.</p>
          ) : (
            <ul className="report-move-list">
              {report.bestMoves.map((ev) => (
                <li key={ev.ply}>
                  <button
                    type="button"
                    className="report-move-btn"
                    onClick={() => handleJumpToMove(ev.ply)}
                  >
                    <strong>
                      {ev.moveNumber}
                      {ev.mover === 'w' ? '.' : '...'} {ev.playedSanEs}
                    </strong>{' '}
                    <span style={{ color: ev.classification.meta.color }}>
                      ({ev.classification.meta.label})
                    </span>
                    <p>
                      <EasyExplanation text={ev.whatYouDidWell} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="report-section">
          <h4>Errores que más influyeron en el resultado</h4>
          {report.criticalMistakes.length === 0 ? (
            <p className="muted-text">¡Excelente! No cometiste errores ni imprecisiones importantes.</p>
          ) : (
            <ul className="report-move-list">
              {report.criticalMistakes.map((ev) => (
                <li key={ev.ply}>
                  <button
                    type="button"
                    className="report-move-btn"
                    onClick={() => handleJumpToMove(ev.ply)}
                  >
                    <strong>
                      {ev.moveNumber}
                      {ev.mover === 'w' ? '.' : '...'} {ev.playedSanEs}
                    </strong>{' '}
                    <span style={{ color: ev.classification.meta.color }}>
                      ({ev.classification.meta.label} · mejor era {ev.bestSanEs})
                    </span>
                    <p>
                      <EasyExplanation text={ev.whatHappened} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="report-two-col">
        <div className="report-section">
          <h4>Oportunidades tácticas desaprovechadas</h4>
          {report.missedOpportunities.length === 0 ? (
            <p className="muted-text">No dejaste pasar golpes tácticos claros en esta partida.</p>
          ) : (
            <ul className="report-move-list">
              {report.missedOpportunities.map((ev) => (
                <li key={ev.ply}>
                  <button
                    type="button"
                    className="report-move-btn"
                    onClick={() => handleJumpToMove(ev.ply)}
                  >
                    <strong>
                      Jugada {ev.moveNumber}: jugaste {ev.playedSanEs} en lugar de {ev.bestSanEs}
                    </strong>
                    <p>
                      <EasyExplanation text={ev.bestAlternativeExplain} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="report-section">
          <h4>Momentos decisivos de la partida</h4>
          {report.decisiveMoments.length === 0 ? (
            <p className="muted-text">Partida corta sin giros bruscos de evaluación.</p>
          ) : (
            <ul className="report-move-list">
              {report.decisiveMoments.map((ev) => (
                <li key={ev.ply}>
                  <button
                    type="button"
                    className="report-move-btn"
                    onClick={() => handleJumpToMove(ev.ply)}
                  >
                    <strong>
                      Turno {ev.moveNumber} ({ev.playedSanEs}): {ev.deltaText}
                    </strong>
                    <p>
                      <EasyExplanation text={ev.whatHappened} />
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Fortalezas y problemas estratégicos */}
      <div className="report-two-col">
        <div className="report-section">
          <h4>Fortalezas demostradas</h4>
          <ul className="bullet-list">
            {report.strengths.map((st, idx) => (
              <li key={idx}>{st}</li>
            ))}
          </ul>
        </div>
        <div className="report-section">
          <h4>Problemas estratégicos detectados</h4>
          <ul className="bullet-list">
            {report.strategicIssues.map((iss, idx) => (
              <li key={idx}>{iss}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* SISTEMA DE APRENDIZAJE PERSONALIZADO */}
      <div className="training-plan-box">
        <div className="training-plan-box__header">
          <span className="eyebrow">Sistema de Aprendizaje Personalizado</span>
          <h4>Plan de Entrenamiento del Profesor</h4>
        </div>

        <div className="report-section">
          <h5>1. Tus tres principales áreas de trabajo (errores aislados vs. patrones recurrentes)</h5>
          <div className="weakness-cards">
            {trainingPlan.topThreeWeaknesses.map((w) => (
              <div key={w.motif} className="weakness-card">
                <div className="weakness-card__top">
                  <strong>{w.label}</strong>
                  <span className={`pill ${w.isRecurringPattern ? 'pill--warn' : 'pill--neutral'}`}>
                    {w.isRecurringPattern ? 'Patrón recurrente' : 'Observación aislada'}
                  </span>
                </div>
                <small className="muted-text">{w.patternNote}</small>
                <p>{w.studyAdvice}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="report-two-col">
          <div className="report-section">
            <h5>2. Conceptos que debes estudiar</h5>
            <ul className="bullet-list">
              {trainingPlan.conceptsToStudy.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
          <div className="report-section">
            <h5>3. Objetivos concretos para tu próxima partida</h5>
            <ul className="bullet-list">
              {trainingPlan.nextGameObjectives.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="report-section">
          <h5>4. Ejercicios personalizados recomendados</h5>
          <div className="recommended-puzzles-row">
            {trainingPlan.recommendedPuzzles.map((puz) => (
              <div key={puz.id} className="rec-puzzle-card">
                <strong>{puz.title}</strong>
                <small>Dificultad: {puz.difficulty}</small>
                <p>{puz.prompt}</p>
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  onClick={() => {
                    useChessStore.setState({ mode: 'challenge', activeTab: 'coach' });
                    void loadChallengePuzzle(puz);
                  }}
                >
                  Practicar este ejercicio →
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="verification-challenge-banner">
          <div>
            <h5>5. Desafío de comprobación: {trainingPlan.verificationChallenge.title}</h5>
            <p>{trainingPlan.verificationChallenge.prompt}</p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void loadVerificationChallengeFromReport()}
          >
            🎯 Resolver desafío en el tablero
          </button>
        </div>
      </div>
    </section>
  );
};
