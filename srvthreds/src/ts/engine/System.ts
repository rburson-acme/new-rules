import { P } from 'vitest/dist/chunks/environment.C5eAp3K6';
import { Sessions } from '../sessions/Sessions';

export interface Process {
  shutdown: (delay: number) => Promise<void>;
}

export class System {
  private static instance: System;

  static getSessions(): Sessions {
    if (!System.instance) {
      throw new Error('System not initialized');
    }
    return System.instance.sessions;
  }

  static getPROC(): Process {
    if (!System.instance) {
      throw new Error('System not initialized');
    }
    return System.instance.PROC;
  }

  static initialize(sessions: Sessions, PROC: Process) {
    if (!System.instance) {
      System.instance = new System(sessions, PROC);
    } else {
      throw new Error('System already initialized');
    }
  }

  static isInitialized(): boolean {
    return !!System.instance;
  }

  private constructor(
    readonly sessions: Sessions,
    readonly PROC: Process,
  ) {}
}
