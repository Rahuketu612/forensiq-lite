import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CasesModule } from './modules/cases/cases.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RedFlagsModule } from './modules/red-flags/red-flags.module';
import { InvestigationModule } from './modules/investigation/investigation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { MappingModule } from './modules/mapping/mapping.module';
import { ReportModule } from './modules/report/report.module';
import { FundTrailModule } from './modules/fund-trail/fund-trail.module';
import { EntityResolutionModule } from './modules/entity-resolution/entity-resolution.module';
import { InvestigationGraphModule } from './modules/investigation-graph/investigation-graph.module';
import { InvestigationAiModule } from './modules/investigation-ai/investigation-ai.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { PilotModule } from './modules/pilot/pilot.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { FeatureVoteModule } from './modules/feature-vote/feature-vote.module';
import { NarrativeModule } from './modules/narrative/narrative.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { JwtAuthGuard, RolesGuard } from './modules/auth/guards';
import { GlobalExceptionFilter } from './common/middlewares';

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
    InvestigationModule,
    DashboardModule,
    PdfModule,
    MappingModule,
    ReportModule,
    FundTrailModule,
    EntityResolutionModule,
    InvestigationGraphModule,
    InvestigationAiModule,
    IntelligenceModule,
    PilotModule,
    FeedbackModule,
    FeatureVoteModule,
    NarrativeModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}