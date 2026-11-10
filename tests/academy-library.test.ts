import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { OPENING_DEFS } from '../src/academy/library';
import type { Note, OpeningDef } from '../src/academy/types';

const noteWhy = (n: Note | undefined): string => (n === undefined ? '' : typeof n === 'string' ? n : n[0]);

function playSan(moves: string[]): Chess | null {
  const c = new Chess();
  for (const m of moves) {
    try {
      c.move(m);
    } catch {
      return null;
    }
  }
  return c;
}
const split = (s: string) => s.trim().split(/\s+/).filter(Boolean);

describe('Biblioteca de aperturas: integridad y legalidad', () => {
  it('tiene identificadores únicos y datos obligatorios completos', () => {
    const ids = new Set<string>();
    const lineIds = new Set<string>();
    for (const o of OPENING_DEFS) {
      expect(ids.has(o.id), `id duplicado ${o.id}`).toBe(false);
      ids.add(o.id);
      expect(o.eco, o.id).toMatch(/^[A-E]\d\d/);
      expect(o.name.length, o.id).toBeGreaterThan(3);
      expect(o.history.length, `${o.id} historia`).toBeGreaterThan(150);
      expect(o.frequency.length, `${o.id} frecuencia`).toBeGreaterThan(10);
      expect(o.goals.length, `${o.id} objetivos`).toBeGreaterThanOrEqual(3);
      expect(o.plans.w.length, `${o.id} plan blancas`).toBeGreaterThanOrEqual(2);
      expect(o.plans.b.length, `${o.id} plan negras`).toBeGreaterThanOrEqual(2);
      expect(o.structures.length, `${o.id} estructuras`).toBeGreaterThanOrEqual(1);
      expect(o.keySquares.length, `${o.id} casillas`).toBeGreaterThanOrEqual(3);
      expect(o.development.length, `${o.id} desarrollo`).toBeGreaterThanOrEqual(3);
      expect(o.commonMistakes.length, `${o.id} errores`).toBeGreaterThanOrEqual(2);
      expect(o.traps.length, `${o.id} trampas`).toBeGreaterThanOrEqual(1);
      expect(o.famousGames.length, `${o.id} partidas`).toBeGreaterThanOrEqual(1);
      expect(o.lines.length, `${o.id} variantes`).toBeGreaterThanOrEqual(3);
      expect(o.lines[0].kind, `${o.id} primera línea`).toBe('principal');
      for (const l of o.lines) {
        expect(lineIds.has(l.id), `línea duplicada ${l.id}`).toBe(false);
        lineIds.add(l.id);
      }
      for (const ks of o.keySquares) expect(ks.square, o.id).toMatch(/^[a-h][1-8]$/);
      for (const g of o.famousGames) {
        expect(g.year).toBeGreaterThan(1450);
        expect(g.year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it('todas las líneas, variantes y trampas son legales según chess.js', () => {
    for (const o of OPENING_DEFS) {
      for (const l of o.lines) {
        const mv = split(l.moves);
        expect(playSan(mv), `${o.id}/${l.id} contiene una jugada ilegal: ${l.moves}`).not.toBeNull();
        expect(mv.length, `${l.id} demasiado corta`).toBeGreaterThanOrEqual(4);
      }
      for (const t of o.traps) {
        const mv = split(t.moves);
        expect(playSan(mv), `${o.id}/trampa ${t.id} ilegal: ${t.moves}`).not.toBeNull();
        expect(mv.length, `${t.id} mistakePly fuera de rango`).toBeGreaterThanOrEqual(t.mistakePly);
        const moverOfMistake = t.mistakePly % 2 === 1 ? 'w' : 'b';
        expect(moverOfMistake, `${t.id}: la jugada errónea debe ser de la víctima`).toBe(t.victim);
        expect(t.explanation.length).toBeGreaterThan(80);
      }
    }
  });

  it('la línea principal está completamente anotada y las claves de notas existen', () => {
    for (const o of OPENING_DEFS) {
      const main = o.lines[0];
      const n = split(main.moves).length;
      expect(n, `${o.id} línea principal corta`).toBeGreaterThanOrEqual(12);
      for (let ply = 1; ply <= n; ply++) {
        const why = noteWhy(main.notes?.[ply]);
        expect(why.length, `${o.id} ply ${ply} sin anotación suficiente`).toBeGreaterThanOrEqual(70);
      }
      for (const l of o.lines) {
        const len = split(l.moves).length;
        for (const k of Object.keys(l.notes ?? {})) {
          expect(Number(k), `${l.id} nota fuera de rango`).toBeLessThanOrEqual(len);
        }
      }
    }
  });

  it('cubre las categorías y las aperturas imprescindibles', () => {
    const cats = new Set(OPENING_DEFS.map((o) => o.category));
    for (const c of ['abiertas', 'semiabiertas', 'cerradas', 'semicerradas', 'flanco', 'defensas', 'gambitos']) {
      expect(cats.has(c as OpeningDef['category']), `falta categoría ${c}`).toBe(true);
    }
    const text = OPENING_DEFS.map((o) => o.name.toLowerCase()).join(' | ');
    for (const k of ['italiana', 'española', 'siciliana', 'francesa', 'caro-kann', 'india de rey', 'gambito de dama', 'londres', 'catalana', 'escandinava', 'nimzoindia']) {
      expect(text.includes(k), `falta ${k}`).toBe(true);
    }
    expect(OPENING_DEFS.length).toBeGreaterThanOrEqual(30);
  });
});

