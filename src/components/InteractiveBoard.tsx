import React, { useEffect, useRef, useState } from 'react';
import { Chess, type Square, type PieceSymbol } from 'chess.js';
import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Key, SquareClasses } from '@lichess-org/chessground/types';
import type { DrawShape } from '@lichess-org/chessground/draw';
import { type Color, legalDests, isPromotion } from '../chess/utils';
import { kingSquare } from '../chess/features';

interface InteractiveBoardProps {
  fen: string;
  orientation: Color;
  playerColor: Color;
  canMove: boolean;
  allowBothSides?: boolean;
  lastMove?: [Square, Square] | null;
  shapes: DrawShape[];
  vulnerableSquares?: Square[];
  isVariantMode?: boolean;
  showSquareLabels?: boolean;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
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
  vulnerableSquares = [],
  isVariantMode = false,
  showSquareLabels = true,
  onMove,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const cgRef = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  const fenRef = useRef(fen);
  onMoveRef.current = onMove;
  fenRef.current = fen;

  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: Color;
  } | null>(null);

  useEffect(() => {
    if (!boardRef.current) return;
    const api = Chessground(boardRef.current, {
      fen,
      orientation: orientation === 'w' ? 'white' : 'black',
      coordinates: true,
      autoCastle: true,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      drawable: {
        enabled: true,
        visible: true,
        eraseOnMovablePieceClick: false,
      },
    });
    cgRef.current = api;
    return () => {
      api.destroy();
      cgRef.current = null;
    };
  }, []);

  useEffect(() => {
    const api = cgRef.current;
    if (!api) return;

    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      return;
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
              onMoveRef.current(fromSq, toSq);
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
    onMove(from, to, role);
  };

  const handleCancelPromotion = () => {
    setPendingPromotion(null);
    if (cgRef.current) {
      cgRef.current.set({ fen });
    }
  };

  const files = orientation === 'w' ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = orientation === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

  return (
    <div className={`board-shell ${isVariantMode ? 'board-shell--variant' : ''}`}>
      <div ref={boardRef} className="cg-board-host cg-wrap" />
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
