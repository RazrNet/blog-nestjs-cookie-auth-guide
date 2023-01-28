import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CookieOptions } from 'express';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private readonly isProduction =
    this.configService.get('NODE_ENV') === 'production';

  private readonly accessTokenSecret = this.configService.get(
    'ACCESS_TOKEN_SECRET',
  );
  private readonly accessTokenExpiresIn = this.configService.get(
    'ACCESS_TOKEN_EXPIRES_IN',
  );

  private readonly refreshTokenSecret = this.configService.get(
    'REFRESH_TOKEN_SECRET',
  );
  private readonly refreshTokenExpiresIn = this.configService.get(
    'REFRESH_TOKEN_EXPIRES_IN',
  );

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Partial<User> | null> {
    const { password, ...user } = await this.userRepository
      .createQueryBuilder()
      .select('*')
      .where('email = :email', { email })
      .getRawOne<User>();

    if (!user) {
      return null;
    }

    const isPasswordCorrect = await bcrypt.compare(pass, password);

    if (!isPasswordCorrect) {
      return null;
    }

    return user;
  }

  getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      signed: true,
      sameSite: 'strict',
      secure: this.isProduction,
    };
  }

  async login(loginDto: LoginDto): Promise<{
    message: string;
    accessToken?: string;
    refreshToken?: string;
    success: boolean;
  }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const accessToken = this.jwtService.sign(
      { sub: user.id, user },
      {
        secret: this.accessTokenSecret,
        expiresIn: this.accessTokenExpiresIn,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.refreshTokenSecret,
        expiresIn: this.refreshTokenExpiresIn,
      },
    );

    return {
      message: 'Login success',
      accessToken,
      refreshToken,
      success: true,
    };
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; success: boolean }> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const savedUser = await this.userRepository.save({
      email: registerDto.email,
      password: hashedPassword,
    });

    if (!savedUser) {
      return {
        message: 'Registration failed',
        success: false,
      };
    }

    return {
      message: 'Registration successful',
      success: true,
    };
  }
}
