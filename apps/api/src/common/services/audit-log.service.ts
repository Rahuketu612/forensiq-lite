import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { AuditEntityType } from '@forensiq/database';

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  previousState?: any;
  newState?: any;
  metadata?: any;
  caseId?: string;
  riskLevel?: string;
  riskIndicators?: string[];
  aiModel?: string;
  aiPrompt?: string;
  aiResponse?: string;
  dataSensitivity?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async log(entry: AuditLogEntry) {
    try {
      const auditEntry = await prisma.comprehensiveAuditLog.create({
        data: {
          userId: entry.userId,
          userEmail: entry.userEmail,
          userRole: entry.userRole,
          sessionId: entry.sessionId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityName: entry.entityName,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          endpoint: entry.endpoint,
          method: entry.method,
          previousState: entry.previousState,
          newState: entry.newState,
          metadata: entry.metadata,
          caseId: entry.caseId,
          riskLevel: entry.riskLevel,
          riskIndicators: entry.riskIndicators || [],
          aiModel: entry.aiModel,
          aiPrompt: entry.aiPrompt,
          aiResponse: entry.aiResponse,
          dataSensitivity: entry.dataSensitivity || 'INTERNAL',
          retentionPeriod: 365, // 1 year default
        },
      });

      // Log to console for debugging
      this.logger.log(
        `[AUDIT] ${entry.action} on ${entry.entityType}:${entry.entityId} by ${entry.userEmail || 'anonymous'}`,
      );

      return auditEntry;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write audit log: ${message}`);
      // Don't throw - audit logging should not break the application
      return null;
    }
  }

  async getAuditLogs(filters: {
    entityType?: AuditEntityType;
    entityId?: string;
    caseId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.caseId) where.caseId = filters.caseId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return prisma.comprehensiveAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  async getCaseAuditTrail(caseId: string) {
    return prisma.comprehensiveAuditLog.findMany({
      where: { caseId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getEntityAuditTrail(entityType: AuditEntityType, entityId: string) {
    return prisma.comprehensiveAuditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getUserActivity(userId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return prisma.comprehensiveAuditLog.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getHighRiskActivity(limit = 50) {
    return prisma.comprehensiveAuditLog.findMany({
      where: {
        riskLevel: { in: ['HIGH', 'CRITICAL'] },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getAuditStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [total, byAction, byEntity, highRisk] = await Promise.all([
      prisma.comprehensiveAuditLog.count({
        where: { timestamp: { gte: startDate } },
      }),
      prisma.comprehensiveAuditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: startDate } },
        _count: true,
      }),
      prisma.comprehensiveAuditLog.groupBy({
        by: ['entityType'],
        where: { timestamp: { gte: startDate } },
        _count: true,
      }),
      prisma.comprehensiveAuditLog.count({
        where: { 
          timestamp: { gte: startDate },
          riskLevel: { in: ['HIGH', 'CRITICAL'] },
        },
      }),
    ]);

    return {
      period: `${days} days`,
      totalActions: total,
      highRiskActions: highRisk,
      byAction: byAction.map(a => ({ action: a.action, count: a._count })),
      byEntity: byEntity.map(e => ({ entityType: e.entityType, count: e._count })),
    };
  }
}