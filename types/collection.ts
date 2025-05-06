export interface Collection {
  name: string;
  documentCount: number;
  metadata?: Record<string, unknown>;
}
