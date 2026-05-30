import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  async getDashboardMetrics() {
    this.logger.log('Fetching dashboard metrics');
    
    const [
      casesCount,
      activeCases,
      transactionsCount,
      redFlagsCount,
      entitiesCount,
      recentNarratives,
    ] = await Promise.all([
      prisma.case.count(),
      prisma.case.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.count(),
      prisma.redFlag.count(),
      prisma.entity.count(),
      prisma.investigationNarrative.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { case: { select: { caseNumber: true, title: true } } },
      }),
    ]);

    // Red flag breakdown by severity
    const flagsBySeverity = await prisma.redFlag.groupBy({
      by: ['severity'],
      _count: true,
    });

    // Transaction types breakdown
    const txByType = await prisma.transaction.groupBy({
      by: ['type'],
      _count: true,
      _sum: { amount: true },
    });

    // Cases by status
    const casesByStatus = await prisma.case.groupBy({
      by: ['status'],
      _count: true,
    });

    // Recent activity (audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true, email: true } } },
    });

    return {
      overview: {
        totalCases: casesCount,
        activeCases,
        totalTransactions: transactionsCount,
        totalRedFlags: redFlagsCount,
        totalEntities: entitiesCount,
      },
      redFlagsBySeverity: flagsBySeverity.map(s => ({
        severity: s.severity,
        count: s._count,
      })),
      transactionsByType: txByType.map(t => ({
        type: t.type,
        count: t._count,
        totalAmount: Math.abs(t._sum.amount || 0),
      })),
      casesByStatus: casesByStatus.map(s => ({
        status: s.status,
        count: s._count,
      })),
      recentNarratives,
      recentActivity,
    };
  }

  async getCaseAnalytics(caseId: string) {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            date: true,
          },
        },
        redFlags: {
          select: {
            id: true,
            severity: true,
            status: true,
            createdAt: true,
          },
        },
        entities: {
          select: {
            id: true,
            canonicalName: true,
            riskScore: true,
          },
        },
        narratives: {
          select: {
            id: true,
            version: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!caseData) {
      return null;
    }

    // Calculate analytics
    const transactionStats = this.calculateTransactionStats(caseData.transactions);
    const flagStats = this.calculateFlagStats(caseData.redFlags);
    const riskDistribution = this.calculateRiskDistribution(caseData.entities);

    return {
      caseId,
      caseNumber: caseData.caseNumber,
      transactionStats,
      flagStats,
      riskDistribution,
      timeline: {
        firstTransaction: caseData.transactions.length > 0 
          ? caseData.transactions.sort((a, b) => a.date.getTime() - b.date.getTime())[0].date
          : null,
        lastTransaction: caseData.transactions.length > 0
          ? caseData.transactions.sort((a, b) => b.date.getTime() - a.date.getTime())[0].date
          : null,
      },
    };
  }

  private calculateTransactionStats(transactions: any[]) {
    const amounts = transactions.map(t => Math.abs(t.amount));
    const totalCredits = transactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalDebits = transactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      count: transactions.length,
      totalCredits,
      totalDebits,
      netFlow: totalCredits - totalDebits,
      averageAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
      maxAmount: Math.max(...amounts, 0),
      minAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
    };
  }

  private calculateFlagStats(flags: any[]) {
    const bySeverity = flags.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = flags.reduce((acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: flags.length,
      bySeverity,
      byStatus,
      unresolvedCount: flags.filter(f => f.status === 'OPEN').length,
    };
  }

  private calculateRiskDistribution(entities: any[]) {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    entities.forEach(e => {
      if (e.riskScore >= 80) distribution.critical++;
      else if (e.riskScore >= 60) distribution.high++;
      else if (e.riskScore >= 30) distribution.medium++;
      else distribution.low++;
    });

    return distribution;
  }

  async getPilotAnalytics() {
    const pilots = await prisma.pilot.findMany({
      include: {
        metrics: true,
        feedback: { select: { priority: true, sentiment: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    const summary = {
      totalPilots: pilots.length,
      activePilots: pilots.filter(p => p.pilotStatus === 'ACTIVE').length,
      averageActivities: pilots.reduce((sum, p) => sum + p.activities.length, 0) / pilots.length || 0,
    };

    // Feature request analytics
    const topFeatures = await prisma.featureRequest.findMany({
      orderBy: { voteCount: 'desc' },
      take: 10,
      include: { _count: { select: { votes: true } } },
    });

    return {
      pilotSummary: summary,
      pilots,
      topFeatureRequests: topFeatures,
    };
  }
}