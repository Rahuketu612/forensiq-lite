import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@forensiq/database';

@Injectable()
export class InvestigationGraphService {
  private readonly logger = new Logger(InvestigationGraphService.name);

  async generateGraph(caseId: string): Promise<{ nodeCount: number; edgeCount: number }> {
    const caseExists = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseExists) {
      throw new NotFoundException(`Case ${caseId} not found`);
    }

    const entities = await this.getEntitiesWithRelations(caseId);
    const transactions = await this.getTransactionsWithIdentifiers(caseId);

    const nodeMap = new Map<string, any>();
    const edgeList: any[] = [];

    this.createEntityNodes(entities, nodeMap);
    this.createIdentifierNodes(transactions, nodeMap);
    this.createEntityToIdentifierEdges(entities, nodeMap, edgeList);
    this.createEntityToEntityEdges(entities, transactions, nodeMap, edgeList);

    return await this.persistGraph(caseId, nodeMap, edgeList);
  }

  async getGraph(caseId: string, filters?: any): Promise<any> {
    const [nodes, edges, stats] = await Promise.all([
      prisma.graphNode.findMany({
        where: {
          caseId,
          ...(filters?.nodeFilters?.nodeType && { nodeType: filters.nodeFilters.nodeType }),
          ...(filters?.nodeFilters?.search && {
            label: { contains: filters.nodeFilters.search, mode: 'insensitive' },
          }),
          ...(filters?.nodeFilters?.minRiskScore && {
            riskScore: { gte: filters.nodeFilters.minRiskScore },
          }),
        },
        include: { edgesFrom: true, edgesTo: true },
      }),
      prisma.graphEdge.findMany({
        where: {
          caseId,
          ...(filters?.edgeFilters?.edgeType && { edgeType: filters.edgeFilters.edgeType }),
          ...(filters?.edgeFilters?.minConfidence && {
            confidenceScore: { gte: filters.edgeFilters.minConfidence / 100 },
          }),
        },
      }),
      this.getGraphStats(caseId),
    ]);

    return { nodes, edges, stats };
  }

  async getNodeById(caseId: string, nodeId: string): Promise<any> {
    const node = await prisma.graphNode.findFirst({
      where: { id: nodeId, caseId },
      include: {
        edgesFrom: { include: { targetNode: true } },
        edgesTo: { include: { sourceNode: true } },
      },
    });

    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found in case ${caseId}`);
    }

    return node;
  }

  async getEdgeById(caseId: string, edgeId: string): Promise<any> {
    const edge = await prisma.graphEdge.findFirst({
      where: { id: edgeId, caseId },
      include: { sourceNode: true, targetNode: true },
    });

    if (!edge) {
      throw new NotFoundException(`Edge ${edgeId} not found in case ${caseId}`);
    }

    return edge;
  }

  async getGraphStats(caseId: string): Promise<any> {
    const [nodeCount, edgeCount, nodeCountsByType, edgeCountsByType, lastGenerated] = await Promise.all([
      prisma.graphNode.count({ where: { caseId } }),
      prisma.graphEdge.count({ where: { caseId } }),
      prisma.graphNode.groupBy({
        by: ['nodeType'],
        where: { caseId },
        _count: { id: true },
      }),
      prisma.graphEdge.groupBy({
        by: ['edgeType'],
        where: { caseId },
        _count: { id: true },
      }),
      prisma.graphAuditLog.findFirst({
        where: { caseId, action: 'GENERATED' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      nodeCount,
      edgeCount,
      nodeCountsByType: Object.fromEntries(nodeCountsByType.map((n: any) => [n.nodeType, n._count.id])),
      edgeCountsByType: Object.fromEntries(edgeCountsByType.map((e: any) => [e.edgeType, e._count.id])),
      lastGeneratedAt: lastGenerated?.createdAt ?? null,
    };
  }

  // ==================== Private Methods ====================

  private async getEntitiesWithRelations(caseId: string): Promise<any[]> {
    return prisma.entity.findMany({
      where: { caseId },
      include: {
        aliases: {
          select: {
            id: true,
            aliasName: true,
            matchType: true,
            source: true,
            confidenceScore: true,
          },
        },
        transactions: {
          select: {
            transactionId: true,
          },
        },
      },
    });
  }

  private async getTransactionsWithIdentifiers(caseId: string): Promise<any[]> {
    const transactions = await prisma.transaction.findMany({
      where: { caseId },
      select: {
        id: true,
        counterparty: true,
        amount: true,
        date: true,
        description: true,
      },
    });

    return transactions.map((tx: any) => ({
      transactionId: tx.id,
      counterparty: tx.counterparty,
      amount: tx.amount,
      date: tx.date,
      description: tx.description,
      extractedData: this.extractIdentifiers(tx.description || ''),
    }));
  }

  private extractIdentifiers(text: string): any {
    const data: any = {};
    const patterns = {
      GSTIN: /\b([0-9]{2}[A-Z]{3}[A-Z0-9]{10}[A-Z]{1}[A-Z0-9]{1}[A-Z]{1})\b/gi,
      PAN: /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/g,
      PHONE: /\b([6-9][0-9]{9})\b/g,
      ACCOUNT: /\b([0-9]{9,18})\b/g,
      UPI: /\b([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)\b/g,
      EMAIL: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
      IFSC: /\b([A-Z]{4}0[A-Z0-9]{6})\b/gi,
    };

    const gstinMatch = text.match(patterns.GSTIN);
    if (gstinMatch) data.gstin = gstinMatch[1].toUpperCase();

    const panMatch = text.match(patterns.PAN);
    if (panMatch) data.pan = panMatch[1].toUpperCase();

    const phoneMatch = text.match(patterns.PHONE);
    if (phoneMatch) data.phone = phoneMatch[1];

    const accountMatch = text.match(patterns.ACCOUNT);
    if (accountMatch) data.account = accountMatch[1].length >= 9 ? accountMatch[1] : undefined;

    const ifscMatch = text.match(patterns.IFSC);
    if (ifscMatch) data.ifsc = ifscMatch[1].toUpperCase();

    const upiMatch = text.match(patterns.UPI);
    if (upiMatch) data.upi = upiMatch[1].toLowerCase();

    const emailMatch = text.match(patterns.EMAIL);
    if (emailMatch) data.email = emailMatch[1].toLowerCase();

    return data;
  }

  private createEntityNodes(entities: any[], nodeMap: Map<string, any>): void {
    for (const entity of entities) {
      const nodeKey = `entity:${entity.id}`;
      nodeMap.set(nodeKey, {
        id: nodeKey,
        nodeType: 'ENTITY',
        label: entity.canonicalName,
        externalId: entity.id,
        riskScore: entity.riskScore,
        metadata: {
          totalAmount: entity.totalAmount,
          transactionCount: entity.transactionCount,
          reviewed: entity.reviewed,
        },
      });

      for (const alias of entity.aliases) {
        const identifierType = this.matchTypeToNodeType(alias.matchType);
        if (identifierType) {
          const aliasKey = `identifier:${identifierType}:${alias.aliasName.toLowerCase()}`;
          if (!nodeMap.has(aliasKey)) {
            nodeMap.set(aliasKey, {
              id: aliasKey,
              nodeType: identifierType,
              label: alias.aliasName,
              externalId: alias.id,
              riskScore: 0,
              metadata: {
                source: alias.source,
                confidenceScore: alias.confidenceScore,
              },
            });
          }
        }
      }
    }
  }

  private createIdentifierNodes(transactions: any[], nodeMap: Map<string, any>): void {
    for (const tx of transactions) {
      const data = tx.extractedData;

      if (data?.gstin) {
        const key = `identifier:GSTIN:${data.gstin}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { id: key, nodeType: 'GSTIN', label: data.gstin, riskScore: 0 });
        }
      }

      if (data?.pan) {
        const key = `identifier:PAN:${data.pan}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { id: key, nodeType: 'PAN', label: data.pan, riskScore: 0 });
        }
      }

      if (data?.phone) {
        const key = `identifier:PHONE:${data.phone}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { id: key, nodeType: 'PHONE', label: data.phone, riskScore: 0 });
        }
      }

      if (data?.account) {
        const key = `identifier:BANK_ACCOUNT:${data.account}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, {
            id: key,
            nodeType: 'BANK_ACCOUNT',
            label: this.maskAccount(data.account),
            riskScore: 0,
            metadata: { accountNumber: data.account },
          });
        }
      }

      if (data?.ifsc) {
        const key = `identifier:IFSC:${data.ifsc}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { id: key, nodeType: 'IFSC', label: data.ifsc, riskScore: 0 });
        }
      }

      if (data?.upi) {
        const key = `identifier:UPI:${data.upi}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, { id: key, nodeType: 'UPI', label: data.upi, riskScore: 0 });
        }
      }

      if (data?.email) {
        const key = `identifier:EMAIL:${data.email}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, {
            id: key,
            nodeType: 'EMAIL',
            label: this.maskEmail(data.email),
            riskScore: 0,
            metadata: { email: data.email },
          });
        }
      }
    }
  }

  private createEntityToIdentifierEdges(entities: any[], nodeMap: Map<string, any>, edgeList: any[]): void {
    for (const entity of entities) {
      const sourceNodeKey = `entity:${entity.id}`;
      
      for (const alias of entity.aliases) {
        const identifierType = this.matchTypeToNodeType(alias.matchType);
        if (identifierType) {
          const targetNodeKey = `identifier:${identifierType}:${alias.aliasName.toLowerCase()}`;
          
          if (nodeMap.has(targetNodeKey)) {
            edgeList.push({
              sourceNodeKey,
              targetNodeKey,
              edgeType: 'OWNS',
              confidenceScore: alias.confidenceScore,
              explanation: `${identifierType} associated with ${entity.canonicalName}`,
              evidenceCount: entity.transactions.length,
              evidence: { transactionIds: entity.transactions.map((t: any) => t.transactionId) },
            });
          }
        }
      }
    }
  }

  private createEntityToEntityEdges(entities: any[], transactions: any[], nodeMap: Map<string, any>, edgeList: any[]): void {
    // Collect all identifiers per entity
    const entityIdentifiers = new Map<string, string[]>();
    for (const entity of entities) {
      const identifiers: string[] = [];
      for (const alias of entity.aliases) {
        const identifierType = this.matchTypeToNodeType(alias.matchType);
        if (identifierType) {
          identifiers.push(`identifier:${identifierType}:${alias.aliasName.toLowerCase()}`);
        }
      }
      entityIdentifiers.set(entity.id, identifiers);
    }

    // Find entities sharing identifiers
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        const ids1 = entityIdentifiers.get(entity1.id) || [];
        const ids2 = entityIdentifiers.get(entity2.id) || [];

        const sharedIdentifiers = ids1.filter(id => ids2.includes(id) && nodeMap.has(id));

        if (sharedIdentifiers.length > 0) {
          edgeList.push({
            sourceNodeKey: `entity:${entity1.id}`,
            targetNodeKey: `entity:${entity2.id}`,
            edgeType: 'SHARES_IDENTIFIER',
            confidenceScore: 0.85,
            explanation: `Both entities use ${sharedIdentifiers.length} shared identifier(s)`,
            evidenceCount: sharedIdentifiers.length,
            evidence: { sharedIdentifiers, entityIds: [entity1.id, entity2.id] },
          });
        }
      }
    }

    // Entity to entity edges based on transaction patterns
    for (const entity of entities) {
      const entityTxIds = new Set(entity.transactions.map((t: any) => t.transactionId));
      const entityTransactions = transactions.filter((tx: any) => entityTxIds.has(tx.transactionId));

      for (const otherEntity of entities) {
        if (otherEntity.id === entity.id) continue;

        const otherTxIds = new Set(otherEntity.transactions.map((t: any) => t.transactionId));
        const otherTransactions = transactions.filter((tx: any) => otherTxIds.has(tx.transactionId));

        const sharedPatterns = this.findSharedPatterns(entityTransactions, otherTransactions);

        if (sharedPatterns.length > 0) {
          edgeList.push({
            sourceNodeKey: `entity:${entity.id}`,
            targetNodeKey: `entity:${otherEntity.id}`,
            edgeType: 'TRANSACTED_WITH',
            confidenceScore: 0.65,
            explanation: `Transaction patterns overlap: ${sharedPatterns.slice(0, 3).join(', ')}`,
            evidenceCount: sharedPatterns.length,
            evidence: { sharedPatterns: sharedPatterns.slice(0, 5), entityIds: [entity.id, otherEntity.id] },
          });
        }
      }
    }
  }

  private findSharedPatterns(transactions1: any[], transactions2: any[]): string[] {
    const patterns: string[] = [];

    const extractPatterns = (desc: string): Set<string> => {
      const patternSet = new Set<string>();
      const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
      let match;
      while ((match = namePattern.exec(desc)) !== null) {
        const name = match[1].trim();
        if (name.length > 2 && !['GSTIN', 'PAN', 'Acct', 'IFSC', 'UPI', 'Phone'].includes(name)) {
          patternSet.add(name.toLowerCase());
        }
      }
      return patternSet;
    };

    const patterns1 = new Set<string>();
    const patterns2 = new Set<string>();

    for (const tx of transactions1) {
      extractPatterns(tx.description || '').forEach(p => patterns1.add(p));
    }

    for (const tx of transactions2) {
      extractPatterns(tx.description || '').forEach(p => patterns2.add(p));
    }

    for (const p of patterns1) {
      if (patterns2.has(p)) {
        patterns.push(p);
      }
    }

    return patterns;
  }

  private async persistGraph(
    caseId: string,
    nodeMap: Map<string, any>,
    edgeList: any[],
  ): Promise<{ nodeCount: number; edgeCount: number }> {
    return await (prisma as any).$transaction(async (tx: any) => {
      // Clear existing graph data
      await tx.graphEdge.deleteMany({ where: { caseId } });
      await tx.graphNode.deleteMany({ where: { caseId } });

      // Create nodes
      const nodesToCreate = Array.from(nodeMap.values()).map((n: any) => ({
        caseId,
        nodeType: n.nodeType,
        label: n.label,
        externalId: n.externalId,
        riskScore: n.riskScore || 0,
        metadata: n.metadata,
      }));

      await tx.graphNode.createMany({ data: nodesToCreate });

      // Create edges by looking up node IDs by their keys
      const edgesToCreate = [];
      const seenEdges = new Set<string>();

      for (const edge of edgeList) {
        const sourceNode = await tx.graphNode.findFirst({
          where: { id: edge.sourceNodeKey },
        });
        const targetNode = await tx.graphNode.findFirst({
          where: { id: edge.targetNodeKey },
        });

        if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
          const edgeKey = `${sourceNode.id}:${targetNode.id}:${edge.edgeType}`;
          if (seenEdges.has(edgeKey)) continue;
          seenEdges.add(edgeKey);

          edgesToCreate.push({
            caseId,
            sourceNodeId: sourceNode.id,
            targetNodeId: targetNode.id,
            edgeType: edge.edgeType,
            confidenceScore: edge.confidenceScore,
            explanation: edge.explanation,
            evidenceCount: edge.evidenceCount,
            metadata: edge.evidence,
          });
        }
      }

      if (edgesToCreate.length > 0) {
        await tx.graphEdge.createMany({ data: edgesToCreate });
      }

      // Create audit log
      await tx.graphAuditLog.create({
        data: {
          caseId,
          action: 'GENERATED',
          description: `Graph generated with ${nodesToCreate.length} nodes and ${edgesToCreate.length} edges`,
          nodeCount: nodesToCreate.length,
          edgeCount: edgesToCreate.length,
        },
      });

      return { nodeCount: nodesToCreate.length, edgeCount: edgesToCreate.length };
    });
  }

  private matchTypeToNodeType(matchType: string): string | null {
    const mapping: Record<string, string> = {
      GSTIN: 'GSTIN',
      PAN: 'PAN',
      BANK_ACCOUNT: 'BANK_ACCOUNT',
      IFSC: 'IFSC',
      UPI_ID: 'UPI',
      PHONE: 'PHONE',
      EMAIL: 'EMAIL',
      ADDRESS: 'ADDRESS',
    };
    return mapping[matchType] || null;
  }

  private maskAccount(account: string): string {
    if (account.length <= 4) return account;
    return '*'.repeat(account.length - 4) + account.slice(-4);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + domain;
  }
}
