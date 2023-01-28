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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';
import { LocalAuthGuard } from './local.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  private readonly jwtName = this.configService.get('JWT_NAME');
  private readonly isProduction =
    this.configService.get('NODE_ENV') === 'production';

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const loginResponse = await this.authService.login(loginDto);
    const { token, ...rest } = loginResponse;

    if (rest.success) {
      res.cookie(this.jwtName, token, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
        secure: this.isProduction,
      });
    }

    return rest;
  }

  @Post('/register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() req: Request) {
    // find any user data
    return req.user;
  }
}
