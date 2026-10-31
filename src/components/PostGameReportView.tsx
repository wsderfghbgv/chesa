import React from 'react';
import { useChessStore } from '../state/useChessStore';
import { CATEGORIES, type MoveCategory } from '../coach/classify';
import { EvalChart } from './EvalChart';
import { isSpeechSupported } from '../coach/soundAndSpeech';
import { EasyExplanation } from './EasyExplanation';

const CATEGORY_ORDER: MoveCategory[] = [
  'excelente',
  'mejor',
  'precisa',
  'buena',
  'oportunidad_perdida',
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

  const handleJumpToMove = (ply: number) => {
    void selectPly(ply);
    setActiveTab('coach');
  };

  return (
    <section className="panel-card report-panel" aria-label="Informe completo de la partida">
      <div className="report-panel__header">
        <div>
          <span className="eyebrow">Informe Completo de la Partida</span>
          <h3>
            Resultado: {report.result} ({report.reasonText})
          </h3>
        </div>
        <div className="btn-row">
          {isSpeechSupported() && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                speakText(
                  `Resumen de la partida. Resultado ${report.result}. Tu precisión fue del ${report.accuracyPercent} por ciento, con ${report.goodMovesTotal} jugadas buenas o precisas de ${report.playerMoveCount}. Lo que hiciste bien: ${report.strengths.join('. ')}.`,
                )
              }
            >
              🔊 Escuchar resumen
            </button>
          )}
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setActiveTab('lab')}
          >
            🎯 Practicar mis errores
          </button>
          <button
            type="button"
            className="btn btn--accent btn--sm"
            onClick={() => void startNewGame({ mode: 'rematch' })}
          >
            ⚔ Jugar revancha y comparar
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

      {/* Bloque destacado: Resumen de la partida y lo que el jugador hizo bien */}
      <div className="coach-block coach-block--good">
        <h4>🌟 Resumen de la partida y qué hiciste bien</h4>
        <p>
          Realizaste <strong>{report.goodMovesTotal}</strong> jugadas positivas (Excelentes, Mejores,
          Precisas o Buenas) de un total de <strong>{report.playerMoveCount}</strong> turnos propios,
          alcanzando una precisión global del <strong>{report.accuracyPercent}%</strong> (pérdida
          media de {report.averageCpLoss} centipeones).
        </p>
        <ul className="bullet-list" style={{ marginTop: '0.35rem' }}>
          {report.strengths.map((st, idx) => (
            <li key={idx}>{st}</li>
          ))}
        </ul>
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
              <strong>{rematchComparison.previousResult} → {report.result}</strong>
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
              <strong>{rematchComparison.previousAcpl} cp → {report.averageCpLoss} cp</strong>
            </div>
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="report-kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Desempeño (Precisión)</span>
          <strong className="kpi-card__value">{report.accuracyPercent}%</strong>
          <small>ACPL: {report.averageCpLoss} cp</small>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Movimientos totales</span>
          <strong className="kpi-card__value">{report.totalFullMoves}</strong>
          <small>{report.playerMoveCount} jugadas tuyas ({report.goodMovesTotal} buenas/precisas)</small>
        </div>
        <div className="kpi-card kpi-card--wide">
          <span className="kpi-card__label">Apertura identificada</span>
          <strong className="kpi-card__value">
            {report.opening ? `${report.opening.eco} · ${report.opening.name}` : 'Esquema libre / Posición personalizada'}
          </strong>
          {report.opening && (
            <small>
              Plan clave: {report.playerColor === 'w' ? report.opening.planWhite : report.opening.planBlack}
            </small>
          )}
        </div>
      </div>

      <p className="engine-disclaimer">{report.methodologyNote}</p>

      {/* Desglose por categorías de jugadas */}
      <div className="report-section">
        <h4>Clasificación de tus movimientos</h4>
        <div className="category-counts-grid">
          {CATEGORY_ORDER.map((cat) => {
            const meta = CATEGORIES[cat];
            const n = report.counts[cat];
            return (
              <div key={cat} className="cat-count-chip">
                <span className="cat-count-chip__dot" style={{ backgroundColor: meta.color }}>
                  {meta.symbol}
                </span>
                <span className="cat-count-chip__label">{meta.label}</span>
                <strong className="cat-count-chip__num">{n}</strong>
              </div>
            );
          })}
        </div>
      </div>

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
                      {ev.moveNumber}{ev.mover === 'w' ? '.' : '...'} {ev.playedSanEs}
                    </strong>{' '}
                    <span style={{ color: ev.classification.meta.color }}>
                      ({ev.classification.meta.label})
                    </span>
                    <p><EasyExplanation text={ev.whatYouDidWell} /></p>
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
                      {ev.moveNumber}{ev.mover === 'w' ? '.' : '...'} {ev.playedSanEs}
                    </strong>{' '}
                    <span style={{ color: ev.classification.meta.color }}>
                      ({ev.classification.meta.label} · mejor era {ev.bestSanEs})
                    </span>
                    <p><EasyExplanation text={ev.whatHappened} /></p>
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
                    <p><EasyExplanation text={ev.bestAlternativeExplain} /></p>
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
                    <p><EasyExplanation text={ev.whatHappened} /></p>
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

      {/* SISTEMA DE APRENDIZAJE PERSONALIZADO (Sección 10) */}
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

