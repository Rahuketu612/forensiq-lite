import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { LinkReason } from '@forensiq/database';
import type { Transaction } from '@forensiq/database';

const LINKING_CONFIG = {
  sameAmountThreshold: 0,
  timestampWindowMs: 5 * 60 * 1000,
  narrationSimilarityThreshold: 0.75,
  counterpartyMatch: true,
  roundAmountThreshold: 0.01,
};

export interface TransactionLinkResult {
  sourceTransactionId: string;
  targetTransactionId: string;
  linkReason: LinkReason;
  confidenceScore: number;
  explanation: string;
  amountMatch: boolean;
  timestampMatch: boolean;
  counterpartyMatch: boolean;
  narrationMatch: boolean;
  amountDifference: number | null;
  timeDifferenceMs: number | null;
  narrationSimilarity: number | null;
}

export interface FundTrailResult {
  caseId: string;
  transactionCount: number;
  linksCreated: number;
  links: {
    id: string;
    sourceTransaction: {
      id: string;
      date: Date;
      amount: number;
      type: string;
      counterparty: string | null;
      description: string | null;
    };
    targetTransaction: {
      id: string;
      date: Date;
      amount: number;
      type: string;
      counterparty: string | null;
      description: string | null;
    };
    linkReason: string;
    confidenceScore: number;
    explanation: string;
    amountDifference: number | null;
    timeDifferenceMs: number | null;
    narrationSimilarity: number | null;
    createdAt: Date;
  }[];
  auditTrail: {
    action: string;
    timestamp: Date;
    details: string;
  }[];
}

@Injectable()
export class FundTrailService {
  async generateFundTrail(caseId: string, userId: string): Promise<FundTrailResult> {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    const transactions = await prisma.transaction.findMany({
      where: { caseId },
      orderBy: { date: 'asc' },
    });

    const linkResults = this.findTransactionLinks(transactions);

    await prisma.transactionLink.deleteMany({
      where: { caseId, deletedAt: null },
    });

    const createdLinks = await Promise.all(
      linkResults.map((link) =>
        prisma.transactionLink.create({
          data: {
            caseId,
            sourceTransactionId: link.sourceTransactionId,
            targetTransactionId: link.targetTransactionId,
            linkReason: link.linkReason,
            confidenceScore: link.confidenceScore,
            explanation: link.explanation,
            amountMatch: link.amountMatch || null,
            timestampMatch: link.timestampMatch || null,
            counterpartyMatch: link.counterpartyMatch || null,
            narrationMatch: link.narrationMatch || null,
            amountDifference: link.amountDifference,
            timeDifferenceMs: link.timeDifferenceMs,
            narrationSimilarity: link.narrationSimilarity,
            createdById: userId,
          },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        userId,
        caseId,
        action: 'TRAIL_GENERATED',
        entityType: 'TransactionLink',
        entityId: caseId,
        metadata: {
          linksCreated: createdLinks.length,
          transactionCount: transactions.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await prisma.investigationTimeline.create({
      data: {
        caseId,
        eventType: 'FUND_TRAIL_GENERATED',
        title: 'Fund trail generated',
        description: `Generated ${createdLinks.length} transaction links from ${transactions.length} transactions`,
        userId,
        metadata: {
          linksCreated: createdLinks.length,
          transactionCount: transactions.length,
        },
      },
    });

    const linksWithDetails = await Promise.all(
      createdLinks.map(async (link) => {
        const sourceTx = await prisma.transaction.findUnique({
          where: { id: link.sourceTransactionId },
          select: { id: true, date: true, amount: true, type: true, counterparty: true, description: true },
        });
        const targetTx = await prisma.transaction.findUnique({
          where: { id: link.targetTransactionId },
          select: { id: true, date: true, amount: true, type: true, counterparty: true, description: true },
        });
        return {
          id: link.id,
          sourceTransaction: sourceTx ? {
            id: sourceTx.id,
            date: sourceTx.date,
            amount: sourceTx.amount,
            type: String(sourceTx.type),
            counterparty: sourceTx.counterparty,
            description: sourceTx.description,
          } : null,
          targetTransaction: targetTx ? {
            id: targetTx.id,
            date: targetTx.date,
            amount: targetTx.amount,
            type: String(targetTx.type),
            counterparty: targetTx.counterparty,
            description: targetTx.description,
          } : null,
          linkReason: link.linkReason,
          confidenceScore: link.confidenceScore,
          explanation: link.explanation,
          amountDifference: link.amountDifference,
          timeDifferenceMs: link.timeDifferenceMs,
          narrationSimilarity: link.narrationSimilarity,
          createdAt: link.createdAt,
        };
      })
    );

    return {
      caseId,
      transactionCount: transactions.length,
      linksCreated: createdLinks.length,
      links: linksWithDetails,
      auditTrail: [
        {
          action: 'FUND_TRAIL_GENERATED',
          timestamp: new Date(),
          details: `Generated ${createdLinks.length} links from ${transactions.length} transactions`,
        },
      ],
    };
  }

  async getFundTrail(caseId: string, userId: string): Promise<FundTrailResult> {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    const transactionCount = await prisma.transaction.count({
      where: { caseId },
    });

    const links = await prisma.transactionLink.findMany({
      where: { caseId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        caseId,
        action: 'READ',
        entityType: 'FundTrail',
        entityId: caseId,
        metadata: {
          linksFound: links.length,
          transactionCount,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const linksWithDetails = await Promise.all(
      links.map(async (link) => {
        const sourceTx = await prisma.transaction.findUnique({
          where: { id: link.sourceTransactionId },
          select: { id: true, date: true, amount: true, type: true, counterparty: true, description: true },
        });
        const targetTx = await prisma.transaction.findUnique({
          where: { id: link.targetTransactionId },
          select: { id: true, date: true, amount: true, type: true, counterparty: true, description: true },
        });
        return {
          id: link.id,
          sourceTransaction: sourceTx ? {
            id: sourceTx.id,
            date: sourceTx.date,
            amount: sourceTx.amount,
            type: String(sourceTx.type),
            counterparty: sourceTx.counterparty,
            description: sourceTx.description,
          } : null,
          targetTransaction: targetTx ? {
            id: targetTx.id,
            date: targetTx.date,
            amount: targetTx.amount,
            type: String(targetTx.type),
            counterparty: targetTx.counterparty,
            description: targetTx.description,
          } : null,
          linkReason: link.linkReason,
          confidenceScore: link.confidenceScore,
          explanation: link.explanation,
          amountDifference: link.amountDifference,
          timeDifferenceMs: link.timeDifferenceMs,
          narrationSimilarity: link.narrationSimilarity,
          createdAt: link.createdAt,
        };
      })
    );

    return {
      caseId,
      transactionCount,
      linksCreated: links.length,
      links: linksWithDetails,
      auditTrail: [],
    };
  }

  async deleteLink(linkId: string, userId: string): Promise<void> {
    const link = await prisma.transactionLink.findUnique({
      where: { id: linkId },
      select: { caseId: true, sourceTransactionId: true, targetTransactionId: true },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await prisma.transactionLink.update({
      where: { id: linkId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        caseId: link.caseId,
        action: 'LINK_DELETED',
        entityType: 'TransactionLink',
        entityId: linkId,
        metadata: {
          sourceTransactionId: link.sourceTransactionId,
          targetTransactionId: link.targetTransactionId,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await prisma.investigationTimeline.create({
      data: {
        caseId: link.caseId,
        eventType: 'TRANSACTION_LINK_DELETED',
        title: 'Transaction link deleted',
        description: 'A transaction link was removed from the fund trail',
        userId,
        metadata: {
          linkId,
          sourceTransactionId: link.sourceTransactionId,
          targetTransactionId: link.targetTransactionId,
        },
      },
    });
  }

  private findTransactionLinks(transactions: Transaction[]): TransactionLinkResult[] {
    const links: TransactionLinkResult[] = [];
    const existingPairs = new Set<string>();

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const sourceTx = transactions[i];
        const targetTx = transactions[j];

        const pairKey = `${sourceTx.id}-${targetTx.id}`;
        if (existingPairs.has(pairKey)) continue;

        const linkResult = this.evaluateTransactionPair(sourceTx, targetTx);
        
        if (linkResult && linkResult.confidenceScore >= 0.5) {
          links.push(linkResult);
          existingPairs.add(pairKey);
        }
      }
    }

    return links.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  private evaluateTransactionPair(
    sourceTx: Transaction,
    targetTx: Transaction
  ): TransactionLinkResult | null {
    const reasons: { reason: LinkReason; score: number; detail: string }[] = [];

    if (Math.abs(sourceTx.amount - targetTx.amount) <= LINKING_CONFIG.sameAmountThreshold) {
      reasons.push({
        reason: 'SAME_AMOUNT',
        score: 0.9,
        detail: `Both transactions have exactly the same amount: ${sourceTx.amount}`,
      });
    }

    const timeDiffMs = Math.abs(sourceTx.date.getTime() - targetTx.date.getTime());
    if (timeDiffMs <= LINKING_CONFIG.timestampWindowMs) {
      const minutesDiff = Math.round(timeDiffMs / 60000);
      reasons.push({
        reason: 'NEARBY_TIMESTAMP',
        score: 0.7 + (0.3 * (1 - timeDiffMs / LINKING_CONFIG.timestampWindowMs)),
        detail: `Transactions occurred within ${minutesDiff} minute(s) of each other (${timeDiffMs}ms apart)`,
      });
    }

    if (sourceTx.counterparty && targetTx.counterparty) {
      const normalizedSource = sourceTx.counterparty.toLowerCase().trim();
      const normalizedTarget = targetTx.counterparty.toLowerCase().trim();
      if (normalizedSource === normalizedTarget && normalizedSource !== '') {
        reasons.push({
          reason: 'SAME_COUNTERPARTY',
          score: 0.85,
          detail: `Both transactions involve the same counterparty: "${sourceTx.counterparty}"`,
        });
      }
    }

    if (sourceTx.description && targetTx.description) {
      const similarity = this.calculateStringSimilarity(sourceTx.description, targetTx.description);
      if (similarity >= LINKING_CONFIG.narrationSimilarityThreshold) {
        const similarityPercent = Math.round(similarity * 100);
        reasons.push({
          reason: 'NARRATION_SIMILARITY',
          score: 0.6 + (similarity * 0.3),
          detail: `Transaction descriptions have ${similarityPercent}% similarity: "${sourceTx.description}" vs "${targetTx.description}"`,
        });
      }
    }

    if (sourceTx.mode === targetTx.mode && sourceTx.mode !== 'OTHER') {
      reasons.push({
        reason: 'SAME_MODE',
        score: 0.5,
        detail: `Both transactions used the same transfer mode: ${sourceTx.mode}`,
      });
    }

    if (sourceTx.type === targetTx.type && sourceTx.type !== 'OTHER') {
      reasons.push({
        reason: 'SAME_TYPE',
        score: 0.4,
        detail: `Both transactions are of the same type: ${sourceTx.type}`,
      });
    }

    const sourceRoundness = this.getRoundAmountScore(sourceTx.amount);
    const targetRoundness = this.getRoundAmountScore(targetTx.amount);
    if (sourceRoundness > 0.8 && targetRoundness > 0.8) {
      reasons.push({
        reason: 'ROUND_AMOUNT',
        score: 0.5,
        detail: `Both transactions have round amounts: ${sourceTx.amount} and ${targetTx.amount}`,
      });
    }

    if (reasons.length === 0) {
      return null;
    }

    const totalScore = reasons.reduce((sum, r) => sum + r.score, 0);
    const confidenceScore = Math.min(1, totalScore / Math.sqrt(reasons.length));

    const primaryReason = reasons.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    const explanation = this.buildExplanation(sourceTx, targetTx, reasons);

    return {
      sourceTransactionId: sourceTx.id,
      targetTransactionId: targetTx.id,
      linkReason: primaryReason.reason,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      explanation,
      amountMatch: reasons.some((r) => r.reason === 'SAME_AMOUNT'),
      timestampMatch: reasons.some((r) => r.reason === 'NEARBY_TIMESTAMP'),
      counterpartyMatch: reasons.some((r) => r.reason === 'SAME_COUNTERPARTY'),
      narrationMatch: reasons.some((r) => r.reason === 'NARRATION_SIMILARITY'),
      amountDifference: sourceTx.amount !== targetTx.amount ? targetTx.amount - sourceTx.amount : null,
      timeDifferenceMs: timeDiffMs,
      narrationSimilarity: sourceTx.description && targetTx.description
        ? this.calculateStringSimilarity(sourceTx.description, targetTx.description)
        : null,
    };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    
    const tokens1 = new Set(normalize(str1));
    const tokens2 = new Set(normalize(str2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  private getRoundAmountScore(amount: number): number {
    if (amount === 0) return 0;
    
    const roundValues = [100, 1000, 10000, 100000];
    
    for (const roundVal of roundValues) {
      const remainder = amount % roundVal;
      const nearestRound = remainder <= roundVal / 2 ? 0 : roundVal;
      const distance = Math.min(remainder, roundVal - remainder);
      const score = 1 - (distance / roundVal);
      if (score > 0.9) return score;
    }

    if (Number.isInteger(amount)) return 0.8;
    
    const decimal = amount % 1;
    if (decimal === 0) return 0.8;
    if (Math.abs(decimal - 0.5) < 0.01) return 0.6;
    if (Math.abs(decimal - 0.25) < 0.01 || Math.abs(decimal - 0.75) < 0.01) return 0.5;

    return 0.1;
  }

  private buildExplanation(
    sourceTx: Transaction,
    targetTx: Transaction,
    reasons: { reason: LinkReason; score: number; detail: string }[]
  ): string {
    const parts: string[] = [];

    const primaryReason = reasons.reduce((best, current) =>
      current.score > best.score ? current : best
    );
    parts.push(`Primary: ${primaryReason.detail}`);

    if (reasons.length > 1) {
      const supportingReasons = reasons
        .filter((r) => r.reason !== primaryReason.reason)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (supportingReasons.length > 0) {
        parts.push(`Supporting evidence: ${supportingReasons.map((r) => r.detail).join('; ')}`);
      }
    }

    parts.push(
      `Transaction 1: ${sourceTx.type} of ${sourceTx.amount} on ${sourceTx.date.toISOString().split('T')[0]}`,
      `Transaction 2: ${targetTx.type} of ${targetTx.amount} on ${targetTx.date.toISOString().split('T')[0]}`
    );

    return parts.join('. ');
  }
}
