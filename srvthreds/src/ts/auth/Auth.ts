export interface AuthResult {
  accessResult: { accessToken: string; expires: number };
  refreshResult: { refreshToken: string; expires: number };
}

export interface TokenPayload {
  participantId: string;
  jti?: string;
}

export interface Auth {
  login(participantId: string, password: string): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<{ accessToken: string; expires: number }>;
  validateAccessToken(token: string): Promise<TokenPayload>;
  logout(refreshToken: string): Promise<void>;
}
