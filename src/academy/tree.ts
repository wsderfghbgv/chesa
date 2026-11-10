/**
 * Árbol de variantes de una apertura: fusiona todas las líneas compiladas por posición, de forma
 * que cada jugada distinta es un nodo y las transposiciones/prefijos comunes se comparten.
 */
import { fenKey } from '../chess/utils';
import type { CompiledOpening, TreeNode } from './types';

export interface VariantTree {
  root: TreeNode;
  /** Búsqueda rápida por clave de posición (se toma el primer nodo; transposiciones son escasas). */
  byId: Map<string, TreeNode>;
}

const treeCache = new Map<string, VariantTree>();

export function buildTree(opening: CompiledOpening): VariantTree {
  const hit = treeCache.get(opening.id);
  if (hit) return hit;
  const root: TreeNode = {
    key: 'root',
    ply: 0,
    san: '',
    sanEs: '',
    uci: '',
    fen: opening.compiled[0].fens[0],
    mover: 'b',
    parent: null,
    children: [],
    lineIds: opening.compiled.map((l) => l.id),
    isMain: true,
  };
  const byId = new Map<string, TreeNode>([['root', root]]);
  opening.compiled.forEach((line, li) => {
    let node = root;
    for (const mv of line.moves) {
      let child = node.children.find((c) => c.uci === mv.uci);
      if (!child) {
        child = {
          key: `${node.key}/${mv.uci}`,
          ply: mv.ply,
          san: mv.san,
          sanEs: mv.sanEs,
          uci: mv.uci,
          fen: mv.fenAfter,
          mover: mv.mover,
          parent: node,
          children: [],
          lineIds: [],
          isMain: li === 0,
        };
        node.children.push(child);
        byId.set(child.key, child);
      }
      if (!child.lineIds.includes(line.id)) child.lineIds.push(line.id);
      if (li === 0) child.isMain = true;
      node = child;
    }
  });
  const tree = { root, byId };
  treeCache.set(opening.id, tree);
  return tree;
}

/** Camino de nodos (sin la raíz) desde la raíz hasta `node`. */
export function pathTo(node: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  for (let n: TreeNode | null = node; n && n.parent; n = n.parent) out.unshift(n);
  return out;
}

/** Nodo del árbol que corresponde a una secuencia UCI (null si sale de la teoría). */
export function followUci(tree: VariantTree, ucis: string[]): { node: TreeNode; depth: number } {
  let node = tree.root;
  let depth = 0;
  for (const u of ucis) {
    const c = node.children.find((x) => x.uci === u);
    if (!c) break;
    node = c;
    depth++;
  }
  return { node, depth };
}

/** Hijos teóricos con la principal primero. */
export function orderedChildren(node: TreeNode): TreeNode[] {
  return [...node.children].sort((a, b) => Number(b.isMain) - Number(a.isMain));
}

export function positionKey(fen: string): string {
  return fenKey(fen);
}

/** Primera hoja siguiendo siempre la línea principal desde `node`. */
export function mainContinuation(node: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  let cur = node;
  while (cur.children.length) {
    cur = orderedChildren(cur)[0];
    out.push(cur);
  }
  return out;
}
