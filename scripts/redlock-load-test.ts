/**
 * Load script that hammers concurrent DELETE(parent) + POST(child) against a
 * multi-instance Menu API (e.g. PM2 cluster) and reports orphan outcomes.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 npx tsx scripts/redlock-load-test.ts
 */
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const ROUNDS = Number(process.env.ROUNDS ?? '40');
const DELAY_MS = Number(process.env.SEED_PAUSE_MS ?? '10');

type CreateBody = { id: string };

async function createRoot(name: string): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/v1/menu`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (response.status !== 201) {
    throw new Error(`seed create failed: ${response.status}`);
  }
  const body = (await response.json()) as CreateBody;
  return Number(body.id);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRound(index: number): Promise<{
  deleteStatus: number;
  createStatus: number;
  treeStatus: number;
  orphan: boolean;
  winsDelete: boolean;
  winsCreate: boolean;
}> {
  const parentName = `LoadParent-${index}-${Date.now()}`;
  const childName = `LoadChild-${index}-${Date.now()}`;
  const parentId = await createRoot(parentName);
  await sleep(DELAY_MS);

  const [deleteResponse, createResponse] = await Promise.all([
    fetch(`${BASE_URL}/api/v1/menu/${parentId}`, { method: 'DELETE' }),
    fetch(`${BASE_URL}/api/v1/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: childName, relatedId: parentId }),
    }),
  ]);

  const treeResponse = await fetch(`${BASE_URL}/api/v1/menu`);
  let parentPresent = false;
  let childPresent = false;

  if (treeResponse.status === 200) {
    const tree = (await treeResponse.json()) as Array<{
      id: string;
      name: string;
      submenus?: Array<{ id: string; name: string }>;
    }>;
    parentPresent = tree.some((node) => node.id === String(parentId));
    childPresent = tree.some(
      (node) =>
        node.name === childName ||
        node.submenus?.some((child) => child.name === childName) === true,
    );
  }

  // GET 500 usually means an orphan broke tree integrity.
  const orphan =
    treeResponse.status === 500 ||
    (createResponse.status === 201 &&
      deleteResponse.status === 200 &&
      !parentPresent &&
      childPresent);

  return {
    deleteStatus: deleteResponse.status,
    createStatus: createResponse.status,
    treeStatus: treeResponse.status,
    orphan,
    winsDelete:
      deleteResponse.status === 200 && createResponse.status === 404 && !orphan,
    winsCreate:
      createResponse.status === 201 && parentPresent && childPresent && !orphan,
  };
}

async function main(): Promise<void> {
  console.log(
    JSON.stringify({
      baseUrl: BASE_URL,
      rounds: ROUNDS,
      message: 'starting redlock load test',
    }),
  );

  let orphans = 0;
  let winsDelete = 0;
  let winsCreate = 0;
  let conflicts = 0;
  let treeErrors = 0;

  for (let i = 0; i < ROUNDS; i += 1) {
    try {
      const result = await runRound(i);
      if (result.orphan) orphans += 1;
      if (result.winsDelete) winsDelete += 1;
      if (result.winsCreate) winsCreate += 1;
      if (
        result.deleteStatus === 200 &&
        result.createStatus === 201 &&
        !result.orphan &&
        !result.winsCreate
      ) {
        conflicts += 1;
      }
      if (result.treeStatus >= 500 && !result.orphan) {
        treeErrors += 1;
      }
    } catch (error) {
      treeErrors += 1;
      console.error(`round ${i} failed`, error);
    }
  }

  const summary = {
    rounds: ROUNDS,
    orphans,
    wins_delete: winsDelete,
    wins_create: winsCreate,
    conflicts,
    tree_errors: treeErrors,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (orphans > 0 || treeErrors > 0) {
    process.exitCode = 2;
  }
}

void main();
