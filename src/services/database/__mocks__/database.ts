import { Database } from '../database';

let n = 0;

// A real Dexie database on fake-indexeddb — there is no mock to write now that tables are
// part of the contract. Each call gets its own name so tests share no state and need no
// teardown.
export function createTestDatabase(): Database {
  return new Database(`mitto-test-${++n}`);
}
