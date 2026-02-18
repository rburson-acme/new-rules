export interface Transaction {
  readonly isComplete: boolean;
  execute(): Promise<any[]>;
  getResultAt<T = any>(index: number): T;
  getResultAsJsonAt<T = any>(index: number): T | undefined;
}
