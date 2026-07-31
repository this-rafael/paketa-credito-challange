import { performance } from 'node:perf_hooks';
import {
  buildMenuTree,
  type MenuTreeInputItem,
} from '../src/shared/tree/build-menu-tree.js';

function buildChain(size: number): MenuTreeInputItem[] {
  return Array.from({ length: size }, (_, index) => {
    const id = index + 1;
    return {
      id,
      name: `N${id}`,
      parentId: index === 0 ? null : index,
    };
  });
}

function run(size: number): void {
  const items = buildChain(size);
  const queryStarted = performance.now();
  // Simulated query cost: materialize the ordered list already in memory.
  const ordered = items.slice().sort((a, b) => a.id - b.id);
  const queryMs = performance.now() - queryStarted;

  const buildStarted = performance.now();
  const tree = buildMenuTree(ordered);
  const buildMs = performance.now() - buildStarted;

  console.log(
    JSON.stringify({
      node: process.version,
      size,
      queryMs: Number(queryMs.toFixed(3)),
      buildMs: Number(buildMs.toFixed(3)),
      roots: tree.length,
    }),
  );
}

for (const size of [1_000, 10_000, 100_000]) {
  run(size);
}
