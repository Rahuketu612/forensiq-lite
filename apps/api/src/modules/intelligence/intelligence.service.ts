import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, AnalysisType } from '@forensiq/database';
import { OllamaService } from '../investigation-ai/ollama.service';

interface IntelligenceOptions {
  model?: string;
  userId: string;
}

@Injectable()
export class IntelligenceService {
  constructor(private readonly ollamaService: OllamaService) {}

  /**
   * Generate AI Case Brief
   */
  async generateCaseBrief(caseId: string, options: IntelligenceOptions) {
    const caseData = await this.getCaseContext(caseId);
    if (!caseData) throw new NotFoundException('Case not found');

    const prompt = this.buildCaseBriefPrompt(caseData, options);
    const startTime = Date.now();

    try {
      const response = await this.ollamaService.generate(prompt, options.model || 'phi4');
      const duration = Date.now() - startTime;

      // Store analysis
      const analysis = await prisma.aiAnalysis.create({
        data: {
          caseId,
          analysisType: AnalysisType.CASE_BRIEF,
          prompt,
          response: response.response,
          modelName: options.model || 'phi4',
          tokenCount: response.eval_count || 0,
          duration,
          createdById: options.userId,
        },
      });

      return {
        analysisId: analysis.id,
        content: response.response,
        model: analysis.modelName,
        tokenCount: analysis.tokenCount || 0,
        duration,
        createdAt: analysis.createdAt,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Case brief generation failed: ${message}`);
    }
  }

  /**
   * Explain a Red Flag with AI
   */
  async explainRedFlag(caseId: string, redFlagId: string, options: IntelligenceOptions & { detailLevel?: string }) {
    const redFlag = await prisma.redFlag.findFirst({
      where: { id: redFlagId, caseId },
      include: { transaction: true },
    });

    if (!redFlag) throw new NotFoundException('Red flag not found');

    const prompt = this.buildRedFlagExplainPrompt(redFlag, options.detailLevel);
    const startTime = Date.now();

    const response = await this.ollamaService.generate(prompt, options.model || 'phi4');
    const duration = Date.now() - startTime;

    const analysis = await prisma.aiAnalysis.create({
      data: {
        caseId,
        analysisType: AnalysisType.RED_FLAG_EXPLAINER,
        prompt,
        response: response.response,
        modelName: options.model || 'phi4',
        tokenCount: response.eval_count || 0,
        duration,
        createdById: options.userId,
      },
    });

    return {
      analysisId: analysis.id,
      content: response.response,
      model: analysis.modelName,
      tokenCount: analysis.tokenCount || 0,
      duration,
      createdAt: analysis.createdAt,
    };
  }

  /**
   * Generate Interview Questions
   */
  async generateInterviewQuestions(caseId: string, options: IntelligenceOptions & { focusArea?: string; count?: number }) {
    const caseData = await this.getCaseContext(caseId);
    if (!caseData) throw new NotFoundException('Case not found');

    const prompt = this.buildInterviewQuestionsPrompt(caseData, options);
    const startTime = Date.now();

    const response = await this.ollamaService.generate(prompt, options.model || 'phi4');
    const duration = Date.now() - startTime;

    const analysis = await prisma.aiAnalysis.create({
      data: {
        caseId,
        analysisType: AnalysisType.INTERVIEW_QUESTIONS,
        prompt,
        response: response.response,
        modelName: options.model || 'phi4',
        tokenCount: response.eval_count || 0,
        duration,
        createdById: options.userId,
      },
    });

    return {
      analysisId: analysis.id,
      content: response.response,
      model: analysis.modelName,
      tokenCount: analysis.tokenCount || 0,
      duration,
      createdAt: analysis.createdAt,
    };
  }

  /**
   * Build Evidence Request Document
   */
  async buildEvidenceRequest(caseId: string, analysisType: string, options: IntelligenceOptions & { requestType?: string }) {
    const caseData = await this.getCaseContext(caseId);
    if (!caseData) throw new NotFoundException('Case not found');

    const prompt = this.buildEvidenceRequestPrompt(caseData, analysisType, options);
    const startTime = Date.now();

    const response = await this.ollamaService.generate(prompt, options.model || 'phi4');
    const duration = Date.now() - startTime;

    const analysis = await prisma.aiAnalysis.create({
      data: {
        caseId,
        analysisType: AnalysisType.EVIDENCE_REQUEST,
        prompt,
        response: response.response,
        modelName: options.model || 'phi4',
        tokenCount: response.eval_count || 0,
        duration,
        createdById: options.userId,
      },
    });

    return {
      analysisId: analysis.id,
      content: response.response,
      model: analysis.modelName,
      tokenCount: analysis.tokenCount || 0,
      duration,
      createdAt: analysis.createdAt,
    };
  }

  /**
   * Search for Similar Patterns
   */
  async searchSimilarPatterns(caseId: string, options: IntelligenceOptions & { patternTypes?: string; minAmount?: number; maxAmount?: number; timeWindowDays?: number }) {
    const caseData = await this.getCaseContext(caseId);
    if (!caseData) throw new NotFoundException('Case not found');

    const prompt = this.buildSimilarPatternPrompt(caseData, options);
    const startTime = Date.now();

    const response = await this.ollamaService.generate(prompt, options.model || 'phi4');
    const duration = Date.now() - startTime;

    const analysis = await prisma.aiAnalysis.create({
      data: {
        caseId,
        analysisType: AnalysisType.SIMILAR_PATTERN,
        prompt,
        response: response.response,
        modelName: options.model || 'phi4',
        tokenCount: response.eval_count || 0,
        duration,
        createdById: options.userId,
      },
    });

    return {
      analysisId: analysis.id,
      content: response.response,
      model: analysis.modelName,
      tokenCount: analysis.tokenCount || 0,
      duration,
      createdAt: analysis.createdAt,
    };
  }

  /**
   * Get analysis history
   */
  async getAnalysisHistory(caseId: string, analysisType?: AnalysisType) {
    return prisma.aiAnalysis.findMany({
      where: { caseId, analysisType: analysisType || undefined },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ============ Private Helper Methods ============

  private async getCaseContext(caseId: string) {
    return prisma.case.findUnique({
      where: { id: caseId },
      include: {
        transactions: { take: 100, orderBy: { date: 'desc' } },
        redFlags: { where: { reviewed: false }, include: { transaction: true } },
        fundTrailPatterns: true,
        entities: true,
        graphNodes: true,
        graphEdges: true,
        investigationNotes: { orderBy: { createdAt: 'desc' }, take: 10 },
        evidenceFiles: true,
      },
    });
  }

  private buildCaseBriefPrompt(caseData: any, options: any): string {
    const transactions = caseData.transactions || [];
    const redFlags = caseData.redFlags || [];
    const totalAmount = transactions.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
    const highRiskFlags = redFlags.filter((f: any) => f.severity === 'CRITICAL' || f.severity === 'HIGH');

    return `You are an AI investigation assistant. Generate a professional case brief for investigators.

CASE INFORMATION:
- Case Number: ${caseData.caseNumber}
- Title: ${caseData.title}
- Description: ${caseData.description || 'N/A'}
- Status: ${caseData.status}
- Risk Level: ${caseData.riskLevel || 'Not assessed'}
- Client: ${caseData.clientName || 'N/A'}

TRANSACTION SUMMARY:
- Total Transactions: ${transactions.length}
- Total Amount: $${totalAmount.toLocaleString()}
- Date Range: ${transactions.length > 0 ? `${new Date(transactions[transactions.length - 1].date).toLocaleDateString()} - ${new Date(transactions[0].date).toLocaleDateString()}` : 'N/A'}

RED FLAGS IDENTIFIED:
${redFlags.length > 0 ? redFlags.map((f: any) => `- ${f.title} (${f.severity}): ${f.description}`).join('\n') : 'None identified'}

Generate a structured case brief with:
1. Executive Summary
2. Key Findings
3. Risk Assessment
4. Recommendations

IMPORTANT: Use neutral forensic language. Do not conclude fraud or criminal conduct. Focus on observable patterns and investigative observations.`;
  }

  private buildRedFlagExplainPrompt(redFlag: any, detailLevel: string = 'detailed'): string {
    const depth = detailLevel === 'comprehensive' ? 'comprehensive' : detailLevel === 'basic' ? 'brief' : 'moderate';
    
    return `You are an AI investigation assistant explaining a red flag finding.

RED FLAG DETAILS:
- Title: ${redFlag.title}
- Severity: ${redFlag.severity}
- Description: ${redFlag.description}
- Transaction Amount: $${Math.abs(redFlag.transaction?.amount || 0)}
- Transaction Date: ${redFlag.transaction?.date ? new Date(redFlag.transaction.date).toLocaleDateString() : 'N/A'}
- Transaction Type: ${redFlag.transaction?.type || 'N/A'}
- Counterparty: ${redFlag.transaction?.counterparty || 'N/A'}

Provide a ${depth} explanation including:
1. What the indicator suggests
2. Why it was flagged
3. Potential legitimate explanations
4. What further investigation may be warranted

IMPORTANT: Use neutral language. Do not conclude fraud or criminal conduct. Focus on investigative considerations.`;
  }

  private buildInterviewQuestionsPrompt(caseData: any, options: any): string {
    const focusArea = options.focusArea || 'general';
    const count = options.count || 10;
    
    return `You are an AI investigation assistant generating interview questions for financial investigation.

CASE: ${caseData.title} (${caseData.caseNumber})
Focus Area: ${focusArea}

CASE CONTEXT:
- Transactions: ${caseData.transactions?.length || 0}
- Red Flags: ${caseData.redFlags?.length || 0}
- Entities: ${caseData.entities?.length || 0}

Generate ${count} interview questions organized by topic. Questions should:
1. Be clear and specific
2. Follow a logical investigative sequence
3. Help gather evidence for the investigation
4. Be appropriate for interviewing relevant parties

Include questions about:
- Transaction details and purposes
- Counterparty relationships
- Business justification
- Supporting documentation
- Timeline verification

IMPORTANT: Use neutral investigative language. Questions should gather facts, not imply wrongdoing.`;
  }

  private buildEvidenceRequestPrompt(caseData: any, analysisType: string, options: any): string {
    const requestType = options.requestType || 'document';
    
    return `You are an AI investigation assistant drafting evidence requests.

CASE: ${caseData.title} (${caseData.caseNumber})
Analysis Type: ${analysisType}
Request Type: ${requestType}

CASE CONTEXT:
- Red Flags Identified: ${caseData.redFlags?.length || 0}
- Entities Involved: ${caseData.entities?.length || 0}
- Fund Trail Patterns: ${caseData.fundTrailPatterns?.length || 0}

Generate a formal evidence request document including:
1. Introduction and purpose
2. Specific documents/information requested
3. Rationale for each request
4. Timeline/deadline for response
5. Instructions for submission

Format as a professional evidence request that could be used in an investigation.

IMPORTANT: Frame requests as investigation requirements, not accusations.`;
  }

  private buildSimilarPatternPrompt(caseData: any, options: any): string {
    const patternTypes = options.patternTypes || 'all';
    const timeWindow = options.timeWindowDays || 90;
    
    return `You are an AI investigation assistant analyzing transaction patterns.

CASE: ${caseData.title} (${caseData.caseNumber})
Search Parameters:
- Pattern Types: ${patternTypes}
- Time Window: Last ${timeWindow} days
- Amount Range: ${options.minAmount ? '$' + options.minAmount : 'Any'} - ${options.maxAmount ? '$' + options.maxAmount : 'Any'}

CURRENT TRANSACTIONS:
${(caseData.transactions || []).slice(0, 20).map((t: any) => 
  `- ${t.date?.split('T')[0]}: $${Math.abs(t.amount)} ${t.type} to/from ${t.counterparty} (Mode: ${t.mode})`
).join('\n') || 'No transactions'}

FUND TRAIL PATTERNS:
${(caseData.fundTrailPatterns || []).map((p: any) => 
  `- ${p.type}: ${p.description} (${p.transactions?.length || 0} transactions)`
).join('\n') || 'No patterns identified'}

Analyze and identify:
1. Similar patterns that warrant attention
2. Unusual transaction sequences
3. Potential layering indicators
4. Circular flow possibilities

IMPORTANT: Use neutral pattern analysis language. Do not conclude fraud. Focus on observable characteristics that merit investigator attention.`;
  }
}