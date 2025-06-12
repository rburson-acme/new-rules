export interface Pub {
  publish(topic: string, message: Record<string, any>): Promise<void>;
  disconnect(): Promise<void>;
}
