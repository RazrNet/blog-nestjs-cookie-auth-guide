import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Response, NextFunction } from 'express';

import type { CustomRequest } from '../../types';
import { UserService } from '../users/user.service';
import { AuthService } from './auth.service';

@Injectable()
export class CookiesMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  private readonly accessTokenName =
    this.configService.get('ACCESS_TOKEN_NAME');
  private readonly accessTokenSecret = this.configService.get(
    'ACCESS_TOKEN_SECRET',
  );
  private readonly accessTokenExpiresIn = this.configService.get(
    'ACCESS_TOKEN_EXPIRES_IN',
  );

  private readonly refreshTokenName =
    this.configService.get('REFRESH_TOKEN_NAME');
  private readonly refreshTokenSecret = this.configService.get(
    'REFRESH_TOKEN_SECRET',
  );
  private readonly refreshTokenExpiresIn = this.configService.get(
    'REFRESH_TOKEN_EXPIRES_IN',
  );

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    const accessToken = req.signedCookies[this.accessTokenName];
    const refreshToken = req.signedCookies[this.refreshTokenName];

    req.isAuthenticated = false;
    req.user = null;

    if (accessToken) {
      try {
        const { user } = this.jwtService.verify(accessToken, {
          secret: this.accessTokenSecret,
        });
        // access_token is valid

        req.user = user;
        req.isAuthenticated = true;
        return next();
      } catch (e) {
        // access_token is expired or invalid
        res.clearCookie(this.accessTokenName, {
          ...this.authService.getCookieOptions(),
          expires: new Date(Date.now() - 1),
        });
      }
    }

    if (refreshToken) {
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.refreshTokenSecret,
        });
        // refresh_token is valid

        const user = await this.userService.findOne(payload.sub);

        // generate new access token
        const newAccessToken = this.jwtService.sign(
          { sub: user.id, user },
          {
            secret: this.accessTokenSecret,
            expiresIn: this.accessTokenExpiresIn,
          },
        );

        // generate new refresh token
        const newRefreshToken = this.jwtService.sign(
          { sub: user.id },
          {
            secret: this.refreshTokenSecret,
            expiresIn: this.refreshTokenExpiresIn,
          },
        );

        // set new access token
        res.cookie(
          this.accessTokenName,
          newAccessToken,
          this.authService.getCookieOptions(),
        );

        // set new refresh token
        res.cookie(
          this.refreshTokenName,
          newRefreshToken,
          this.authService.getCookieOptions(),
        );

        req.user = user;
        req.isAuthenticated = true;
        return next();
      } catch (e) {
        // refresh_token is expired or invalid
        res.clearCookie(this.refreshTokenName, {
          ...this.authService.getCookieOptions(),
          expires: new Date(Date.now() - 1),
        });
      }
    }

    return next();
  }
}
