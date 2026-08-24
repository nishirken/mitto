import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StoredSettings } from 'services/database';
import { createTestDatabase } from 'services/database/__mocks__/database';
import { DEFAULT_SETTINGS, SettingsStore } from './settings-store';

async function createStore(stored: StoredSettings | null = null) {
  const db = createTestDatabase();
  // Seeded through the table so the `setSettings` spy below only sees the store's own write.
  if (stored) await db.meta.put({ key: 'settings', value: stored });
  const setSettings = vi.spyOn(db, 'setSettings');

  return { db, setSettings, store: new SettingsStore(db) };
}

describe('SettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to defaults when nothing is stored', async () => {
    const { store } = await createStore(null);

    await store.init();

    expect(store.settings.get()).toEqual(DEFAULT_SETTINGS);
    expect(store.pagedScroll('conversations')).toBe(false);
    expect(store.pagedScroll('messages')).toBe(false);
  });

  it('loads stored settings', async () => {
    const { store } = await createStore({
      conversations: { pagedScroll: true },
      messages: { pagedScroll: true },
    });

    await store.init();

    expect(store.pagedScroll('conversations')).toBe(true);
    expect(store.pagedScroll('messages')).toBe(true);
  });

  it('fills missing sections with defaults', async () => {
    const { store } = await createStore({ messages: { pagedScroll: true } } as StoredSettings);

    await store.init();

    expect(store.settings.get()).toEqual({
      conversations: { pagedScroll: false },
      messages: { pagedScroll: true },
    });
  });

  it('writes a section without touching the other', async () => {
    const { setSettings, store } = await createStore(null);
    await store.init();

    await store.setPagedScroll('messages', true);

    expect(store.settings.get()).toEqual({
      conversations: { pagedScroll: false },
      messages: { pagedScroll: true },
    });
    expect(setSettings).toHaveBeenCalledWith({
      conversations: { pagedScroll: false },
      messages: { pagedScroll: true },
    });
  });

  it('does not mutate the defaults', async () => {
    const { store } = await createStore(null);
    await store.init();

    await store.setPagedScroll('conversations', true);

    expect(DEFAULT_SETTINGS).toEqual({
      conversations: { pagedScroll: false },
      messages: { pagedScroll: false },
    });
  });
});
