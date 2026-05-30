import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@forensiq/database';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      message?: string;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly startTime: number;

  constructor(private readonly configService: ConfigService) {
    this.startTime = Date.now();
  }

  async check(): Promise<HealthResponse> {
    const services = {
      database: await this.checkDatabase(),
    };

    const allUp = Object.values(services).every((s) => s.status === 'up');
    const anyDown = Object.values(services).some((s) => s.status === 'down');

    let status: 'ok' | 'degraded' | 'unhealthy' = 'ok';
    if (anyDown) status = 'unhealthy';
    else if (!allUp) status = 'degraded';

    return {
      status,
      version: this.configService.get<string>('npm_package_version', '1.0.0'),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      services,
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down' | 'degraded'; latency?: number; message?: string }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }
}