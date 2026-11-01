import React, { useState, useMemo } from 'react';
import { useChessStore } from '../state/useChessStore';
import { CATEGORIES, type MoveCategory } from '../coach/classify';
import { EvalChart } from './EvalChart';
import { isSpeechSupported } from '../coach/soundAndSpeech';
import { EasyExplanation } from './EasyExplanation';
import type { MoveEvaluation } from '../coach/explain';
import type { PostGameReport } from '../coach/postGame';

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

/** Componente para truncar explicaciones largas a 2 líneas con toggle "Ver más / Ver menos" */
export const TruncatedExplanation: React.FC<{ text: string; maxLen?: number }> = ({
  text,
  maxLen = 130,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxLen;

  return (
    <div className="truncated-text-wrapper">
      <div className={`truncated-text ${!expanded && isLong ? 'truncated-text--clamped' : ''}`}>
        <EasyExplanation text={text} />
      </div>
      {isLong && (
        <button
          type="button"
          className="btn-toggle-clamp"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? '▲ Ver menos' : '▼ Ver más'}
        </button>
      )}
    </div>
  );
};

interface ReportAccordionProps {
  id: string;
  title: string;
  icon: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const ReportAccordion: React.FC<ReportAccordionProps> = ({
  id,
  title,
  icon,
  summary,
  isOpen,
  onToggle,
  badge,
  children,
}) => {
  const triggerId = `accordion-trigger-${id}`;
  const contentId = `accordion-content-${id}`;

  return (
    <div className={`report-accordion ${isOpen ? 'report-accordion--open' : ''}`} id={id}>
      <button
        type="button"
        id={triggerId}
        className="report-accordion__trigger"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <div className="report-accordion__title-group">
          <div className="report-accordion__title">
            <span className="report-accordion__icon" aria-hidden="true">
              {icon}
            </span>
            <span>{title}</span>
            {badge}
          </div>
          <span className="report-accordion__summary">{summary}</span>
        </div>
        <span className="report-accordion__chevron" aria-hidden="true">
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          className="report-accordion__body"
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface PostGameReportViewProps {
  report?: PostGameReport | null;
}

export const PostGameReportView: React.FC<PostGameReportViewProps> = ({
  report: propReport,
}) => {
  const storeReport = useChessStore((s) => s.postGameReport);
  const report = propReport !== undefined ? propReport : (storeReport ?? useChessStore.getState().postGameReport);
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

  // Estados de acordeones colapsables (cerrados por defecto)
  const [criticalOpen, setCriticalOpen] = useState(false);
  const [mainMistakeOpen, setMainMistakeOpen] = useState(false);
  const [mergedCardOpen, setMergedCardOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [classificationsOpen, setClassificationsOpen] = useState(false);
  const [bestMoveOpen, setBestMoveOpen] = useState(false);

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

  // Comprobar si "Momento crítico" y "Principal error" se refieren a la misma jugada
  const isMergedCriticalAndMistake = Boolean(
    report.criticalMoment &&
      report.mainMistake &&
      report.criticalMoment.ply === report.mainMistake.ply,
  );

  // Lista de errores clave para la fila superior de chips (J6 ❌, J9 ⚠️, etc.)
  const keyMistakes = useMemo(() => {
    const map = new Map<number, MoveEvaluation>();
    if (
      report.criticalMoment &&
      (report.criticalMoment.classification.category === 'error_grave' ||
        report.criticalMoment.classification.category === 'error' ||
        report.criticalMoment.classification.category === 'imprecision')
    ) {
      map.set(report.criticalMoment.ply, report.criticalMoment);
    }
    if (report.mainMistake) {
      map.set(report.mainMistake.ply, report.mainMistake);
    }
    for (const m of report.criticalMistakes) {
      map.set(m.ply, m);
    }
    return Array.from(map.values()).sort((a, b) => a.ply - b.ply);
  }, [report.criticalMoment, report.mainMistake, report.criticalMistakes]);

  // Al seleccionar en el tablero, saltamos a la jugada sin abandonar el informe
  const handleJumpToMove = (ply: number) => {
    void selectPly(ply);
  };

  const handleStartMistakePractice = () => {
    void startPracticeMistakesFromCurrentGame();
    setActiveTab('coach');
  };

  // Al pulsar un chip de error: saltar en tablero, expandir tarjeta y hacer scroll suave
  const handleSelectMistakeChip = (m: MoveEvaluation) => {
    void selectPly(m.ply);

    if (isMergedCriticalAndMistake && m.ply === report.criticalMoment?.ply) {
      setMergedCardOpen(true);
    } else {
      if (report.criticalMoment?.ply === m.ply) {
        setCriticalOpen(true);
      }
      if (report.mainMistake?.ply === m.ply) {
        setMainMistakeOpen(true);
      }
    }

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const targetEl = document.getElementById(`mistake-target-${m.ply}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
  };

  const getChipIcon = (cat: MoveCategory) => {
    if (cat === 'error_grave') return '❌';
    if (cat === 'error') return '⚠️';
    if (cat === 'imprecision') return '❓';
    return '⚠️';
  };

  const whiteAccuracy = report.whiteStats?.accuracyPercent ?? (report.playerColor === 'w' ? report.accuracyPercent : 0);
  const blackAccuracy = report.blackStats?.accuracyPercent ?? (report.playerColor === 'b' ? report.accuracyPercent : 0);
  const whiteAcpl = report.whiteStats?.averageCpLoss ?? (report.playerColor === 'w' ? report.averageCpLoss : 0);
  const blackAcpl = report.blackStats?.averageCpLoss ?? (report.playerColor === 'b' ? report.averageCpLoss : 0);

  return (
    <section className="panel-card report-panel" aria-label="Informe completo de la partida">
      {/* 1. Cabecera principal compacta con botones principales agrupados */}
      <div className="report-panel__header">
        <div className="report-panel__title-box">
          <span className="eyebrow">Informe de Análisis Post-Partida · Game Review</span>
          <h3 className="report-result-title">
            Resultado: <span className="report-result-badge">{report.result}</span>{' '}
            <span className="report-reason-text">({report.reasonText})</span>
          </h3>
        </div>

        <div className="btn-row report-header-buttons">
          {isSpeechSupported() && (
            <button
              type="button"
              className="btn btn--secondary btn--xs"
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
            className="btn btn--accent btn--xs"
            onClick={handleStartMistakePractice}
          >
            🎯 Practicar mis errores
          </button>
          {batchAnalysisProgress ? (
            <button
              type="button"
              className="btn btn--warn btn--xs"
              onClick={cancelBatchAnalysis}
            >
              ⏹ Detener ({batchAnalysisProgress.currentPly}/{batchAnalysisProgress.totalPlies})
            </button>
          ) : (
            canDeepAnalyze && (
              <button
                type="button"
                className="btn btn--secondary btn--xs"
                onClick={() => void analyzeCurrentGameFull()}
              >
                🔍 Analizar con Stockfish ({analyzedCount}/{totalMovesCount})
              </button>
            )
          )}
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => void startNewGame({ mode: 'rematch' })}
          >
            ⚔ Jugar revancha
          </button>
          <button
            type="button"
            className="btn btn--primary btn--xs"
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

      {/* 2. Módulo Dual de Precisión y Pérdida Media (Siempre visible en la parte superior) */}
      <div className="report-dual-overview">
        <div className={`report-side-card ${report.playerColor === 'w' ? 'report-side-card--player' : ''}`}>
          <div className="report-side-card__top">
            <span className="report-side-card__icon" aria-hidden="true">♔</span>
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

        <div className="report-dual-vs" aria-hidden="true">
          <span className="report-dual-vs__pill">VS</span>
        </div>

        <div className={`report-side-card ${report.playerColor === 'b' ? 'report-side-card--player' : ''}`}>
          <div className="report-side-card__top">
            <span className="report-side-card__icon" aria-hidden="true">♚</span>
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

      {/* 3. Fila de chips de Errores Clave para navegación directa */}
      {keyMistakes.length > 0 && (
        <div className="report-chips-container" role="region" aria-label="Navegación rápida de errores clave">
          <span className="report-chips-label">Errores clave:</span>
          <div className="report-chips-row">
            {keyMistakes.map((m) => (
              <button
                key={m.ply}
                type="button"
                className={`report-error-chip report-error-chip--${m.classification.category}`}
                title={`Jugada ${m.moveNumber}: ${m.playedSanEs} (${m.classification.meta.label}). Haz clic para saltar en el tablero y ver análisis.`}
                onClick={() => handleSelectMistakeChip(m)}
              >
                <span>{`J${m.moveNumber}`}</span>
                <span>{getChipIcon(m.classification.category)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Acordeones colapsables para ahorrar espacio vertical */}
      <div className="report-accordions-group">
        {/* Caso fusionado: Momento crítico y Principal error son la misma jugada */}
        {isMergedCriticalAndMistake && report.criticalMoment && report.mainMistake && (
          <ReportAccordion
            id={`mistake-target-${report.criticalMoment.ply}`}
            title="Momento crítico y principal error"
            icon="⚡⚠️"
            summary={`Jugada ${report.criticalMoment.moveNumber}: jugaste ${report.criticalMoment.playedSanEs} (mejor era ${report.mainMistake.bestSanEs})`}
            isOpen={mergedCardOpen}
            onToggle={() => setMergedCardOpen(!mergedCardOpen)}
            badge={<span className="pill pill--warn pill--xs">Misma jugada decisiva</span>}
          >
            <p className="highlight-card__move">
              Jugada {report.criticalMoment.moveNumber} ({report.criticalMoment.mover === 'w' ? 'Blancas' : 'Negras'}):{' '}
              jugaste <strong>{report.criticalMoment.playedSanEs}</strong> · La alternativa recomendada era{' '}
              <strong>{report.mainMistake.bestSanEs}</strong>
            </p>
            <TruncatedExplanation
              text={report.mainMistake.whatHappened || report.criticalMoment.whatHappened}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--secondary btn--xs"
                onClick={() => handleJumpToMove(report.criticalMoment!.ply)}
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
          </ReportAccordion>
        )}

        {/* Caso no fusionado: Momento crítico individual */}
        {!isMergedCriticalAndMistake && report.criticalMoment && (
          <ReportAccordion
            id={`mistake-target-${report.criticalMoment.ply}`}
            title="Momento más crítico"
            icon="⚡"
            summary={`Jugada ${report.criticalMoment.moveNumber}: ${report.criticalMoment.playedSanEs}`}
            isOpen={criticalOpen}
            onToggle={() => setCriticalOpen(!criticalOpen)}
          >
            <p className="highlight-card__move">
              Jugada {report.criticalMoment.moveNumber} ({report.criticalMoment.mover === 'w' ? 'Blancas' : 'Negras'}):{' '}
              <strong>{report.criticalMoment.playedSanEs}</strong>
            </p>
            <TruncatedExplanation text={report.criticalMoment.whatHappened} />
            <button
              type="button"
              className="btn btn--secondary btn--xs"
              onClick={() => handleJumpToMove(report.criticalMoment!.ply)}
            >
              👁 Ver momento crítico en tablero
            </button>
          </ReportAccordion>
        )}

        {/* Caso no fusionado: Principal error individual */}
        {!isMergedCriticalAndMistake && report.mainMistake && (
          <ReportAccordion
            id={`mistake-target-${report.mainMistake.ply}`}
            title="Principal error cometido"
            icon="⚠️"
            summary={`Jugada ${report.mainMistake.moveNumber}: jugaste ${report.mainMistake.playedSanEs} (mejor era ${report.mainMistake.bestSanEs})`}
            isOpen={mainMistakeOpen}
            onToggle={() => setMainMistakeOpen(!mainMistakeOpen)}
          >
            <p className="highlight-card__move">
              Jugada {report.mainMistake.moveNumber}: jugaste <strong>{report.mainMistake.playedSanEs}</strong> (mejor era{' '}
              <strong>{report.mainMistake.bestSanEs}</strong>)
            </p>
            <TruncatedExplanation text={report.mainMistake.whatHappened} />
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
          </ReportAccordion>
        )}

        {/* Mejor jugada de la partida (opcional si existe) */}
        {report.bestMoveOfGame && (
          <ReportAccordion
            id={`best-move-${report.bestMoveOfGame.ply}`}
            title="Mejor jugada de la partida"
            icon="🌟"
            summary={`Jugada ${report.bestMoveOfGame.moveNumber}: ${report.bestMoveOfGame.playedSanEs}`}
            isOpen={bestMoveOpen}
            onToggle={() => setBestMoveOpen(!bestMoveOpen)}
          >
            <p className="highlight-card__move">
              Jugada {report.bestMoveOfGame.moveNumber} ({report.bestMoveOfGame.mover === 'w' ? 'Blancas' : 'Negras'}):{' '}
              <strong>{report.bestMoveOfGame.playedSanEs}</strong>
            </p>
            <TruncatedExplanation
              text={report.bestMoveOfGame.whatYouDidWell || report.bestMoveOfGame.whatHappened}
            />
            <button
              type="button"
              className="btn btn--secondary btn--xs"
              onClick={() => handleJumpToMove(report.bestMoveOfGame!.ply)}
            >
              👁 Ver jugada en el tablero
            </button>
          </ReportAccordion>
        )}

        {/* Estadísticas de la partida */}
        <ReportAccordion
          id="report-stats-accordion"
          title="Estadísticas de la partida"
          icon="📊"
          summary={`${report.opening ? report.opening.name : 'Apertura'} · ${report.totalFullMoves} turnos completos`}
          isOpen={statsOpen}
          onToggle={() => setStatsOpen(!statsOpen)}
        >
          <ul className="stats-mini-list">
            <li>
              <span>Apertura jugada:</span>
              <strong>{report.opening ? `${report.opening.eco} · ${report.opening.name}` : 'Esquema libre'}</strong>
            </li>
            <li>
              <span>Apertura / Teoría:</span>
              <strong>{report.openingMovesCount ?? 0} jugadas</strong>
            </li>
            <li>
              <span>Movimientos tácticos:</span>
              <strong>{report.tacticalMovesCount ?? 0} jugadas</strong>
            </li>
            <li>
              <span>Total de turnos completos:</span>
              <strong>{report.totalFullMoves} jugadas</strong>
            </li>
          </ul>
        </ReportAccordion>

        {/* Clasificación de jugadas (Blancas vs Negras) */}
        <ReportAccordion
          id="report-classifications-accordion"
          title="Clasificación de jugadas (Blancas vs Negras)"
          icon="📋"
          summary={`${whiteAccuracy}% vs ${blackAccuracy}% de precisión`}
          isOpen={classificationsOpen}
          onToggle={() => setClassificationsOpen(!classificationsOpen)}
        >
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
        </ReportAccordion>
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

      {/* Bloque destacado: Resumen de tu actuación */}
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

      {/* Mejores jugadas y errores influyentes */}
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
                    <TruncatedExplanation text={ev.whatYouDidWell} maxLen={90} />
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
                <li key={ev.ply} id={`mistake-target-${ev.ply}`}>
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
                    <TruncatedExplanation text={ev.whatHappened} maxLen={90} />
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
                    <TruncatedExplanation text={ev.bestAlternativeExplain} maxLen={90} />
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
                    <TruncatedExplanation text={ev.whatHappened} maxLen={90} />
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

      {/* 5. Barra inferior sticky del panel con el botón principal de práctica */}
      <div className="report-sticky-bottom-bar" role="region" aria-label="Práctica interactiva de errores">
        <div className="report-sticky-bottom-bar__info">
          <span className="report-sticky-bottom-bar__icon" aria-hidden="true">🎯</span>
          <div className="report-sticky-bottom-bar__text">
            <strong>Practica tus fallos en el tablero</strong>
            <small>
              {report.criticalMistakes.length > 0
                ? `${report.criticalMistakes.length} ejercicios tácticos basados en esta partida`
                : 'Resuelve las posiciones dudosas calculadas por Stockfish'}
            </small>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--accent btn--sm report-sticky-bottom-bar__btn"
          onClick={handleStartMistakePractice}
        >
          🎯 Comenzar práctica →
        </button>
      </div>
    </section>
  );
};

