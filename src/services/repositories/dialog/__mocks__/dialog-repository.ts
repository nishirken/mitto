import { vi } from 'vitest';
import type { IDialogRepository } from '../dialog-repository';

export class MockDialogRepository implements IDialogRepository {
  applyDialogsResponse = vi.fn(async () => {});
  applyReadInbox = vi.fn(async () => {});
  applyReadOutbox = vi.fn(async () => {});
}
