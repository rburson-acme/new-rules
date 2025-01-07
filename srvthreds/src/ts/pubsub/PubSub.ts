export interface PubSub {
  publish(topic: string, message: Record<string, any>): Promise<void>;
  subscribe(topics: string[], notifyFn: (topic: string, message: Record<string, any>) => void): Promise<void>;
  disconnect(): Promise<void>;
}