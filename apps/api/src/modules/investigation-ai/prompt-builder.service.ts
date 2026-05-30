import { Injectable } from '@nestjs/common';

export interface CaseContext {
  caseNumber: string;
  caseTitle: string;
  caseDescription: string;
  status: string;
  riskLevel: string;
  clientName: string;
  createdAt: string;
  transactions: TransactionData[];
  redFlags: RedFlagData[];
  entities: EntityData[];
  fundTrailPatterns?: FundTrailData[];
  notes?: NoteData[];
  graphSummary?: GraphSummary;
}

export interface TransactionData {
  date: string;
  description: string;
  counterparty: string;
  mode: string;
  type: string;
  amount: number;
  balance: number;
}

export interface RedFlagData {
  ruleName: string;
  severity: string;
  description: string;
  date: string;
  amount: number;
  counterparty: string;
  reviewed: boolean;
}

export interface EntityData {
  name: string;
  riskScore: number;
  transactionCount: number;
  totalAmount: number;
  aliases: string[];
}

export interface FundTrailData {
  patternType: string;
  description: string;
  confidence: number;
  involvedEntities: string[];
  totalAmount: number;
}

export interface NoteData {
  content: string;
  author: string;
  createdAt: string;
}

export interface GraphSummary {
  nodeCount: number;
  edgeCount: number;
  highRiskNodes: string[];
  keyRelationships: string[];
}

@Injectable()
export class PromptBuilderService {
  buildSummaryPrompt(context: CaseContext): string {
    return `You are an AI assistant helping a forensic auditor analyze a financial investigation case.

IMPORTANT SAFETY GUIDELINES:
- Never conclude that fraud, money laundering, or criminal conduct has occurred
- Use neutral, investigative language
- Focus on factual observations and patterns
- Suggest areas requiring further investigation
- Your role is to assist the investigator, not to make determinations

CASE INFORMATION:
Case Number: ${context.caseNumber}
Title: ${context.caseTitle}
Description: ${context.caseDescription}
Status: ${context.status}
Risk Level: ${context.riskLevel}
Client: ${context.clientName}
Investigation Started: ${context.createdAt}

TRANSACTION SUMMARY:
${this.formatTransactions(context.transactions)}

RED FLAGS IDENTIFIED:
${this.formatRedFlags(context.redFlags)}

ENTITIES OF INTEREST:
${this.formatEntities(context.entities)}

${context.fundTrailPatterns ? `FUND TRAIL PATTERNS:\n${this.formatFundTrails(context.fundTrailPatterns)}` : ''}

${context.graphSummary ? `INVESTIGATION GRAPH SUMMARY:
- Total Nodes: ${context.graphSummary.nodeCount}
- Total Relationships: ${context.graphSummary.edgeCount}
- High Risk Entities: ${context.graphSummary.highRiskNodes.join(', ')}
- Key Relationships: ${context.graphSummary.keyRelationships.join('; ')}` : ''}

Based on the above information, provide a comprehensive case summary that:
1. Describes the overall nature of the investigation
2. Highlights key findings from transaction analysis
3. Summarizes the red flags identified and their significance
4. Identifies entities that warrant further investigation
5. Suggests next steps for the investigation

Use clear, professional language appropriate for a forensic audit report.`;
  }

  buildTimelinePrompt(context: CaseContext): string {
    return `You are an AI assistant helping a forensic auditor construct a chronological timeline of investigation events.

IMPORTANT SAFETY GUIDELINES:
- Never conclude that fraud, money laundering, or criminal conduct has occurred
- Present events factually without making determinations
- Use neutral language like "unusual", "anomalous", "noteworthy" instead of "fraudulent"
- Help the investigator understand the sequence of events

CASE INFORMATION:
Case Number: ${context.caseNumber}
Title: ${context.caseTitle}

CHRONOLOGICAL TRANSACTIONS:
${this.formatTransactionsChronologically(context.transactions)}

RED FLAGS (with dates):
${this.formatRedFlagsWithDates(context.redFlags)}

ENTITIES OF INTEREST:
${this.formatEntities(context.entities)}

Based on the transaction and red flag data, construct a detailed chronological timeline that:
1. Lists events in date order from earliest to latest
2. Groups related events together where appropriate
3. Highlights significant patterns or anomalies
4. Identifies potential investigation leads based on the sequence
5. Notes any temporal relationships between red flags

Format the timeline clearly with dates and descriptions.`;
  }

  buildQuestionsPrompt(context: CaseContext): string {
    return `You are an AI assistant helping a forensic auditor develop investigation questions.

IMPORTANT SAFETY GUIDELINES:
- Never frame questions as if guilt is predetermined
- Focus on gathering evidence and information
- Use open-ended, investigative questions
- Help the auditor know what to ask and where to look

CASE INFORMATION:
Case Number: ${context.caseNumber}
Title: ${context.caseTitle}

TRANSACTIONS:
${this.formatTransactions(context.transactions)}

RED FLAGS:
${this.formatRedFlags(context.redFlags)}

ENTITIES:
${this.formatEntities(context.entities)}

${context.fundTrailPatterns ? `FUND TRAIL PATTERNS:\n${this.formatFundTrails(context.fundTrailPatterns)}` : ''}

Generate a comprehensive list of investigation questions organized by category:

1. TRANSACTION QUESTIONS - Questions about specific transactions that need answers
2. ENTITY QUESTIONS - Questions about the entities involved in the case
3. DOCUMENTATION QUESTIONS - What documents or evidence should be requested
4. VERIFICATION QUESTIONS - What needs to be verified or corroborated
5. PATTERN QUESTIONS - Questions arising from the identified patterns

For each question, indicate:
- The question itself
- Why it's important to the investigation
- What evidence would help answer it

Use neutral, professional language appropriate for a forensic audit.`;
  }

  buildEvidenceGapsPrompt(context: CaseContext): string {
    return `You are an AI assistant helping a forensic auditor identify gaps in the investigation evidence.

IMPORTANT SAFETY GUIDELINES:
- Never assume the absence of evidence indicates guilt
- Present gaps as opportunities for additional investigation
- Frame findings neutrally

CASE INFORMATION:
Case Number: ${context.caseNumber}
Title: ${context.caseTitle}
Description: ${context.caseDescription}

CURRENT EVIDENCE:
Transactions Analyzed: ${context.transactions.length}
Red Flags Identified: ${context.redFlags.length}
Entities Identified: ${context.entities.length}
${context.fundTrailPatterns ? `Fund Trail Patterns Found: ${context.fundTrailPatterns.length}` : ''}

TRANSACTIONS:
${this.formatTransactions(context.transactions)}

RED FLAGS:
${this.formatRedFlags(context.redFlags)}

ENTITIES:
${this.formatEntities(context.entities)}

INVESTIGATION NOTES:
${context.notes ? this.formatNotes(context.notes) : 'No additional notes available.'}

Based on the available information, identify gaps in the evidence that should be addressed:

1. MISSING DOCUMENTATION - What documents are not yet obtained
2. UNVERIFIED TRANSACTIONS - Transactions lacking supporting documentation
3. ENTITY INFORMATION - Gaps in information about involved entities
4. PATTERN EVIDENCE - Evidence needed to confirm or refute patterns
5. TIMELINE GAPS - Periods or events lacking documentation
6. RECOMMENDED ACTIONS - How to address each gap

Be specific and actionable in your recommendations.`;
  }

  buildFullAnalysisPrompt(context: CaseContext): string {
    return `You are an AI assistant providing a comprehensive forensic analysis of a financial investigation case.

IMPORTANT SAFETY GUIDELINES - STRICTLY ENFORCED:
- NEVER conclude that fraud, money laundering, or criminal conduct has occurred
- NEVER use language that implies guilt or wrongdoing by any party
- ALWAYS use neutral, investigative language
- Frame all findings as observations requiring further investigation
- Your role is to assist the investigator, NOT to make legal or moral determinations
- Use phrases like "suggests further investigation", "anomalous pattern", "warrants review"

CASE INFORMATION:
Case Number: ${context.caseNumber}
Title: ${context.caseTitle}
Description: ${context.caseDescription}
Status: ${context.status}
Risk Level: ${context.riskLevel}
Client: ${context.clientName}

SECTION 1: EXECUTIVE SUMMARY
Provide a brief (3-5 sentences) overview of the investigation based on available data.

SECTION 2: TRANSACTION ANALYSIS
${this.formatTransactions(context.transactions)}

SECTION 3: RED FLAGS ANALYSIS
${this.formatRedFlags(context.redFlags)}

SECTION 4: ENTITY ANALYSIS
${this.formatEntities(context.entities)}

SECTION 5: PATTERN ANALYSIS
${context.fundTrailPatterns ? this.formatFundTrails(context.fundTrailPatterns) : 'No specific patterns identified yet.'}

SECTION 6: GRAPH ANALYSIS
${context.graphSummary ? `
Investigation Graph Statistics:
- Total Entities/Nodes: ${context.graphSummary.nodeCount}
- Total Relationships: ${context.graphSummary.edgeCount}
- High Risk Entities: ${context.graphSummary.highRiskNodes.join(', ') || 'None identified'}
- Key Relationships: ${context.graphSummary.keyRelationships.join('; ') || 'None identified'}
` : 'Graph analysis not yet available.'}

SECTION 7: INVESTIGATION PROGRESS
${context.notes ? `Notes from investigation:\n${this.formatNotes(context.notes)}` : 'No investigation notes available.'}

SECTION 8: RECOMMENDATIONS
Based on the above analysis, provide:

A) PRIORITY ACTIONS - What should be investigated first
B) EVIDENCE GAPS - What additional information is needed
C) FOLLOW-UP QUESTIONS - What questions need answers
D) DOCUMENTATION NEEDS - What documents should be requested

Remember: You are an AI ASSISTANT. You do not make determinations of fraud, guilt, or criminality. You help the investigator gather and analyze information.`;
  }

  private formatTransactions(transactions: TransactionData[]): string {
    if (transactions.length === 0) return 'No transactions available.';
    
    const totalCredits = transactions
      .filter(t => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = transactions
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, t) => sum + t.amount, 0);

    let summary = `Total Transactions: ${transactions.length}\n`;
    summary += `Total Credits: ₹${totalCredits.toLocaleString('en-IN')}\n`;
    summary += `Total Debits: ₹${totalDebits.toLocaleString('en-IN')}\n\n`;
    
    summary += 'Key Transactions (sorted by amount):\n';
    const sorted = [...transactions].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    sorted.slice(0, 10).forEach(t => {
      summary += `- ${t.date}: ${t.type} ₹${t.amount.toLocaleString('en-IN')} to/from ${t.counterparty} (${t.mode})\n`;
      summary += `  Description: ${t.description}\n`;
    });
    
    return summary;
  }

  private formatTransactionsChronologically(transactions: TransactionData[]): string {
    if (transactions.length === 0) return 'No transactions available.';
    
    const sorted = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return sorted.map(t => 
      `${t.date}: ${t.type} ₹${t.amount.toLocaleString('en-IN')} - ${t.description} (${t.counterparty})`
    ).join('\n');
  }

  private formatRedFlags(redFlags: RedFlagData[]): string {
    if (redFlags.length === 0) return 'No red flags identified.';
    
    const severityCounts = redFlags.reduce((acc, flag) => {
      acc[flag.severity] = (acc[flag.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let summary = `Total Red Flags: ${redFlags.length}\n`;
    summary += `By Severity: ${Object.entries(severityCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}\n\n`;
    
    redFlags.forEach(flag => {
      summary += `[${flag.severity}] ${flag.ruleName}\n`;
      summary += `  ${flag.description}\n`;
      summary += `  Date: ${flag.date}, Amount: ₹${flag.amount.toLocaleString('en-IN')}, Party: ${flag.counterparty}\n`;
      summary += `  Reviewed: ${flag.reviewed ? 'Yes' : 'No'}\n\n`;
    });
    
    return summary;
  }

  private formatRedFlagsWithDates(redFlags: RedFlagData[]): string {
    return redFlags.map(f => 
      `${f.date}: [${f.severity}] ${f.ruleName} - ${f.description} (₹${f.amount.toLocaleString('en-IN')} - ${f.counterparty})`
    ).join('\n');
  }

  private formatEntities(entities: EntityData[]): string {
    if (entities.length === 0) return 'No entities identified.';
    
    const sorted = [...entities].sort((a, b) => b.riskScore - a.riskScore);
    
    return sorted.map(e => {
      let summary = `${e.name} (Risk: ${e.riskScore.toFixed(1)}/10)\n`;
      summary += `  Transactions: ${e.transactionCount}, Total Amount: ₹${e.totalAmount.toLocaleString('en-IN')}\n`;
      if (e.aliases.length > 0) {
        summary += `  Also known as: ${e.aliases.join(', ')}\n`;
      }
      return summary;
    }).join('\n');
  }

  private formatFundTrails(patterns: FundTrailData[]): string {
    return patterns.map(p => {
      let summary = `[${p.patternType}] Confidence: ${(p.confidence * 100).toFixed(0)}%\n`;
      summary += `  ${p.description}\n`;
      summary += `  Involved: ${p.involvedEntities.join(', ')}\n`;
      summary += `  Total Amount: ₹${p.totalAmount.toLocaleString('en-IN')}\n`;
      return summary;
    }).join('\n\n');
  }

  private formatNotes(notes: NoteData[]): string {
    return notes.map(n => 
      `- [${n.createdAt}] ${n.author}: ${n.content}`
    ).join('\n');
  }
}
