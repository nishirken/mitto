import { signal } from '@lit-labs/signals';
import type { IDatabase, StoredSettings } from 'services/database';

export const DEFAULT_SETTINGS: StoredSettings = {
  conversations: { pagedScroll: false },
  messages: { pagedScroll: false },
};

export type SettingsSection = keyof StoredSettings;

export class SettingsStore {
  readonly settings = signal<StoredSettings>(DEFAULT_SETTINGS);

  constructor(private readonly _storage: IDatabase) {}

  async init(): Promise<void> {
    const stored = await this._storage.getSettings();
    if (stored) this.settings.set({ ...DEFAULT_SETTINGS, ...stored });
  }

  pagedScroll(section: SettingsSection): boolean {
    return this.settings.get()[section].pagedScroll;
  }

  async setPagedScroll(section: SettingsSection, pagedScroll: boolean): Promise<void> {
    const next = { ...this.settings.get(), [section]: { pagedScroll } };
    this.settings.set(next);
    await this._storage.setSettings(next);
  }
}
