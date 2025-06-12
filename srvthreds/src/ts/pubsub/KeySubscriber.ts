export interface KeySubscriber {
  subscribe(patterns: string[], notifyFn: (pattern: string, channel: string, message: any) => void): Promise<void>;
  unsubscribe(patterns: string[]): Promise<void>;
  disconnect(): Promise<void>;
}
