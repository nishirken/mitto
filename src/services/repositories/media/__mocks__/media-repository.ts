import { vi } from 'vitest';
import type { IMediaRepository } from '../media-repository';

export class MockMediaRepository implements IMediaRepository {
  applyMessagesMedia = vi.fn(async () => {});
  applyMedia = vi.fn(async () => null);
}
