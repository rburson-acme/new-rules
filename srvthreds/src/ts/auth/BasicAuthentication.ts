import { UserController } from '../persistence/controllers/UserController.js';
import { Authentication, AuthResult, TokenPayload } from './Authentication.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Id } from '../thredlib/index.js';
import { AuthStorageOps } from './AuthStorageOps.js';

const DEFAULT_EXPIRE_TIME = 3600; // in seconds, 1 hour
const DEFAULT_REFRESH_EXPIRE_TIME = 36000; // in seconds, 10 hours

const EXPIRE_TIME = process.env.JWT_EXPIRE_TIME ? parseInt(process.env.JWT_EXPIRE_TIME) : DEFAULT_EXPIRE_TIME;
const REFRESH_TOKEN_EXPIRE_TIME = process.env.REFRESH_TOKEN_EXPIRE_TIME
  ? parseInt(process.env.REFRESH_TOKEN_EXPIRE_TIME)
  : DEFAULT_REFRESH_EXPIRE_TIME;

export class BasicAuthentication implements Authentication {
  private static instance: BasicAuthentication;

  private constructor(private authStorageOps: AuthStorageOps) {}

  public static initialize(authStorage: AuthStorageOps) {
    if (!BasicAuthentication.instance) BasicAuthentication.instance = new BasicAuthentication(authStorage);
  }

  public static getInstance(): BasicAuthentication {
    if (!BasicAuthentication.instance) throw new Error('BasicAuth not initialized');
    return BasicAuthentication.instance;
  }

  public static async hashPassword(password: string): Promise<string> {
    const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  }

  async login(participantId: string, password: string): Promise<AuthResult> {
    const user = await UserController.get().getUserByHandle(participantId);
    if (!user) {
      throw new Error('Invalid username');
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      const accessResult = await this.getAccessToken({ participantId });
      const refreshResult = await this.getRefreshToken({ participantId });
      await this.authStorageOps.saveRefreshToken(refreshResult.jti, participantId, REFRESH_TOKEN_EXPIRE_TIME);
      return { accessResult, refreshResult };
    } else {
      throw new Error('Invalid password');
    }
  }

  validateAccessToken(accessToken: string): Promise<TokenPayload> {
    return new Promise<TokenPayload>((resolve, reject) => {
      jwt.verify(accessToken, process.env.JWT_SECRET as jwt.Secret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as TokenPayload);
        }
      });
    });
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; expires: number }> {
    try {
      const { participantId, jti } = await this.decodeAndVerifyRefreshToken(refreshToken);
      if (await this.isKnownRefreshToken(jti!, participantId)) {
        throw new Error('Refresh token does not match participant or has been revoked');
      }
      const accessResult = await this.getAccessToken({ participantId });
      return accessResult;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        await this.revokeRefreshToken(err.jti, err.participantId);
        throw new Error('Refresh token has expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const { participantId, jti } = await this.decodeAndVerifyRefreshToken(refreshToken);
      await this.revokeRefreshToken(jti!, participantId);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        await this.revokeRefreshToken(err.jti, err.participantId);
        throw new Error('Refresh token has expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  private async isKnownRefreshToken(jti: string, participantId: string): Promise<boolean> {
    // Check if the refresh token is in the store
    return this.authStorageOps.verifyRefreshToken(jti, participantId);
  }

  private async revokeRefreshToken(jti: string, participantId: string): Promise<void> {
    return this.authStorageOps.revokeRefreshToken(jti);
  }

  private decodeAndVerifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
    return new Promise<TokenPayload>((resolve, reject) => {
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as jwt.Secret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as TokenPayload);
        }
      });
    });
  }

  private getAccessToken(payload: TokenPayload): Promise<{ accessToken: string; expires: number }> {
    // JWT_EXPIRE_TIME must be in seconds
    const expireSecs = EXPIRE_TIME;
    const expires = new Date(Date.now() + expireSecs * 1000).getTime();
    return new Promise<{ accessToken: string; expires: number }>((resolve, reject) => {
      jwt.sign(payload, process.env.JWT_SECRET as jwt.Secret, { expiresIn: expireSecs }, (err, accessToken) => {
        if (err) {
          reject(err);
        } else if (!accessToken) {
          reject(new Error('Access Token generation failed'));
        } else {
          resolve({ accessToken, expires });
        }
      });
    });
  }

  private getRefreshToken(payload: TokenPayload): Promise<{ refreshToken: string; expires: number; jti: string }> {
    // JWT_EXPIRE_TIME must be in seconds
    const expireSecs = REFRESH_TOKEN_EXPIRE_TIME;
    const expires = new Date(Date.now() + expireSecs * 1000).getTime();
    const jti = Id.generate();
    return new Promise<{ refreshToken: string; expires: number; jti: string }>((resolve, reject) => {
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
  }
}
