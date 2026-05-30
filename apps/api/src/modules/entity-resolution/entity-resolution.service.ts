import { Injectable, Logger } from '@nestjs/common';
import { prisma, MatchType } from '@forensiq/database';

export interface EntityMatchResult {
  matchType: MatchType;
  confidence: number;
  reason: string;
  matchValue: string;
}

export interface EntityCluster {
  canonicalName: string;
  aliases: string[];
  matchType: MatchType;
  confidence: number;
  reason: string;
  transactionIds: string[];
  totalAmount: number;
  transactionCount: number;
}

/**
 * Entity Resolution Service V1
 * Uses deterministic matching rules to cluster transactions by counterparty
 * No AI/ML - purely rule-based matching
 */
@Injectable()
export class EntityResolutionService {
  private readonly logger = new Logger(EntityResolutionService.name);

  constructor() {}

  /**
   * Normalize a string for comparison (lowercase, remove special chars)
   */
  normalizeName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract potential identifiers from description/narration
   */
  extractIdentifiers(description: string | null): {
    gstin?: string;
    pan?: string;
    bankAccount?: string;
    ifsc?: string;
    upiId?: string;
    phone?: string;
  } {
    const identifiers: {
      gstin?: string;
      pan?: string;
      bankAccount?: string;
      ifsc?: string;
      upiId?: string;
      phone?: string;
    } = {};
    
    if (!description) return identifiers;

    // GSTIN pattern
    const gstinMatch = description.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i);
    if (gstinMatch) {
      identifiers.gstin = gstinMatch[1].toUpperCase();
    }

    // PAN pattern
    const panMatch = description.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i);
    if (panMatch) {
      identifiers.pan = panMatch[1].toUpperCase();
    }

    // Bank account
    const bankAccountMatch = description.match(/\b([0-9]{9,18})\b/);
    if (bankAccountMatch) {
      identifiers.bankAccount = bankAccountMatch[1];
    }

    // IFSC
    const ifscMatch = description.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
    if (ifscMatch) {
      identifiers.ifsc = ifscMatch[1].toUpperCase();
    }

    // UPI ID
    const upiMatch = description.match(/\b([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)\b/);
    if (upiMatch && upiMatch[1].includes('upi')) {
      identifiers.upiId = upiMatch[1].toLowerCase();
    }

    // Phone
    const phoneMatch = description.match(/\b(0?[6-9][0-9]{9})\b/);
    if (phoneMatch) {
      identifiers.phone = phoneMatch[1];
    }

    return identifiers;
  }

  /**
   * Match two entities by their identifiers
   */
  matchByIdentifier(
    name1: string | null,
    name2: string | null,
    identifiers1: Record<string, string | undefined>,
    identifiers2: Record<string, string | undefined>,
  ): EntityMatchResult | null {
    // 1. Exact match on counterparty name
    if (name1 && name2 && name1.trim() === name2.trim()) {
      return {
        matchType: 'EXACT_NAME' as MatchType,
        confidence: 1.0,
        reason: `Exact name match: "${name1}"`,
        matchValue: name1.trim(),
      };
    }

    // 2. Normalized name match
    const norm1 = this.normalizeName(name1 || '');
    const norm2 = this.normalizeName(name2 || '');
    
    if (norm1 && norm2 && norm1 === norm2) {
      return {
        matchType: 'NORMALIZED_NAME' as MatchType,
        confidence: 0.95,
        reason: `Normalized name match: "${name1}" ≈ "${name2}"`,
        matchValue: norm1,
      };
    }

    // 3. GSTIN match
    if (identifiers1.gstin && identifiers2.gstin && 
        identifiers1.gstin === identifiers2.gstin) {
      return {
        matchType: 'GSTIN' as MatchType,
        confidence: 1.0,
        reason: `GSTIN match: ${identifiers1.gstin}`,
        matchValue: identifiers1.gstin,
      };
    }

    // 4. PAN match
    if (identifiers1.pan && identifiers2.pan && 
        identifiers1.pan === identifiers2.pan) {
      return {
        matchType: 'PAN' as MatchType,
        confidence: 1.0,
        reason: `PAN match: ${identifiers1.pan}`,
        matchValue: identifiers1.pan,
      };
    }

    // 5. Bank account match
    if (identifiers1.bankAccount && identifiers2.bankAccount && 
        identifiers1.bankAccount === identifiers2.bankAccount) {
      const ifscMatch = identifiers1.ifsc && identifiers2.ifsc && 
                        identifiers1.ifsc === identifiers2.ifsc;
      return {
        matchType: 'BANK_ACCOUNT' as MatchType,
        confidence: ifscMatch ? 1.0 : 0.9,
        reason: `Bank account match${ifscMatch ? ` with IFSC ${identifiers1.ifsc}` : ''}`,
        matchValue: identifiers1.bankAccount,
      };
    }

    // 6. IFSC match alone
    if (identifiers1.ifsc && identifiers2.ifsc && 
        identifiers1.ifsc === identifiers2.ifsc && 
        !identifiers1.bankAccount && !identifiers2.bankAccount) {
      return {
        matchType: 'IFSC' as MatchType,
        confidence: 0.5,
        reason: `IFSC code match: ${identifiers1.ifsc} (bank-only, no account)`,
        matchValue: identifiers1.ifsc,
      };
    }

    // 7. UPI ID match
    if (identifiers1.upiId && identifiers2.upiId && 
        identifiers1.upiId === identifiers2.upiId) {
      return {
        matchType: 'UPI_ID' as MatchType,
        confidence: 1.0,
        reason: `UPI ID match: ${identifiers1.upiId}`,
        matchValue: identifiers1.upiId,
      };
    }

    // 8. Phone number match
    if (identifiers1.phone && identifiers2.phone && 
        identifiers1.phone === identifiers2.phone) {
      return {
        matchType: 'PHONE' as MatchType,
        confidence: 0.85,
        reason: `Phone match: ${identifiers1.phone}`,
        matchValue: identifiers1.phone,
      };
    }

    return null;
  }

  /**
   * Analyze transactions and cluster them into entities
   */
  async analyzeTransactions(caseId: string): Promise<EntityCluster[]> {
    this.logger.log(`Starting entity analysis for case ${caseId}`);

    const transactions = await prisma.transaction.findMany({
      where: { caseId },
      orderBy: { date: 'asc' },
    });

    if (transactions.length === 0) {
      this.logger.log(`No transactions found for case ${caseId}`);
      return [];
    }

    const txData = transactions.map((tx) => ({
      ...tx,
      identifiers: {
        ...this.extractIdentifiers(tx.description),
        gstin: tx.gstin || undefined,
        pan: tx.pan || undefined,
        bankAccount: tx.bankAccount || undefined,
        ifsc: tx.ifsc || undefined,
        upiId: tx.upiId || undefined,
        phone: tx.phone || undefined,
      },
    }));

    const clusters = this.buildClusters(txData);

    this.logger.log(`Identified ${clusters.length} entities for case ${caseId}`);
    return clusters;
  }

  /**
   * Union-Find based clustering algorithm
   */
  private buildClusters(
    transactions: Array<{
      id: string;
      counterparty: string | null;
      amount: number;
      description: string | null;
      identifiers: Record<string, string | undefined>;
    }>
  ): EntityCluster[] {
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };
    const union = (x: string, y: string) => {
      const px = find(x);
      const py = find(y);
      if (px !== py) {
        parent.set(px, py);
      }
    };

    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const tx1 = transactions[i];
        const tx2 = transactions[j];

        const match = this.matchByIdentifier(
          tx1.counterparty,
          tx2.counterparty,
          tx1.identifiers,
          tx2.identifiers,
        );

        if (match) {
          union(tx1.id, tx2.id);
        }
      }
    }

    const entityGroups = new Map<string, typeof transactions>();
    
    for (const tx of transactions) {
      const root = find(tx.id);
      if (!entityGroups.has(root)) {
        entityGroups.set(root, []);
      }
      entityGroups.get(root)!.push(tx);
    }

    const clusters: EntityCluster[] = [];

    for (const [, group] of entityGroups) {
      const nameCounts = new Map<string, { count: number; length: number }>();
      const aliasSet = new Set<string>();
      
      for (const tx of group) {
        const name = tx.counterparty || 'Unknown Entity';
        const existingMap: { count: number; length: number } = nameCounts.get(name) || { count: 0, length: 0 };
        nameCounts.set(name, {
          count: existingMap.count + 1,
          length: name.length,
        });
        aliasSet.add(name);
      }

      const sortedEntries = Array.from(nameCounts.entries()).sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return b[1].length - a[1].length;
      });
      const canonicalName = sortedEntries[0]?.[0] || 'Unknown Entity';

      let matchType: MatchType = 'EXACT_NAME';
      let confidence = 1.0;
      let reason = '';

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const match = this.matchByIdentifier(
            group[i].counterparty,
            group[j].counterparty,
            group[i].identifiers,
            group[j].identifiers,
          );
          if (match && match.confidence >= confidence) {
            matchType = match.matchType;
            confidence = match.confidence;
            reason = match.reason;
          }
        }
      }

      const totalAmount = group.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      clusters.push({
        canonicalName,
        aliases: Array.from(aliasSet),
        matchType,
        confidence,
        reason: reason || `Grouped ${group.length} transactions by ${matchType}`,
        transactionIds: group.map((tx) => tx.id),
        totalAmount,
        transactionCount: group.length,
      });
    }

    return clusters.sort((a, b) => b.transactionCount - a.transactionCount);
  }

  /**
   * Persist entity clusters to the database
   */
  async persistClusters(
    caseId: string,
    clusters: EntityCluster[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const cluster of clusters) {
      const existing = await prisma.entity.findFirst({
        where: {
          caseId,
          canonicalName: cluster.canonicalName,
        },
        include: { aliases: true },
      });

      if (existing) {
        await prisma.entity.update({
          where: { id: existing.id },
          data: {
            totalAmount: cluster.totalAmount,
            transactionCount: cluster.transactionCount,
            explanation: cluster.reason,
          },
        });

        for (const aliasName of cluster.aliases) {
          const aliasExists = existing.aliases.some(
            (a) => a.aliasName.toLowerCase() === aliasName.toLowerCase()
          );
          if (!aliasExists) {
            await prisma.entityAlias.create({
              data: {
                entityId: existing.id,
                aliasName,
                matchType: cluster.matchType,
                confidenceScore: cluster.confidence,
                matchReason: cluster.reason,
              },
            });
          }
        }

        for (const txId of cluster.transactionIds) {
          const linkExists = await prisma.transactionEntity.findFirst({
            where: {
              transactionId: txId,
              entityId: existing.id,
            },
          });

          if (!linkExists) {
            await prisma.transactionEntity.create({
              data: {
                transactionId: txId,
                entityId: existing.id,
                matchScore: cluster.confidence,
              },
            });
          }
        }

        await prisma.entityAuditLog.create({
          data: {
            entityId: existing.id,
            action: 'UPDATE',
            description: `Updated entity with ${cluster.transactionCount} transactions`,
            confidenceScore: cluster.confidence,
            matchDetails: {
              matchType: cluster.matchType,
              aliases: cluster.aliases,
            },
            triggeredBy: 'system',
          },
        });

        updated++;
      } else {
        const entity = await prisma.entity.create({
          data: {
            caseId,
            canonicalName: cluster.canonicalName,
            totalAmount: cluster.totalAmount,
            transactionCount: cluster.transactionCount,
            explanation: cluster.reason,
            riskScore: this.calculateRiskScore(cluster),
          },
        });

        for (const aliasName of cluster.aliases) {
          await prisma.entityAlias.create({
            data: {
              entityId: entity.id,
              aliasName,
              matchType: cluster.matchType,
              source: 'counterparty',
              confidenceScore: cluster.confidence,
              matchReason: cluster.reason,
            },
          });
        }

        for (const txId of cluster.transactionIds) {
          await prisma.transactionEntity.create({
            data: {
              transactionId: txId,
              entityId: entity.id,
              matchScore: cluster.confidence,
            },
          });
        }

        await prisma.entityAuditLog.create({
          data: {
            entityId: entity.id,
            action: 'CREATE',
            description: `Created entity "${cluster.canonicalName}" with ${cluster.transactionCount} transactions`,
            confidenceScore: cluster.confidence,
            matchDetails: {
              matchType: cluster.matchType,
              aliases: cluster.aliases,
              reason: cluster.reason,
            },
            triggeredBy: 'system',
          },
        });

        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Calculate risk score based on entity characteristics
   */
  private calculateRiskScore(cluster: EntityCluster): number {
    let risk = 0;

    if (cluster.transactionCount > 10) risk += 20;
    if (cluster.totalAmount > 10000000) risk += 30;
    if (cluster.confidence < 0.8) risk += 25;

    return Math.min(risk, 100);
  }

  /**
   * Get entity by ID with full details
   */
  async getEntityById(entityId: string): Promise<any> {
    return prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        aliases: {
          orderBy: { confidenceScore: 'desc' },
        },
        transactions: {
          include: {
            transaction: {
              select: {
                id: true,
                date: true,
                amount: true,
                type: true,
                counterparty: true,
                description: true,
              },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get all entities for a case
   */
  async getEntitiesByCase(caseId: string, includeReviewed?: boolean): Promise<any[]> {
    return prisma.entity.findMany({
      where: {
        caseId,
        ...(includeReviewed === false ? { reviewed: false } : {}),
      },
      include: {
        aliases: {
          orderBy: { confidenceScore: 'desc' },
        },
        _count: {
          select: {
            transactions: true,
            auditLogs: true,
          },
        },
      },
      orderBy: [
        { reviewed: 'asc' },
        { transactionCount: 'desc' },
        { riskScore: 'desc' },
      ],
    });
  }

  /**
   * Mark entity as reviewed
   */
  async reviewEntity(entityId: string, userId?: string): Promise<any> {
    return prisma.entity.update({
      where: { id: entityId },
      data: {
        reviewed: true,
        reviewedAt: new Date(),
        reviewedBy: userId,
      },
    });
  }
}
