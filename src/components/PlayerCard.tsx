import React from 'react';
import type { Color, CapturedPieces } from '../chess/utils';

export interface PlayerCardProps {
  name: string;
  rating?: number | string;
  titleBadge?: string;
  avatarIcon?: string;
  avatarColor?: string;
  color: Color;
  isThinking?: boolean;
  isActiveTurn?: boolean;
  capturedPieces?: CapturedPieces;
  materialDiff?: number;
  clockMs?: number;
  clockEnabled?: boolean;
  statusText?: string;
  quote?: string;
}

function formatClockDisplay(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

  // Si queda menos de 10 segundos, mostrar décimas de segundo estilo Chess.com
  if (ms < 10000 && ms > 0) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  }
  return `${minutes}:${sStr}`;
}

const PIECE_SYMBOLS: Record<'w' | 'b', Record<keyof CapturedPieces, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  rating,
  titleBadge,
  avatarIcon = '♟',
  avatarColor,
  color,
  isThinking = false,
  isActiveTurn = false,
  capturedPieces,
  materialDiff = 0,
  clockMs = 0,
  clockEnabled = false,
  statusText,
  quote,
}) => {
  const isLowTime = clockEnabled && isActiveTurn && clockMs > 0 && clockMs < 30000;
  const oppColor: Color = color === 'w' ? 'b' : 'w';

  // Las piezas capturadas por este jugador son del color opuesto:
  const symbols = PIECE_SYMBOLS[oppColor];

  const pieceOrder: Array<keyof CapturedPieces> = ['p', 'n', 'b', 'r', 'q'];
  const hasCaptured =
    capturedPieces &&
    (capturedPieces.p > 0 ||
      capturedPieces.n > 0 ||
      capturedPieces.b > 0 ||
      capturedPieces.r > 0 ||
      capturedPieces.q > 0);

  return (
    <div
      className={`player-card ${isActiveTurn ? 'player-card--active' : ''} ${
        isLowTime ? 'player-card--low-time' : ''
      }`}
      role="region"
      aria-label={`Información del jugador ${name}`}
    >
      <div className="player-card__left">
        <div
          className={`player-card__avatar ${isThinking ? 'player-card__avatar--pulse' : ''}`}
          style={avatarColor ? { background: avatarColor } : undefined}
          title={quote ? `«${quote}»` : name}
        >
          <span className="player-card__avatar-symbol" aria-hidden="true">
            {avatarIcon}
          </span>
          <span
            className={`player-card__side-dot player-card__side-dot--${color}`}
            title={color === 'w' ? 'Juega con Blancas' : 'Juega con Negras'}
          />
        </div>

        <div className="player-card__details">
          <div className="player-card__header-line">
            {titleBadge && <span className="player-card__title-badge">{titleBadge}</span>}
            <strong className="player-card__name" title={name}>
              {name}
            </strong>
            {rating !== undefined && (
              <span className="player-card__rating">({rating})</span>
            )}
            {isThinking && (
              <span className="player-card__thinking-badge" aria-live="polite">
                <span className="thinking-dots">
                  <span />
                  <span />
                  <span />
                </span>
                Calculando…
              </span>
            )}
          </div>

          <div className="player-card__sub-line">
            {/* Lista visual de piezas capturadas */}
            {hasCaptured && (
              <div className="player-card__captured" aria-label="Piezas capturadas">
                {pieceOrder.map((role) => {
                  const count = capturedPieces[role];
                  if (!count || count <= 0) return null;
                  return (
                    <span key={role} className="captured-piece-group" title={`${count}x ${role}`}>
                      <span className="captured-piece-glyph">{symbols[role]}</span>
                      {count > 1 && <span className="captured-piece-count">{count}</span>}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Ventaja de material estilo Chess.com (+N) */}
            {materialDiff > 0 && (
              <span className="player-card__mat-advantage">+{materialDiff}</span>
            )}

            {statusText && <span className="player-card__status-text">{statusText}</span>}
          </div>
        </div>
      </div>

      <div className="player-card__right">
        {clockEnabled && (
          <div
            className={`player-card__clock ${isActiveTurn ? 'player-card__clock--active' : ''} ${
              isLowTime ? 'player-card__clock--alert' : ''
            }`}
            title={`Tiempo restante: ${formatClockDisplay(clockMs)}`}
            aria-live="polite"
          >
            <span className="player-card__clock-icon">⏱</span>
            <span className="player-card__clock-time">{formatClockDisplay(clockMs)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
