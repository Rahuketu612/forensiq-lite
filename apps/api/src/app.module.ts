import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CasesModule } from './modules/cases/cases.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RedFlagsModule } from './modules/red-flags/red-flags.module';
import { JwtAuthGuard, RolesGuard } from './modules/auth/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    HealthModule,
    AuthModule,
    CasesModule,
    TransactionsModule,
    RedFlagsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}