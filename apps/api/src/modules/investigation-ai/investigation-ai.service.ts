import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { PromptBuilderService, CaseContext } from './prompt-builder.service';
import { prisma } from '@forensiq/database';

export interface AnalysisResult {
  analysis: string;
  model: string;
  duration: number;
  tokenCount?: number;
}

export type AnalysisType = 'SUMMARY' | 'TIMELINE' | 'QUESTIONS' | 'EVIDENCE_GAPS' | 'FULL_ANALYSIS';

@Injectable()
export class InvestigationAiService {
  private readonly logger = new Logger(InvestigationAiService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly promptBuilderService: PromptBuilderService,
  ) {}

  async performAnalysis(
    caseId: string,
    analysisType: AnalysisType,
    userId: string,
    model?: string,
  ): Promise<AnalysisResult> {
    this.logger.log(`Starting ${analysisType} analysis for case ${caseId}`);

    // Fetch case context
    const caseContext = await this.fetchCaseContext(caseId);

    // Build prompt based on analysis type
    const prompt = this.buildPrompt(analysisType, caseContext);

    // Generate analysis using Ollama
    const selectedModel = model || this.ollamaService.getDefaultModel();
    const startTime = Date.now();
    const response = await this.ollamaService.generate(prompt, selectedModel);
    const duration = Date.now() - startTime;

    // Store analysis for audit trail
    await this.storeAnalysis(caseId, analysisType, prompt, response.response, selectedModel, duration, userId);

    return {
      analysis: response.response,
      model: selectedModel,
      duration,
      tokenCount: response.eval_count,
    };
  }

  async getPreviousAnalyses(caseId: string) {
    return prisma.aiAnalysis.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getAnalysisById(analysisId: string) {
    return prisma.aiAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async checkOllamaHealth(): Promise<{ available: boolean; models: string[] }> {
    const available = await this.ollamaService.checkHealth();
    return {
      available,
      models: this.ollamaService.getAvailableModels(),
    };
  }

  private async fetchCaseContext(caseId: string): Promise<CaseContext> {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 50,
        },
        redFlags: {
          include: {
            rule: true,
          },
          orderBy: { severity: 'desc' },
        },
        entities: {
          include: {
            aliases: true,
          },
          orderBy: { riskScore: 'desc' },
          take: 20,
        },
        fundTrailPatterns: {
          orderBy: { confidenceScore: 'desc' },
        },
        investigationNotes: {
          include: {
            author: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!caseData) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    // Get graph summary
    const graphSummary = await this.getGraphSummary(caseId);

    return {
      caseNumber: caseData.caseNumber,
      caseTitle: caseData.title,
      caseDescription: caseData.description || '',
      status: caseData.status,
      riskLevel: caseData.riskLevel || 'MEDIUM',
      clientName: caseData.clientName || 'Unknown',
      createdAt: caseData.createdAt.toISOString(),
      transactions: caseData.transactions.map((t) => ({
        date: t.date.toISOString().split('T')[0],
        description: t.description || 'No description',
        counterparty: t.counterparty || 'N/A',
        mode: t.mode,
        type: t.type,
        amount: t.amount,
        balance: t.balance || 0,
      })),
      redFlags: caseData.redFlags.map((rf: any) => ({
        ruleName: rf.rule?.name || 'Unknown Rule',
        severity: rf.severity,
        description: rf.description || '',
        date: rf.createdAt.toISOString().split('T')[0],
        amount: rf.amount || 0,
        counterparty: rf.counterparty || 'N/A',
        reviewed: rf.reviewed,
      })),
      entities: caseData.entities.map((e: any) => ({
        name: e.canonicalName,
        riskScore: e.riskScore,
        transactionCount: e.transactionCount,
        totalAmount: e.totalAmount,
        aliases: e.aliases.map((a: any) => a.aliasName),
      })),
      fundTrailPatterns: caseData.fundTrailPatterns.map((p: any) => ({
        patternType: p.patternType,
        description: p.title || '',
        confidence: p.confidenceScore,
        involvedEntities: [],
        totalAmount: p.totalAmount || 0,
      })),
      notes: caseData.investigationNotes.map((n: any) => ({
        content: `${n.title}: ${n.content}`,
        author: n.author?.name || 'Unknown',
        createdAt: n.createdAt.toISOString(),
      })),
      graphSummary,
    };
  }

  private async getGraphSummary(caseId: string) {
    const [nodeCount, edgeCount, highRiskNodes, keyEdges] = await Promise.all([
      prisma.graphNode.count({ where: { caseId } }),
      prisma.graphEdge.count({ where: { caseId } }),
      prisma.graphNode.findMany({
        where: { caseId, riskScore: { gte: 70 } },
        select: { label: true },
      }),
      prisma.graphEdge.findMany({
        where: { caseId, confidenceScore: { gte: 0.7 } },
        select: { edgeType: true, explanation: true },
        take: 5,
      }),
    ]);

    return {
      nodeCount,
      edgeCount,
      highRiskNodes: highRiskNodes.map((n) => n.label),
      keyRelationships: keyEdges.map((e) => `${e.edgeType}: ${e.explanation}`),
    };
  }

  private buildPrompt(type: AnalysisType, context: CaseContext): string {
    switch (type) {
      case 'SUMMARY':
        return this.promptBuilderService.buildSummaryPrompt(context);
      case 'TIMELINE':
        return this.promptBuilderService.buildTimelinePrompt(context);
      case 'QUESTIONS':
        return this.promptBuilderService.buildQuestionsPrompt(context);
      case 'EVIDENCE_GAPS':
        return this.promptBuilderService.buildEvidenceGapsPrompt(context);
      case 'FULL_ANALYSIS':
        return this.promptBuilderService.buildFullAnalysisPrompt(context);
      default:
        throw new Error(`Unknown analysis type: ${type}`);
    }
  }

  private async storeAnalysis(
    caseId: string,
    analysisType: AnalysisType,
    prompt: string,
    response: string,
    modelName: string,
    duration: number,
    userId: string,
  ): Promise<void> {
    try {
      await prisma.aiAnalysis.create({
        data: {
          caseId,
          analysisType,
          prompt,
          response,
          modelName,
          duration,
          createdById: userId,
        },
      });
      this.logger.log(`Stored ${analysisType} analysis for case ${caseId}`);
    } catch (error) {
      this.logger.error(`Failed to store analysis: ${error}`);
      // Don't throw - analysis is still valid, just not stored
    }
  }
}
