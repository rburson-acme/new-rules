export interface Transaction {
  // Starts a new transaction
  start(): Promise<void>;
  // Commits the current transaction
  commit(): Promise<void>;
  // Rolls back the current transaction
  rollback(): Promise<void>;
}
