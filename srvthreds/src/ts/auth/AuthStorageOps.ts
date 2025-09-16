export interface AuthStorageOps {
  /* 
    JTI = JWT ID, a unique identifier for the token
    Store the refresh token with an expiration time
  */
  saveRefreshToken(jti: string, participantId: string, expSecs: number): Promise<void>;

  /*
    Remove the refresh token from storage
  */
  revokeRefreshToken(jti: string): Promise<void>;

  /*
    Check if the refresh token is revoked and if not, verify it belongs to the participant
  */
  verifyRefreshToken(jti: string, participantId: string): Promise<boolean>;

  /*
    @TODO
    Get all refresh tokens for a participant (for logout from all devices)
  */
  getRefreshTokensForParticipant(participantId: string): Promise<string[]>;
}
