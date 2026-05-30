import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { RedFlagSeverity, TransactionType } from '@forensiq/database';

// Rule definitions for type safety
interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: RedFlagSeverity;
  isActive: boolean;
  defaultParams?: Record<string, unknown>;
}

interface RedFlagResult {
  transactionId: string;
  ruleId: string;
  ruleName: string;
  severity: RedFlagSeverity;
  explanation: string;
}

interface RuleEngineResult {
  flags: RedFlagResult[];
  stats: {
    total: number;
    bySeverity: Record<string, number>;
    byRule: Record<string, number>;
  };
}

/**
 * Red Flag Rule Engine
 * 
 * Product Principles:
 * - Rule-based detection only (no AI)
 * - Every flag must be explainable
 * - All normalization must be traceable
 * - Use "Requires auditor review" not "Fraud detected"
 */
@Injectable()
export class RedFlagRuleEngine {
  private readonly logger = new Logger(RedFlagRuleEngine.name);

  // Built-in rules (can be overridden by database rules)
  private readonly builtInRules: RuleDefinition[] = [
    {
      id: 'round_amount',
      name: 'Round Amount',
      description: 'Flags transactions with round amounts (divisible by 10000)',
      severity: RedFlagSeverity.MEDIUM,
      isActive: true,
      defaultParams: { minAmount: 50000, divisor: 10000 },
    },
    {
      id: 'high_value',
      name: 'High Value Transaction',
      description: 'Flags transactions above threshold',
      severity: RedFlagSeverity.HIGH,
      isActive: true,
      defaultParams: { threshold: 500000 },
    },
    {
      id: 'weekend',
      name: 'Weekend Transaction',
      description: 'Flags transactions on Saturday/Sunday',
      severity: RedFlagSeverity.MEDIUM,
      isActive: true,
      defaultParams: {},
    },
    {
      id: 'duplicate',
      name: 'Duplicate Transaction',
      description: 'Flags potential duplicate transactions',
      severity: RedFlagSeverity.HIGH,
      isActive: true,
      defaultParams: { windowDays: 7, amountTolerance: 0 },
    },
    {
      id: 'suspicious_narration',
      name: 'Suspicious Narration',
      description: 'Flags descriptions containing suspicious keywords',
      severity: RedFlagSeverity.MEDIUM,
      isActive: true,
      defaultParams: {
        keywords: ['cash', 'adjustment', 'loan', 'advance', 'self', 'misc', 'transfer'],
      },
    },
  ];

  /**
   * Run all active rules against transactions
   */
  async runRules(caseId: string): Promise<RuleEngineResult> {
    // Get case
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    // Get all transactions for this case
    const transactions = await prisma.transaction.findMany({
      where: { caseId },
      orderBy: { date: 'asc' },
    });

    if (transactions.length === 0) {
      return {
        flags: [],
        stats: { total: 0, bySeverity: {}, byRule: {} },
      };
    }

    // Get custom rules from database
    const customRules = await prisma.redFlagRule.findMany({
      where: { caseId, isActive: true },
    });

    // Combine built-in and custom rules
    const activeRules = [
      ...this.builtInRules.filter(r => r.isActive),
      ...customRules.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        severity: (r.priority >= 2 ? RedFlagSeverity.HIGH : 
                  r.priority >= 1 ? RedFlagSeverity.MEDIUM : 
                  RedFlagSeverity.LOW),
        isActive: r.isActive,
        defaultParams: (r.parameters as Record<string, unknown>) || {},
      })),
    ];

    const flags: RedFlagResult[] = [];
    const stats = { total: 0, bySeverity: {} as Record<string, number>, byRule: {} as Record<string, number> };

    // Run each rule
    for (const rule of activeRules) {
      try {
        const ruleFlags = await this.runRule(rule, transactions);
        flags.push(...ruleFlags);

        // Update stats
        stats.total += ruleFlags.length;
        stats.bySeverity[rule.severity] = (stats.bySeverity[rule.severity] || 0) + ruleFlags.length;
        stats.byRule[rule.name] = (stats.byRule[rule.name] || 0) + ruleFlags.length;
      } catch (error) {
        this.logger.error(`Error running rule ${rule.name}:`, error);
      }
    }

    return { flags, stats };
  }

  /**
   * Run a specific rule against transactions
   */
  private async runRule(rule: RuleDefinition, transactions: any[]): Promise<RedFlagResult[]> {
    const flags: RedFlagResult[] = [];

    switch (rule.id) {
      case 'round_amount':
        return this.checkRoundAmount(transactions, rule);
      case 'high_value':
        return this.checkHighValue(transactions, rule);
      case 'weekend':
        return this.checkWeekend(transactions, rule);
      case 'duplicate':
        return this.checkDuplicate(transactions, rule);
      case 'suspicious_narration':
        return this.checkSuspiciousNarration(transactions, rule);
      default:
        // For custom rules, check based on condition type
        return this.runCustomRule(rule, transactions);
    }
  }

  /**
   * Rule 1: Round Amount - Flags transactions divisible by 10000
   */
  private checkRoundAmount(transactions: any[], rule: RuleDefinition): RedFlagResult[] {
    const flags: RedFlagResult[] = [];
    const params = rule.defaultParams || {};
    const minAmount = (params.minAmount as number) || 50000;
    const divisor = (params.divisor as number) || 10000;

    for (const tx of transactions) {
      if (tx.amount >= minAmount && tx.amount % divisor === 0) {
        flags.push({
          transactionId: tx.id,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          explanation: `Transaction amount ₹${tx.amount.toLocaleString('en-IN')} is a round number (divisible by ${divisor.toLocaleString('en-IN')}). Amount exceeds ₹${minAmount.toLocaleString('en-IN')} threshold. Requires auditor review.`,
        });
      }
    }

    return flags;
  }

  /**
   * Rule 2: High Value - Flags transactions above threshold
   */
  private checkHighValue(transactions: any[], rule: RuleDefinition): RedFlagResult[] {
    const flags: RedFlagResult[] = [];
    const params = rule.defaultParams || {};
    const threshold = (params.threshold as number) || 500000;

    for (const tx of transactions) {
      if (tx.amount >= threshold) {
        const typeLabel = tx.type === TransactionType.CREDIT ? 'credit' : 'debit';
        flags.push({
          transactionId: tx.id,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          explanation: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} of ₹${tx.amount.toLocaleString('en-IN')} exceeds high value threshold of ₹${threshold.toLocaleString('en-IN')}. Requires auditor review.`,
        });
      }
    }

    return flags;
  }

  /**
   * Rule 3: Weekend Transaction - Flags Saturday/Sunday transactions
   */
  private checkWeekend(transactions: any[], rule: RuleDefinition): RedFlagResult[] {
    const flags: RedFlagResult[] = [];

    for (const tx of transactions) {
      const date = new Date(tx.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
        const severity = tx.amount >= 100000 ? RedFlagSeverity.MEDIUM : RedFlagSeverity.LOW;
        
        flags.push({
          transactionId: tx.id,
          ruleId: rule.id,
          ruleName: rule.name,
          severity,
          explanation: `Transaction dated ${dayName}. Business transactions on weekends may require additional scrutiny. Amount: ₹${tx.amount.toLocaleString('en-IN')}. Requires auditor review.`,
        });
      }
    }

    return flags;
  }

  /**
   * Rule 4: Duplicate Transaction - Flags similar transactions within window
   */
  private checkDuplicate(transactions: any[], rule: RuleDefinition): RedFlagResult[] {
    const flags: RedFlagResult[] = [];
    const params = rule.defaultParams || {};
    const windowDays = (params.windowDays as number) || 7;
    const tolerance = (params.amountTolerance as number) || 0;

    // Group transactions by counterparty (normalize for comparison)
    const byCounterparty = new Map<string, any[]>();
    
    for (const tx of transactions) {
      const key = (tx.counterparty || 'unknown').toLowerCase().trim();
      if (!byCounterparty.has(key)) {
        byCounterparty.set(key, []);
      }
      byCounterparty.get(key)!.push(tx);
    }

    // Check for duplicates within each counterparty group
    for (const [counterparty, txs] of byCounterparty) {
      if (txs.length < 2) continue;

      // Sort by date
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (let i = 0; i < txs.length; i++) {
        for (let j = i + 1; j < txs.length; j++) {
          const tx1 = txs[i];
          const tx2 = txs[j];
          
          const daysDiff = Math.abs(
            (new Date(tx2.date).getTime() - new Date(tx1.date).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff <= windowDays) {
            const amountDiff = Math.abs(tx1.amount - tx2.amount);
            if (amountDiff <= tolerance) {
              flags.push({
                transactionId: tx2.id,
                ruleId: rule.id,
                ruleName: rule.name,
                severity: rule.severity,
                explanation: `Potential duplicate: Transaction of ₹${tx2.amount.toLocaleString('en-IN')} to "${counterparty}" within ${Math.round(daysDiff)} days of similar transaction (₹${tx1.amount.toLocaleString('en-IN')}). Date: ${new Date(tx2.date).toLocaleDateString('en-IN')}. Requires auditor review.`,
              });
            }
          }
        }
      }
    }

    return flags;
  }

  /**
   * Rule 5: Suspicious Narration - Flags descriptions with keywords
   */
  private checkSuspiciousNarration(transactions: any[], rule: RuleDefinition): RedFlagResult[] {
    const flags: RedFlagResult[] = [];
    const params = rule.defaultParams || {};
    const keywords = (params.keywords as string[]) || ['cash', 'adjustment', 'loan', 'advance', 'self', 'misc', 'transfer'];

    for (const tx of transactions) {
      const desc = (tx.description || '').toLowerCase();
      
      for (const keyword of keywords) {
        if (desc.includes(keyword)) {
          flags.push({
            transactionId: tx.id,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            explanation: `Transaction description contains keyword "${keyword}": "${tx.description}". Amount: ₹${tx.amount.toLocaleString('en-IN')}. Requires auditor review.`,
          });
          break; // Only flag once per transaction
        }
      }
    }

    return flags;
  }

  /**
   * Run custom rule from database
   */
  private runCustomRule(rule: RuleDefinition, transactions: any[]): RedFlagResult[] {
    const flags: RedFlagResult[] = [];
    const params = rule.defaultParams || {};
    const conditionType = (params.conditionType as string) || '';
    const conditionValue = (params.conditionValue as string) || '';

    switch (conditionType) {
      case 'AMOUNT_ABOVE':
        const threshold = parseFloat(conditionValue) || 0;
        for (const tx of transactions) {
          if (tx.amount > threshold) {
            flags.push({
              transactionId: tx.id,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              explanation: `${rule.description}: Amount ₹${tx.amount.toLocaleString('en-IN')} exceeds threshold ₹${threshold.toLocaleString('en-IN')}. Requires auditor review.`,
            });
          }
        }
        break;

      case 'DESCRIPTION_CONTAINS':
        for (const tx of transactions) {
          if ((tx.description || '').toLowerCase().includes(conditionValue.toLowerCase())) {
            flags.push({
              transactionId: tx.id,
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              explanation: `${rule.description}: Description contains "${conditionValue}". Requires auditor review.`,
            });
          }
        }
        break;

      // Add more condition types as needed
    }

    return flags;
  }

  /**
   * Create red flag records from rule engine results
   */
  async createRedFlags(caseId: string, ruleResults: RedFlagResult[]): Promise<number> {
    if (ruleResults.length === 0) return 0;

    let createdCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const flag of ruleResults) {
        // Check if this flag already exists
        const existing = await tx.redFlag.findFirst({
          where: {
            transactionId: flag.transactionId,
            ruleId: flag.ruleId,
          },
        });

        if (!existing) {
          await tx.redFlag.create({
            data: {
              caseId,
              ruleId: flag.ruleId,
              ruleName: flag.ruleName,
              title: flag.ruleName, // Use ruleName as title
              transactionId: flag.transactionId,
              explanation: flag.explanation,
              severity: flag.severity,
              reviewed: false,
            },
          });
          createdCount++;
        }
      }
    });

    return createdCount;
  }

  /**
   * Get red flags with filters
   */
  async getRedFlags(
    caseId: string,
    options: {
      severity?: string;
      reviewed?: boolean;
      ruleName?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { severity, reviewed, ruleName, page = 1, limit = 50 } = options;

    const where: any = { caseId };
    if (severity) where.severity = severity;
    if (reviewed !== undefined) where.reviewed = reviewed;
    if (ruleName) where.ruleName = { contains: ruleName, mode: 'insensitive' };

    const [flags, total] = await Promise.all([
      prisma.redFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          transaction: {
            select: {
              id: true,
              date: true,
              description: true,
              amount: true,
              type: true,
              counterparty: true,
            },
          },
        },
      }),
      prisma.redFlag.count({ where }),
    ]);

    return {
      flags,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get red flag statistics
   */
  async getStats(caseId: string) {
    const [allFlags, bySeverity, byRule, reviewed] = await Promise.all([
      prisma.redFlag.findMany({ where: { caseId } }),
      prisma.redFlag.groupBy({
        by: ['severity'],
        where: { caseId },
        _count: true,
      }),
      prisma.redFlag.groupBy({
        by: ['ruleName'],
        where: { caseId },
        _count: true,
      }),
      prisma.redFlag.findMany({
        where: { caseId, reviewed: true },
      }),
    ]);

    return {
      total: allFlags.length,
      high: allFlags.filter(f => f.severity === RedFlagSeverity.HIGH).length,
      medium: allFlags.filter(f => f.severity === RedFlagSeverity.MEDIUM).length,
      low: allFlags.filter(f => f.severity === RedFlagSeverity.LOW).length,
      critical: allFlags.filter(f => f.severity === RedFlagSeverity.CRITICAL).length,
      reviewed: reviewed.length,
      unreviewed: allFlags.length - reviewed.length,
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
      byRule: byRule.map(r => ({ ruleName: r.ruleName, count: r._count })),
    };
  }

  /**
   * Mark flag as reviewed
   */
  async markReviewed(flagId: string, userId: string) {
    return prisma.redFlag.update({
      where: { id: flagId },
      data: {
        reviewed: true,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });
  }

  /**
   * Add feedback to flag
   */
  async addFeedback(flagId: string, userId: string, feedback: string, type: 'IMPORTANT' | 'FALSE_POSITIVE' | 'NEEDS_EVIDENCE' | 'IGNORE') {
    // Update flag
    await prisma.redFlag.update({
      where: { id: flagId },
      data: {
        feedbackType: type,
        feedbackNote: feedback,
        feedbackById: userId,
        feedbackAt: new Date(),
      },
    });

    // Create feedback history
    return prisma.redFlagFeedback.create({
      data: {
        redFlagId: flagId,
        userId,
        type,
        note: feedback,
      },
    });
  }
}