import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { LocalAuthGuard } from './local.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  private readonly accessTokenName =
    this.configService.get('ACCESS_TOKEN_NAME');
  private readonly refreshTokenName =
    this.configService.get('REFRESH_TOKEN_NAME');

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const loginResponse = await this.authService.login(loginDto);
    const { accessToken, refreshToken, ...rest } = loginResponse;

    if (rest.success) {
      res.cookie(
        this.accessTokenName,
        accessToken,
        this.authService.getCookieOptions(),
      );
      res.cookie(
        this.refreshTokenName,
        refreshToken,
        this.authService.getCookieOptions(),
      );
    }

    return rest;
  }

  @Post('/register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(AuthGuard)
  @Get('/me')
  me(@Req() req: Request) {
    return req.user;
  }
}
