/**
 * Renderizador de texto pedagógico para jugadores que no conocen coordenadas ni notación algebraica.
 *
 * - Traduce automáticamente abreviaturas ("Cf3", "Axf7+", "O-O") a español cotidiano ("Caballo moviendo a f3", "Enroque corto").
 * - Convierte cualquier casilla mencionada (ej. "e4", "f7", "c4") en una insignia interactiva:
 *   al pasar el ratón o pulsar sobre ella, ILUMINA esa casilla exacta en el tablero y explica dónde está
 *   visualmente (abajo/arriba/centro/izquierda/derecha).
 */
import React from 'react';
import type { Square } from 'chess.js';
import { humanizeChessText, describeSquareVisually } from '../chess/humanLanguage';
import { useChessStore } from '../state/useChessStore';

interface EasyExplanationProps {
  text: string;
}

const SQUARE_SPLIT_REGEX = /\b([a-h][1-8])\b/g;

export const EasyExplanation: React.FC<EasyExplanationProps> = ({ text }) => {
  const simpleLanguageMode = useChessStore((s) => s.simpleLanguageMode);
  const orientation = useChessStore((s) => s.orientation);
  const setCustomHighlightShapes = useChessStore((s) => s.setCustomHighlightShapes);

  const processed = simpleLanguageMode ? humanizeChessText(text) : text;
  const parts = processed.split(SQUARE_SPLIT_REGEX);

  const handleHighlight = (sq: Square, scrollToBoardIfMobile = false) => {
    setCustomHighlightShapes([{ orig: sq, brush: 'yellow' }]);
    if (scrollToBoardIfMobile && typeof window !== 'undefined' && window.innerWidth <= 720) {
      const boardEl = document.querySelector('.board-stage');
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          boardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  const handleClear = () => {
    setCustomHighlightShapes([]);
  };

  return (
    <span>
      {parts.map((part, idx) => {
        if (/^[a-h][1-8]$/.test(part)) {
          const sq = part as Square;
          const visualWhere = describeSquareVisually(sq, orientation);
          return (
            <button
              key={`${idx}-${sq}`}
              type="button"
              className="sq-interactive-chip"
              title={`Casilla ${sq} (${visualWhere}) — Pasa el ratón o haz clic para iluminarla en el tablero`}
              onMouseEnter={() => handleHighlight(sq, false)}
              onMouseLeave={handleClear}
              onClick={() => handleHighlight(sq, true)}
            >
              📍 {sq}
              {simpleLanguageMode && (
                <span className="sq-interactive-chip__hint"> (ver en tablero)</span>
              )}
            </button>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};
