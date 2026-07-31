import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(repositoryRoot, '_site');
const binaryExtension = process.platform === 'win32' ? '.cmd' : '';

function localBinary(name) {
  return join(
    repositoryRoot,
    'node_modules',
    '.bin',
    `${name}${binaryExtension}`,
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${String(result.status)}`);
  }
}

async function makeRedocClientRendered() {
  const redocPath = join(outputRoot, 'openapi', 'index.html');
  const redocHtml = await readFile(redocPath, 'utf8');
  const hydrationCall = 'Redoc.hydrate(__redoc_state, container);';
  const clientRenderCall = [
    'container.replaceChildren();',
    '      Redoc.init(',
    '        __redoc_state.spec.data,',
    '        __redoc_state.options,',
    '        container,',
    '      );',
  ].join('\n      ');

  if (!redocHtml.includes(hydrationCall)) {
    throw new Error('Unexpected Redoc output: hydration call was not found.');
  }

  const clientRenderedHtml = redocHtml
    .replace(hydrationCall, clientRenderCall)
    .replace(
      '</head>',
      '  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml" />\n</head>',
    );

  await writeFile(redocPath, clientRenderedHtml);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(join(repositoryRoot, 'docs-site'), outputRoot, { recursive: true });

run(localBinary('typedoc'), [
  '--options',
  'typedoc.json',
  '--out',
  '_site/reference',
  '--readme',
  'none',
]);

await mkdir(join(outputRoot, 'openapi'), { recursive: true });
run(
  localBinary('redocly'),
  [
    'build-docs',
    'openapi/openapi.yaml',
    '--output',
    '_site/openapi/index.html',
  ],
  {
    env: {
      REDOCLY_TELEMETRY: 'off',
      REDOCLY_SUPPRESS_UPDATE_NOTICE: 'true',
    },
  },
);
await makeRedocClientRendered();
await cp(
  join(repositoryRoot, 'openapi', 'openapi.yaml'),
  join(outputRoot, 'openapi', 'openapi.yaml'),
);

run(process.execPath, [join(repositoryRoot, 'scripts', 'build-ua-viewer.mjs')]);
