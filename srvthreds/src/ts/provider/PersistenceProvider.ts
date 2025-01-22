import { Persistence } from "../persistence/Persistence";

export interface PersistenceProvider {

    getInstance(dbname?: string): Persistence;
    connect(): Promise<void>;
    disconnect(): Promise<void>;

}