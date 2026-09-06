import type { Signal } from '@lit-labs/signals';

export interface BackfillSource {
  readonly hasMore: Signal.State<boolean>;
  loadMore(): Promise<void>;
}

/**
 * Fils the viewport screen
 */
export class ViewportBackfill {
  private _controller = new AbortController();
  private _pending?: Promise<void>;

  constructor(
    private readonly _source: BackfillSource,
    private readonly _maxRounds: number = 10,
  ) {}

  track(load: Promise<void>): void {
    this._pending = load;
  }

  /**
   * Run the loop unless the next run is called and cancels the current loop
   */
  async run(covered: boolean): Promise<boolean> {
    this._controller.abort();
    const controller = new AbortController();
    this._controller = controller;

    await this._pending;

    if (controller.signal.aborted || covered) return false;

    let rounds = 0;

    while (rounds < this._maxRounds && !controller.signal.aborted && this._source.hasMore.get()) {
      this._pending = this._source.loadMore().catch(() => {});
      await this._pending;
      rounds++;
    }

    return rounds > 0 && !controller.signal.aborted;
  }

  dispose(): void {
    this._controller.abort();
  }
}
