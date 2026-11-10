/**
 * Academia Inteligente de Aperturas («Aprender Aperturas»).
 *
 * Implementa el sistema integral de aprendizaje interactivo de aperturas con:
 * - Panel izquierdo: Biblioteca de 37 aperturas (buscador, filtros por las 7 categorías, nivel,
 *   bando, favoritos y progreso), enciclopedia estratégica completa y selector de variantes/trampas.
 * - Centro: Tablero interactivo (`InteractiveBoard`) + barra de evaluación (`EvalBar`) + modos de
 *   Lección, Práctica («Juega la apertura»), Explorador de Variantes, Retos (8 tipos), Progreso/SM-2
 *   y Analizador de Fase de Apertura de Partidas.
 * - Panel derecho: Profesor Virtual con explicación por voz sincronizada, las 7 dimensiones
 *   explicativas de cada movimiento, Inspector de Casillas/Piezas y Entrenador IA conversacional
 *   respaldado por Stockfish 19.
 * - Zona inferior: Navegación de movimientos, reproducción automática sincronizada y cambio entre
 *   línea principal y variantes.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { InteractiveBoard } from './InteractiveBoard';
import { EvalBar } from './EvalBar';
import { useChessStore } from '../state/useChessStore';
import { COLOR_NAME, localizeSan, moveToUci, uciToSan, type Color } from '../chess/utils';
import { formatScore, type Score } from '../engine/score';
import {
  getSpeechState,
  isSpeechRecognitionSupported,
  isSpeechSupported,
  pauseCoachSpeech,
  playChessSound,
  repeatLastCoachSpeech,
  resumeCoachSpeech,
  setCoachSpeechRate,
  soundTypeForSan,
  speakCoachExplanation,
  startCoachVoiceListening,
  stopCoachSpeech,
  stopCoachVoiceListening,
  subscribeSpeechState,
} from '../coach/soundAndSpeech';
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  CHALLENGE_LABELS,
  LEVEL_LABELS,
  OPENING_COACH_QUICK_QUESTIONS,
  OPENING_DEFS,
  PRACTICE_DIFFICULTY_LABELS,
  addStudyTime,
  analyzeOpeningPhase,
  analyzePosition,
  askOpeningCoach,
  buildTree,
  compileOpening,
  createPracticeSession,
  dueCards,
  evaluateChallengeAttempt,
  followUci,
  formatDuration,
  getChallengesFiltered,
  getOpening,
  inspectSquareOrPiece,
  loadProgress,
  markLessonCompleted,
  markMovesLearned,
  masteryOf,
  orderedChildren,
  recommend,
  recordChallenge,
  recordMistake,
  recordPracticeMove,
  recordPracticeRun,
  recordRecall,
  requestPracticeHint,
  saveProgress,
  submitPracticeMove,
  toggleFavorite,
  type AcademyProgress,
  type Arrow,
  type Challenge,
  type ChallengeType,
  type CompiledLine,
  type CompiledMove,
  type CompiledOpening,
  type EngineLineSummary,
  type Level,
  type OpeningCategory,
  type OpeningCoachAnswer,
  type OpeningPhaseAnalysisReport,
  type PracticeDifficulty,
  type PracticeState,
  type ReviewCard,
} from '../academy';

export type AcademyWorkspaceMode =
  | 'lesson'
  | 'practice'
  | 'explorer'
  | 'challenges'
  | 'progress'
  | 'game-analysis';

const ALL_SQUARES: Square[] = (() => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  const out: Square[] = [];
  for (const r of ranks) for (const f of files) out.push(`${f}${r}` as Square);
  return out;
})();

function arrowsToDrawShapes(arrows: Arrow[], highlights: Square[]): DrawShape[] {
  const shapes: DrawShape[] = [];
  for (const h of highlights) {
    shapes.push({ orig: h, brush: 'yellow' });
  }
  for (const a of arrows) {
    shapes.push({ orig: a.orig, dest: a.dest, brush: a.brush });
  }
  return shapes;
}

export const OpeningsAcademyView: React.FC = () => {
  const boardTheme = useChessStore((s) => s.boardTheme);
  const showSquareLabels = useChessStore((s) => s.showSquareLabelsOnBoard);
  const soundEnabled = useChessStore((s) => s.soundEnabled);
  const savedGames = useChessStore((s) => s.savedGames);
  const currentStoreMoves = useChessStore((s) => s.moves);
  const explanationLevel = useChessStore((s) => s.explanationLevel);

  // 1. Estado de progreso persistente
  const [progress, setProgress] = useState<AcademyProgress>(() => loadProgress());
  const updateProgress = (updater: (prev: AcademyProgress) => AcademyProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  };

  // 2. Filtros de la biblioteca de aperturas
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<OpeningCategory | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>('all');
  const [sideFilter, setSideFilter] = useState<Color | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [leftSubTab, setLeftSubTab] = useState<'catalog' | 'encyclopedia' | 'variants'>('catalog');
  const [rightSubTab, setRightSubTab] = useState<'teacher' | 'ai-coach' | 'inspector'>('teacher');

  // 3. Apertura, variante y modo activo
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>('italiana');
  const opening: CompiledOpening = useMemo(
    () => getOpening(selectedOpeningId) ?? compileOpening(OPENING_DEFS[0]),
    [selectedOpeningId],
  );
  const [selectedLineId, setSelectedLineId] = useState<string>(() => opening.compiled[0].id);

  useEffect(() => {
    if (!opening.compiled.some((l) => l.id === selectedLineId)) {
      setSelectedLineId(opening.compiled[0].id);
    }
  }, [opening, selectedLineId]);

  const activeLine: CompiledLine = useMemo(
    () => opening.compiled.find((l) => l.id === selectedLineId) ?? opening.compiled[0],
    [opening, selectedLineId],
  );

  const [workspaceMode, setWorkspaceMode] = useState<AcademyWorkspaceMode>('lesson');
  const [boardOrientation, setBoardOrientation] = useState<Color>(
    () => opening.studyAs ?? (opening.side === 'b' ? 'b' : 'w'),
  );

  // 4. Estado de Lección Interactiva (ply, reproducción automática, trampa activa)
  const [lessonPly, setLessonPly] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [voiceAutoNarrate, setVoiceAutoNarrate] = useState<boolean>(false);
  const [showKeySquaresOnBoard, setShowKeySquaresOnBoard] = useState<boolean>(true);
  const [showPlanArrowsOnBoard, setShowPlanArrowsOnBoard] = useState<boolean>(true);
  const [showThreatsOnBoard, setShowThreatsOnBoard] = useState<boolean>(true);
  const [activeTrapReplay, setActiveTrapReplay] = useState<{
    name: string;
    fens: string[];
    movesSanEs: string[];
    movesUci: string[];
    ply: number;
    explanation: string;
  } | null>(null);

  // 5. Estado de Modo Práctica («Juega la Apertura»)
  const [practiceColor, setPracticeColor] = useState<Color>('w');
  const [practiceDifficulty, setPracticeDifficulty] = useState<PracticeDifficulty>('variado');
  const [practiceState, setPracticeState] = useState<PracticeState>(() =>
    createPracticeSession(opening, 'w', 'variado', opening.compiled[0].id),
  );
  const [practiceHintArrows, setPracticeHintArrows] = useState<Arrow[]>([]);
  const [practiceHintHighlights, setPracticeHintHighlights] = useState<Square[]>([]);
  const [practiceHintMessage, setPracticeHintMessage] = useState<string | null>(null);

  // 6. Estado de Explorador de Variantes (árbol + comparador + motor en vivo)
  const variantTree = useMemo(() => buildTree(opening), [opening]);
  const [explorerUciPath, setExplorerUciPath] = useState<string[]>([]);
  const [explorerFens, setExplorerFens] = useState<string[]>([opening.compiled[0].fens[0]]);
  const [compareLineAId, setCompareLineAId] = useState<string>(() => opening.compiled[0].id);
  const [compareLineBId, setCompareLineBId] = useState<string>(
    () => opening.compiled[1]?.id ?? opening.compiled[0].id,
  );
  const [engineTopLines, setEngineTopLines] = useState<EngineLineSummary[]>([]);
  const [isLoadingEngineLines, setIsLoadingEngineLines] = useState<boolean>(false);

  // 7. Estado de Entrenamiento con Retos (8 tipos)
  const [challengeTypeFilter, setChallengeTypeFilter] = useState<ChallengeType | 'all'>('all');
  const [challengeScope, setChallengeScope] = useState<'current' | 'all'>('current');
  const filteredChallenges = useMemo(
    () =>
      getChallengesFiltered({
        openingId: challengeScope === 'current' ? opening.id : 'all',
        type: challengeTypeFilter,
      }),
    [opening.id, challengeScope, challengeTypeFilter],
  );
  const [challengeIndex, setChallengeIndex] = useState<number>(0);
  const activeChallenge: Challenge | undefined =
    filteredChallenges[challengeIndex % Math.max(1, filteredChallenges.length)];
  const [challengeHintIndex, setChallengeHintIndex] = useState<number>(0);
  const [challengeResult, setChallengeResult] = useState<{
    correct: boolean;
    message: string;
    points: number;
  } | null>(null);
  const [challengeTimerEnabled, setChallengeTimerEnabled] = useState<boolean>(false);
  const [challengeSecondsLeft, setChallengeSecondsLeft] = useState<number>(45);

  // 8. Estado de Repetición Espaciada (SM-2) activa en tablero
  const [activeSrCard, setActiveSrCard] = useState<ReviewCard | null>(null);
  const [srFeedback, setSrFeedback] = useState<string | null>(null);

  // 9. Estado de Análisis de Partidas y Aperturas (Requisito 11)
  const [pgnInputText, setPgnInputText] = useState<string>(
    '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb6 7. d5 Ne7 8. e5 Ng4',
  );
  const [analysisColor, setAnalysisColor] = useState<Color>('w');
  const [openingReport, setOpeningReport] = useState<OpeningPhaseAnalysisReport | null>(null);
  const [isAnalyzingGameOpening, setIsAnalyzingGameOpening] = useState<boolean>(false);
  const [reportPlyView, setReportPlyView] = useState<number | null>(null);

  // 10. Estado del Entrenador IA Conversacional e Inspector de Casilla/Pieza
  const [selectedSquare, setSelectedSquare] = useState<Square>('d4');
  const [coachQuestionInput, setCoachQuestionInput] = useState<string>('');
  const [coachHistory, setCoachHistory] = useState<OpeningCoachAnswer[]>([]);
  const [isAskingCoach, setIsAskingCoach] = useState<boolean>(false);
  const [coachCustomIllustration, setCoachCustomIllustration] = useState<{
    arrows: Arrow[];
    highlights: Square[];
    threatened: Square[];
  } | null>(null);

  // 11. Estado del Profesor con Voz y Evaluación en vivo del tablero
  const [speechState, setSpeechState] = useState(() => getSpeechState());
  const [liveScore, setLiveScore] = useState<Score | null>({ kind: 'cp', value: 20 });

  useEffect(() => subscribeSpeechState(setSpeechState), []);

  // Contador de tiempo de estudio para la apertura activa
  useEffect(() => {
    const timer = setInterval(() => {
      updateProgress((prev) => addStudyTime(prev, opening.id, 5));
    }, 5000);
    return () => clearInterval(timer);
  }, [opening.id]);

  // Al cambiar de apertura, actualizar orientación recomendada y reiniciar lección
  const handleSelectOpening = (id: string) => {
    const nextOp = getOpening(id);
    if (!nextOp) return;
    stopCoachSpeech();
    setIsAutoPlaying(false);
    setSelectedOpeningId(id);
    const defaultLine = nextOp.compiled[0];
    setSelectedLineId(defaultLine.id);
    const prefColor: Color = nextOp.studyAs ?? (nextOp.side === 'b' ? 'b' : 'w');
    setBoardOrientation(prefColor);
    setPracticeColor(prefColor);
    setLessonPly(0);
    setActiveTrapReplay(null);
    setCoachCustomIllustration(null);
    setExplorerUciPath([]);
    setExplorerFens([defaultLine.fens[0]]);
    setCompareLineAId(defaultLine.id);
    setCompareLineBId(nextOp.compiled[1]?.id ?? defaultLine.id);
    setPracticeState(createPracticeSession(nextOp, prefColor, practiceDifficulty, defaultLine.id));
  };

  // Filtrado de la biblioteca de aperturas
  const filteredOpenings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return OPENING_DEFS.filter((o) => {
      if (categoryFilter !== 'all' && o.category !== categoryFilter) return false;
      if (levelFilter !== 'all' && o.level !== levelFilter) return false;
      if (sideFilter !== 'all' && o.side !== 'both' && o.side !== sideFilter) return false;
      if (onlyFavorites && !progress.favorites.includes(o.id)) return false;
      if (q) {
        const hay = `${o.name} ${o.short ?? ''} ${o.eco} ${o.goals.join(' ')} ${o.lines.map((l) => l.name).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, categoryFilter, levelFilter, sideFilter, onlyFavorites, progress.favorites]);

  // Determinar el FEN activo y la jugada activa según el modo de trabajo
  const currentLessonMove: CompiledMove | null =
    lessonPly > 0 && lessonPly <= activeLine.moves.length ? activeLine.moves[lessonPly - 1] : null;

  const activeFen: string = useMemo(() => {
    if (activeTrapReplay) {
      return activeTrapReplay.fens[activeTrapReplay.ply] ?? activeTrapReplay.fens[0];
    }
    if (workspaceMode === 'lesson') {
      return activeLine.fens[Math.min(lessonPly, activeLine.fens.length - 1)] ?? activeLine.fens[0];
    }
    if (workspaceMode === 'practice') {
      return practiceState.fen;
    }
    if (workspaceMode === 'explorer') {
      return explorerFens[explorerFens.length - 1] ?? activeLine.fens[0];
    }
    if (workspaceMode === 'challenges' && activeChallenge) {
      return activeChallenge.fen;
    }
    if (workspaceMode === 'progress' && activeSrCard) {
      return activeSrCard.fen;
    }
    if (workspaceMode === 'game-analysis' && openingReport && reportPlyView !== null) {
      const item = openingReport.plySummaries.find((p) => p.ply === reportPlyView);
      if (item) return item.fenAfter;
    }
    return activeLine.fens[Math.min(lessonPly, activeLine.fens.length - 1)] ?? activeLine.fens[0];
  }, [
    activeTrapReplay,
    workspaceMode,
    activeLine,
    lessonPly,
    practiceState.fen,
    explorerFens,
    activeChallenge,
    activeSrCard,
    openingReport,
    reportPlyView,
  ]);

  // Evaluación ligera de Stockfish para la barra de evaluación y el explorador
  useEffect(() => {
    let cancelled = false;
    setIsLoadingEngineLines(true);
    analyzePosition(activeFen, { depth: 10, multipv: 3 })
      .then((res) => {
        if (cancelled) return;
        if (res.lines[0]?.score) setLiveScore(res.lines[0].score);
        const stm: Color = new Chess(activeFen).turn();
        const summaries: EngineLineSummary[] = res.lines.slice(0, 3).map((l) => ({
          sanEs: l.pv[0] ? localizeSan(uciToSan(activeFen, l.pv[0]), 'es') : '—',
          uci: l.pv[0] ?? '',
          scoreText: formatScore(l.score, stm),
          cp: l.score.kind === 'cp' ? l.score.value : 0,
          line: l.pv.slice(0, 5).join(' '),
        }));
        setEngineTopLines(summaries);
        setIsLoadingEngineLines(false);
      })
      .catch(() => {
        if (!cancelled) setIsLoadingEngineLines(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFen]);

  // Registrar movimiento aprendido cuando el usuario avanza en la lección
  useEffect(() => {
    if (workspaceMode === 'lesson' && currentLessonMove) {
      const uciSlice = activeLine.moves.slice(0, lessonPly).map((m) => m.uci);
      const { node } = followUci(variantTree, uciSlice);
      updateProgress((prev) => {
        let next = markMovesLearned(prev, opening.id, [node.key]);
        if (lessonPly === activeLine.moves.length) {
          next = markLessonCompleted(next, opening.id, activeLine.id);
        }
        return next;
      });
    }
  }, [workspaceMode, lessonPly, activeLine, opening.id, variantTree]);

  // Narración por voz del movimiento actual y reproducción automática sincronizada (Requisito 5)
  const buildMoveSpeechScript = (mv: CompiledMove): string => {
    const moveNum = Math.ceil(mv.ply / 2);
    const sideText = mv.mover === 'w' ? `Jugada ${moveNum} de las blancas` : `Respuesta de las negras en la jugada ${moveNum}`;
    return `${sideText}: ${mv.sanEs}. ${mv.teaching.why} ${mv.teaching.consequence} ${mv.teaching.controls}`;
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    if (lessonPly >= activeLine.moves.length) {
      setIsAutoPlaying(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const nextPly = lessonPly + 1;
    const nextMv = activeLine.moves[nextPly - 1];

    if (voiceAutoNarrate && isSpeechSupported() && nextMv) {
      setLessonPly(nextPly);
      speakCoachExplanation(buildMoveSpeechScript(nextMv), {
        onEnd: () => {
          timer = setTimeout(() => {
            setLessonPly((cur) => {
              if (cur >= activeLine.moves.length) {
                setIsAutoPlaying(false);
                return cur;
              }
              return cur;
            });
          }, 600);
        },
      });
    } else {
      timer = setTimeout(() => {
        setLessonPly((cur) => {
          if (cur + 1 >= activeLine.moves.length) {
            setIsAutoPlaying(false);
          }
          return Math.min(activeLine.moves.length, cur + 1);
        });
      }, 2200);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAutoPlaying, lessonPly, activeLine, voiceAutoNarrate]);

  // Cuando el usuario avanza manualmente y tiene activada la narración automática
  const stepLessonTo = (targetPly: number, narrateIfEnabled = true) => {
    const clamped = Math.max(0, Math.min(activeLine.moves.length, targetPly));
    setActiveTrapReplay(null);
    setCoachCustomIllustration(null);
    setLessonPly(clamped);
    const mv = clamped > 0 ? activeLine.moves[clamped - 1] : null;
    if (mv && soundEnabled) {
      playChessSound(soundTypeForSan(mv.san), soundEnabled);
    }
    if (narrateIfEnabled && voiceAutoNarrate && mv) {
      speakCoachExplanation(buildMoveSpeechScript(mv));
    }
  };

  // Temporizador opcional en modo Retos
  useEffect(() => {
    if (workspaceMode !== 'challenges' || !challengeTimerEnabled || challengeResult) return;
    if (challengeSecondsLeft <= 0) {
      setChallengeResult({
        correct: false,
        message: `⏰ Tiempo agotado. La solución era: ${activeChallenge?.explanation ?? ''}`,
        points: 0,
      });
      return;
    }
    const t = setTimeout(() => setChallengeSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [workspaceMode, challengeTimerEnabled, challengeSecondsLeft, challengeResult, activeChallenge]);

  // Calcular formas visuales (flechas y casillas resaltadas) y casillas vulnerables para el tablero
  const boardVisuals = useMemo(() => {
    if (coachCustomIllustration) {
      return {
        shapes: arrowsToDrawShapes(coachCustomIllustration.arrows, coachCustomIllustration.highlights),
        vulnerable: coachCustomIllustration.threatened,
        lastMove: null as [Square, Square] | null,
      };
    }

    if (workspaceMode === 'practice') {
      const arrows: Arrow[] = [...practiceHintArrows];
      const highlights: Square[] = [...practiceHintHighlights];
      if (practiceState.lastFeedback?.kind === 'mistake') {
        arrows.push(...practiceState.lastFeedback.arrows);
        highlights.push(...practiceState.lastFeedback.highlights);
      }
      return {
        shapes: arrowsToDrawShapes(arrows, highlights),
        vulnerable: [],
        lastMove: null as [Square, Square] | null,
      };
    }

    if (workspaceMode === 'challenges' && activeChallenge && challengeResult) {
      return {
        shapes: arrowsToDrawShapes(activeChallenge.reveal ?? [], []),
        vulnerable: [],
        lastMove: null as [Square, Square] | null,
      };
    }

    if (workspaceMode === 'explorer') {
      const { node } = followUci(variantTree, explorerUciPath);
      const children = orderedChildren(node);
      const arrows: Arrow[] = children.slice(0, 4).map((c) => ({
        orig: c.uci.slice(0, 2) as Square,
        dest: c.uci.slice(2, 4) as Square,
        brush: c.isMain ? 'green' : 'blue',
      }));
      return {
        shapes: arrowsToDrawShapes(arrows, []),
        vulnerable: [],
        lastMove:
          node.uci.length >= 4
            ? ([node.uci.slice(0, 2) as Square, node.uci.slice(2, 4) as Square] as [Square, Square])
            : null,
      };
    }

    // Modo Lección por defecto
    const arrows: Arrow[] = [];
    const highlights: Square[] = [];
    const vulnerable: Square[] = [];

    if (showKeySquaresOnBoard) {
      for (const ks of opening.keySquares.slice(0, 3)) {
        if (!highlights.includes(ks.square)) highlights.push(ks.square);
      }
    }

    if (currentLessonMove) {
      if (showPlanArrowsOnBoard) {
        arrows.push(...currentLessonMove.teaching.arrows);
      }
      if (showKeySquaresOnBoard) {
        for (const h of currentLessonMove.teaching.highlights) {
          if (!highlights.includes(h)) highlights.push(h);
        }
      }
      if (showThreatsOnBoard) {
        vulnerable.push(...currentLessonMove.teaching.threatened);
      }
    } else if (showPlanArrowsOnBoard && activeLine.moves[0]) {
      // En la posición inicial, mostrar la primera jugada recomendada
      arrows.push({
        orig: activeLine.moves[0].from,
        dest: activeLine.moves[0].to,
        brush: 'green',
      });
    }

    return {
      shapes: arrowsToDrawShapes(arrows, highlights),
      vulnerable,
      lastMove: currentLessonMove ? ([currentLessonMove.from, currentLessonMove.to] as [Square, Square]) : null,
    };
  }, [
    coachCustomIllustration,
    workspaceMode,
    practiceHintArrows,
    practiceHintHighlights,
    practiceState.lastFeedback,
    activeChallenge,
    challengeResult,
    variantTree,
    explorerUciPath,
    showKeySquaresOnBoard,
    showPlanArrowsOnBoard,
    showThreatsOnBoard,
    opening.keySquares,
    currentLessonMove,
    activeLine.moves,
  ]);

  // Manejo de movimientos realizados manualmente en el tablero interactivo
  const handleBoardMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    setCoachCustomIllustration(null);

    // 1) En Modo Práctica («Juega la Apertura»)
    if (workspaceMode === 'practice') {
      setPracticeHintArrows([]);
      setPracticeHintHighlights([]);
      setPracticeHintMessage(null);

      const { nextState, accepted } = submitPracticeMove(
        practiceState,
        opening,
        from,
        to,
        promotion,
      );
      setPracticeState(nextState);

      const tree = buildTree(opening);
      const currentNode = tree.byId.get(practiceState.nodeKey) ?? tree.root;
      const expectedChild =
        orderedChildren(currentNode).find((c) => c.lineIds.includes(practiceState.targetLineId)) ??
        orderedChildren(currentNode)[0];

      if (!accepted && nextState.lastFeedback) {
        if (expectedChild) {
          updateProgress((prev) => {
            let p = recordPracticeMove(prev, opening.id, false);
            p = recordMistake(p, {
              openingId: opening.id,
              fen: practiceState.fen,
              expectedSanEs: expectedChild.sanEs,
              playedSanEs: nextState.lastFeedback!.playedSanEs,
            });
            p = recordRecall(
              p,
              {
                openingId: opening.id,
                lineId: practiceState.targetLineId,
                fen: practiceState.fen,
                expectedUci: expectedChild.uci,
                expectedSanEs: expectedChild.sanEs,
                color: practiceState.playerColor,
              },
              1,
            );
            return p;
          });
        }
        return false;
      }

      if (accepted) {
        if (expectedChild) {
          updateProgress((prev) => {
            let p = recordPracticeMove(prev, opening.id, true);
            p = recordRecall(
              p,
              {
                openingId: opening.id,
                lineId: practiceState.targetLineId,
                fen: practiceState.fen,
                expectedUci: expectedChild.uci,
                expectedSanEs: expectedChild.sanEs,
                color: practiceState.playerColor,
              },
              nextState.mistakesCount === 0 ? 5 : 4,
            );
            if (nextState.completed) {
              p = recordPracticeRun(p, opening.id, practiceState.targetLineId, nextState.mistakesCount === 0);
            }
            return p;
          });
        }
        return true;
      }
      return false;
    }

    // 2) En Modo Entrenamiento con Retos
    if (workspaceMode === 'challenges' && activeChallenge) {
      const chess = new Chess(activeChallenge.fen);
      try {
        const mv = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!mv) return false;
        const uci = moveToUci(mv);
        const res = evaluateChallengeAttempt(activeChallenge, { uci });
        setChallengeResult({
          correct: res.correct,
          message: res.message,
          points: res.pointsAwarded,
        });
        updateProgress((prev) => recordChallenge(prev, activeChallenge.openingId, res.correct, res.pointsAwarded));
        return res.correct;
      } catch {
        return false;
      }
    }

    // 3) En Modo Progreso / Tarjeta SM-2 activa
    if (workspaceMode === 'progress' && activeSrCard) {
      const chess = new Chess(activeSrCard.fen);
      try {
        const mv = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!mv) return false;
        const uci = moveToUci(mv);
        const ok = uci === activeSrCard.expectedUci;
        updateProgress((prev) =>
          recordRecall(
            prev,
            {
              openingId: activeSrCard.openingId,
              lineId: activeSrCard.lineId,
              fen: activeSrCard.fen,
              expectedUci: activeSrCard.expectedUci,
              expectedSanEs: activeSrCard.expectedSanEs,
              color: activeSrCard.color,
            },
            ok ? 5 : 1,
          ),
        );
        setSrFeedback(
          ok
            ? `✓ ¡Excelente memoria! Jugaste ${activeSrCard.expectedSanEs}. Tarjeta reprogramada con mayor intervalo.`
            : `✗ Jugaste ${localizeSan(mv.san, 'es')}, pero la jugada teórica era ${activeSrCard.expectedSanEs}. Se volverá a programar para hoy.`,
        );
        return ok;
      } catch {
        return false;
      }
    }

    // 4) En Modo Explorador de Variantes (permite explorar cualquier jugada legal)
    if (workspaceMode === 'explorer') {
      const curFen = explorerFens[explorerFens.length - 1] ?? activeLine.fens[0];
      const chess = new Chess(curFen);
      try {
        const mv = chess.move({ from, to, promotion: promotion ?? 'q' });
        if (!mv) return false;
        const uci = moveToUci(mv);
        setExplorerUciPath((prev) => [...prev, uci]);
        setExplorerFens((prev) => [...prev, chess.fen()]);
        return true;
      } catch {
        return false;
      }
    }

    // 5) En Modo Lección Interactiva: si coincide con el siguiente movimiento de la línea actual o de otra variante de la apertura, avanza a él
    const fenNow = activeLine.fens[lessonPly] ?? activeLine.fens[0];
    const chess = new Chess(fenNow);
    try {
      const mv = chess.move({ from, to, promotion: promotion ?? 'q' });
      if (!mv) return false;
      const uci = moveToUci(mv);
      const nextInCurrent = activeLine.moves[lessonPly];
      if (nextInCurrent && nextInCurrent.uci === uci) {
        stepLessonTo(lessonPly + 1, true);
        return true;
      }
      // Comprobar si pertenece a otra variante de la misma apertura en este ply
      const prefixUcis = activeLine.moves.slice(0, lessonPly).map((m) => m.uci);
      const matchingOtherLine = opening.compiled.find((l) => {
        if (l.moves.length <= lessonPly) return false;
        const samePrefix = prefixUcis.every((u, idx) => l.moves[idx]?.uci === u);
        return samePrefix && l.moves[lessonPly]?.uci === uci;
      });
      if (matchingOtherLine) {
        setSelectedLineId(matchingOtherLine.id);
        setLessonPly(lessonPly + 1);
        return true;
      }
      // Si no es de la lección, cambiamos automáticamente al explorador con esa jugada para que el usuario pueda investigar libremente
      setWorkspaceMode('explorer');
      setExplorerUciPath([...prefixUcis, uci]);
      setExplorerFens([...activeLine.fens.slice(0, lessonPly + 1), chess.fen()]);
      return true;
    } catch {
      return false;
    }
  };

  // Lanzar trampa interactiva en el tablero
  const handleStartTrapReplay = (trapId: string) => {
    const trap = opening.traps.find((t) => t.id === trapId);
    if (!trap) return;
    const sans = trap.moves.trim().split(/\s+/).filter(Boolean);
    const c = new Chess();
    const fens = [c.fen()];
    const movesSanEs: string[] = [];
    const movesUci: string[] = [];
    for (const s of sans) {
      try {
        const m = c.move(s);
        fens.push(c.fen());
        movesSanEs.push(localizeSan(m.san, 'es'));
        movesUci.push(moveToUci(m));
      } catch {
        break;
      }
    }
    setWorkspaceMode('lesson');
    setActiveTrapReplay({
      name: trap.name,
      fens,
      movesSanEs,
      movesUci,
      ply: fens.length - 1,
      explanation: trap.explanation,
    });
    if (voiceAutoNarrate) {
      speakCoachExplanation(`Trampa de apertura: ${trap.name}. ${trap.explanation}`);
    }
  };

  // Consultar al Entrenador IA de Aperturas
  const handleAskOpeningCoach = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    setRightSubTab('ai-coach');
    setIsAskingCoach(true);
    try {
      const uciHistory =
        workspaceMode === 'practice'
          ? practiceState.uciHistory
          : workspaceMode === 'explorer'
            ? explorerUciPath
            : activeLine.moves.slice(0, lessonPly).map((m) => m.uci);

      const ans = await askOpeningCoach(q, {
        opening,
        line: activeLine,
        fen: activeFen,
        pgn: activeLine.pgn,
        uciHistory,
        ply: lessonPly,
        userColor: boardOrientation,
        level: explanationLevel,
        currentMove: currentLessonMove,
        selectedSquare,
      });

      setCoachHistory((prev) => [ans, ...prev.slice(0, 14)]);
      setCoachCustomIllustration({
        arrows: ans.illustration.arrows,
        highlights: ans.illustration.highlights,
        threatened: ans.illustration.threatened,
      });
      setCoachQuestionInput('');
      if (voiceAutoNarrate) {
        speakCoachExplanation(ans.spokenText);
      }
    } finally {
      setIsAskingCoach(false);
    }
  };

  // Micrófono de voz para preguntar al profesor
  const handleToggleVoiceQuestion = () => {
    if (speechState.isListeningMic) {
      stopCoachVoiceListening();
      return;
    }
    startCoachVoiceListening((transcript, isFinal) => {
      setCoachQuestionInput(transcript);
      if (isFinal && transcript.trim().length > 3) {
        void handleAskOpeningCoach(transcript);
      }
    });
  };

  // Ejecutar análisis de fase de apertura de una partida (Requisito 11)
  const handleRunOpeningPhaseAnalysis = async (pgnSource: string, color: Color, title?: string) => {
    setIsAnalyzingGameOpening(true);
    setReportPlyView(null);
    try {
      const rep = await analyzeOpeningPhase({
        pgnOrMoves: pgnSource,
        playerColor: color,
        sourceTitle: title,
        useEngine: true,
        engineDepth: 10,
      });
      setOpeningReport(rep);
    } finally {
      setIsAnalyzingGameOpening(false);
    }
  };

  // Inspección de la casilla seleccionada (Requisito 7)
  const squareInspection = useMemo(
    () => inspectSquareOrPiece(activeFen, selectedSquare, opening),
    [activeFen, selectedSquare, opening],
  );

  // Estadísticas y recomendación de progreso (Requisito 10)
  const currentMastery = useMemo(() => masteryOf(progress, opening.id), [progress, opening.id]);
  const recommendation = useMemo(
    () => recommend(progress, explanationLevel),
    [progress, explanationLevel],
  );
  const dueSrCards = useMemo(() => dueCards(progress), [progress]);
  const topMistakesList = useMemo(
    () => Object.values(progress.mistakes).sort((a, b) => b.count - a.count).slice(0, 8),
    [progress.mistakes],
  );

  const totalLearnedMovesCount = useMemo(
    () => Object.values(progress.openings).reduce((acc, o) => acc + o.movesLearned.length, 0),
    [progress.openings],
  );
  const totalMasteredLinesCount = useMemo(
    () => Object.values(progress.openings).reduce((acc, o) => acc + o.masteredLines.length, 0),
    [progress.openings],
  );
  const totalChallengesCompleted = useMemo(
    () => Object.values(progress.openings).reduce((acc, o) => acc + o.challengesDone, 0),
    [progress.openings],
  );
  const globalPracticeStats = useMemo(() => {
    let correct = 0;
    let total = 0;
    for (const o of Object.values(progress.openings)) {
      correct += o.practiceCorrect;
      total += o.practiceTotal;
    }
    return {
      correct,
      total,
      percent: total > 0 ? Math.round((correct / total) * 100) : 100,
    };
  }, [progress.openings]);

  // Medición responsiva para el tablero central de la Academia
  const centerStageRef = useRef<HTMLDivElement | null>(null);
  const [academyBoardSize, setAcademyBoardSize] = useState<number | null>(null);

  useEffect(() => {
    const el = centerStageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const availW = Math.max(260, rect.width - 54);
      const availH = Math.max(260, Math.min(window.innerHeight * 0.56, 520));
      setAcademyBoardSize(Math.floor(Math.min(availW, availH)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <section className="academy-shell" aria-label="Academia de Aperturas – Entrenador Inteligente de Ajedrez">
      {/* BARRA SUPERIOR DE MODOS DE LA ACADEMIA */}
      <div className="academy-top-bar">
        <div className="academy-top-bar__title">
          <span className="eyebrow">Academia de Aperturas · Stockfish 19 + Entrenador IA</span>
          <h2>
            {opening.name} <span className="pill pill--motif">{opening.eco}</span>{' '}
            <span className="pill pill--phase">{CATEGORY_LABELS[opening.category]}</span>{' '}
            <span className="pill pill--accent">
              Dominio: {currentMastery.percent}% ({currentMastery.label})
            </span>
          </h2>
        </div>

        <div className="academy-mode-tabs" role="tablist" aria-label="Modos de aprendizaje de aperturas">
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'lesson'}
            className={`academy-mode-btn ${workspaceMode === 'lesson' ? 'academy-mode-btn--active' : ''}`}
            onClick={() => {
              setWorkspaceMode('lesson');
              setActiveTrapReplay(null);
            }}
          >
            🎓 Lección Interactiva
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'practice'}
            className={`academy-mode-btn ${workspaceMode === 'practice' ? 'academy-mode-btn--active' : ''}`}
            onClick={() => {
              stopCoachSpeech();
              setIsAutoPlaying(false);
              setWorkspaceMode('practice');
              setPracticeState(
                createPracticeSession(opening, practiceColor, practiceDifficulty, activeLine.id),
              );
            }}
          >
            ⚔️ Practicar Apertura
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'explorer'}
            className={`academy-mode-btn ${workspaceMode === 'explorer' ? 'academy-mode-btn--active' : ''}`}
            onClick={() => {
              setWorkspaceMode('explorer');
              const ucis = activeLine.moves.slice(0, lessonPly).map((m) => m.uci);
              setExplorerUciPath(ucis);
              setExplorerFens(activeLine.fens.slice(0, lessonPly + 1));
            }}
          >
            🌳 Explorador de Variantes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'challenges'}
            className={`academy-mode-btn ${workspaceMode === 'challenges' ? 'academy-mode-btn--active' : ''}`}
            onClick={() => {
              setWorkspaceMode('challenges');
              setChallengeResult(null);
              setChallengeHintIndex(0);
              setChallengeSecondsLeft(45);
            }}
          >
            🎯 Retos ({filteredChallenges.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'progress'}
            className={`academy-mode-btn ${workspaceMode === 'progress' ? 'academy-mode-btn--active' : ''}`}
            onClick={() => setWorkspaceMode('progress')}
          >
            📈 Progreso y Memoria {dueSrCards.length > 0 ? `(${dueSrCards.length})` : ''}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={workspaceMode === 'game-analysis'}
            className={`academy-mode-btn ${workspaceMode === 'game-analysis' ? 'academy-mode-btn--active' : ''}`}
            onClick={() => setWorkspaceMode('game-analysis')}
          >
            🔍 Analizar mis Partidas
          </button>
        </div>
      </div>

      {/* CUERPO PRINCIPAL DE 3 PANELES (Izquierdo: Biblioteca/Enciclopedia · Centro: Tablero y Modo · Derecho: Profesor Voz e IA) */}
      <div className="academy-grid">
        {/* ================= PANEL IZQUIERDO: BIBLIOTECA, ENCICLOPEDIA Y VARIANTES ================= */}
        <aside className="academy-panel academy-panel--left" aria-label="Biblioteca de aperturas y enciclopedia">
          <div className="level-Seg" role="tablist" aria-label="Secciones de biblioteca">
            <button
              type="button"
              role="tab"
              aria-selected={leftSubTab === 'catalog'}
              className={`seg-btn ${leftSubTab === 'catalog' ? 'seg-btn--active' : ''}`}
              onClick={() => setLeftSubTab('catalog')}
            >
              📚 Catálogo ({filteredOpenings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={leftSubTab === 'encyclopedia'}
              className={`seg-btn ${leftSubTab === 'encyclopedia' ? 'seg-btn--active' : ''}`}
              onClick={() => setLeftSubTab('encyclopedia')}
            >
              🏛️ Enciclopedia
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={leftSubTab === 'variants'}
              className={`seg-btn ${leftSubTab === 'variants' ? 'seg-btn--active' : ''}`}
              onClick={() => setLeftSubTab('variants')}
            >
              🌿 Variantes ({opening.compiled.length})
            </button>
          </div>

          {/* SUB-PESTAÑA 1: CATÁLOGO DE 37 APERTURAS CON BUSCADOR Y FILTROS */}
          {leftSubTab === 'catalog' && (
            <div className="academy-catalog">
              <div className="academy-filters">
                <input
                  type="search"
                  className="academy-search-input"
                  placeholder="Buscar por nombre, ECO (ej. C50, B90) o idea…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar apertura"
                />
                <div className="academy-filter-row">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as OpeningCategory | 'all')}
                    aria-label="Filtrar por categoría de apertura"
                  >
                    <option value="all">Todas las categorías (7)</option>
                    {(Object.keys(CATEGORY_LABELS) as OpeningCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as Level | 'all')}
                    aria-label="Filtrar por dificultad"
                  >
                    <option value="all">Cualquier nivel</option>
                    <option value="basico">Principiante</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </div>

                <div className="academy-filter-row">
                  <select
                    value={sideFilter}
                    onChange={(e) => setSideFilter(e.target.value as Color | 'all')}
                    aria-label="Filtrar por bando"
                  >
                    <option value="all">Blancas y Negras</option>
                    <option value="w">♔ Para Blancas</option>
                    <option value="b">♚ Para Negras</option>
                  </select>

                  <button
                    type="button"
                    className={`btn btn--xs ${onlyFavorites ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => setOnlyFavorites((v) => !v)}
                  >
                    ★ Favoritas ({progress.favorites.length})
                  </button>
                </div>
                {categoryFilter !== 'all' && (
                  <small className="muted-text">{CATEGORY_HINTS[categoryFilter]}</small>
                )}
              </div>

              <div className="academy-opening-list">
                {filteredOpenings.map((op) => {
                  const isSelected = op.id === opening.id;
                  const isFav = progress.favorites.includes(op.id);
                  const mast = masteryOf(progress, op.id);

                  return (
                    <div
                      key={op.id}
                      className={`academy-opening-card ${isSelected ? 'academy-opening-card--active' : ''}`}
                      onClick={() => handleSelectOpening(op.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleSelectOpening(op.id);
                      }}
                    >
                      <div className="academy-opening-card__header">
                        <div>
                          <span className="pill pill--motif">{op.eco}</span>{' '}
                          <span className="pill pill--phase">{CATEGORY_LABELS[op.category]}</span>{' '}
                          <span className="pill pill--neutral">{LEVEL_LABELS[op.level]}</span>
                        </div>
                        <button
                          type="button"
                          className={`fav-star-btn ${isFav ? 'fav-star-btn--active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProgress((prev) => toggleFavorite(prev, op.id));
                          }}
                          title={isFav ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                          aria-label={`Marcar ${op.name} como favorita`}
                        >
                          {isFav ? '★' : '☆'}
                        </button>
                      </div>

                      <h4 className="academy-opening-card__title">{op.name}</h4>
                      <p className="academy-opening-card__goal">{op.goals[0]}</p>

                      <div className="academy-opening-card__meta">
                        <span>
                          {op.side === 'w' ? '♔ Blancas' : op.side === 'b' ? '♚ Negras' : '♔♚ Ambos'} ·{' '}
                          {'★'.repeat(op.popularity)}
                        </span>
                        <span className="pill pill--accent">{mast.percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-PESTAÑA 2: ENCICLOPEDIA COMPLETA DE LA APERTURA SELECCIONADA (Requisito 2) */}
          {leftSubTab === 'encyclopedia' && (
            <div className="academy-encyclopedia">
              <div className="coach-block">
                <h4>📜 Historia, Origen y Frecuencia</h4>
                <p>{opening.history}</p>
                <small className="block-sub">
                  <strong>Popularidad ({'★'.repeat(opening.popularity)}):</strong> {opening.frequency}
                </small>
              </div>

              <div className="coach-block coach-block--good">
                <h4>🎯 Objetivos Estratégicos</h4>
                <ul className="bullet-list">
                  {opening.goals.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>

              <div className="coach-block">
                <h4>♔ Plan de las Blancas</h4>
                <ul className="bullet-list">
                  {opening.plans.w.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                <h4 style={{ marginTop: '0.6rem' }}>♚ Plan de las Negras</h4>
                <ul className="bullet-list">
                  {opening.plans.b.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="coach-block">
                <h4>🧱 Estructuras de Peones Características</h4>
                <ul className="bullet-list">
                  {opening.structures.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="coach-block">
                <h4>📍 Casillas Importantes (clic para inspeccionar)</h4>
                <div className="academy-key-squares">
                  {opening.keySquares.map((ks) => (
                    <button
                      key={ks.square}
                      type="button"
                      className={`academy-sq-chip ${selectedSquare === ks.square ? 'academy-sq-chip--active' : ''}`}
                      onClick={() => {
                        setSelectedSquare(ks.square);
                        setRightSubTab('inspector');
                        setCoachCustomIllustration({
                          arrows: [],
                          highlights: [ks.square],
                          threatened: [],
                        });
                      }}
                    >
                      <strong>{ks.square}</strong>: {ks.role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="coach-block">
                <h4>♞ Desarrollo Ideal de las Piezas</h4>
                <ul className="bullet-list">
                  {opening.development.map((d, i) => (
                    <li key={i}>
                      <strong>{d.piece}:</strong> {d.idea}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="coach-block coach-block--watch">
                <h4>⚠️ Errores Frecuentes</h4>
                <ul className="bullet-list">
                  {opening.commonMistakes.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="coach-block coach-block--watch">
                <h4>🪤 Trampas Conocidas</h4>
                {opening.traps.map((t) => (
                  <div key={t.id} className="academy-trap-box">
                    <h5>
                      {t.name} (víctima: {COLOR_NAME[t.victim]})
                    </h5>
                    <p>{t.explanation}</p>
                    <button
                      type="button"
                      className="btn btn--primary btn--xs"
                      onClick={() => handleStartTrapReplay(t.id)}
                    >
                      ▶ Reproducir trampa en el tablero
                    </button>
                  </div>
                ))}
              </div>

              <div className="coach-block">
                <h4>🏆 Partidas Famosas</h4>
                {opening.famousGames.map((fg, idx) => (
                  <div key={idx} className="academy-famous-game">
                    <strong>
                      {fg.white} vs {fg.black} ({fg.result})
                    </strong>
                    <div className="muted-text">
                      {fg.event}, {fg.year}
                    </div>
                    <p>{fg.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-PESTAÑA 3: VARIANTES PRINCIPALES Y SECUNDARIAS */}
          {leftSubTab === 'variants' && (
            <div className="academy-variants-list">
              <p className="muted-text">
                Selecciona cualquier línea para estudiarla paso a paso en el tablero o practicarla contra la IA:
              </p>
              {opening.compiled.map((line) => {
                const isCurrent = line.id === activeLine.id;
                const isDone = progress.openings[opening.id]?.lessonsCompleted.includes(line.id);
                const isMastered = progress.openings[opening.id]?.masteredLines.includes(line.id);

                return (
                  <div
                    key={line.id}
                    className={`lab-item-card ${isCurrent ? 'lab-item-card--active' : ''}`}
                  >
                    <div className="lab-item-card__top">
                      <div>
                        <span className="pill pill--motif">{line.eco}</span>{' '}
                        <span className="pill pill--phase">
                          {line.kind === 'principal'
                            ? '⭐ Línea Principal'
                            : line.kind === 'trampa'
                              ? '🪤 Celada / Trampa'
                              : '🌿 Variante Secundaria'}
                        </span>{' '}
                        {isDone && <span className="pill pill--accent">✓ Lección vista</span>}{' '}
                        {isMastered && <span className="pill pill--accent">🏆 Dominada</span>}
                      </div>
                    </div>
                    <h4>{line.name}</h4>
                    <p>{line.idea}</p>
                    <div className="opening-steps-preview">
                      {line.moves.map((m) => (
                        <span key={m.ply} className="step-chip">
                          {m.ply % 2 === 1 ? `${Math.ceil(m.ply / 2)}.` : ''}
                          {m.sanEs}
                        </span>
                      ))}
                    </div>
                    <div className="action-row" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn--primary btn--xs"
                        onClick={() => {
                          setSelectedLineId(line.id);
                          setWorkspaceMode('lesson');
                          setActiveTrapReplay(null);
                          setLessonPly(1);
                        }}
                      >
                        🎓 Estudiar lección
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => {
                          setSelectedLineId(line.id);
                          setWorkspaceMode('practice');
                          setPracticeState(
                            createPracticeSession(opening, practiceColor, practiceDifficulty, line.id),
                          );
                        }}
                      >
                        ⚔️ Practicar línea
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ================= PANEL CENTRAL: TABLERO INTERACTIVO Y MODO ACTIVO ================= */}
        <div className="academy-center-column">
          {/* CONTROLES DE CAPAS VISUALES SOBRE EL TABLERO */}
          <div className="academy-board-toolbar">
            <div className="academy-board-toolbar__group">
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={() => setBoardOrientation((c) => (c === 'w' ? 'b' : 'w'))}
                title="Girar orientación del tablero"
              >
                🔄 Girar ({boardOrientation === 'w' ? 'Blancas abajo' : 'Negras abajo'})
              </button>
              <button
                type="button"
                className={`btn btn--xs ${showKeySquaresOnBoard ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setShowKeySquaresOnBoard((v) => !v)}
              >
                📍 Casillas clave
              </button>
              <button
                type="button"
                className={`btn btn--xs ${showPlanArrowsOnBoard ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setShowPlanArrowsOnBoard((v) => !v)}
              >
                🏹 Flechas de plan
              </button>
              <button
                type="button"
                className={`btn btn--xs ${showThreatsOnBoard ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setShowThreatsOnBoard((v) => !v)}
              >
                ⚡ Amenazas
              </button>
            </div>
            <span className="pill pill--neutral">
              Eval. Stockfish: {formatScore(liveScore, boardOrientation)}
            </span>
          </div>

          {/* ESCENARIO DEL TABLERO + BARRA DE EVALUACIÓN */}
          <div ref={centerStageRef} className="academy-board-stage">
            <EvalBar
              score={liveScore}
              orientation={boardOrientation}
              boardHeight={academyBoardSize}
            />
            <InteractiveBoard
              fen={activeFen}
              orientation={boardOrientation}
              playerColor={boardOrientation}
              canMove={true}
              allowBothSides={workspaceMode === 'lesson' || workspaceMode === 'explorer'}
              lastMove={boardVisuals.lastMove}
              shapes={boardVisuals.shapes}
              vulnerableSquares={boardVisuals.vulnerable}
              isVariantMode={workspaceMode === 'explorer'}
              showSquareLabels={showSquareLabels}
              boardTheme={boardTheme}
              boardSize={academyBoardSize}
              onMove={handleBoardMove}
            />
          </div>

          {/* BANNER DE TRAMPA SI SE ESTÁ REPRODUCIENDO UNA CELADA */}
          {activeTrapReplay && (
            <div className="coach-block coach-block--watch academy-mode-card">
              <div className="academy-card-header-inline">
                <h4>🪤 Reproduciendo trampa: {activeTrapReplay.name}</h4>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  onClick={() => setActiveTrapReplay(null)}
                >
                  ✕ Volver a la lección
                </button>
              </div>
              <p>{activeTrapReplay.explanation}</p>
              <div className="action-row" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  disabled={activeTrapReplay.ply <= 0}
                  onClick={() =>
                    setActiveTrapReplay((prev) =>
                      prev ? { ...prev, ply: Math.max(0, prev.ply - 1) } : null,
                    )
                  }
                >
                  ◀ Jugada anterior
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--xs"
                  disabled={activeTrapReplay.ply >= activeTrapReplay.fens.length - 1}
                  onClick={() =>
                    setActiveTrapReplay((prev) =>
                      prev
                        ? { ...prev, ply: Math.min(prev.fens.length - 1, prev.ply + 1) }
                        : null,
                    )
                  }
                >
                  Siguiente jugada ▶
                </button>
                <span className="muted-text">
                  Paso {activeTrapReplay.ply}/{activeTrapReplay.fens.length - 1}
                </span>
              </div>
            </div>
          )}

          {/* PANEL CONTEXTUAL SEGÚN EL MODO ACTIVO DEBAJO DEL TABLERO */}

          {/* MODO 2: PRACTICAR («JUEGA LA APERTURA» – Requisito 6) */}
          {workspaceMode === 'practice' && (
            <div className="academy-mode-card">
              <div className="academy-card-header-inline">
                <div>
                  <span className="eyebrow">Modo Práctica · Juega la Apertura</span>
                  <h4>
                    Practicando {opening.short ?? opening.name} con{' '}
                    {practiceState.playerColor === 'w' ? '♔ Blancas' : '♚ Negras'}
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <select
                    value={practiceColor}
                    onChange={(e) => {
                      const col = e.target.value as Color;
                      setPracticeColor(col);
                      setBoardOrientation(col);
                      setPracticeState(
                        createPracticeSession(opening, col, practiceDifficulty, activeLine.id),
                      );
                    }}
                    aria-label="Seleccionar color para practicar"
                  >
                    <option value="w">♔ Jugar con Blancas</option>
                    <option value="b">♚ Jugar con Negras</option>
                  </select>

                  <select
                    value={practiceDifficulty}
                    onChange={(e) => {
                      const diff = e.target.value as PracticeDifficulty;
                      setPracticeDifficulty(diff);
                      setPracticeState(
                        createPracticeSession(opening, practiceColor, diff, activeLine.id),
                      );
                    }}
                    aria-label="Seleccionar dificultad de práctica"
                  >
                    {(Object.keys(PRACTICE_DIFFICULTY_LABELS) as PracticeDifficulty[]).map((d) => (
                      <option key={d} value={d}>
                        {PRACTICE_DIFFICULTY_LABELS[d].title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    disabled={practiceState.completed}
                    onClick={() => {
                      const { nextState, hint } = requestPracticeHint(practiceState, opening);
                      setPracticeState(nextState);
                      if (hint) {
                        setPracticeHintArrows(hint.arrows);
                        setPracticeHintHighlights(hint.highlights);
                        setPracticeHintMessage(hint.text);
                      }
                    }}
                  >
                    💡 Pedir pista ({practiceState.currentHintLevel === 0 ? '1/2' : '2/2'})
                  </button>

                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={() => {
                      setPracticeHintArrows([]);
                      setPracticeHintHighlights([]);
                      setPracticeHintMessage(null);
                      setPracticeState(
                        createPracticeSession(opening, practiceColor, practiceDifficulty, activeLine.id),
                      );
                    }}
                  >
                    ↺ Reiniciar práctica
                  </button>
                </div>
              </div>

              <p className="muted-text">
                {PRACTICE_DIFFICULTY_LABELS[practiceDifficulty].subtitle} · Aciertos:{' '}
                <strong>{practiceState.correctCount}</strong> · Errores:{' '}
                <strong>{practiceState.mistakesCount}</strong>
              </p>

              {practiceHintMessage && (
                <div className="coach-block coach-block--good">
                  <p>{practiceHintMessage}</p>
                </div>
              )}

              {practiceState.lastFeedback && (
                <div
                  className={`coach-block ${
                    practiceState.lastFeedback.kind === 'mistake'
                      ? 'coach-block--watch'
                      : 'coach-block--good'
                  }`}
                >
                  <h4>{practiceState.lastFeedback.headline}</h4>
                  <p>
                    <strong>Explicación:</strong> {practiceState.lastFeedback.whyWrongOrRight}
                  </p>
                  <p>
                    <strong>Recomendación teórica:</strong>{' '}
                    {practiceState.lastFeedback.recommendedExplanation}
                  </p>
                  <p>
                    <strong>Consecuencias:</strong> {practiceState.lastFeedback.consequences}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODO 3: EXPLORADOR Y ÁRBOL DE VARIANTES (Requisito 9) */}
          {workspaceMode === 'explorer' && (
            <div className="academy-mode-card">
              <div className="academy-card-header-inline">
                <div>
                  <span className="eyebrow">Explorador de Variantes y Árbol Teórico</span>
                  <h4>Explora continuaciones, compara variantes y consulta a Stockfish</h4>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    disabled={explorerUciPath.length === 0}
                    onClick={() => {
                      setExplorerUciPath((p) => p.slice(0, -1));
                      setExplorerFens((f) => (f.length > 1 ? f.slice(0, -1) : f));
                    }}
                  >
                    ◀ Deshacer paso
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={() => {
                      const main = opening.compiled[0];
                      setSelectedLineId(main.id);
                      setExplorerUciPath(main.moves.slice(0, 6).map((m) => m.uci));
                      setExplorerFens(main.fens.slice(0, 7));
                    }}
                  >
                    ⭐ Regresar a la línea principal
                  </button>
                </div>
              </div>

              {/*Continuaciones del árbol teórico desde la posición actual*/}
              {(() => {
                const { node, depth } = followUci(variantTree, explorerUciPath);
                const inBook = depth === explorerUciPath.length;
                const children = inBook ? orderedChildren(node) : [];
                return (
                  <div className="academy-tree-branches">
                    <h5>
                      {inBook
                        ? `Ramas teóricas desde esta posición (${children.length}):`
                        : 'Posición libre fuera del árbol de la apertura (analizada en vivo por Stockfish):'}
                    </h5>
                    {children.length > 0 && (
                      <div className="opening-steps-preview" style={{ marginBottom: '0.6rem' }}>
                        {children.map((ch) => {
                          const lName =
                            opening.compiled.find((l) => ch.lineIds.includes(l.id))?.name ?? 'Variante';
                          return (
                            <button
                              key={ch.key}
                              type="button"
                              className={`btn btn--xs ${ch.isMain ? 'btn--primary' : 'btn--ghost'}`}
                              onClick={() => {
                                setExplorerUciPath((p) => [...p, ch.uci]);
                                setExplorerFens((f) => [...f, ch.fen]);
                              }}
                            >
                              {ch.ply % 2 === 1 ? `${Math.ceil(ch.ply / 2)}.` : `${Math.ceil(ch.ply / 2)}...`}
                              {ch.sanEs} · <small>{lName}</small>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Evaluación multi-línea de Stockfish en el explorador */}
              <div className="coach-block">
                <h5>
                  🤖 Evaluaciones de Stockfish 19 en esta posición{' '}
                  {isLoadingEngineLines ? '(calculando…)' : ''}:
                </h5>
                <div className="academy-engine-lines">
                  {engineTopLines.map((el, i) => (
                    <div key={i} className="academy-engine-line-item">
                      <span className="pill pill--motif">#{i + 1}</span>{' '}
                      <strong>{el.sanEs}</strong> ({el.scoreText}) · <small>{el.line}</small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comparador lado a lado de variantes */}
              <div className="academy-variant-comparator">
                <h5>⚖️ Comparar variantes de {opening.short ?? opening.name}:</h5>
                <div className="academy-filter-row" style={{ marginBottom: '0.4rem' }}>
                  <select
                    value={compareLineAId}
                    onChange={(e) => setCompareLineAId(e.target.value)}
                    aria-label="Primera variante a comparar"
                  >
                    {opening.compiled.map((l) => (
                      <option key={l.id} value={l.id}>
                        A: {l.name} ({l.eco})
                      </option>
                    ))}
                  </select>
                  <select
                    value={compareLineBId}
                    onChange={(e) => setCompareLineBId(e.target.value)}
                    aria-label="Segunda variante a comparar"
                  >
                    {opening.compiled.map((l) => (
                      <option key={l.id} value={l.id}>
                        B: {l.name} ({l.eco})
                      </option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const lA = opening.compiled.find((l) => l.id === compareLineAId) ?? opening.compiled[0];
                  const lB = opening.compiled.find((l) => l.id === compareLineBId) ?? opening.compiled[0];
                  let divergePly = 1;
                  for (let i = 0; i < Math.min(lA.moves.length, lB.moves.length); i++) {
                    if (lA.moves[i].uci !== lB.moves[i].uci) {
                      divergePly = i + 1;
                      break;
                    }
                  }
                  return (
                    <div className="academy-compare-grid">
                      <div className="coach-block">
                        <strong>
                          {lA.name} ({lA.eco})
                        </strong>
                        <p>{lA.idea}</p>
                        <small className="muted-text">{lA.pgn}</small>
                      </div>
                      <div className="coach-block">
                        <strong>
                          {lB.name} ({lB.eco})
                        </strong>
                        <p>{lB.idea}</p>
                        <small className="muted-text">
                          Diverge en ply {divergePly}: {lB.pgn}
                        </small>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* MODO 4: ENTRENAMIENTO CON RETOS (8 tipos – Requisito 8) */}
          {workspaceMode === 'challenges' && activeChallenge && (
            <div className="academy-mode-card">
              <div className="academy-card-header-inline">
                <div>
                  <span className="pill pill--motif">
                    {CHALLENGE_LABELS[activeChallenge.type]}
                  </span>{' '}
                  <span className="pill pill--phase">+{activeChallenge.points} pts</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <select
                    value={challengeTypeFilter}
                    onChange={(e) => {
                      setChallengeTypeFilter(e.target.value as ChallengeType | 'all');
                      setChallengeIndex(0);
                      setChallengeResult(null);
                      setChallengeHintIndex(0);
                    }}
                    aria-label="Filtrar por tipo de reto"
                  >
                    <option value="all">Todos los tipos de reto (8)</option>
                    {(Object.keys(CHALLENGE_LABELS) as ChallengeType[]).map((ct) => (
                      <option key={ct} value={ct}>
                        {CHALLENGE_LABELS[ct]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={challengeScope}
                    onChange={(e) => {
                      setChallengeScope(e.target.value as 'current' | 'all');
                      setChallengeIndex(0);
                      setChallengeResult(null);
                    }}
                    aria-label="Alcance de los retos"
                  >
                    <option value="current">Solo de {opening.short ?? opening.name}</option>
                    <option value="all">De todas las 37 aperturas</option>
                  </select>

                  <button
                    type="button"
                    className={`btn btn--xs ${challengeTimerEnabled ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => {
                      setChallengeTimerEnabled((v) => !v);
                      setChallengeSecondsLeft(45);
                    }}
                  >
                    ⏱️ {challengeTimerEnabled ? `${challengeSecondsLeft}s` : 'Temporizador'}
                  </button>
                </div>
              </div>

              <h4 style={{ marginTop: '0.4rem' }}>{activeChallenge.statement}</h4>

              {activeChallenge.options && activeChallenge.options.length > 0 && (
                <div className="academy-challenge-options">
                  {activeChallenge.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="btn btn--ghost btn--sm academy-option-btn"
                      onClick={() => {
                        const res = evaluateChallengeAttempt(activeChallenge, { optionId: opt.id });
                        setChallengeResult({
                          correct: res.correct,
                          message: res.message,
                          points: res.pointsAwarded,
                        });
                        updateProgress((prev) =>
                          recordChallenge(prev, activeChallenge.openingId, res.correct, res.pointsAwarded),
                        );
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {challengeHintIndex > 0 && (
                <div className="coach-block">
                  {activeChallenge.hints.slice(0, challengeHintIndex).map((h, i) => (
                    <p key={i}>{h}</p>
                  ))}
                </div>
              )}

              {challengeResult && (
                <div
                  className={`coach-block ${
                    challengeResult.correct ? 'coach-block--good' : 'coach-block--watch'
                  }`}
                >
                  <p>{challengeResult.message}</p>
                </div>
              )}

              <div className="action-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  disabled={challengeHintIndex >= activeChallenge.hints.length}
                  onClick={() => setChallengeHintIndex((i) => i + 1)}
                >
                  💡 Pista progresiva ({challengeHintIndex}/{activeChallenge.hints.length})
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--xs"
                  onClick={() => {
                    setChallengeIndex((i) => i + 1);
                    setChallengeResult(null);
                    setChallengeHintIndex(0);
                    setChallengeSecondsLeft(45);
                  }}
                >
                  Siguiente reto ▶
                </button>
              </div>
            </div>
          )}

          {/* MODO 5: PROGRESO Y MEMORIZACIÓN CON REPETICIÓN ESPACIADA (Requisito 10) */}
          {workspaceMode === 'progress' && (
            <div className="academy-mode-card">
              <span className="eyebrow">Sistema de Aprendizaje Personalizado y Repetición Espaciada (SM-2)</span>
              <h4>Resumen de tu Progreso Académico</h4>

              <div className="academy-stats-grid">
                <div className="academy-stat-box">
                  <strong>{Object.keys(progress.openings).length}/37</strong>
                  <span>Aperturas estudiadas</span>
                </div>
                <div className="academy-stat-box">
                  <strong>{totalLearnedMovesCount}</strong>
                  <span>Movimientos aprendidos</span>
                </div>
                <div className="academy-stat-box">
                  <strong>{globalPracticeStats.percent}%</strong>
                  <span>Precisión en práctica</span>
                </div>
                <div className="academy-stat-box">
                  <strong>{totalChallengesCompleted}</strong>
                  <span>Retos completados</span>
                </div>
                <div className="academy-stat-box">
                  <strong>{totalMasteredLinesCount}</strong>
                  <span>Variantes dominadas</span>
                </div>
                <div className="academy-stat-box">
                  <strong>{formatDuration(progress.totalSeconds)}</strong>
                  <span>Tiempo de estudio</span>
                </div>
              </div>

              <div className="coach-block coach-block--good" style={{ marginTop: '0.6rem' }}>
                <h4>🧭 Recomendación del Entrenador: {recommendation.headline}</h4>
                <ul className="bullet-list">
                  {recommendation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                  {recommendation.reinforce.map((r, i) => (
                    <li key={`re-${i}`}>{r}</li>
                  ))}
                </ul>
                {recommendation.openingId && (
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={() => {
                      handleSelectOpening(recommendation.openingId!);
                      setWorkspaceMode('practice');
                    }}
                  >
                    Ir a practicar apertura recomendada
                  </button>
                )}
              </div>

              {/* Cola de tarjetas SM-2 vencidas */}
              <div className="coach-block" style={{ marginTop: '0.6rem' }}>
                <h4>⏰ Repetición Espaciada (Tarjetas para repasar hoy: {dueSrCards.length})</h4>
                {dueSrCards.length === 0 ? (
                  <p className="muted-text">
                    ¡Estás al día! Practica cualquier apertura en el Modo Práctica para generar nuevas tarjetas de memoria.
                  </p>
                ) : (
                  <div className="opening-steps-preview">
                    {dueSrCards.slice(0, 6).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="btn btn--primary btn--xs"
                        onClick={() => {
                          setActiveSrCard(c);
                          setBoardOrientation(c.color);
                          setSrFeedback(
                            `Repaso SM-2 (${c.openingId}): juega en el tablero el movimiento teórico de las ${COLOR_NAME[c.color]}.`,
                          );
                        }}
                      >
                        Repasar posición ({c.openingId})
                      </button>
                    ))}
                  </div>
                )}
                {srFeedback && <p style={{ marginTop: '0.4rem' }}>{srFeedback}</p>}
              </div>

              {/* Errores recurrentes */}
              {topMistakesList.length > 0 && (
                <div className="coach-block coach-block--watch" style={{ marginTop: '0.6rem' }}>
                  <h4>🔁 Errores Recurrentes Registrados</h4>
                  <ul className="bullet-list">
                    {topMistakesList.map((m) => (
                      <li key={m.key}>
                        <strong>{m.openingId}:</strong> jugaste <code>{m.playedSanEs}</code> en vez de{' '}
                        <code>{m.expectedSanEs}</code> ({m.count}x)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* MODO 6: ANÁLISIS DE PARTIDAS Y APERTURAS (Requisito 11) */}
          {workspaceMode === 'game-analysis' && (
            <div className="academy-mode-card">
              <span className="eyebrow">Conexión con Análisis de Partidas y Diagnóstico Teórico</span>
              <h4>Analizar la Fase de Apertura de una Partida</h4>

              {savedGames.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <label className="muted-text">Seleccionar una de tus partidas guardadas:</label>
                  <div className="opening-steps-preview" style={{ marginTop: '0.25rem' }}>
                    {savedGames.slice(0, 5).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className="btn btn--ghost btn--xs"
                        onClick={() => {
                          setPgnInputText(g.pgn || g.sanMoves.join(' '));
                          setAnalysisColor(g.playerColor);
                          void handleRunOpeningPhaseAnalysis(
                            g.pgn || g.sanMoves.join(' '),
                            g.playerColor,
                            `Partida guardada (${g.openingName ?? g.result})`,
                          );
                        }}
                      >
                        {g.openingName ?? 'Partida'} ({g.result})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                className="academy-pgn-textarea"
                rows={3}
                value={pgnInputText}
                onChange={(e) => setPgnInputText(e.target.value)}
                placeholder="Pega aquí el PGN o las jugadas de cualquier partida (ej. 1.e4 e5 2.Cf3 Cc6…)"
                aria-label="PGN o jugadas para analizar la apertura"
              />

              <div className="action-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <select
                  value={analysisColor}
                  onChange={(e) => setAnalysisColor(e.target.value as Color)}
                  aria-label="Bando jugado en la partida"
                >
                  <option value="w">Analizar desde Blancas</option>
                  <option value="b">Analizar desde Negras</option>
                </select>

                <button
                  type="button"
                  className="btn btn--primary btn--xs"
                  disabled={isAnalyzingGameOpening}
                  onClick={() => void handleRunOpeningPhaseAnalysis(pgnInputText, analysisColor)}
                >
                  {isAnalyzingGameOpening ? 'Analizando con Stockfish…' : '🔍 Analizar fase de apertura'}
                </button>

                {currentStoreMoves.length > 0 && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => {
                      const sanStr = currentStoreMoves.map((m) => m.san).join(' ');
                      setPgnInputText(sanStr);
                      void handleRunOpeningPhaseAnalysis(sanStr, analysisColor, 'Partida actual en tablero');
                    }}
                  >
                    Importar partida en curso
                  </button>
                )}
              </div>

              {openingReport && (
                <div className="academy-report-box" style={{ marginTop: '0.6rem' }}>
                  <div className="coach-block coach-block--good">
                    <h5>
                      📖 Apertura identificada: {openingReport.detectedOpening.name} (
                      {openingReport.detectedOpening.eco})
                    </h5>
                    <p>
                      Seguiste la teoría conocida durante{' '}
                      <strong>{openingReport.followedTheoryPlies}</strong> medias jugadas.
                    </p>
                    {openingReport.outOfBook && (
                      <p>
                        <strong>Salida de la teoría:</strong> Jugada {openingReport.outOfBook.moveNumber} (
                        {COLOR_NAME[openingReport.outOfBook.mover]} jugó{' '}
                        <code>{openingReport.outOfBook.playedSanEs}</code>). Alternativas teóricas conocidas:{' '}
                        {openingReport.outOfBook.bookAlternatives
                          .map((a) => `${a.sanEs} (${a.variantName})`)
                          .join(', ') || 'ninguna en esta rama'}
                        .{' '}
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          onClick={() => setReportPlyView(openingReport.outOfBook!.ply)}
                        >
                          Ver en tablero
                        </button>
                      </p>
                    )}
                    {openingReport.firstMistake && (
                      <p>
                        <strong>Primer error importante:</strong>{' '}
                        {openingReport.firstMistake.explanation}{' '}
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          onClick={() => setReportPlyView(openingReport.firstMistake!.ply)}
                        >
                          Ver error en tablero
                        </button>
                      </p>
                    )}
                  </div>

                  {openingReport.violatedPrinciples.length > 0 && (
                    <div className="coach-block coach-block--watch" style={{ marginTop: '0.4rem' }}>
                      <h5>⚠️ Principios estratégicos incumplidos:</h5>
                      <ul className="bullet-list">
                        {openingReport.violatedPrinciples.map((vp) => (
                          <li key={vp.id}>
                            <strong>{vp.title}:</strong> {vp.explanation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="coach-block" style={{ marginTop: '0.4rem' }}>
                    <h5>💡 Cómo mejorar en futuras partidas:</h5>
                    <ul className="bullet-list">
                      {openingReport.improvementAdvice.map((adv, idx) => (
                        <li key={idx}>{adv}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="btn btn--primary btn--xs"
                      onClick={() => {
                        handleSelectOpening(openingReport.recommendedAcademyOpeningId);
                        setWorkspaceMode('lesson');
                      }}
                    >
                      🎓 Estudiar {openingReport.detectedOpening.name} en la Academia
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= PANEL DERECHO: PROFESOR CON VOZ, 7 DIMENSIONES Y ENTRENADOR IA ================= */}
        <aside className="academy-panel academy-panel--right" aria-label="Profesor IA, explicaciones y preguntas">
          <div className="level-Seg" role="tablist" aria-label="Secciones del entrenador derecho">
            <button
              type="button"
              role="tab"
              aria-selected={rightSubTab === 'teacher'}
              className={`seg-btn ${rightSubTab === 'teacher' ? 'seg-btn--active' : ''}`}
              onClick={() => setRightSubTab('teacher')}
            >
              🎙️ Profesor y Jugada
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rightSubTab === 'ai-coach'}
              className={`seg-btn ${rightSubTab === 'ai-coach' ? 'seg-btn--active' : ''}`}
              onClick={() => setRightSubTab('ai-coach')}
            >
              🤖 Preguntar a la IA
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rightSubTab === 'inspector'}
              className={`seg-btn ${rightSubTab === 'inspector' ? 'seg-btn--active' : ''}`}
              onClick={() => setRightSubTab('inspector')}
            >
              🔍 Casilla ({selectedSquare})
            </button>
          </div>

          {/* SUB-PESTAÑA DERECHA 1: MODO PROFESOR CON VOZ + LAS 7 PREGUNTAS DE CADA JUGADA (Requisitos 3 y 5) */}
          {rightSubTab === 'teacher' && (
            <div className="academy-teacher-pane">
              {/* CONTROLES DE VOZ DEL PROFESOR VIRTUAL (Requisito 5) */}
              <div className="coach-block academy-voice-box">
                <div className="academy-card-header-inline">
                  <h4>🔊 Profesor Virtual con Explicación por Voz</h4>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                    <input
                      type="checkbox"
                      checked={voiceAutoNarrate}
                      onChange={(e) => setVoiceAutoNarrate(e.target.checked)}
                    />
                    Auto-narrar al avanzar
                  </label>
                </div>

                <div className="academy-voice-controls">
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={() => {
                      const text = currentLessonMove
                        ? buildMoveSpeechScript(currentLessonMove)
                        : `${opening.name} (${opening.eco}). ${opening.history} Objetivos: ${opening.goals.join(' ')}`;
                      speakCoachExplanation(text);
                    }}
                  >
                    🔊 Narrar explicación
                  </button>

                  {speechState.isSpeaking && !speechState.isPaused && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => pauseCoachSpeech()}
                    >
                      ⏸ Pausar voz
                    </button>
                  )}

                  {speechState.isPaused && (
                    <button
                      type="button"
                      className="btn btn--primary btn--xs"
                      onClick={() => resumeCoachSpeech()}
                    >
                      ▶ Reanudar voz
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => repeatLastCoachSpeech()}
                  >
                    🔁 Repetir
                  </button>

                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() => {
                      stopCoachSpeech();
                      setIsAutoPlaying(false);
                    }}
                  >
                    ⏹ Detener
                  </button>

                  <select
                    value={speechState.rate}
                    onChange={(e) => setCoachSpeechRate(Number(e.target.value))}
                    aria-label="Velocidad de reproducción de voz"
                  >
                    <option value={0.85}>0.85x Lenta</option>
                    <option value={1.0}>1.0x Normal</option>
                    <option value={1.15}>1.15x Ágil</option>
                    <option value={1.3}>1.3x Rápida</option>
                  </select>
                </div>

                {speechState.currentSubtitle && (
                  <p className="academy-voice-subtitle">«{speechState.currentSubtitle}»</p>
                )}
              </div>

              {/* LAS 7 DIMENSIONES PEDAGÓGICAS DEL MOVIMIENTO ACTUAL (Requisito 3) */}
              {currentLessonMove ? (
                <div className="academy-move-teaching">
                  <div className="coach-block coach-block--good">
                    <h4>
                      Jugada {Math.ceil(currentLessonMove.ply / 2)}
                      {currentLessonMove.mover === 'w' ? '. ' : '... '}
                      <code>{currentLessonMove.sanEs}</code> ({COLOR_NAME[currentLessonMove.mover]})
                    </h4>
                    <p>
                      <strong>1. ¿Por qué se realiza y qué objetivo tiene?</strong>{' '}
                      {currentLessonMove.teaching.why}
                    </p>
                  </div>

                  <div className="coach-block">
                    <p>
                      <strong>2. ¿Qué consecuencias estratégicas tiene?</strong>{' '}
                      {currentLessonMove.teaching.consequence}
                    </p>
                    <p>
                      <strong>3. ¿Qué casillas controla?</strong>{' '}
                      {currentLessonMove.teaching.controls}
                    </p>
                    <p>
                      <strong>4. ¿Qué amenaza genera?</strong>{' '}
                      {currentLessonMove.teaching.threat}
                    </p>
                  </div>

                  <div className="coach-block">
                    <p>
                      <strong>5. ¿Qué pretende conseguir el rival a continuación?</strong>{' '}
                      {currentLessonMove.teaching.rival}
                    </p>
                    <p>
                      <strong>6. ¿Qué pasaría si se realiza otro movimiento?</strong>{' '}
                      {currentLessonMove.teaching.alternative}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="coach-block">
                  <h4>Posición inicial de {opening.name}</h4>
                  <p>
                    Usa los controles inferiores (<strong>Siguiente ▶</strong> o{' '}
                    <strong>▶ Reproducir secuencia</strong>) o mueve directamente las piezas en el
                    tablero para estudiar el razonamiento detrás de cada jugada.
                  </p>
                  <p>
                    <strong>Idea de la variante «{activeLine.name}»:</strong> {activeLine.idea}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SUB-PESTAÑA DERECHA 2: ENTRENADOR IA CONVERSACIONAL (Requisitos 4 y 7) */}
          {rightSubTab === 'ai-coach' && (
            <div className="academy-ai-coach-pane">
              <div className="coach-block">
                <h4>🤖 Pregunta al Entrenador IA sobre la Apertura o Posición</h4>
                <p className="muted-text">
                  El entrenador tiene acceso a la apertura ({opening.short ?? opening.name}), el FEN actual,
                  el historial PGN y valida cada cálculo con Stockfish 19 sin inventar jugadas.
                </p>

                <div className="academy-quick-questions">
                  {OPENING_COACH_QUICK_QUESTIONS.map((qq) => (
                    <button
                      key={qq.id}
                      type="button"
                      className="btn btn--ghost btn--xs"
                      disabled={isAskingCoach}
                      onClick={() => void handleAskOpeningCoach(qq.prompt)}
                    >
                      {qq.label}
                    </button>
                  ))}
                </div>

                <form
                  className="academy-ask-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleAskOpeningCoach(coachQuestionInput);
                  }}
                >
                  <input
                    type="text"
                    value={coachQuestionInput}
                    onChange={(e) => setCoachQuestionInput(e.target.value)}
                    placeholder="Ej.: ¿Por qué no puedo mover la dama aquí? ¿Qué sucede si intercambio peones?"
                    aria-label="Escribe tu pregunta al entrenador de aperturas"
                  />
                  {isSpeechRecognitionSupported() && (
                    <button
                      type="button"
                      className={`btn btn--xs ${speechState.isListeningMic ? 'btn--primary' : 'btn--ghost'}`}
                      onClick={handleToggleVoiceQuestion}
                      title="Preguntar por voz con micrófono"
                    >
                      🎙️
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn btn--primary btn--xs"
                    disabled={isAskingCoach || !coachQuestionInput.trim()}
                  >
                    {isAskingCoach ? 'Analizando…' : 'Preguntar'}
                  </button>
                </form>
              </div>

              {coachHistory.length === 0 ? (
                <div className="coach-block">
                  <p className="muted-text">
                    Haz clic en cualquiera de las preguntas sugeridas arriba o escribe tu propia duda
                    sobre la posición actual.
                  </p>
                </div>
              ) : (
                <div className="academy-coach-answers">
                  {coachHistory.map((ans) => (
                    <div key={ans.id} className="academy-answer-card">
                      <div className="academy-answer-card__q">❓ {ans.question}</div>
                      <h5>{ans.headline}</h5>

                      {/* Diferenciación explícita entre evaluación del motor y explicación estratégica de la IA */}
                      <div className="coach-block coach-block--good">
                        <strong>⚙️ Validación de Stockfish 19 (prof. {ans.engineFact.depth}):</strong>
                        <p>
                          Evaluación: <code>{ans.engineFact.scoreText}</code> ({ans.engineFact.scoreDescription}) ·
                          Mejor jugada: <code>{ans.engineFact.bestMoveSanEs}</code> · Línea:{' '}
                          <code>{ans.engineFact.principalVariationEs}</code>
                        </p>
                        {ans.engineFact.comparedMove && (
                          <p>
                            Jugada consultada (<code>{ans.engineFact.comparedMove.playedSanEs}</code>):{' '}
                            <strong>{ans.engineFact.comparedMove.verdictLabel}</strong> (eval.{' '}
                            {ans.engineFact.comparedMove.scoreText}, pérdida{' '}
                            {ans.engineFact.comparedMove.lossCp} cp →{' '}
                            <code>{ans.engineFact.comparedMove.lineEs}</code>).
                          </p>
                        )}
                      </div>

                      <div className="coach-block" style={{ marginTop: '0.35rem' }}>
                        <strong>🎓 Explicación Estratégica del Entrenador IA:</strong>
                        <p>{ans.strategicExplanation}</p>
                        {ans.bulletPoints.length > 0 && (
                          <ul className="bullet-list">
                            {ans.bulletPoints.map((bp, idx) => (
                              <li key={idx}>{bp}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="action-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          onClick={() => speakCoachExplanation(ans.spokenText)}
                        >
                          🔊 Escuchar explicación
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--xs"
                          onClick={() =>
                            setCoachCustomIllustration({
                              arrows: ans.illustration.arrows,
                              highlights: ans.illustration.highlights,
                              threatened: ans.illustration.threatened,
                            })
                          }
                        >
                          🎯 Mostrar en el tablero
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-PESTAÑA DERECHA 3: INSPECTOR DE CASILLAS Y PIEZAS (Requisito 7) */}
          {rightSubTab === 'inspector' && (
            <div className="academy-inspector-pane">
              <div className="coach-block">
                <div className="academy-card-header-inline">
                  <h4>🔍 Inspector de Casilla o Pieza</h4>
                  <select
                    value={selectedSquare}
                    onChange={(e) => {
                      const sq = e.target.value as Square;
                      setSelectedSquare(sq);
                      const info = inspectSquareOrPiece(activeFen, sq, opening);
                      setCoachCustomIllustration({
                        arrows: info.arrows,
                        highlights: info.highlights,
                        threatened: [],
                      });
                    }}
                    aria-label="Seleccionar casilla del tablero a inspeccionar"
                  >
                    {ALL_SQUARES.map((sq) => (
                      <option key={sq} value={sq}>
                        Casilla {sq}
                      </option>
                    ))}
                  </select>
                </div>

                <p>{squareInspection.summary}</p>

                {squareInspection.keySquareRole && (
                  <div className="coach-block coach-block--good" style={{ marginTop: '0.4rem' }}>
                    <strong>Importancia en {opening.short ?? opening.name}:</strong>{' '}
                    {squareInspection.keySquareRole}
                  </div>
                )}

                <div className="action-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--primary btn--xs"
                    onClick={() =>
                      void handleAskOpeningCoach(
                        `¿Qué importancia tiene la casilla ${selectedSquare} en esta posición y cómo puedo aprovecharla?`,
                      )
                    }
                  >
                    🤖 Preguntar a la IA sobre {selectedSquare}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs"
                    onClick={() =>
                      setCoachCustomIllustration({
                        arrows: squareInspection.arrows,
                        highlights: squareInspection.highlights,
                        threatened: [],
                      })
                    }
                  >
                    📍 Resaltar en el tablero
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ================= ZONA INFERIOR: NAVEGACIÓN DE MOVIMIENTOS, VARIANTES Y PROGRESO ================= */}
      <footer className="academy-bottom-bar" aria-label="Controles de navegación de la apertura">
        <div className="academy-transport-controls">
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            disabled={lessonPly === 0}
            onClick={() => {
              setIsAutoPlaying(false);
              stepLessonTo(0, false);
            }}
            title="Ir a la posición inicial"
          >
            ⏮ Inicio
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            disabled={lessonPly === 0}
            onClick={() => {
              setIsAutoPlaying(false);
              stepLessonTo(lessonPly - 1, true);
            }}
            title="Retroceder un movimiento"
          >
            ◀ Anterior
          </button>
          <button
            type="button"
            className="btn btn--primary btn--xs"
            onClick={() => {
              if (isAutoPlaying) {
                setIsAutoPlaying(false);
                stopCoachSpeech();
              } else {
                setWorkspaceMode('lesson');
                if (lessonPly >= activeLine.moves.length) setLessonPly(0);
                setIsAutoPlaying(true);
              }
            }}
          >
            {isAutoPlaying ? '⏸ Pausar secuencia' : '▶ Reproducir secuencia'}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            disabled={lessonPly >= activeLine.moves.length}
            onClick={() => {
              setIsAutoPlaying(false);
              setWorkspaceMode('lesson');
              stepLessonTo(lessonPly + 1, true);
            }}
            title="Avanzar al siguiente movimiento"
          >
            Siguiente ▶
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            disabled={lessonPly >= activeLine.moves.length}
            onClick={() => {
              setIsAutoPlaying(false);
              setWorkspaceMode('lesson');
              stepLessonTo(activeLine.moves.length, true);
            }}
            title="Ir al final de la línea"
          >
            ⏭ Final
          </button>
        </div>

        {/* CINTA INTERACTIVA DE JUGADAS DE LA LECCIÓN ACTUAL */}
        <div className="academy-moves-ribbon" role="list" aria-label="Secuencia de jugadas de la variante">
          {activeLine.moves.map((mv) => {
            const isCurrent = workspaceMode === 'lesson' && lessonPly === mv.ply;
            return (
              <button
                key={mv.ply}
                type="button"
                className={`academy-ply-btn ${isCurrent ? 'academy-ply-btn--active' : ''}`}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setWorkspaceMode('lesson');
                  stepLessonTo(mv.ply, true);
                }}
              >
                {mv.ply % 2 === 1 ? `${Math.ceil(mv.ply / 2)}.` : ''}
                {mv.sanEs}
              </button>
            );
          })}
        </div>

        {/* SELECTOR RÁPIDO ENTRE LÍNEA PRINCIPAL Y VARIANTES */}
        <div className="academy-line-switcher">
          <select
            value={activeLine.id}
            onChange={(e) => {
              setSelectedLineId(e.target.value);
              setWorkspaceMode('lesson');
              setLessonPly(0);
            }}
            aria-label="Cambiar entre línea principal y variantes"
          >
            {opening.compiled.map((l) => (
              <option key={l.id} value={l.id}>
                {l.kind === 'principal' ? '⭐ ' : '🌿 '}
                {l.name} ({l.eco})
              </option>
            ))}
          </select>
        </div>
      </footer>
    </section>
  );
};
