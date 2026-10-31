import React, { useState } from 'react';
import { useChessStore } from '../state/useChessStore';
import {
  exportAllGamesPgn,
  exportBackupJson,
  importBackupOrPgn,
  fetchOnlineGames,
} from '../storage/db';
import { MOTIF_LABELS, type MotifId } from '../coach/explain';

export const ProfilePanel: React.FC = () => {
  const stats = useChessStore((s) => s.playerStats);
  const savedGames = useChessStore((s) => s.savedGames);
  const batchAnalysisProgress = useChessStore((s) => s.batchAnalysisProgress);
  const loadSavedGameIntoViewer = useChessStore((s) => s.loadSavedGameIntoViewer);
  const analyzeSavedGameWithStockfish = useChessStore((s) => s.analyzeSavedGameWithStockfish);
  const removeSavedGame = useChessStore((s) => s.removeSavedGame);
  const startNewGame = useChessStore((s) => s.startNewGame);
  const refreshProfileData = useChessStore((s) => s.refreshProfileData);

  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [onlinePlatform, setOnlinePlatform] = useState<'lichess' | 'chesscom'>('lichess');
  const [onlineUsername, setOnlineUsername] = useState('');
  const [onlineCount, setOnlineCount] = useState(2);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [autoAnalyzeOnImport, setAutoAnalyzeOnImport] = useState(true);

  const triggerDownload = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPgn = async () => {
    const pgn = await exportAllGamesPgn();
    triggerDownload(`chess-coach-ai-partidas-${new Date().toISOString().slice(0, 10)}.pgn`, pgn || '; Sin partidas');
  };

  const handleExportJson = async () => {
    const json = await exportBackupJson();
    triggerDownload(
      `chess-coach-ai-backup-${new Date().toISOString().slice(0, 10)}.json`,
      json,
      'application/json;charset=utf-8',
    );
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportFeedback(null);
    try {
      const res = await importBackupOrPgn(importText);
      await refreshProfileData();
      setImportText('');
      setImportFeedback(
        `Importación completada: ${res.importedGames} partida(s) y ${res.importedPuzzles} ejercicio(s) añadidos.`,
      );
      if (autoAnalyzeOnImport && res.importedIds[0]) {
        void analyzeSavedGameWithStockfish(res.importedIds[0]);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOnlineImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportFeedback(null);
    setOnlineLoading(true);
    try {
      const res = await fetchOnlineGames(onlinePlatform, onlineUsername, onlineCount);
      await refreshProfileData();
      setImportFeedback(
        `Se importaron ${res.importedGames} partida(s) recientes de ${onlinePlatform === 'lichess' ? 'Lichess.org' : 'Chess.com'} para «${onlineUsername}».`,
      );
      if (autoAnalyzeOnImport && res.importedIds[0]) {
        void analyzeSavedGameWithStockfish(res.importedIds[0]);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportFeedback(null);
    try {
      const text = await file.text();
      const res = await importBackupOrPgn(text);
      await refreshProfileData();
      setImportFeedback(
        `Archivo «${file.name}» importado: ${res.importedGames} partida(s) y ${res.importedPuzzles} ejercicio(s).`,
      );
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="panel-card profile-panel" aria-label="Perfil y progreso del jugador">
      <div className="profile-panel__header">
        <div>
          <span className="eyebrow">Estadísticas Acumuladas en IndexedDB</span>
          <h3>Perfil y Progreso del Jugador</h3>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={savedGames.length === 0}
            onClick={() => void handleExportPgn()}
          >
            ⬇ Exportar PGN
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void handleExportJson()}
          >
            ⬇ Respaldo JSON completo
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="report-kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Partidas jugadas</span>
          <strong className="kpi-card__value">{stats.totalGames}</strong>
          <small>
            {stats.wins}V · {stats.draws}T · {stats.losses}D
          </small>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Jugadas precisas / buenas</span>
          <strong className="kpi-card__value">{stats.preciseMovePercentage}%</strong>
          <small>Precisión media: {stats.averageAccuracy}% (ACPL {stats.averageCpLoss})</small>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Progreso en ejercicios</span>
          <strong className="kpi-card__value">
            {stats.puzzlesSummary.solvedCount} / {stats.puzzlesSummary.totalAttempts}
          </strong>
          <small>
            {stats.avgThinkTimeMs
              ? `Tiempo medio reflexión: ${(stats.avgThinkTimeMs / 1000).toFixed(1)} s`
              : 'Reloj opcional (sin tiempo medio aún)'}
          </small>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Índice de Rendimiento Estimado</span>
          <strong className="kpi-card__value">
            {stats.estimatedPerformance.available ? `≈ ${stats.estimatedPerformance.value}` : 'En calibración'}
          </strong>
          <small>{stats.estimatedPerformance.confidenceLabel}</small>
        </div>
      </div>

      <p className="engine-disclaimer">{stats.estimatedPerformance.explanation}</p>

      {/* Evolución de rendimiento (gráfico SVG) */}
      <div className="report-section">
        <h4>Evolución de tu rendimiento (Precisión % partida a partida)</h4>
        {stats.performanceHistory.length === 0 ? (
          <p className="muted-text">Completa tu primera partida para visualizar la curva de evolución.</p>
        ) : (
          <div className="trend-chart-wrap">
            <svg className="trend-svg" viewBox="0 0 600 140" role="img" aria-label="Evolución de precisión">
              <line x1="30" y1="20" x2="580" y2="20" stroke="currentColor" strokeOpacity="0.15" />
              <line x1="30" y1="70" x2="580" y2="70" stroke="currentColor" strokeOpacity="0.15" />
              <line x1="30" y1="120" x2="580" y2="120" stroke="currentColor" strokeOpacity="0.15" />
              <text x="4" y="24" fontSize="10" fill="currentColor" opacity="0.65">100%</text>
              <text x="8" y="74" fontSize="10" fill="currentColor" opacity="0.65">50%</text>
              <text x="12" y="124" fontSize="10" fill="currentColor" opacity="0.65">0%</text>
              {stats.performanceHistory.map((pt, idx, arr) => {
                const x = arr.length === 1 ? 305 : 40 + (idx / (arr.length - 1)) * 520;
                const y = 120 - (pt.accuracy / 100) * 100;
                const next = arr[idx + 1];
                const nx = next ? 40 + ((idx + 1) / (arr.length - 1)) * 520 : x;
                const ny = next ? 120 - (next.accuracy / 100) * 100 : y;
                const dotColor =
                  pt.outcome === 'win' ? '#22c55e' : pt.outcome === 'draw' ? '#eab308' : '#ef4444';
                return (
                  <g key={pt.gameId}>
                    {next && (
                      <line
                        x1={x}
                        y1={y}
                        x2={nx}
                        y2={ny}
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                    )}
                    <circle cx={x} cy={y} r="5" fill={dotColor}>
                      <title>{`Partida ${idx + 1} (${pt.levelName}): ${pt.accuracy}% · ACPL ${pt.acpl}`}</title>
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Rendimiento por color y Aperturas utilizadas */}
      <div className="report-two-col">
        <div className="report-section">
          <h4>Rendimiento con Blancas y Negras</h4>
          <div className="color-stats-grid">
            <div className="color-stat-box">
              <strong>♔ Con Blancas ({stats.whiteGames.total})</strong>
              <p>
                {stats.whiteGames.wins} victorias · {stats.whiteGames.draws} tablas ·{' '}
                {stats.whiteGames.losses} derrotas
              </p>
              <small>Precisión media: {stats.whiteGames.avgAccuracy}%</small>
            </div>
            <div className="color-stat-box">
              <strong>♚ Con Negras ({stats.blackGames.total})</strong>
              <p>
                {stats.blackGames.wins} victorias · {stats.blackGames.draws} tablas ·{' '}
                {stats.blackGames.losses} derrotas
              </p>
              <small>Precisión media: {stats.blackGames.avgAccuracy}%</small>
            </div>
          </div>
        </div>

        <div className="report-section">
          <h4>Aperturas que utilizas</h4>
          {stats.openingsUsed.length === 0 ? (
            <p className="muted-text">Aún no se han registrado aperturas con nombre.</p>
          ) : (
            <ul className="compact-list">
              {stats.openingsUsed.slice(0, 6).map((op) => (
                <li key={`${op.eco}-${op.name}`}>
                  <span>
                    <strong>{op.eco}</strong> · {op.name}
                  </span>
                  <span className="pill pill--neutral">
                    {op.count} part. ({op.winRate}% vict.)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Errores más frecuentes y Problemas tácticos recurrentes */}
      <div className="report-two-col">
        <div className="report-section">
          <h4>Errores más frecuentes y progreso por tema</h4>
          {stats.frequentMistakes.length === 0 ? (
            <p className="muted-text">Sin errores registrados todavía.</p>
          ) : (
            <ul className="compact-list">
              {stats.frequentMistakes.map((m) => (
                <li key={m.category}>
                  <span>{m.category}</span>
                  <strong>{m.count}</strong>
                </li>
              ))}
            </ul>
          )}
          {Object.keys(stats.puzzlesSummary.byMotif).length > 0 && (
            <div className="sub-block">
              <h5>Ejercicios resueltos por motivo</h5>
              <ul className="compact-list">
                {(Object.entries(stats.puzzlesSummary.byMotif) as Array<
                  [MotifId, { solved: number; total: number }]
                >).map(([motif, rec]) => (
                  <li key={motif}>
                    <span>{MOTIF_LABELS[motif]}</span>
                    <span>
                      {rec.solved}/{rec.total} resueltos
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="report-section">
          <h4>Problemas tácticos y estratégicos detectados</h4>
          {stats.recurringTacticalIssues.length === 0 ? (
            <p className="muted-text">Sin motivos tácticos de error acumulados.</p>
          ) : (
            <ul className="compact-list">
              {stats.recurringTacticalIssues.slice(0, 6).map((it) => (
                <li key={it.motif}>
                  <span>{it.label}</span>
                  <span className={`pill ${it.isRecurring ? 'pill--warn' : 'pill--neutral'}`}>
                    {it.count} ({it.isRecurring ? 'Recurrente' : 'Aislado'})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Historial de recomendaciones */}
      {stats.recommendationsHistory.length > 0 && (
        <div className="report-section">
          <h4>Historial de recomendaciones del entrenador</h4>
          <ul className="bullet-list">
            {stats.recommendationsHistory.slice(0, 4).map((rec) => (
              <li key={rec.gameId}>
                <strong>{rec.date.slice(0, 10)}:</strong> {rec.items[0] ?? 'Mantener solidez táctica.'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de partidas guardadas */}
      <div className="report-section">
        <h4>Historial de partidas guardadas ({savedGames.length})</h4>
        {batchAnalysisProgress && (
          <div className="analyzing-strip" role="status" style={{ marginBottom: '0.6rem' }}>
            <span className="spinner-dot" /> Stockfish 19 está analizando la partida jugada por jugada:{' '}
            <strong>
              {batchAnalysisProgress.currentPly} / {batchAnalysisProgress.totalPlies} plies
            </strong>
            … Al terminar se abrirá el informe completo y se añadirán tus errores al Banco Personal.
          </div>
        )}
        {savedGames.length === 0 ? (
          <p className="muted-text">Las partidas completadas se guardan automáticamente aquí.</p>
        ) : (
          <div className="saved-games-list">
            {savedGames.map((g) => {
              const isBeingAnalyzed = batchAnalysisProgress?.gameId === g.id;
              return (
                <div key={g.id} className="saved-game-row">
                  <div>
                    <strong>
                      {g.createdAt.slice(0, 10)} · {g.result} ({g.playerColor === 'w' ? 'Blancas' : 'Negras'} vs.{' '}
                      {g.opponentLevelName})
                    </strong>
                    <small className="block-sub">
                      {g.openingName ? `${g.openingEco} ${g.openingName} · ` : ''}
                      {g.evaluations.length > 0
                        ? `Precisión: ${g.accuracyPercent}% · ACPL: ${g.averageCpLoss} cp · ${g.uciMoves.length} plies`
                        : `Sin evaluar aún (${g.uciMoves.length} plies) · Pulsa «Analizar con Stockfish»`}
                    </small>
                  </div>
                  <div className="btn-row">
                    {g.evaluations.length === 0 && (
                      <button
                        type="button"
                        className="btn btn--primary btn--xs"
                        disabled={Boolean(batchAnalysisProgress)}
                        onClick={() => void analyzeSavedGameWithStockfish(g.id)}
                      >
                        {isBeingAnalyzed ? 'Analizando…' : '⚡ Analizar con Stockfish'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn--secondary btn--xs"
                      onClick={() => void loadSavedGameIntoViewer(g.id)}
                    >
                      Abrir análisis
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => void startNewGame({ mode: 'rematch', rematchFromGameId: g.id })}
                    >
                      Revancha
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--xs"
                      onClick={() => void removeSavedGame(g.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Función 6: Importación directa desde Lichess.org / Chess.com + PGN / JSON */}
      <div className="report-section import-box">
        <h4>🌐 Importar partidas desde Lichess.org, Chess.com o archivo PGN/JSON</h4>
        <form onSubmit={(e) => void handleOnlineImport(e)} className="online-import-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <select
            value={onlinePlatform}
            onChange={(e) => setOnlinePlatform(e.target.value as 'lichess' | 'chesscom')}
            aria-label="Plataforma online"
            className="input-select"
          >
            <option value="lichess">Lichess.org</option>
            <option value="chesscom">Chess.com</option>
          </select>
          <input
            type="text"
            className="input-text"
            placeholder="Tu usuario (ej: DrNykterstein)"
            value={onlineUsername}
            onChange={(e) => setOnlineUsername(e.target.value)}
            aria-label="Nombre de usuario de Lichess o Chess.com"
          />
          <select
            value={onlineCount}
            onChange={(e) => setOnlineCount(Number(e.target.value))}
            aria-label="Cantidad de partidas a importar"
            className="input-select"
          >
            <option value={1}>Última partida (1)</option>
            <option value={2}>Últimas 2 partidas</option>
            <option value={3}>Últimas 3 partidas</option>
            <option value={5}>Últimas 5 partidas</option>
          </select>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={onlineLoading || Boolean(batchAnalysisProgress)}
          >
            {onlineLoading ? 'Descargando…' : '⬇ Importar de la cuenta'}
          </button>
        </form>

        <label className="chk-label" style={{ marginBottom: '0.6rem', display: 'inline-flex' }}>
          <input
            type="checkbox"
            checked={autoAnalyzeOnImport}
            onChange={(e) => setAutoAnalyzeOnImport(e.target.checked)}
          />
          <span>Analizar automáticamente la partida importada con Stockfish 19 y extraer mis errores</span>
        </label>

        <div className="file-upload-row">
          <label className="btn btn--secondary btn--sm file-label">
            📂 Seleccionar archivo .pgn o .json
            <input
              type="file"
              accept=".pgn,.json,.txt"
              onChange={(e) => void handleFileUpload(e)}
              hidden
            />
          </label>
        </div>
        <form onSubmit={(e) => void handleImportSubmit(e)} className="import-form">
          <textarea
            className="text-area"
            rows={4}
            placeholder="O pega aquí el contenido PGN de una partida (ej: 1. e4 e5 2. Nf3 Nc6 ...) o un respaldo JSON..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button type="submit" className="btn btn--primary btn--sm">
            Importar texto PGN / JSON
          </button>
        </form>
        {importFeedback && <p className="form-success">✓ {importFeedback}</p>}
        {importError && (
          <p className="form-error" role="alert">
            ⚠ {importError}
          </p>
        )}
      </div>
    </section>
  );
};

