import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(repositoryRoot, '_site');
const requiredFiles = [
  '.nojekyll',
  'index.html',
  'en/index.html',
  'assets/styles.css',
  'reference/index.html',
  'openapi/index.html',
  'openapi/openapi.yaml',
  'architecture/index.html',
  'architecture/knowledge-graph.json',
  'architecture/meta.json',
  'architecture/config.json',
  'architecture/diff-overlay.json',
  'architecture/domain-graph.json',
];

const missing = [];
for (const relativePath of requiredFiles) {
  try {
    const file = await stat(join(outputRoot, relativePath));
    if (!file.isFile()) {
      missing.push(relativePath);
    }
  } catch {
    missing.push(relativePath);
  }
}

if (missing.length > 0) {
  throw new Error(`Missing portal files: ${missing.join(', ')}`);
}

const graph = await readFile(
  join(outputRoot, 'architecture', 'knowledge-graph.json'),
  'utf8',
);
if (/\/home\/|\/Users\/|[A-Za-z]:\\/.test(graph)) {
  throw new Error('Published graph contains an absolute local path.');
}

const architectureIndex = await readFile(
  join(outputRoot, 'architecture', 'index.html'),
  'utf8',
);
if (!architectureIndex.includes('./assets/')) {
  throw new Error('Architecture viewer does not use portable relative assets.');
}

const openApiIndex = await readFile(
  join(outputRoot, 'openapi', 'index.html'),
  'utf8',
);
if (
  openApiIndex.includes('Redoc.hydrate(__redoc_state, container);') ||
  !openApiIndex.includes('container.replaceChildren();') ||
  !openApiIndex.includes('../assets/favicon.svg')
) {
  throw new Error('OpenAPI docs lack client rendering or the shared favicon.');
}

const graphData = JSON.parse(graph);
if (
  !Array.isArray(graphData.nodes) ||
  graphData.nodes.length === 0 ||
  !Array.isArray(graphData.edges) ||
  graphData.edges.length === 0
) {
  throw new Error('Published knowledge graph is empty or malformed.');
}

console.log(
  `Portal valid: ${String(graphData.nodes.length)} graph nodes and ${String(graphData.edges.length)} edges.`,
);
