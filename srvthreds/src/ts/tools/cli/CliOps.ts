import { Logger, Id } from '../../thredlib/index.js';
import { TokenPayload } from '../../auth/Auth.js';
import jwt from 'jsonwebtoken';

/**
 * CLI Operations class containing static methods for each CLI command.
 * Each method corresponds to a command-line operation, named using camelCase
 * conversion of the kebab-case operation name.
 */
export class CliOps {
  /**
   * Generate a refresh token
   * Corresponds to: generate-refresh-token
   *
   * @param participantId - The participant ID to include in the token payload
   * @param expireMins - Expiration time in minutes
   */
  static async generateRefreshToken(
    participantId: string,
    expireMins: number,
  ): Promise<{ refreshToken: string; expires: number; jti: string }> {
    try {
      if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error('REFRESH_TOKEN_SECRET environment variable is not set');
      }
      const expireSecs = expireMins * 60;
      const expires = new Date(Date.now() + expireSecs * 1000).getTime();
      const jti = Id.generate();
      const payload: TokenPayload = { participantId };
      return await new Promise<{ refreshToken: string; expires: number; jti: string }>((resolve, reject) => {
        jwt.sign(
          payload,
          process.env.REFRESH_TOKEN_SECRET as jwt.Secret,
          { expiresIn: expireSecs, jwtid: jti },
          (err, refreshToken) => {
            if (err) {
              reject(err);
            } else if (!refreshToken) {
              reject(new Error('Refresh Token generation failed'));
            } else {
              resolve({ refreshToken, expires, jti });
            }
          },
        );
      });
    } catch (error) {
      Logger.error('Failed to generate refresh token:', error);
      throw error;
    }
  }

  /**
   * Generate an access token
   * Corresponds to: generate-access-token
   *
   * @param participantId - The participant ID to include in the token payload
   * @param expireMins - Expiration time in minutes
   */
  static async generateAccessToken(
    participantId: string,
    expireMins: number,
  ): Promise<{ accessToken: string; expires: number; jti: string }> {
    try {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
      }
      const expireSecs = expireMins * 60;
      const expires = new Date(Date.now() + expireSecs * 1000).getTime();
      const jti = Id.generate();
      const payload: TokenPayload = { participantId };
      return await new Promise<{ accessToken: string; expires: number; jti: string }>((resolve, reject) => {
        jwt.sign(
          payload,
          process.env.JWT_SECRET as jwt.Secret,
          { expiresIn: expireSecs, jwtid: jti },
          (err, accessToken) => {
            if (err) {
              reject(err);
            } else if (!accessToken) {
              reject(new Error('Access Token generation failed'));
            } else {
              resolve({ accessToken, expires, jti });
            }
          },
        );
      });
    } catch (error) {
      Logger.error('Failed to generate access token:', error);
      throw error;
    }
  }
}
