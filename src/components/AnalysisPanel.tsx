import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { useChessStore } from '../state/useChessStore';
import { formatScore } from '../engine/score';
import { pvToSan, formatLine, validateFenSafe, tryMove, localizeSan } from '../chess/utils';

export const AnalysisPanel: React.FC = () => {
  const fens = useChessStore((s) => s.fens);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const variant = useChessStore((s) => s.variant);
  const liveLines = useChessStore((s) => s.liveLines);
  const analysisDepth = useChessStore((s) => s.analysisDepth);
  const isAnalyzingMove = useChessStore((s) => s.isAnalyzingMove);
  const engineStatus = useChessStore((s) => s.engineStatus);
  const engineLabel = useChessStore((s) => s.engineLabel);
  const playerColor = useChessStore((s) => s.playerColor);
  const mode = useChessStore((s) => s.mode);
  const gameOver = useChessStore((s) => s.gameOver);

  const setAnalysisDepth = useChessStore((s) => s.setAnalysisDepth);
  const reanalyzeCurrentPosition = useChessStore((s) => s.reanalyzeCurrentPosition);
  const cancelOngoingAnalysis = useChessStore((s) => s.cancelOngoingAnalysis);
  const startNewGame = useChessStore((s) => s.startNewGame);

  const currentFen =
    (variant?.active ? variant.fens[variant.stepIndex] : fens[viewingPly]) ??
    fens[fens.length - 1] ??
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState<string | null>(null);
  const [copiedFen, setCopiedFen] = useState(false);

  const handleLoadFen = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = fenInput.trim();
    if (!trimmed) {
      setFenError('Introduce una cadena FEN.');
      return;
    }
    const check = validateFenSafe(trimmed);
    if (!check.ok) {
      setFenError(`FEN no válido: ${check.error}`);
      return;
    }
    setFenError(null);
    await startNewGame({ customFen: trimmed });
    setFenInput('');
  };

  const handleExplorePvLine = (pvUcis: string[]) => {
    const chess = new Chess(currentFen);
    const fensList = [currentFen];
    const sanList: string[] = [];
    const validUcis: string[] = [];
    for (const u of pvUcis.slice(0, 8)) {
      const m = tryMove(chess, u);
      if (!m) break;
      validUcis.push(u);
      sanList.push(localizeSan(m.san, 'es'));
      fensList.push(chess.fen());
    }
    if (validUcis.length === 0) return;
    useChessStore.setState({
      customHighlightShapes: [],
      variant: {
        active: true,
        label: `Línea MultiPV (${sanList[0]})`,
        originPly: viewingPly,
        originFen: currentFen,
        uciMoves: validUcis,
        sanMoves: sanList,
        fens: fensList,
        stepIndex: 1,
        analysis: liveLines,
      },
    });
  };

  const handleCopyFen = async () => {
    try {
      await navigator.clipboard.writeText(currentFen);
      setCopiedFen(true);
      setTimeout(() => setCopiedFen(false), 1800);
    } catch { /* ignorado */ }
  };

  if (mode === 'no_aid' && !gameOver) {
    return (
      <section className="panel-card" aria-label="Panel de análisis">
        <h3>Motor de análisis bloqueado durante la partida</h3>
        <p className="muted-text">
          Estás en el <strong>Modo 4 (Entrenamiento sin ayuda)</strong>. Para preservar la validez
          del entrenamiento, las líneas de Stockfish estarán disponibles en cuanto concluya la
          partida.
        </p>
      </section>
    );
  }

  return (
    <section className="panel-card analysis-panel" aria-label="Análisis de Stockfish">
      <div className="analysis-panel__header">
        <div>
          <span className="eyebrow">{engineLabel} · Protocolo UCI</span>
          <h3>Líneas principales del motor (MultiPV)</h3>
        </div>
        <span className={`pill ${engineStatus === 'thinking' || isAnalyzingMove ? 'pill--accent' : 'pill--neutral'}`}>
          {engineStatus === 'thinking' || isAnalyzingMove ? 'Calculando…' : `Prof. alcanzada: ${liveLines?.depth ?? 0}`}
        </span>
      </div>

      {/* Control de profundidad independiente de la fuerza del rival */}
      <div className="depth-control-bar">
        <label htmlFor="analysis-depth-slider">
          Profundidad de análisis: <strong>{analysisDepth}</strong> plies
        </label>
        <input
          id="analysis-depth-slider"
          type="range"
          min={8}
          max={20}
          value={analysisDepth}
          onChange={(e) => setAnalysisDepth(Number(e.target.value))}
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={isAnalyzingMove}
            onClick={() => void reanalyzeCurrentPosition(Math.min(22, analysisDepth + 3))}
          >
            🔍 Profundizar posición (+3)
          </button>
          {(isAnalyzingMove || engineStatus === 'thinking') && (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={cancelOngoingAnalysis}
            >
              ⏹ Cancelar análisis en curso
            </button>
          )}
        </div>
      </div>

      {/* Lista de líneas MultiPV */}
      <div className="multipv-list">
        {!liveLines || liveLines.lines.length === 0 ? (
          <p className="muted-text">No hay líneas calculadas para esta posición todavía.</p>
        ) : (
          liveLines.lines.map((line) => {
            const sans = pvToSan(liveLines.fen, line.pv, 8);
            const formatted = formatLine(liveLines.fen, sans, 'es');
            return (
              <div key={line.multipv} className="multipv-row">
                <div className="multipv-row__meta">
                  <span className="multipv-rank">#{line.multipv}</span>
                  <strong
                    className="multipv-score"
                    title={`Evaluación para tus ${playerColor === 'w' ? 'Blancas' : 'Negras'}: ${formatScore(line.score, playerColor)}`}
                  >
                    {formatScore(line.score, playerColor)}
                  </strong>
                  <span className="multipv-depth">d{line.depth} ({playerColor === 'w' ? 'Blancas' : 'Negras'})</span>
                </div>
                <div className="multipv-row__pv">
                  <code>{formatted || '(posición terminal)'}</code>
                </div>
                {line.pv.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => handleExplorePvLine(line.pv)}
                  >
                    Explorar en tablero
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* FEN actual y carga de posición personalizada */}
      <div className="fen-box">
        <div className="fen-box__current">
          <span className="fen-box__label">FEN de la posición actual:</span>
          <div className="fen-box__code-row">
            <code className="fen-code">{currentFen}</code>
            <button type="button" className="btn btn--ghost btn--xs" onClick={() => void handleCopyFen()}>
              {copiedFen ? '✓ Copiado' : 'Copiar FEN'}
            </button>
          </div>
        </div>

        <form className="fen-form" onSubmit={(e) => void handleLoadFen(e)}>
          <label htmlFor="custom-fen-input">Configurar o analizar una posición FEN personalizada:</label>
          <div className="fen-form__row">
            <input
              id="custom-fen-input"
              type="text"
              className="text-input"
              placeholder="Ej: r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4"
              value={fenInput}
              onChange={(e) => {
                setFenInput(e.target.value);
                if (fenError) setFenError(null);
              }}
            />
            <button type="submit" className="btn btn--primary btn--sm">
              Cargar FEN
            </button>
          </div>
          {fenError && (
            <p className="form-error" role="alert">
              ⚠ {fenError}
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

