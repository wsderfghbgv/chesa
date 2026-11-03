import React, { useEffect, useRef, useState } from 'react';
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key, SquareClasses } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { type Color, legalDests, isPromotion } from '../chess/utils';
import { kingSquare } from '../chess/features';
import { CATEGORIES, type MoveCategory } from '../coach/classify';

interface InteractiveBoardProps {
  fen: string;
  orientation: Color;
  playerColor: Color;
  canMove: boolean;
  allowBothSides?: boolean;
  lastMove?: [Square, Square] | null;
  shapes: DrawShape[];
  activeBadge?: { square: Square; category: MoveCategory } | null;
  vulnerableSquares?: Square[];
  isVariantMode?: boolean;
  showSquareLabels?: boolean;
  boardTheme?: 'emerald' | 'wood' | 'midnight' | 'ocean';
  boardSize?: number | null;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void | boolean | Promise<boolean | void>;
}

function countBoardPieces(fenStr: string): number {
  const placement = fenStr.split(' ')[0] ?? '';
  let count = 0;
  for (let i = 0; i < placement.length; i++) {
    const ch = placement[i];
    if (ch && /[prnbqkPRNBQK]/.test(ch)) count++;
  }
  return count;
}

function squareToPercentCoords(sq: Square, orientation: Color): { left: string; top: string } {
  const fileCode = sq.charCodeAt(0) - 97; // 0..7
  const rankNum = Number(sq[1]) - 1; // 0..7
  const col = orientation === 'w' ? fileCode : 7 - fileCode;
  const row = orientation === 'w' ? 7 - rankNum : rankNum;
  return {
    left: `${col * 12.5}%`,
    top: `${row * 12.5}%`,
  };
}

const PROMOTION_PIECES: Array<{ role: PieceSymbol; label: string; symbolW: string; symbolB: string }> = [
  { role: 'q', label: 'Dama', symbolW: '♕', symbolB: '♛' },
  { role: 'r', label: 'Torre', symbolW: '♖', symbolB: '♜' },
  { role: 'b', label: 'Alfil', symbolW: '♗', symbolB: '♝' },
  { role: 'n', label: 'Caballo', symbolW: '♘', symbolB: '♞' },
];

export const InteractiveBoard: React.FC<InteractiveBoardProps> = ({
  fen,
  orientation,
  playerColor,
  canMove,
  allowBothSides = false,
  lastMove,
  shapes,
  activeBadge = null,
  vulnerableSquares = [],
  isVariantMode = false,
  showSquareLabels = true,
  boardTheme = 'emerald',
  boardSize = null,
  onMove,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cgRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  const fenRef = useRef(fen);
  const prevPieceCountRef = useRef<number>(countBoardPieces(fen));
  onMoveRef.current = onMove;
  fenRef.current = fen;

  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: Color;
  } | null>(null);

  const [moveImpact, setMoveImpact] = useState<{
    square: Square;
    kind: 'move' | 'capture' | 'check';
    id: number;
  } | null>(null);

  useEffect(() => {
    if (!boardRef.current) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const api = Chessground(boardRef.current, {
      fen,
      orientation: orientation === 'w' ? 'white' : 'black',
      coordinates: true,
      autoCastle: true,
      animation: { enabled: !prefersReducedMotion, duration: prefersReducedMotion ? 0 : 260 },
      highlight: { lastMove: true, check: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      drawable: {
        enabled: true,
        visible: true,
        eraseOnMovablePieceClick: false,
        brushes: {
          green: { key: 'g', color: '#22c55e', opacity: 0.85, lineWidth: 10 },
          red: { key: 'r', color: '#ef4444', opacity: 0.85, lineWidth: 10 },
          blue: { key: 'b', color: '#3b82f6', opacity: 0.85, lineWidth: 10 },
          yellow: { key: 'y', color: '#eab308', opacity: 0.85, lineWidth: 10 },
        },
      },
    });
    cgRef.current = api;

    // Observador de cambio de tamaño con debouncing para evitar bucles de layout en Safari/WebKit
    let ro: ResizeObserver | null = null;
    let rafId: number | null = null;
    if (typeof ResizeObserver !== 'undefined' && boardRef.current) {
      ro = new ResizeObserver(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          api.redrawAll();
        });
      });
      ro.observe(boardRef.current);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro?.disconnect();
      api.destroy();
      cgRef.current = null;
    };
  }, []);

  // Redibujar tablero cuando el tamaño calculado cambie
  useEffect(() => {
    if (cgRef.current && boardSize) {
      const raf = requestAnimationFrame(() => {
        cgRef.current?.redrawAll();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [boardSize]);

  useEffect(() => {
    const api = cgRef.current;
    if (!api) return;

    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      return;
    }

    const currentPieces = countBoardPieces(fen);
    const wasCapture = currentPieces < prevPieceCountRef.current;
    prevPieceCountRef.current = currentPieces;

    if (lastMove && lastMove[1]) {
      const kind: 'move' | 'capture' | 'check' = chess.inCheck()
        ? 'check'
        : wasCapture
          ? 'capture'
          : 'move';
      setMoveImpact({ square: lastMove[1], kind, id: Date.now() });
    } else {
      setMoveImpact(null);
    }

    const stm = chess.turn();
    const dests = legalDests(chess) as unknown as Map<Key, Key[]>;
    const movableColor = !canMove
      ? undefined
      : allowBothSides
        ? (stm === 'w' ? 'white' : 'black')
        : (playerColor === 'w' ? 'white' : 'black');

    const customClasses: SquareClasses = new Map();
    for (const sq of vulnerableSquares) {
      customClasses.set(sq as Key, 'vulnerable-sq');
    }
    if (chess.isCheckmate()) {
      const kSq = kingSquare(chess, stm);
      if (kSq) customClasses.set(kSq as Key, 'checkmate-sq');
    }

    api.set({
      fen,
      orientation: orientation === 'w' ? 'white' : 'black',
      turnColor: stm === 'w' ? 'white' : 'black',
      check: chess.inCheck() ? (stm === 'w' ? 'white' : 'black') : false,
      lastMove: lastMove ? ([lastMove[0] as Key, lastMove[1] as Key]) : undefined,
      highlight: {
        lastMove: true,
        check: true,
        custom: customClasses,
      },
      movable: {
        free: false,
        color: movableColor,
        dests: canMove ? dests : new Map(),
        showDests: true,
        rookCastle: true,
        events: {
          after: (orig, dest) => {
            const curChess = new Chess(fenRef.current);
            const fromSq = orig as Square;
            const toSq = dest as Square;
            if (isPromotion(curChess, fromSq, toSq)) {
              setPendingPromotion({ from: fromSq, to: toSq, color: curChess.turn() });
            } else {
              void Promise.resolve(onMoveRef.current(fromSq, toSq)).then((accepted) => {
                if (accepted === false && cgRef.current) {
                  cgRef.current.set({ fen: fenRef.current });
                }
              });
            }
          },
        },
      },
    });
    api.setAutoShapes(shapes);
  }, [fen, orientation, playerColor, canMove, allowBothSides, lastMove, shapes, vulnerableSquares]);

  const handleConfirmPromotion = (role: PieceSymbol) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    void Promise.resolve(onMoveRef.current(from, to, role)).then((accepted) => {
      if (accepted === false && cgRef.current) {
        cgRef.current.set({ fen: fenRef.current });
      }
    });
  };

  const handleCancelPromotion = () => {
    setPendingPromotion(null);
    if (cgRef.current) {
      cgRef.current.set({ fen });
    }
  };

  const files = orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = orientation === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  const impactPos = moveImpact ? squareToPercentCoords(moveImpact.square, orientation) : null;
  const badgePos = activeBadge ? squareToPercentCoords(activeBadge.square, orientation) : null;

  return (
    <div
      className={`board-shell ${isVariantMode ? 'board-shell--variant' : ''}`}
      data-board-theme={boardTheme}
      style={boardSize ? { width: `${boardSize}px`, height: `${boardSize}px` } : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div ref={boardRef} className="cg-board-host cg-wrap" />
      {moveImpact && impactPos && (
        <div
          key={moveImpact.id}
          className={`move-impact-ring move-impact-ring--${moveImpact.kind}`}
          style={{ left: impactPos.left, top: impactPos.top }}
          aria-hidden="true"
        />
      )}
      {activeBadge && badgePos && (
        <div
          className={`board-move-badge board-move-badge--${activeBadge.category}`}
          style={{
            left: badgePos.left,
            top: badgePos.top,
            backgroundColor: CATEGORIES[activeBadge.category]?.color ?? '#10b981',
          }}
          title={`${CATEGORIES[activeBadge.category]?.label ?? 'Jugada'} en ${activeBadge.square}`}
          aria-label={`Clasificación de jugada: ${CATEGORIES[activeBadge.category]?.label}`}
        >
          <span className="board-move-badge__symbol" aria-hidden="true">
            {CATEGORIES[activeBadge.category]?.symbol ?? '★'}
          </span>
        </div>
      )}
      {showSquareLabels && (
        <div className="square-labels-overlay" aria-hidden="true">
          {ranks.map((r) =>
            files.map((f) => (
              <span key={`${f}${r}`} className="sq-label-cell">
                {f}
                {r}
              </span>
            )),
          )}
        </div>
      )}
      {pendingPromotion && (
        <div className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Selecciona pieza de promoción">
          <div className="promotion-dialog">
            <h4>Promoción de peón ({pendingPromotion.to})</h4>
            <p>Elige la pieza a la que deseas coronar:</p>
            <div className="promotion-options">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p.role}
                  type="button"
                  className="promotion-btn"
                  onClick={() => handleConfirmPromotion(p.role)}
                >
                  <span className="promotion-btn__icon">
                    {pendingPromotion.color === 'w' ? p.symbolW : p.symbolB}
                  </span>
                  <span className="promotion-btn__label">{p.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleCancelPromotion}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
