import { vi } from 'vitest';
import type { IMediaFileService } from '../media-file-service';

export class MockMediaFileService implements IMediaFileService {
  url = vi.fn(async (): Promise<string | null> => null);
  dispose = vi.fn(() => {});
}
