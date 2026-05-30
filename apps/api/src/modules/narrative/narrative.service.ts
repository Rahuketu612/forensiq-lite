import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { NarrativeStatus } from '@forensiq/database';
import { 
  GenerateNarrativeDto, 
  UpdateNarrativeDto, 
  UpdateNarrativeSectionDto,
  TimelineEventDto,
  ObservationDto,
  OpenQuestionDto,
  EvidenceGapDto,
  RecommendationDto,
} from './narrative.dto';

@Injectable()
export class NarrativeService {
  private readonly logger = new Logger(NarrativeService.name);

  /**
   * Generate a narrative for a case by aggregating:
   * - Transactions
   * - Red Flags
   * - Fund Trail
   * - Entities
   * - Investigation Notes
   */
  async generateNarrative(dto: GenerateNarrativeDto, userId?: string) {
    this.logger.log(`Generating narrative for case: ${dto.caseId}`);
    
    // Get case data
    const caseData = await prisma.case.findUnique({
      where: { id: dto.caseId },
      include: {
        transactions: {
          orderBy: { date: 'asc' },
          take: 500,
        },
        redFlags: {
          include: { rule: true },
          orderBy: { createdAt: 'desc' },
        },
        fundTrailPatterns: true,
        entities: {
          include: { aliases: true },
        },
        investigationNotes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!caseData) {
      throw new NotFoundException(`Case ${dto.caseId} not found`);
    }

    // Generate narrative sections
    const timeline = this.buildTimeline(caseData.transactions, caseData.redFlags, caseData.investigationNotes);
    const observations = this.buildObservations(caseData);
    const openQuestions = this.buildOpenQuestions(caseData);
    const evidenceGaps = this.buildEvidenceGaps(caseData);
    const recommendations = this.buildRecommendations(caseData);

    // Calculate summary
    const summary = this.generateSummary(caseData);

    // Get next version number
    const latestNarrative = await prisma.investigationNarrative.findFirst({
      where: { caseId: dto.caseId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latestNarrative?.version || 0) + 1;

    // Create narrative
    const narrative = await prisma.investigationNarrative.create({
      data: {
        caseId: dto.caseId,
        version: nextVersion,
        status: NarrativeStatus.GENERATED,
        generatedBy: 'system',
        title: dto.title || `Investigation Narrative - ${caseData.caseNumber}`,
        summary,
        timeline: timeline as any,
        observations: observations as any,
        openQuestions: openQuestions as any,
        evidenceGaps: evidenceGaps as any,
        recommendations: recommendations as any,
        prompt: dto.prompt,
      },
    });

    // Create version snapshot
    await prisma.narrativeVersion.create({
      data: {
        narrativeId: narrative.id,
        version: nextVersion,
        title: narrative.title,
        summary,
        timeline: timeline as any,
        observations: observations as any,
        openQuestions: openQuestions as any,
        evidenceGaps: evidenceGaps as any,
        recommendations: recommendations as any,
        changeNotes: 'Initial generation from case data',
        generatedBy: 'system',
      },
    });

    this.logger.log(`Created narrative ${narrative.id} version ${nextVersion}`);
    return narrative;
  }

  async findAll(caseId: string) {
    return prisma.investigationNarrative.findMany({
      where: { caseId },
      orderBy: { version: 'desc' },
    });
  }

  async findOne(id: string) {
    const narrative = await prisma.investigationNarrative.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { version: 'desc' } },
        case: { select: { caseNumber: true, title: true } },
      },
    });

    if (!narrative) {
      throw new NotFoundException(`Narrative ${id} not found`);
    }

    return narrative;
  }

  async updateNarrative(id: string, dto: UpdateNarrativeDto, userId?: string) {
    this.logger.log(`Updating narrative ${id}`);
    
    const data: any = { ...dto };
    if (dto.status === NarrativeStatus.APPROVED) {
      data.approvedAt = new Date();
      data.approvedById = userId;
    }

    return prisma.investigationNarrative.update({
      where: { id },
      data,
    });
  }

  async updateSection(id: string, dto: UpdateNarrativeSectionDto) {
    this.logger.log(`Updating narrative ${id} section: ${dto.section}`);
    
    const updateData: any = {};
    updateData[dto.section] = dto.data;

    return prisma.investigationNarrative.update({
      where: { id },
      data: updateData,
    });
  }

  // =====================================================================
  // Narrative Generation Helpers
  // =====================================================================

  private buildTimeline(transactions: any[], redFlags: any[], notes: any[]): TimelineEventDto[] {
    const events: TimelineEventDto[] = [];

    // Add transaction events
    transactions.forEach(tx => {
      events.push({
        date: tx.date.toISOString(),
        type: 'transaction',
        title: `Transaction: ${tx.description?.substring(0, 50) || 'N/A'}`,
        description: `${tx.type} of ${Math.abs(tx.amount).toLocaleString()} - ${tx.counterparty || 'Unknown counterparty'}`,
        transactionId: tx.id,
        importance: Math.abs(tx.amount) > 50000 ? 'high' : Math.abs(tx.amount) > 10000 ? 'medium' : 'low',
      });
    });

    // Add red flag events
    redFlags.forEach(flag => {
      events.push({
        date: flag.createdAt.toISOString(),
        type: 'red_flag',
        title: `Red Flag: ${flag.rule?.name || 'Unknown rule'}`,
        description: flag.description || flag.rule?.description || 'Flag detected',
        flagId: flag.id,
        importance: flag.severity === 'CRITICAL' || flag.severity === 'HIGH' ? 'high' : 'medium',
      });
    });

    // Add note events
    notes.forEach(note => {
      events.push({
        date: note.createdAt.toISOString(),
        type: 'note',
        title: `Note: ${note.title || 'Investigation note'}`,
        description: note.content.substring(0, 200),
        importance: 'low',
      });
    });

    // Sort by date
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
  }

  private buildObservations(caseData: any): ObservationDto[] {
    const observations: ObservationDto[] = [];
    
    // Analyze transaction patterns
    const amounts = caseData.transactions.map((t: any) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;
    const highValueTxs = caseData.transactions.filter((t: any) => Math.abs(t.amount) > avgAmount * 2);

    if (highValueTxs.length > 0) {
      observations.push({
        id: 'obs-1',
        category: 'transactions',
        title: 'High-value transactions detected',
        description: `${highValueTxs.length} transactions exceed twice the average amount of ${avgAmount.toLocaleString()}. These may warrant additional scrutiny.`,
        evidence: highValueTxs.map((t: any) => t.id),
        confidence: 0.85,
      });
    }

    // Analyze red flags
    const criticalFlags = caseData.redFlags.filter((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    if (criticalFlags.length > 0) {
      observations.push({
        id: 'obs-2',
        category: 'red_flags',
        title: `${criticalFlags.length} high-priority red flags identified`,
        description: 'The following red flags require attention based on their severity and potential impact on the investigation.',
        evidence: criticalFlags.map((f: any) => f.id),
        confidence: 0.95,
      });
    }

    // Analyze fund patterns
    const patterns = caseData.fundTrailPatterns;
    if (patterns.length > 0) {
      observations.push({
        id: 'obs-3',
        category: 'fund_flow',
        title: 'Fund flow patterns detected',
        description: `${patterns.length} fund trail pattern(s) have been identified in the transaction data. Review the fund trail analysis for details.`,
        evidence: patterns.map((p: any) => p.id),
        confidence: 0.90,
      });
    }

    // Entity analysis
    const entities = caseData.entities;
    if (entities.length > 0) {
      observations.push({
        id: 'obs-4',
        category: 'entities',
        title: `${entities.length} entities identified and resolved`,
        description: 'Multiple transactions reference related entities. Entity resolution has consolidated these for analysis.',
        evidence: entities.map((e: any) => e.id),
        confidence: 0.80,
      });
    }

    return observations;
  }

  private buildOpenQuestions(caseData: any): OpenQuestionDto[] {
    const questions: OpenQuestionDto[] = [];
    
    // Unresolved red flags
    const unresolvedFlags = caseData.redFlags.filter((f: any) => f.status !== 'RESOLVED' && f.status !== 'FALSE_POSITIVE');
    if (unresolvedFlags.length > 0) {
      questions.push({
        id: 'q-1',
        question: 'Are all detected red flags explainable by legitimate transactions?',
        context: `${unresolvedFlags.length} red flag(s) remain unresolved. Each should be investigated and documented.`,
        priority: unresolvedFlags.length > 5 ? 'high' : 'medium',
        relatedFlags: unresolvedFlags.map((f: any) => f.id),
      });
    }

    // Missing documentation
    const largeTransactions = caseData.transactions.filter((t: any) => Math.abs(t.amount) > 100000);
    if (largeTransactions.length > 0) {
      questions.push({
        id: 'q-2',
        question: 'Is supporting documentation available for all transactions exceeding 100,000?',
        context: `${largeTransactions.length} large transaction(s) require verification documentation.`,
        priority: 'high',
        relatedTransactions: largeTransactions.map((t: any) => t.id),
      });
    }

    // Entity questions
    const highRiskEntities = caseData.entities.filter((e: any) => e.riskScore > 70);
    if (highRiskEntities.length > 0) {
      questions.push({
        id: 'q-3',
        question: 'Has the relationship with high-risk entities been verified?',
        context: `${highRiskEntities.length} entity/entities have elevated risk scores based on transaction patterns.`,
        priority: 'medium',
        relatedEntities: highRiskEntities.map((e: any) => e.id),
      });
    }

    // Cash transactions
    const cashTransactions = caseData.transactions.filter((t: any) => t.mode === 'CASH');
    if (cashTransactions.length > 5) {
      questions.push({
        id: 'q-4',
        question: 'What is the source and justification for multiple cash transactions?',
        context: `${cashTransactions.length} cash transactions detected. Cash transactions may require additional verification.`,
        priority: 'medium',
        relatedTransactions: cashTransactions.map((t: any) => t.id),
      });
    }

    return questions;
  }

  private buildEvidenceGaps(caseData: any): EvidenceGapDto[] {
    const gaps: EvidenceGapDto[] = [];

    // Check for missing documentation
    const largeDeposits = caseData.transactions.filter((t: any) => t.type === 'CREDIT' && Math.abs(t.amount) > 50000);
    if (largeDeposits.length > 0) {
      gaps.push({
        id: 'gap-1',
        gap: 'Large cash deposits require source documentation',
        whyItMatters: 'Deposits exceeding 50,000 may have reporting requirements and should be verified.',
        suggestedAction: 'Request bank deposit slips and source documentation for each large deposit.',
        priority: 'high',
      });
    }

    // Check for circular transactions
    const linkedTxIds = new Set<string>();
    caseData.transactionLinks.forEach((link: any) => {
      linkedTxIds.add(link.sourceTransactionId);
      linkedTxIds.add(link.targetTransactionId);
    });

    if (caseData.transactionLinks.length > 3) {
      gaps.push({
        id: 'gap-2',
        gap: 'Multiple linked transactions require investigation',
        whyItMatters: 'Linked transactions may indicate circular flow or structured transactions.',
        suggestedAction: 'Review all linked transactions and document the business rationale for each.',
        priority: 'medium',
      });
    }

    // Check entity verification
    const unreviewedEntities = caseData.entities.filter((e: any) => !e.reviewed);
    if (unreviewedEntities.length > 0) {
      gaps.push({
        id: 'gap-3',
        gap: `${unreviewedEntities.length} entity/entities have not been manually reviewed`,
        whyItMatters: 'Entity resolution is algorithmic and may require human verification.',
        suggestedAction: 'Manually review each entity and confirm accuracy of grouping.',
        priority: 'medium',
      });
    }

    return gaps;
  }

  private buildRecommendations(caseData: any): RecommendationDto[] {
    const recommendations: RecommendationDto[] = [];

    // High-priority red flags
    const criticalFlags = caseData.redFlags.filter((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
    if (criticalFlags.length > 0) {
      recommendations.push({
        id: 'rec-1',
        recommendation: 'Prioritize investigation of high-severity red flags',
        rationale: `${criticalFlags.length} red flag(s) have been classified as HIGH or CRITICAL priority based on established rules.`,
        priority: 'high',
        category: 'investigation',
      });
    }

    // Fund trail analysis
    if (caseData.fundTrailPatterns.length > 0) {
      recommendations.push({
        id: 'rec-2',
        recommendation: 'Complete fund flow analysis documentation',
        rationale: 'Fund trail patterns have been detected. Document the complete flow from source to destination.',
        priority: 'medium',
        category: 'documentation',
      });
    }

    // Entity verification
    recommendations.push({
      id: 'rec-3',
      recommendation: 'Verify entity relationships with supporting documentation',
      rationale: 'Entity resolution is based on transaction patterns. Independent verification is recommended.',
      priority: 'medium',
      category: 'verification',
    });

    // Summary report
    recommendations.push({
      id: 'rec-4',
      recommendation: 'Generate investigation summary report',
      rationale: 'All available data has been analyzed. A formal report would document findings and support conclusions.',
      priority: 'low',
      category: 'reporting',
    });

    return recommendations;
  }

  private generateSummary(caseData: any): string {
    const txCount = caseData.transactions.length;
    const flagCount = caseData.redFlags.length;
    const entityCount = caseData.entities.length;
    const patternCount = caseData.fundTrailPatterns.length;

    const criticalFlags = caseData.redFlags.filter((f: any) => f.severity === 'CRITICAL').length;
    const highFlags = caseData.redFlags.filter((f: any) => f.severity === 'HIGH').length;

    // Neutral language - never conclude fraud
    let summary = `Investigation analysis for Case ${caseData.caseNumber} (`;

    if (flagCount === 0) {
      summary += `${txCount} transactions reviewed, no red flags detected.`;
    } else {
      summary += `${txCount} transactions analyzed, ${flagCount} red flags identified`;
      if (criticalFlags > 0) summary += ` (${criticalFlags} CRITICAL, ${highFlags} HIGH)`;
      summary += '. ';
    }

    if (entityCount > 0) {
      summary += `${entityCount} entities have been identified. `;
    }

    if (patternCount > 0) {
      summary += `${patternCount} fund flow pattern(s) have been detected.`;
    }

    summary += ' This narrative was generated automatically and should be reviewed by an investigator.';

    return summary;
  }
}