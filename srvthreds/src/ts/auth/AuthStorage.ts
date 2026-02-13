import { Storage, Types } from '../storage/Storage.js';
import { AuthStorageOps } from './AuthStorageOps.js';

export class AuthStorage implements AuthStorageOps {
  constructor(private storage: Storage) {}

  /* 
    JTI = JWT ID, a unique identifier for the token
    Store the refresh token with an expiration time
  */
  async saveRefreshToken(jti: string, participantId: string, expSecs: number): Promise<void> {
    await this.storage.setKey({ type: Types.RefreshTokens, key: jti, value: participantId, expSecs });
  }

  /*
    Remove the refresh token from storage
  */
  async revokeRefreshToken(jti: string): Promise<void> {
    await this.storage.deleteKey({ type: Types.RefreshTokens, key: jti });
  }

  /*
    Check if the refresh token is revoked and if not, verify it belongs to the participant
  */
  async verifyRefreshToken(jti: string, participantId: string): Promise<boolean> {
    const _participantId = await this.storage.getKey({ type: Types.RefreshTokens, key: jti });
    return _participantId === participantId;
  }

  /*
    @TODO
    Get all refresh tokens for a participant (for logout from all devices)
  */
  async getRefreshTokensForParticipant(participantId: string): Promise<string[]> {
    // return this.storage.getKeysByValue(Types.RefreshTokens, participantId);
    return [];
  }
}
