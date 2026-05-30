import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

const DEV_BYPASS_TOKEN = 'dev-bypass-token';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check for dev bypass token
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    
    if (authHeader === `Bearer ${DEV_BYPASS_TOKEN}`) {
      // Dev bypass mode - attach fake user
      (request as any).user = {
        id: 'dev-bypass-user',
        email: 'auditor@forensiq.local',
        name: 'Dev Auditor',
        role: 'AUDITOR',
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      throw err;
    }
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}