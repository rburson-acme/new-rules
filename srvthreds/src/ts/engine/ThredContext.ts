import { Address, ExpressionContext } from '../thredlib/index.js';

export class ThredContext implements ExpressionContext {
  readonly thredId: string | undefined;
  private readonly scope: Record<string, any>;
  private uniqueParticipants: Set<string>;

  constructor(params?: { thredId: string; scope?: Record<string, any>; permissions?: any; participantIds?: string[] }) {
    this.thredId = params?.thredId ?? undefined;
    this.scope = params?.scope || {};
    this.uniqueParticipants = new Set<string>(params?.participantIds || []);
  }

  // @todo keep every 'instance' of local + it's reaction if we need to time travel
  setLocal(name: string, value: any) {
    this.scope[name] = value;
  }

  getLocal(name: string) {
    return this.scope[name];
  }

  getThredId(): string | undefined {
    return this.thredId;
  }

  hasParticipant(name: string): boolean {
    return this.uniqueParticipants.has(name);
  }

  getParticipantAddresses() {
    return [...this.uniqueParticipants];
  }

  addParticipantIds(participantIds: string | string[]) {
    if (!participantIds) return;
    if (Array.isArray(participantIds)) {
      participantIds.forEach((participantId) => this.uniqueParticipants.add(participantId));
    } else if (typeof participantIds === 'string') {
      this.uniqueParticipants.add(participantIds);
    }
  }

  getState() {
    return {
      thredId: this.thredId,
      scope: this.scope,
      participantIds: Array.from(this.uniqueParticipants),
    };
  }

  static fromState(state: any): ThredContext {
    const { thredId, scope, participantIds } = state;
    return new ThredContext({ thredId, scope, participantIds });
  }
}
