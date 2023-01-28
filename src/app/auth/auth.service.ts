import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Partial<User> | null> {
    const { password, ...user } = await this.userRepository.findOne({
      select: ['id', 'email', 'password'],
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordCorrect = await bcrypt.compare(pass, password);

    if (!isPasswordCorrect) {
      return null;
    }

    return user;
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ message: string; token?: string; success: boolean }> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const token = this.jwtService.sign({ sub: user.id });

    return {
      message: 'Login success',
      token,
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
