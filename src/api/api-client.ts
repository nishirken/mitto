export interface ApiClient {
  send(query: Record<string, unknown>): Promise<unknown>;
  addEventListener(event: string, cb: (event: Record<string, unknown>) => void): void;
  removeEventListener(event: string, cb: (event: Record<string, unknown>) => void): void;
}
