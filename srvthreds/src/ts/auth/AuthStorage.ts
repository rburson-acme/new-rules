import { Storage, Types } from '../storage/Storage.js';

export class AuthStorage {
  constructor(private storage: Storage) {}

  async saveRefreshToken(jti: string, participantId: string, expSecs: number): Promise<void> {
    await this.storage.setKey(Types.RefreshTokens, jti, participantId, expSecs);
  }

  revokeRefreshToken(jti: string): Promise<void> {
    return this.storage.deleteKey(Types.RefreshTokens, jti);
  }

  async verifyRefreshToken(jti: string, participantId: string): Promise<boolean> {
    const _participantId = await this.storage.getKey(Types.RefreshTokens, jti);
    return _participantId === participantId;
  }

}
