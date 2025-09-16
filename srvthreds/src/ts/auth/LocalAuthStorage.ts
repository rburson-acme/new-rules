import { Storage, Types } from '../storage/Storage.js';
import { AuthStorageOps } from './AuthStorageOps.js';

export class LocalAuthStorage implements AuthStorageOps {
  private authorizedTokens = process.env.AUTHORIZED_TOKENS ? process.env.AUTHORIZED_TOKENS.split(',') : [];

  /* 
    JTI = JWT ID, a unique identifier for the token
    Store the refresh token with an expiration time
  */
  async saveRefreshToken(jti: string, participantId: string, expSecs: number): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /*
    Remove the refresh token from storage
  */
  async revokeRefreshToken(jti: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /*
    Check if the refresh token is revoked and if not, verify it belongs to the participant
  */
  async verifyRefreshToken(jti: string, participantId: string): Promise<boolean> {
    return this.authorizedTokens.includes(jti);
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
