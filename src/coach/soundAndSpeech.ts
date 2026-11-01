/**
 * Síntesis de efectos de sonido (Web Audio API), Profesor Virtual con Voz en español (Web Speech API TTS)
 * con pronunciación ajedrecística natural, subtítulos sincronizados en tiempo real y reconocimiento
 * de voz por micrófono (SpeechRecognition) para conversar con el entrenador.
 *
 * Degrada de forma segura en entornos de prueba (jsdom / Node) donde `AudioContext` o
 * `speechSynthesis` no estén disponibles.
 */

export type ChessSoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'gameOver'
  | 'success'
  | 'mistake'
  | 'tick';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** Reproduce un impacto acústico similar a una pieza de ajedrez de madera */
function playWoodClick(
  ctx: AudioContext,
  freq: number,
  durationSec: number,
  gainVal = 0.15,
  delaySec = 0,
): void {
  try {
    const start = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), start + durationSec);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, start);
    filter.frequency.exponentialRampToValueAtTime(300, start + durationSec);

    gain.gain.setValueAtTime(gainVal, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + durationSec);
  } catch {
    // Silencio seguro en entornos sin soporte de audio
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainVal = 0.12,
  delaySec = 0,
): void {
  try {
    const start = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(gainVal, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + durationSec);
  } catch {
    // Ignorado en entornos sin salida de audio
  }
}

/** Reproduce un efecto de sonido sintetizado para eventos del tablero y del entrenador. */
export function playChessSound(type: ChessSoundType, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (type) {
    case 'move':
      playWoodClick(ctx, 380, 0.055, 0.22);
      playTone(ctx, 160, 0.045, 'sine', 0.12, 0.005);
      break;
    case 'capture':
      playWoodClick(ctx, 290, 0.075, 0.28);
      playWoodClick(ctx, 130, 0.09, 0.22, 0.02);
      break;
    case 'check':
      playWoodClick(ctx, 420, 0.05, 0.2);
      playTone(ctx, 587.33, 0.12, 'sine', 0.16, 0.02);
      playTone(ctx, 880, 0.18, 'sine', 0.15, 0.08);
      break;
    case 'castle':
      playWoodClick(ctx, 360, 0.05, 0.2);
      playWoodClick(ctx, 310, 0.055, 0.22, 0.08);
      break;
    case 'promote':
      playWoodClick(ctx, 350, 0.05, 0.18);
      playTone(ctx, 440, 0.09, 'sine', 0.14, 0.04);
      playTone(ctx, 554.37, 0.09, 'sine', 0.14, 0.11);
      playTone(ctx, 659.25, 0.16, 'sine', 0.15, 0.18);
      break;
    case 'tick':
      // Sonido sutil de tic de reloj mecánico cuando quedan menos de 30 segundos
      playWoodClick(ctx, 1200, 0.015, 0.05);
      break;
    case 'success':
      playTone(ctx, 523.25, 0.09, 'sine', 0.12);
      playTone(ctx, 659.25, 0.12, 'sine', 0.13, 0.09);
      break;
    case 'mistake':
      playTone(ctx, 240, 0.12, 'sawtooth', 0.1);
      playTone(ctx, 185, 0.18, 'sawtooth', 0.1, 0.1);
      break;
    case 'gameOver':
      playTone(ctx, 392, 0.12, 'sine', 0.12);
      playTone(ctx, 493.88, 0.12, 'sine', 0.12, 0.11);
      playTone(ctx, 587.33, 0.22, 'sine', 0.14, 0.22);
      break;
  }
}

/** Determina el tipo de sonido apropiado a partir de una jugada SAN. */
export function soundTypeForSan(san: string): ChessSoundType {
  if (san.includes('#')) return 'gameOver';
  if (san.includes('+')) return 'check';
  if (san.includes('=')) return 'promote';
  if (san.startsWith('O-O')) return 'castle';
  if (san.includes('x')) return 'capture';
  return 'move';
}

let cachedEsVoice: SpeechSynthesisVoice | null = null;
function findEsVoice(): SpeechSynthesisVoice | null {
  if (cachedEsVoice) return cachedEsVoice;
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices?.() ?? [];
  const es =
    voices.find((v) => v.lang.toLowerCase().startsWith('es') && v.localService) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('es')) ??
    null;
  if (es) cachedEsVoice = es;
  return es;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      cachedEsVoice = null;
      findEsVoice();
    };
  } catch { /* ignorado */ }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

const PIECE_SPEECH_ES: Record<string, string> = {
  R: 'rey',
  D: 'dama',
  T: 'torre',
  A: 'alfil',
  C: 'caballo',
  K: 'rey',
  Q: 'dama',
  B: 'alfil',
  N: 'caballo',
};

/**
 * Convierte notación algebraica de ajedrez (SAN en español o inglés) y evaluaciones numéricas
 * dentro de una frase en fonética natural en español para que el sintetizador de voz
 * pronuncie correctamente piezas, capturas, enroques, jaques y coordenadas.
 */
export function chessTextToNaturalSpanishSpeech(text: string): string {
  if (!text) return '';

  let s = text
    // Enroques
    .replace(/\bO-O-O\b/g, 'enroque largo')
    .replace(/\bO-O\b/g, 'enroque corto')
    // Mates tipo +M3 o -M2
    .replace(/\+M(\d+)/g, 'mate a favor en $1')
    .replace(/-M(\d+)/g, 'mate en contra en $1')
    // Evaluaciones con signo (+0.45 -> más 0.45, -1.20 -> menos 1.20)
    .replace(/\+(\d+[.,]\d+)/g, 'más $1')
    .replace(/[-−](\d+[.,]\d+)/g, 'menos $1')
    .replace(/→/g, ' a ');

  // Jugadas de pieza tipo Cf3, Dxd5+, Tae1, Axe4#
  s = s.replace(
    /\b([RDTACKQBN])([a-h1-8]?)(x?)([a-h][1-8])(=[RDTACQBN])?([+#])?(?=$|[\s.,;:!?)\]])/g,
    (_match, piece: string, disamb: string, cap: string, sq: string, promo: string | undefined, chk: string | undefined) => {
      const pName = PIECE_SPEECH_ES[piece] ?? piece;
      const disText = disamb ? ` de ${disamb}` : '';
      const action = cap === 'x' ? ' por ' : ' ';
      const sqSpoken = `${sq[0]} ${sq[1]}`;
      const promoPiece = promo ? PIECE_SPEECH_ES[promo.slice(1)] ?? 'dama' : '';
      const promoText = promoPiece ? ` coronando ${promoPiece}` : '';
      const chkText = chk === '#' ? ', jaque mate' : chk === '+' ? ', jaque' : '';
      return `${pName}${disText}${action}${sqSpoken}${promoText}${chkText}`;
    },
  );

  // Capturas de peón tipo exd5, cxd4+
  s = s.replace(
    /\b([a-h])x([a-h][1-8])(=[RDTACQBN])?([+#])?(?=$|[\s.,;:!?)\]])/g,
    (_match, fromFile: string, sq: string, promo: string | undefined, chk: string | undefined) => {
      const sqSpoken = `${sq[0]} ${sq[1]}`;
      const promoPiece = promo ? PIECE_SPEECH_ES[promo.slice(1)] ?? 'dama' : '';
      const promoText = promoPiece ? ` coronando ${promoPiece}` : '';
      const chkText = chk === '#' ? ', jaque mate' : chk === '+' ? ', jaque' : '';
      return `peón de ${fromFile} por ${sqSpoken}${promoText}${chkText}`;
    },
  );

  // Avances de peón sueltos con promoción o jaque (ej. e8=D+, e4)
  s = s.replace(
    /\b([a-h][1-8])(=[RDTACQBN])([+#])?(?=$|[\s.,;:!?)\]])/g,
    (_match, sq: string, promo: string, chk: string | undefined) => {
      const sqSpoken = `${sq[0]} ${sq[1]}`;
      const promoPiece = PIECE_SPEECH_ES[promo.slice(1)] ?? 'dama';
      const chkText = chk === '#' ? ', jaque mate' : chk === '+' ? ', jaque' : '';
      return `${sqSpoken} coronando ${promoPiece}${chkText}`;
    },
  );

  // Limpiar emojis y símbolos decorativos para que el motor de voz no los deletree
  s = s
    .replace(/[✓✗★!?\u2600-\u26FF\u2700-\u27BF\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

export interface SpeechControllerState {
  isSpeaking: boolean;
  isPaused: boolean;
  isListeningMic: boolean;
  currentSubtitle: string;
  fullText: string;
  rate: number;
  volume: number;
}

type SpeechListener = (state: SpeechControllerState) => void;

const SPEECH_RATE_KEY = 'ccai_speech_rate';
const SPEECH_VOL_KEY = 'ccai_speech_vol';

function loadSavedNumber(key: string, fallback: number, min: number, max: number): number {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  } catch {
    return fallback;
  }
}

let speechState: SpeechControllerState = {
  isSpeaking: false,
  isPaused: false,
  isListeningMic: false,
  currentSubtitle: '',
  fullText: '',
  rate: loadSavedNumber(SPEECH_RATE_KEY, 1.0, 0.8, 1.4),
  volume: loadSavedNumber(SPEECH_VOL_KEY, 1.0, 0, 1),
};

const listeners = new Set<SpeechListener>();
let subtitleTimer: ReturnType<typeof setInterval> | null = null;
let lastSpokenDisplayText = '';
let activeSpeechSessionId = 0;

function clearSubtitleTimer() {
  if (subtitleTimer) {
    clearInterval(subtitleTimer);
    subtitleTimer = null;
  }
}

function updateSpeechState(partial: Partial<SpeechControllerState>) {
  speechState = { ...speechState, ...partial };
  for (const fn of listeners) {
    try {
      fn(speechState);
    } catch {
      // Ignorado
    }
  }
}

export function getSpeechState(): SpeechControllerState {
  return speechState;
}

export function subscribeSpeechState(listener: SpeechListener): () => void {
  listeners.add(listener);
  listener(speechState);
  return () => {
    listeners.delete(listener);
  };
}

export function setCoachSpeechRate(rate: number): void {
  const clamped = Math.max(0.8, Math.min(1.4, Number(rate.toFixed(2))));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPEECH_RATE_KEY, String(clamped));
    }
  } catch { /* ignorado */ }
  updateSpeechState({ rate: clamped });
}

export function setCoachSpeechVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, Number(volume.toFixed(2))));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SPEECH_VOL_KEY, String(clamped));
    }
  } catch { /* ignorado */ }
  updateSpeechState({ volume: clamped });
}

export function stopCoachSpeech(): void {
  activeSpeechSessionId++;
  clearSubtitleTimer();
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignorado
    }
  }
  updateSpeechState({
    isSpeaking: false,
    isPaused: false,
  });
}

export function pauseCoachSpeech(): void {
  if (!isSpeechSupported() || !speechState.isSpeaking) return;
  try {
    window.speechSynthesis.pause();
    updateSpeechState({ isPaused: true });
  } catch {
    // Ignorado
  }
}

export function resumeCoachSpeech(): void {
  if (!isSpeechSupported() || !speechState.isSpeaking) return;
  try {
    window.speechSynthesis.resume();
    updateSpeechState({ isPaused: false });
  } catch {
    // Ignorado
  }
}

export function repeatLastCoachSpeech(): boolean {
  const target = lastSpokenDisplayText || speechState.fullText;
  if (!target) return false;
  return speakCoachExplanation(target);
}

/** Divide un texto largo en frases legibles para mostrar subtítulos sincronizados en vivo. */
function splitIntoSubtitles(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const rawSentences = cleaned.split(/(?<=[.!?…:;])\s+/);
  const chunks: string[] = [];
  for (const s of rawSentences) {
    if (s.length <= 130) {
      chunks.push(s);
    } else {
      const words = s.split(' ');
      let buf = '';
      for (const w of words) {
        if ((buf + ' ' + w).trim().length > 115) {
          chunks.push(buf.trim());
          buf = w;
        } else {
          buf = (buf + ' ' + w).trim();
        }
      }
      if (buf.trim()) chunks.push(buf.trim());
    }
  }
  return chunks.length > 0 ? chunks : [cleaned];
}

export interface SpeakOptions {
  /** Si se pasa true, solo actualiza los subtítulos escritos sin emitir audio (Modo silencioso). */
  silentOnly?: boolean;
  /** Callback al terminar la locución de forma natural (útil para Reproducción Automática). */
  onEnd?: () => void;
}

/**
 * Lee en voz alta una explicación del entrenador en español con pronunciación ajedrecística natural
 * y sincronización de subtítulos en vivo. Cancela inmediatamente cualquier audio anterior para
 * garantizar que nunca se superpongan dos voces.
 */
export function speakCoachExplanation(text: string, options: SpeakOptions = {}): boolean {
  const displayClean = text.replace(/\s+/g, ' ').trim();
  if (!displayClean) return false;

  lastSpokenDisplayText = displayClean;
  const sessionId = ++activeSpeechSessionId;
  clearSubtitleTimer();

  const subtitleChunks = splitIntoSubtitles(displayClean);

  if (options.silentOnly || !isSpeechSupported() || speechState.volume <= 0.01) {
    if (isSpeechSupported()) {
      try { window.speechSynthesis.cancel(); } catch { /* ignorado */ }
    }
    updateSpeechState({
      isSpeaking: false,
      isPaused: false,
      fullText: displayClean,
      currentSubtitle: subtitleChunks[0] ?? displayClean,
    });
    if (options.onEnd) {
      setTimeout(() => {
        if (sessionId === activeSpeechSessionId) options.onEnd?.();
      }, 1800);
    }
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const phoneticText = chessTextToNaturalSpanishSpeech(displayClean);
    const utterance = new SpeechSynthesisUtterance(phoneticText);
    utterance.lang = 'es-ES';
    utterance.rate = speechState.rate;
    utterance.volume = speechState.volume;
    utterance.pitch = 1.0;

    const esVoice = findEsVoice();
    if (esVoice) {
      utterance.voice = esVoice;
    }

    let chunkIdx = 0;
    updateSpeechState({
      isSpeaking: true,
      isPaused: false,
      fullText: displayClean,
      currentSubtitle: subtitleChunks[0] ?? displayClean,
    });

    // Temporizador progresivo para avanzar subtítulos si el navegador no emite onboundary
    if (subtitleChunks.length > 1) {
      const approxTotalMs = Math.max(2500, (displayClean.length / (14.5 * speechState.rate)) * 1000);
      const stepMs = Math.max(1400, Math.round(approxTotalMs / subtitleChunks.length));
      subtitleTimer = setInterval(() => {
        if (sessionId !== activeSpeechSessionId || speechState.isPaused) return;
        chunkIdx = Math.min(subtitleChunks.length - 1, chunkIdx + 1);
        updateSpeechState({
          currentSubtitle: subtitleChunks[chunkIdx] ?? displayClean,
        });
      }, stepMs);
    }

    utterance.onboundary = (ev) => {
      if (sessionId !== activeSpeechSessionId) return;
      if (typeof ev.charIndex === 'number' && phoneticText.length > 0 && subtitleChunks.length > 1) {
        const ratio = Math.min(0.99, Math.max(0, ev.charIndex / phoneticText.length));
        const targetIdx = Math.min(subtitleChunks.length - 1, Math.floor(ratio * subtitleChunks.length));
        if (targetIdx !== chunkIdx) {
          chunkIdx = targetIdx;
          updateSpeechState({
            currentSubtitle: subtitleChunks[chunkIdx] ?? displayClean,
          });
        }
      }
    };

    utterance.onend = () => {
      if (sessionId !== activeSpeechSessionId) return;
      clearSubtitleTimer();
      updateSpeechState({
        isSpeaking: false,
        isPaused: false,
        currentSubtitle: subtitleChunks[subtitleChunks.length - 1] ?? displayClean,
      });
      options.onEnd?.();
    };

    utterance.onerror = () => {
      if (sessionId !== activeSpeechSessionId) return;
      clearSubtitleTimer();
      updateSpeechState({
        isSpeaking: false,
        isPaused: false,
      });
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    clearSubtitleTimer();
    updateSpeechState({ isSpeaking: false, isPaused: false });
    return false;
  }
}

// --- Reconocimiento de Voz por Micrófono (Web Speech API SpeechRecognition) ---

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

let activeRecognition: SpeechRecognitionInstance | null = null;

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function stopCoachVoiceListening(): void {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch { /* ignorado */ }
    activeRecognition = null;
  }
  updateSpeechState({ isListeningMic: false });
}

export function startCoachVoiceListening(
  onTranscript: (transcript: string, isFinal: boolean) => void,
  onError?: (msg: string) => void,
): boolean {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    onError?.('Tu navegador no soporta reconocimiento de voz por micrófono. Puedes escribir tu pregunta debajo.');
    return false;
  }

  // Detener inmediatamente la voz del profesor si estaba hablando para escuchar al usuario
  stopCoachSpeech();
  stopCoachVoiceListening();

  try {
    const rec = new Ctor();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (event) => {
      const lastIdx = event.results.length - 1;
      const item = event.results[lastIdx];
      const transcript = item?.[0]?.transcript?.trim() ?? '';
      const isFinal = Boolean((item as unknown as { isFinal?: boolean })?.isFinal);
      if (transcript) {
        onTranscript(transcript, isFinal);
      }
    };

    rec.onerror = (ev) => {
      updateSpeechState({ isListeningMic: false });
      activeRecognition = null;
      if (ev.error && ev.error !== 'no-speech' && ev.error !== 'aborted') {
        onError?.('No se pudo capturar el micrófono. Verifica los permisos o escribe tu pregunta.');
      }
    };

    rec.onend = () => {
      updateSpeechState({ isListeningMic: false });
      activeRecognition = null;
    };

    activeRecognition = rec;
    updateSpeechState({ isListeningMic: true });
    rec.start();
    return true;
  } catch {
    updateSpeechState({ isListeningMic: false });
    activeRecognition = null;
    onError?.('No se pudo iniciar el micrófono.');
    return false;
  }
}
