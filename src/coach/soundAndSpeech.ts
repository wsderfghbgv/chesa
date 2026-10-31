/**
 * Síntesis de efectos de sonido (Web Audio API) y voz pedagógica en español (Web Speech API).
 *
 * No requiere archivos de audio externos y degrada de forma segura en entornos de prueba
 * (jsdom / Node) donde `AudioContext` o `speechSynthesis` no estén disponibles.
 */

export type ChessSoundType =
  | 'move'
  | 'capture'
  | 'check'
  | 'castle'
  | 'promote'
  | 'gameOver'
  | 'success'
  | 'mistake';

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
      playTone(ctx, 290, 0.065, 'triangle', 0.11);
      break;
    case 'capture':
      playTone(ctx, 195, 0.08, 'sawtooth', 0.12);
      playTone(ctx, 145, 0.07, 'triangle', 0.1, 0.03);
      break;
    case 'check':
      playTone(ctx, 587.33, 0.11, 'sine', 0.14);
      playTone(ctx, 880, 0.16, 'sine', 0.14, 0.07);
      break;
    case 'castle':
      playTone(ctx, 270, 0.06, 'triangle', 0.11);
      playTone(ctx, 340, 0.07, 'triangle', 0.11, 0.07);
      break;
    case 'promote':
      playTone(ctx, 440, 0.09, 'sine', 0.12);
      playTone(ctx, 554.37, 0.09, 'sine', 0.12, 0.08);
      playTone(ctx, 659.25, 0.14, 'sine', 0.13, 0.16);
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

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function stopCoachSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignorado
  }
}

/**
 * Lee en voz alta una explicación del entrenador en español usando Web Speech API.
 */
export function speakCoachExplanation(text: string): boolean {
  if (!isSpeechSupported() || !text.trim()) return false;
  try {
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[✓✗★!?\u2600-\u26FF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.03;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices?.() ?? [];
    const esVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('es') && v.localService) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

