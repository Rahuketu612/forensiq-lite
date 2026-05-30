import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@forensiq/database';

export interface CaseDashboard {
  caseId: string;
  caseData: {
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  statistics: {
    totalTransactions: number;
    totalImports: number;
    totalRedFlags: number;
    highSeverityFlags: number;
    reviewedFlags: number;
    unreviewedFlags: number;
    evidenceFilesCount: number;
    investigationNotesCount: number;
    latestActivity: Date | null;
  };
  progress: {
    redFlagsReviewedPercent: number;
  };
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  user: { id: string; name: string; email: string } | null;
  createdAt: Date;
  entityType?: string;
}

@Injectable()
export class DashboardService {
  async getDashboard(caseId: string): Promise<CaseDashboard> {
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    const [
      transactionsCount,
      importsCount,
      evidenceCount,
      notesCount,
      redFlagBreakdown,
      recentActivity,
    ] = await Promise.all([
      prisma.transaction.count({ where: { caseId } }),
      prisma.transactionImport.count({ where: { caseId } }),
      prisma.evidenceFile.count({ where: { caseId } }),
      prisma.investigationNote.count({ where: { caseId } }),
      prisma.redFlag.groupBy({
        by: ['severity', 'reviewed'],
        where: { caseId },
        _count: true,
      }),
      this.getRecentActivity(caseId),
    ]);

    const totalRedFlags = redFlagBreakdown.reduce((sum, item) => sum + item._count, 0);
    const highSeverityFlags = redFlagBreakdown
      .filter((item) => item.severity === 'HIGH' || item.severity === 'CRITICAL')
      .reduce((sum, item) => sum + item._count, 0);
    const reviewedFlags = redFlagBreakdown
      .filter((item) => item.reviewed === true)
      .reduce((sum, item) => sum + item._count, 0);

    const latestTimeline = await prisma.investigationTimeline.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });

    const latestActivity = latestTimeline?.createdAt || caseData.updatedAt;

    return {
      caseId,
      caseData: {
        id: caseData.id,
        title: caseData.title,
        status: caseData.status,
        createdAt: caseData.createdAt,
        updatedAt: caseData.updatedAt,
      },
      statistics: {
        totalTransactions: transactionsCount,
        totalImports: importsCount,
        totalRedFlags,
        highSeverityFlags,
        reviewedFlags,
        unreviewedFlags: totalRedFlags - reviewedFlags,
        evidenceFilesCount: evidenceCount,
        investigationNotesCount: notesCount,
        latestActivity,
      },
      progress: {
        redFlagsReviewedPercent: totalRedFlags > 0
          ? Math.round((reviewedFlags / totalRedFlags) * 100)
          : 0,
      },
      recentActivity,
    };
  }

  private async getRecentActivity(caseId: string, limit: number = 15): Promise<ActivityEntry[]> {
    const timelineEntries = await prisma.investigationTimeline.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return timelineEntries.map((entry) => ({
      id: entry.id,
      eventType: entry.eventType,
      title: entry.title,
      description: entry.description,
      user: entry.user,
      createdAt: entry.createdAt,
      entityType: entry.redFlagId ? 'redFlag' : entry.transactionId ? 'transaction' : undefined,
    }));
  }
}