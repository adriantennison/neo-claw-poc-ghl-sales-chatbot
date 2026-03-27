import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(
      EVENTS_FILE,
      JSON.stringify({ events: [], metrics: { leads: 0, followUpsTriggered: 0 } }, null, 2)
    );
  }
}

export async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(EVENTS_FILE, 'utf8');
  return JSON.parse(raw);
}

export async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(EVENTS_FILE, JSON.stringify(store, null, 2));
}

export async function appendEvent(event) {
  const store = await readStore();
  store.events.unshift(event);
  store.events = store.events.slice(0, 100);
  await writeStore(store);
  return store;
}

export async function updateMetrics(updater) {
  const store = await readStore();
  store.metrics = updater(store.metrics || { leads: 0, followUpsTriggered: 0 });
  await writeStore(store);
  return store.metrics;
}
