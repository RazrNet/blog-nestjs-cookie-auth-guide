import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { CustomRequest } from '../../types';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CustomRequest>();

    const isAuthenticated = request.isAuthenticated;

    return isAuthenticated;
  }
}
