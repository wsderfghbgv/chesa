import React, { useEffect, useState } from 'react';
import { useChessStore } from '../state/useChessStore';
import {
  getSpeechState,
  subscribeSpeechState,
  stopCoachSpeech,
  pauseCoachSpeech,
  resumeCoachSpeech,
  repeatLastCoachSpeech,
  setCoachSpeechRate,
  setCoachSpeechVolume,
  startCoachVoiceListening,
  stopCoachVoiceListening,
  isSpeechSupported,
  isSpeechRecognitionSupported,
  type SpeechControllerState,
} from '../coach/soundAndSpeech';
import { QUICK_COACH_QUESTIONS, type CoachTeachingMode, type ExplanationDepth } from '../coach/explain';
import { EasyExplanation } from './EasyExplanation';

export const CoachAvatarWidget: React.FC = () => {
  const [speech, setSpeech] = useState<SpeechControllerState>(getSpeechState());
  const [questionText, setQuestionText] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const isAnalyzingMove = useChessStore((s) => s.isAnalyzingMove);
  const isOpponentThinking = useChessStore((s) => s.isOpponentThinking);
  const coachTeachingMode = useChessStore((s) => s.coachTeachingMode);
  const explanationDepth = useChessStore((s) => s.explanationDepth);
  const coachQaHistory = useChessStore((s) => s.coachQaHistory);
  const viewingPly = useChessStore((s) => s.viewingPly);
  const moveEvaluations = useChessStore((s) => s.moveEvaluations);

  const setCoachTeachingMode = useChessStore((s) => s.setCoachTeachingMode);
  const setExplanationDepth = useChessStore((s) => s.setExplanationDepth);
  const askCoachQuestion = useChessStore((s) => s.askCoachQuestion);
  const clearCoachQaHistory = useChessStore((s) => s.clearCoachQaHistory);
  const customHighlightShapes = useChessStore((s) => s.customHighlightShapes);
  const setCustomHighlightShapes = useChessStore((s) => s.setCustomHighlightShapes);
  const speakText = useChessStore((s) => s.speakText);

  useEffect(() => {
    return subscribeSpeechState((next) => {
      setSpeech({ ...next });
    });
  }, []);

  const activeEval = moveEvaluations[viewingPly] ?? null;

  // Determinar estado visual del Avatar
  let avatarState: 'speaking' | 'listening' | 'thinking' | 'idle' = 'idle';
  if (speech.isListeningMic) {
    avatarState = 'listening';
  } else if (speech.isSpeaking && !speech.isPaused) {
    avatarState = 'speaking';
  } else if (isAnalyzingMove || isOpponentThinking) {
    avatarState = 'thinking';
  }

  const handleToggleMic = () => {
    if (speech.isListeningMic) {
      stopCoachVoiceListening();
      return;
    }
    setMicError(null);
    const ok = startCoachVoiceListening(
      (transcript, isFinal) => {
        setQuestionText(transcript);
        if (isFinal && transcript.trim().length > 3) {
          askCoachQuestion(transcript);
          setQuestionText('');
          stopCoachVoiceListening();
        }
      },
      (err) => {
        setMicError(err);
      },
    );
    if (!ok && !micError) {
      setMicError('El micrófono no está disponible en este navegador.');
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = questionText.trim();
    if (!q) return;
    askCoachQuestion(q);
    setQuestionText('');
  };

  const handleQuickQuestion = (q: string) => {
    askCoachQuestion(q);
  };

  const handlePlayCurrentMoveExplanation = () => {
    if (!activeEval) return;
    const depth = explanationDepth ?? 'normal';
    const script =
      activeEval.spokenNarrative?.[depth] ??
      activeEval.spokenNarrative?.normal ??
      `${activeEval.playedSanEs}, ${activeEval.classification.meta.label}. ${activeEval.whatHappened}`;
    speakText(script);
  };

  return (
    <div className="coach-avatar-panel" role="region" aria-label="Profesor Virtual con Voz">
      {/* Cabecera del Avatar con Estado Animado y Opciones */}
      <div className="coach-avatar-panel__header">
        <div className="coach-avatar-card">
          <div className={`coach-avatar-visual coach-avatar-visual--${avatarState}`}>
            {/* SVG Avatar animado del Gran Maestro */}
            <svg
              className="coach-avatar-svg"
              viewBox="0 0 72 72"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label={`Avatar del profesor: ${avatarState}`}
            >
              <defs>
                <linearGradient id="avatarGrad" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
                <linearGradient id="avatarFace" x1="20" y1="20" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="100%" stopColor="#fdba74" />
                </linearGradient>
              </defs>

              {/* Fondo circular */}
              <circle cx="36" cy="36" r="34" fill="url(#avatarGrad)" />
              <circle cx="36" cy="36" r="33" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.4" />

              {/* Anillo de ondas para voz / escucha / pensamiento */}
              {avatarState === 'speaking' && (
                <circle cx="36" cy="36" r="35" className="avatar-wave avatar-wave--speaking" />
              )}
              {avatarState === 'listening' && (
                <circle cx="36" cy="36" r="35" className="avatar-wave avatar-wave--listening" />
              )}
              {avatarState === 'thinking' && (
                <circle cx="36" cy="36" r="35" className="avatar-wave avatar-wave--thinking" />
              )}

              {/* Corona / Birrete de Gran Maestro */}
              <path d="M22 23L36 14L50 23L44 26H28L22 23Z" fill="#f59e0b" />
              <circle cx="36" cy="14" r="2.5" fill="#fef08a" />

              {/* Rostro */}
              <circle cx="36" cy="37" r="16" fill="url(#avatarFace)" />

              {/* Gafas de profesor */}
              <circle cx="31" cy="35" r="4.2" stroke="#334155" strokeWidth="1.3" fill="none" />
              <circle cx="41" cy="35" r="4.2" stroke="#334155" strokeWidth="1.3" fill="none" />
              <line x1="35.2" y1="35" x2="36.8" y2="35" stroke="#334155" strokeWidth="1.3" />

              {/* Ojos */}
              <circle cx="31" cy="35" r="1.5" fill="#0f172a" />
              <circle cx="41" cy="35" r="1.5" fill="#0f172a" />

              {/* Bigote / Expresión */}
              <path d="M29 42C33 44 39 44 43 42C41 45 35 45 29 42Z" fill="#e2e8f0" />

              {/* Boca que se mueve al hablar */}
              {avatarState === 'speaking' ? (
                <ellipse cx="36" cy="46" rx="3.5" ry="2.2" fill="#881337" className="avatar-mouth--moving" />
              ) : (
                <path d="M33 46Q36 48 39 46" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              )}

              {/* Pechera / Traje */}
              <path d="M22 55C24 49 48 49 50 55L53 66H19L22 55Z" fill="#1e293b" />
              <path d="M36 52L38 60H34L36 52Z" fill="#f87171" />
            </svg>

            {/* Insignia de estado */}
            <span
              className={`coach-status-dot coach-status-dot--${avatarState}`}
              title={
                avatarState === 'speaking'
                  ? 'El profesor está hablando'
                  : avatarState === 'listening'
                    ? 'El profesor te está escuchando…'
                    : avatarState === 'thinking'
                      ? 'Stockfish está analizando la posición…'
                      : 'El profesor está listo'
              }
            />
          </div>

          <div className="coach-avatar-meta">
            <div className="coach-avatar-name-row">
              <strong className="coach-avatar-name">Profesor Virtual con Voz</strong>
              <span className={`pill pill--${avatarState}`}>
                {avatarState === 'speaking'
                  ? '🗣 Hablando'
                  : avatarState === 'listening'
                    ? '🎙 Escuchando'
                    : avatarState === 'thinking'
                      ? '⚙ Calculando'
                      : 'En reposo'}
              </span>
            </div>
            <small className="coach-avatar-sub">
              {coachTeachingMode === 'auto'
                ? 'Modo automático: explica cada jugada'
                : coachTeachingMode === 'on_demand'
                  ? 'Modo bajo demanda: habla cuando se le pide'
                  : 'Modo silencioso: solo subtítulos escritos'}
            </small>
          </div>
        </div>

        {/* Selectores de Modo de Enseñanza y Profundidad */}
        <div className="coach-settings-strip">
          <div className="coach-mode-seg" role="group" aria-label="Modo de enseñanza del profesor">
            {(
              [
                { id: 'auto', label: 'Automático', icon: '🔊' },
                { id: 'on_demand', label: 'Bajo demanda', icon: '👆' },
                { id: 'silent', label: 'Silencioso', icon: '🤫' },
              ] as Array<{ id: CoachTeachingMode; label: string; icon: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                className={`seg-btn ${coachTeachingMode === m.id ? 'seg-btn--active' : ''}`}
                onClick={() => setCoachTeachingMode(m.id)}
                title={`Modo ${m.label}`}
              >
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>

          <div className="coach-depth-seg" role="group" aria-label="Profundidad de las explicaciones">
            {(
              [
                { id: 'breve', label: 'Breve' },
                { id: 'normal', label: 'Normal' },
                { id: 'detallada', label: 'Detallada' },
              ] as Array<{ id: ExplanationDepth; label: string }>
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                className={`seg-btn seg-btn--sm ${explanationDepth === d.id ? 'seg-btn--active' : ''}`}
                onClick={() => setExplanationDepth(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Caja de Subtítulos Sincronizados en Tiempo Real */}
      <div className="coach-subtitles-box" role="region" aria-label="Subtítulos sincronizados del profesor">
        <div className="coach-subtitles-box__top">
          <span className="coach-subtitles-tag">
            {speech.isSpeaking ? '💬 Comentario en vivo:' : '📜 Explicación del profesor:'}
          </span>
          <div className="coach-speech-controls">
            {activeEval && (
              <button
                type="button"
                className="btn btn--primary btn--xs"
                onClick={handlePlayCurrentMoveExplanation}
                title="Explicar esta jugada en voz alta"
              >
                ▶ Explicar jugada
              </button>
            )}
            {isSpeechSupported() && speech.isSpeaking && (
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={speech.isPaused ? resumeCoachSpeech : pauseCoachSpeech}
                title={speech.isPaused ? 'Reanudar voz' : 'Pausar voz'}
              >
                {speech.isPaused ? '▶ Reanudar' : '⏸ Pausa'}
              </button>
            )}
            {isSpeechSupported() && (
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={() => repeatLastCoachSpeech()}
                title="Repetir última locución"
              >
                ↻ Repetir
              </button>
            )}
            {isSpeechSupported() && speech.isSpeaking && (
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={stopCoachSpeech}
                title="Detener voz"
              >
                ⏹ Parar
              </button>
            )}
          </div>
        </div>

        <div className="coach-subtitles-content">
          <p className="coach-subtitle-text">
            {speech.currentSubtitle ? (
              <span className="coach-subtitle-highlight">{speech.currentSubtitle}</span>
            ) : activeEval ? (
              <span>
                {activeEval.playedSanEs} ({activeEval.classification.meta.label}): {activeEval.whatHappened}
              </span>
            ) : (
              <span className="muted-text">
                Selecciona cualquier jugada del historial o mueve una pieza para escuchar el análisis de Stockfish.
              </span>
            )}
          </p>
        </div>

        {/* Barra de Ajustes de Audio (Velocidad y Volumen) */}
        {isSpeechSupported() && (
          <div className="coach-audio-sliders">
            <div className="audio-slider-item">
              <span>Velocidad: <strong>{speech.rate.toFixed(2)}x</strong></span>
              <input
                type="range"
                min="0.85"
                max="1.35"
                step="0.05"
                value={speech.rate}
                onChange={(e) => setCoachSpeechRate(parseFloat(e.target.value))}
                aria-label="Velocidad de reproducción de la voz del profesor"
              />
            </div>
            <div className="audio-slider-item">
              <span>Volumen: <strong>{Math.round(speech.volume * 100)}%</strong></span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={speech.volume}
                onChange={(e) => setCoachSpeechVolume(parseFloat(e.target.value))}
                aria-label="Volumen de la voz del profesor"
              />
            </div>
          </div>
        )}
      </div>

      {/* Interfaz de Preguntas y Respuestas con el Profesor (Micrófono + Texto + Chips) */}
      <div className="coach-qa-section">
        <div className="coach-qa-section__title">
          <span>💬 Pregúntale a tu Profesor sobre esta posición</span>
          {coachQaHistory.length > 0 && (
            <button
              type="button"
              className="btn btn--ghost btn--xs"
              onClick={clearCoachQaHistory}
            >
              Limpiar chat
            </button>
          )}
        </div>

        {/* Chips de Preguntas Rápidas */}
        <div className="coach-quick-chips" role="group" aria-label="Preguntas rápidas al profesor">
          {QUICK_COACH_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              className="quick-chip-btn"
              onClick={() => handleQuickQuestion(q)}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Formulario de Entrada con Botón de Micrófono y Envío */}
        <form className="coach-qa-form" onSubmit={handleAskSubmit}>
          <div className="coach-qa-input-wrap">
            <input
              type="text"
              className="coach-qa-input text-input"
              placeholder={
                speech.isListeningMic
                  ? '🎙 Escuchando tu pregunta por micrófono…'
                  : 'Escribe tu pregunta o duda sobre esta posición…'
              }
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />

            {isSpeechRecognitionSupported() && (
              <button
                type="button"
                className={`coach-mic-btn ${speech.isListeningMic ? 'coach-mic-btn--active' : ''}`}
                onClick={handleToggleMic}
                title={speech.isListeningMic ? 'Detener micrófono' : 'Preguntar por voz con el micrófono'}
                aria-label="Activar reconocimiento de voz por micrófono"
              >
                {speech.isListeningMic ? '🔴' : '🎙'}
              </button>
            )}

            <button
              type="submit"
              className="btn btn--primary btn--sm coach-qa-send-btn"
              disabled={!questionText.trim()}
            >
              Enviar
            </button>
          </div>
          {micError && (
            <small className="coach-mic-error" role="alert">
              ⚠ {micError}
            </small>
          )}
        </form>

        {/* Historial de Preguntas y Respuestas contextuales */}
        {coachQaHistory.length > 0 && (
          <div className="coach-qa-stream">
            {coachQaHistory.slice(0, 4).map((item) => (
              <div key={item.id} className="coach-qa-card">
                <div className="coach-qa-card__q">
                  <strong>Tú ({item.timestamp}):</strong>
                  <p>{item.question}</p>
                </div>
                <div className="coach-qa-card__a">
                  <div className="coach-qa-card__header">
                    <strong>🎓 Profesor:</strong>
                    {item.highlightUci && (() => {
                      const fromSq = item.highlightUci.slice(0, 2);
                      const toSq = item.highlightUci.slice(2, 4);
                      const isHighlighted = (customHighlightShapes ?? []).some(
                        (sh) => sh.orig === fromSq && sh.dest === toSq
                      );
                      return (
                        <button
                          type="button"
                          className={`btn ${isHighlighted ? 'btn--accent' : 'btn--secondary'} btn--xs`}
                          onClick={() => {
                            if (isHighlighted) {
                              setCustomHighlightShapes([]);
                            } else {
                              setCustomHighlightShapes([
                                { orig: fromSq as any, dest: toSq as any, brush: 'green' },
                                { orig: fromSq as any, brush: 'yellow' },
                              ]);
                            }
                          }}
                          title={isHighlighted ? 'Ocultar señalización del tablero' : 'Señalar en el tablero qué pieza mover'}
                        >
                          {isHighlighted ? '✕ Ocultar señalización' : '🟢 Señalar en tablero'}
                        </button>
                      );
                    })()}
                  </div>
                  <p><EasyExplanation text={item.answer} /></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
