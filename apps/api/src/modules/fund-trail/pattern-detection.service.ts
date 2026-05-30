import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@forensiq/database';

// InvestigationStatus type from Prisma (using string for safety)
type InvestigationStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';

// Pattern types as const strings for type safety without Prisma enums
type PatternType = 'CIRCULAR_FLOW' | 'LAYERING' | 'ROUND_TRIPPING' | 'REPEATED_CHAIN';

interface TransactionData {
  id: string;
  date: Date;
  amount: number;
  type: string;
  counterparty: string | null;
  description: string | null;
}

interface DetectedPattern {
  patternType: PatternType;
  title: string;
  explanation: string;
  confidenceScore: number;
  totalAmount: number | null;
  transactionIds: string[];
  counterparties: string[];
  timeWindowStart: Date | null;
  timeWindowEnd: Date | null;
}

export interface AnalyzeResult {
  caseId: string;
  patternsDetected: number;
  byType: Record<string, number>;
  patterns: DetectedPattern[];
  auditTrail: Array<{ action: string; timestamp: Date; details: string }>;
}

interface PatternConfig {
  layeringTimeWindowDays: number;
  layeringAmountTolerance: number;
  roundTrippingDays: number;
  roundTrippingTolerance: number;
  minChainLength: number;
  minTransactions: number;
}

const DEFAULT_CONFIG: PatternConfig = {
  layeringTimeWindowDays: 7,
  layeringAmountTolerance: 0.1,
  roundTrippingDays: 30,
  roundTrippingTolerance: 0.15,
  minChainLength: 3,
  minTransactions: 3,
};

// Product-safe wording mappings
const PATTERN_TITLES: Record<PatternType, string> = {
  CIRCULAR_FLOW: 'Possible circular fund movement pattern',
  LAYERING: 'Potential fund layering pattern',
  ROUND_TRIPPING: 'Possible round-tripping pattern',
  REPEATED_CHAIN: 'Repeated counterparty chain pattern',
};

const PATTERN_EXPLANATIONS: Record<PatternType, string> = {
  CIRCULAR_FLOW: 'Funds appear to move in a circular path through multiple counterparties within the transaction period.',
  LAYERING: 'A single inflow is followed by multiple outflows of similar total value, potentially to obscure the original source.',
  ROUND_TRIPPING: 'Funds sent out appear to return through related or same counterparties within the analysis window.',
  REPEATED_CHAIN: 'Similar transaction chains between the same counterparties appear multiple times in the data.',
};

@Injectable()
export class PatternDetectionService {
  private config: PatternConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  async analyzePatterns(
    caseId: string,
    userId: string,
    options?: Partial<PatternConfig>
  ): Promise<AnalyzeResult> {
    this.config = { ...DEFAULT_CONFIG, ...options };

    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    const transactions = await prisma.transaction.findMany({
      where: { caseId },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        amount: true,
        type: true,
        counterparty: true,
        description: true,
      },
    });

    if (transactions.length < this.config.minTransactions) {
      return {
        caseId,
        patternsDetected: 0,
        byType: {},
        patterns: [],
        auditTrail: [
          {
            action: 'INSUFFICIENT_DATA',
            timestamp: new Date(),
            details: `Only ${transactions.length} transactions found, minimum ${this.config.minTransactions} required`,
          },
        ],
      };
    }

    const patterns: DetectedPattern[] = [];

    // Detect circular flows (A → B → C → A)
    const circularPatterns = this.detectCircularFlows(transactions);
    patterns.push(...circularPatterns);

    // Detect layering (single inflow → multiple outflows)
    const layeringPatterns = this.detectLayering(transactions);
    patterns.push(...layeringPatterns);

    // Detect round-tripping
    const roundTripPatterns = this.detectRoundTripping(transactions);
    patterns.push(...roundTripPatterns);

    // Detect repeated chains
    const chainPatterns = this.detectRepeatedChains(transactions);
    patterns.push(...chainPatterns);

    // Store patterns in database
    const storedPatterns = await Promise.all(
      patterns.map((pattern) =>
        prisma.fundTrailPattern.create({
          data: {
            caseId,
            patternType: pattern.patternType,
            title: pattern.title,
            explanation: pattern.explanation,
            confidenceScore: pattern.confidenceScore,
            totalAmount: pattern.totalAmount,
            transactionIds: pattern.transactionIds,
            counterparties: pattern.counterparties,
            timeWindowStart: pattern.timeWindowStart,
            timeWindowEnd: pattern.timeWindowEnd,
            createdById: userId,
          },
        })
      )
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        caseId,
        action: 'PATTERN_DETECTED',
        entityType: 'FundTrailPattern',
        entityId: caseId,
        metadata: {
          patternsFound: patterns.length,
          byType: this.groupByType(patterns),
          transactionCount: transactions.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Create timeline event for analysis completion
    await prisma.investigationTimeline.create({
      data: {
        caseId,
        eventType: 'FUND_TRAIL_PATTERNS_ANALYZED',
        title: 'Fund trail pattern analysis completed',
        description: `${patterns.length} potential fund-flow patterns detected requiring auditor review`,
        userId,
        metadata: {
          patternsFound: patterns.length,
          byType: this.groupByType(patterns),
        },
      },
    });

    // Create individual pattern timeline events
    await Promise.all(
      storedPatterns.map((pattern) =>
        prisma.investigationTimeline.create({
          data: {
            caseId,
            eventType: 'PATTERN_DETECTED',
            title: this.getPatternEventTitle(pattern.patternType),
            description: `${pattern.title}. Confidence: ${(pattern.confidenceScore * 100).toFixed(0)}%. ${pattern.explanation}`,
            userId,
            patternId: pattern.id,
            metadata: {
              patternId: pattern.id,
              patternType: pattern.patternType,
              confidenceScore: pattern.confidenceScore,
            },
          },
        })
      )
    );

    const byType = this.groupByType(storedPatterns);

    return {
      caseId,
      patternsDetected: patterns.length,
      byType,
      patterns,
      auditTrail: [
        {
          action: 'FUND_TRAIL_PATTERNS_ANALYZED',
          timestamp: new Date(),
          details: `Analyzed ${transactions.length} transactions, detected ${patterns.length} patterns`,
        },
      ],
    };
  }

  async getPatterns(caseId: string): Promise<{
    patterns: Array<{
      id: string;
      patternType: PatternType;
      title: string;
      explanation: string;
      confidenceScore: number;
      totalAmount: number | null;
      transactionIds: string[];
      counterparties: string[];
      timeWindowStart: Date | null;
      timeWindowEnd: Date | null;
      reviewed: boolean;
      status: InvestigationStatus;
      createdAt: Date;
    }>;
    summary: { total: number; byType: Record<string, number> };
  }> {
    const patterns = await prisma.fundTrailPattern.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      patterns: patterns as any,
      summary: {
        total: patterns.length,
        byType: this.groupByType(patterns),
      },
    };
  }

  async getPatternById(patternId: string): Promise<{
    pattern: {
      id: string;
      patternType: PatternType;
      title: string;
      explanation: string;
      confidenceScore: number;
      totalAmount: number | null;
      transactionIds: string[];
      counterparties: string[];
      timeWindowStart: Date | null;
      timeWindowEnd: Date | null;
      reviewed: boolean;
      reviewedBy: string | null;
      reviewedAt: Date | null;
      status: InvestigationStatus;
      createdAt: Date;
      createdBy: { id: string; name: string; email: string };
    };
    transactions: Array<{
      id: string;
      date: Date;
      amount: number;
      type: string;
      counterparty: string | null;
      description: string | null;
    }>;
  } | null> {
    const pattern = await prisma.fundTrailPattern.findUnique({
      where: { id: patternId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!pattern) {
      return null;
    }

    const transactions = await prisma.transaction.findMany({
      where: { id: { in: pattern.transactionIds } },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        amount: true,
        type: true,
        counterparty: true,
        description: true,
      },
    });

    return { pattern: pattern as any, transactions };
  }

  async updatePatternStatus(
    patternId: string,
    userId: string,
    status: InvestigationStatus
  ): Promise<void> {
    const pattern = await prisma.fundTrailPattern.findUnique({
      where: { id: patternId },
      select: { id: true, caseId: true, status: true },
    });

    if (!pattern) {
      throw new NotFoundException('Pattern not found');
    }

    await prisma.fundTrailPattern.update({
      where: { id: patternId },
      data: {
        reviewed: true,
        reviewedBy: userId,
        reviewedAt: new Date(),
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        caseId: pattern.caseId,
        action: 'PATTERN_STATUS_CHANGED',
        entityType: 'FundTrailPattern',
        entityId: patternId,
        metadata: {
          previousStatus: pattern.status,
          newStatus: status,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await prisma.investigationTimeline.create({
      data: {
        caseId: pattern.caseId,
        eventType: 'PATTERN_STATUS_CHANGED',
        title: 'Pattern review status updated',
        description: `Pattern marked as "${status.toLowerCase().replace('_', ' ')}" by auditor`,
        userId,
        patternId,
        metadata: {
          patternId,
          newStatus: status,
        },
      },
    });
  }

  // CIRCULAR FLOW DETECTION
  // Detects: A → B → C → A (money returning to start)
  private detectCircularFlows(transactions: TransactionData[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Build transaction graph by counterparty
    const graph = new Map<string, string[]>();
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!tx.counterparty) continue;
      const cp = tx.counterparty.toLowerCase().trim();
      if (!graph.has(cp)) graph.set(cp, []);
      
      // Add next transaction counterparty to graph
      if (i < transactions.length - 1) {
        const next = transactions[i + 1];
        if (next.counterparty && next.counterparty.toLowerCase().trim() !== cp) {
          graph.get(cp)!.push(next.counterparty.toLowerCase().trim());
        }
      }
    }

    // Find circular paths using DFS
    const visited = new Set<string>();
    for (const [startCp] of graph) {
      if (visited.has(startCp)) continue;

      const path: string[] = [];
      const found: string[][] = [];

      const dfs = (current: string, depth: number) => {
        if (depth > 0 && current === startCp) {
          found.push([...path]);
          return;
        }
        if (depth > 6 || path.length > 6) return; // Limit depth

        path.push(current);
        const neighbors = graph.get(current) || [];
        for (const next of neighbors) {
          if (!path.includes(next) || next === startCp) {
            dfs(next, depth + 1);
          }
        }
        path.pop();
      };

      dfs(startCp, 0);
      visited.add(startCp);

      // Convert found paths to patterns (inside loop where `found` is in scope)
      for (const pathItem of found) {
        if (pathItem.length < 3) continue;

        const involvedTx = transactions.filter((t) =>
          t.counterparty && pathItem.includes(t.counterparty.toLowerCase().trim())
        );

        const counterparties = [...new Set(pathItem)];
        const totalAmount = involvedTx.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const dates = involvedTx.map((t) => t.date.getTime());
        const timeWindowStart = new Date(Math.min(...dates));
        const timeWindowEnd = new Date(Math.max(...dates));

        // Calculate confidence based on path length and consistency
        const confidence = Math.min(0.95, 0.5 + pathItem.length * 0.1);

        patterns.push({
          patternType: 'CIRCULAR_FLOW',
          title: PATTERN_TITLES.CIRCULAR_FLOW,
          explanation: `${PATTERN_EXPLANATIONS.CIRCULAR_FLOW} Movement path: ${pathItem.join(' → ')}. Total value: ₹${totalAmount.toLocaleString('en-IN')}. ${involvedTx.length} transactions involved over ${Math.ceil((timeWindowEnd.getTime() - timeWindowStart.getTime()) / (1000 * 60 * 60 * 24))} days.`,
          confidenceScore: Math.round(confidence * 100) / 100,
          totalAmount,
          transactionIds: involvedTx.map((t) => t.id),
          counterparties,
          timeWindowStart,
          timeWindowEnd,
        });
      }
    }

    return patterns;
  }

  // LAYERING DETECTION
  // Detects: Large inflow followed by multiple smaller outflows
  private detectLayering(transactions: TransactionData[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const windowMs = this.config.layeringTimeWindowDays * msPerDay;
    const tolerance = this.config.layeringAmountTolerance;

    const credits = transactions.filter((t) => t.type === 'CREDIT' && t.amount > 10000);
    const debits = transactions.filter((t) => t.type === 'DEBIT');

    for (const credit of credits) {
      const timeCutoff = new Date(credit.date.getTime() + windowMs);
      const subsequentDebits = debits.filter(
        (d) => d.date >= credit.date && d.date <= timeCutoff
      );

      if (subsequentDebits.length < 2) continue;

      const outflowTotal = subsequentDebits.reduce((sum, d) => sum + d.amount, 0);
      const expectedRange = {
        min: credit.amount * (1 - tolerance),
        max: credit.amount * (1 + tolerance) * 2,
      };

      // Check if outflows total close to inflow (within tolerance)
      if (outflowTotal >= expectedRange.min && outflowTotal <= expectedRange.max) {
        const allTx = [credit, ...subsequentDebits];
        const counterparties = [...new Set(
          allTx
            .filter((t) => t.counterparty)
            .map((t) => t.counterparty!.toLowerCase().trim())
        )];

        patterns.push({
          patternType: 'LAYERING',
          title: PATTERN_TITLES.LAYERING,
          explanation: `${PATTERN_EXPLANATIONS.LAYERING} Single inflow of ₹${credit.amount.toLocaleString('en-IN')} followed by ${subsequentDebits.length} outflows totaling ₹${outflowTotal.toLocaleString('en-IN')} within ${this.config.layeringTimeWindowDays} days.`,
          confidenceScore: this.calculateLayeringConfidence(subsequentDebits),
          totalAmount: credit.amount,
          transactionIds: allTx.map((t) => t.id),
          counterparties,
          timeWindowStart: credit.date,
          timeWindowEnd: subsequentDebits[subsequentDebits.length - 1].date,
        });
      }
    }

    return patterns;
  }

  // ROUND-TRIPPING DETECTION
  // Detects: Money going out and coming back
  private detectRoundTripping(transactions: TransactionData[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    const windowMs = this.config.roundTrippingDays * msPerDay;
    const tolerance = this.config.roundTrippingTolerance;

    // Group by counterparty
    const byCounterparty = new Map<string, TransactionData[]>();
    for (const tx of transactions) {
      if (!tx.counterparty) continue;
      const cp = tx.counterparty.toLowerCase().trim();
      if (!byCounterparty.has(cp)) byCounterparty.set(cp, []);
      byCounterparty.get(cp)!.push(tx);
    }

    // Find same counterparty round-trips
    for (const [, txs] of byCounterparty) {
      if (txs.length < 2) continue;

      // Sort by date
      txs.sort((a, b) => a.date.getTime() - b.date.getTime());

      for (let i = 0; i < txs.length - 1; i++) {
        const outbound = txs[i];
        if (outbound.type !== 'DEBIT') continue;

        for (let j = i + 1; j < txs.length; j++) {
          const inbound = txs[j];
          if (inbound.type !== 'CREDIT') continue;

          // Check time window
          const daysDiff = (inbound.date.getTime() - outbound.date.getTime()) / msPerDay;
          if (daysDiff > this.config.roundTrippingDays) break;

          // Check amount similarity
          const ratio = Math.abs(inbound.amount / outbound.amount);
          if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) {
            const cp = outbound.counterparty?.toLowerCase().trim() || '';
            patterns.push({
              patternType: 'ROUND_TRIPPING',
              title: PATTERN_TITLES.ROUND_TRIPPING,
              explanation: `${PATTERN_EXPLANATIONS.ROUND_TRIPPING} Same counterparty "${outbound.counterparty}" shows ₹${Math.abs(outbound.amount).toLocaleString('en-IN')} outflow followed by ₹${inbound.amount.toLocaleString('en-IN')} inflow ${Math.round(daysDiff)} days later.`,
              confidenceScore: this.calculateRoundTripConfidence(outbound, inbound, daysDiff),
              totalAmount: Math.abs(outbound.amount),
              transactionIds: [outbound.id, inbound.id],
              counterparties: [cp],
              timeWindowStart: outbound.date,
              timeWindowEnd: inbound.date,
            });

            // Report one round-trip per outbound
            break;
          }
        }
      }
    }

    return patterns;
  }

  // REPEATED CHAIN DETECTION
  // Detects: A → B → C appearing multiple times
  private detectRepeatedChains(transactions: TransactionData[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Build consecutive chain patterns
    const chains = new Map<string, TransactionData[]>();

    for (let i = 0; i < transactions.length - 1; i++) {
      const tx1 = transactions[i];
      const tx2 = transactions[i + 1];

      if (!tx1.counterparty || !tx2.counterparty) continue;

      const cp1 = tx1.counterparty.toLowerCase().trim();
      const cp2 = tx2.counterparty.toLowerCase().trim();
      if (cp1 === cp2) continue;

      const chainKey = `${cp1}→${cp2}`;

      if (!chains.has(chainKey)) chains.set(chainKey, []);
      chains.get(chainKey)!.push(tx1, tx2);
    }

    // Find chains that appear multiple times
    for (const [chainKey, chainTxs] of chains) {
      const uniqueTxCount = new Set(chainTxs.map((t) => t.id)).size;

      if (uniqueTxCount >= this.config.minChainLength * 2) {
        // Count occurrences
        let occurrenceCount = 0;
        for (let i = 0; i < transactions.length - 1; i++) {
          const cp1 = transactions[i].counterparty?.toLowerCase().trim() || '';
          const cp2 = transactions[i + 1].counterparty?.toLowerCase().trim() || '';
          if (`${cp1}→${cp2}` === chainKey) occurrenceCount++;
        }

        if (occurrenceCount >= 2) {
          const counterparties = chainKey.split('→');
          const involvedTx = [...new Set(chainTxs)];
          const totalAmount = involvedTx.reduce((sum, t) => sum + Math.abs(t.amount), 0);
          const dates = involvedTx.map((t) => t.date.getTime());

          patterns.push({
            patternType: 'REPEATED_CHAIN',
            title: PATTERN_TITLES.REPEATED_CHAIN,
            explanation: `${PATTERN_EXPLANATIONS.REPEATED_CHAIN} Chain "${chainKey.replace('→', ' → ')}" appears ${occurrenceCount} times.`,
            confidenceScore: Math.min(0.9, 0.4 + occurrenceCount * 0.2),
            totalAmount,
            transactionIds: involvedTx.map((t) => t.id),
            counterparties,
            timeWindowStart: new Date(Math.min(...dates)),
            timeWindowEnd: new Date(Math.max(...dates)),
          });
        }
      }
    }

    return patterns;
  }

  // Helper: Calculate layering confidence
  private calculateLayeringConfidence(outflows: TransactionData[]): number {
    const countScore = Math.min(1, outflows.length / 5);
    
    // Calculate consistency based on amount variance
    const amounts = outflows.map(o => o.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length;
    const consistencyScore = Math.abs(variance) < avg ? 1 : 0.5;

    return Math.round(Math.min(0.95, (countScore * 0.6 + consistencyScore * 0.4) * 100) / 100);
  }

  // Helper: Calculate round-trip confidence
  private calculateRoundTripConfidence(
    outbound: TransactionData,
    inbound: TransactionData,
    daysDiff: number
  ): number {
    const amountDiff = Math.abs(outbound.amount - inbound.amount);
    const amountScore = 1 - (amountDiff / Math.max(Math.abs(outbound.amount), Math.abs(inbound.amount)));
    const timeScore = 1 - (daysDiff / this.config.roundTrippingDays);
    const daysPenalty = daysDiff < 1 ? 0.1 : 0;

    const raw = (amountScore * 0.6 + timeScore * 0.3 - daysPenalty) * 100;
    return Math.round(Math.min(0.95, raw) * 100) / 100;
  }

  // Helper: Group patterns by type
  private groupByType(
    patterns: Array<{ patternType: PatternType }>
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const p of patterns) {
      result[p.patternType] = (result[p.patternType] || 0) + 1;
    }
    return result;
  }

  // Helper: Get pattern event title
  private getPatternEventTitle(patternType: PatternType): string {
    const titles: Record<PatternType, string> = {
      CIRCULAR_FLOW: 'Possible circular fund movement detected',
      LAYERING: 'Potential layering pattern detected',
      ROUND_TRIPPING: 'Possible round-tripping pattern detected',
      REPEATED_CHAIN: 'Repeated counterparty chain detected',
    };
    return titles[patternType] || 'Fund-flow pattern detected';
  }
}
