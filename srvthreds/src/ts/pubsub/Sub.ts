export interface Sub {
  subscribe(topics: string[], notifyFn: (topic: string, message: Record<string, any>) => void): Promise<void>;
  unsubscribe(topics: string[]): Promise<void>;
  disconnect(): Promise<void>;
}
