export interface Transaction {
    execute(): Promise<void>;
}
