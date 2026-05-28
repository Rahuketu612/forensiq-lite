import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { TimelineEventType, InvestigationStatus } from '@forensiq/database';

/**
 * Investigation Service
 * 
 * Handles investigation notes, evidence linking, and timeline tracking.
 * All actions are recorded in the audit trail for traceability.
 */
@Injectable()
export class InvestigationService {
  private readonly logger = new Logger(InvestigationService.name);

  // ============================================
  // Investigation Notes
  // ============================================

  /**
   * Create an investigation note
   */
  async createNote(
    caseId: string,
    userId: string,
    data: {
      title: string;
      content: string;
      transactionId?: string;
      redFlagId?: string;
    }
  ) {
    // Verify case exists
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    // Create note
    const note = await prisma.investigationNote.create({
      data: {
        caseId,
        title: data.title,
        content: data.content,
        authorId: userId,
        transactionId: data.transactionId,
        redFlagId: data.redFlagId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        transaction: { select: { id: true, date: true, amount: true } },
        redFlag: { select: { id: true, ruleName: true, severity: true } },
      },
    });

    // Create timeline entry
    await this.addTimelineEntry(caseId, userId, {
      eventType: TimelineEventType.NOTE_ADDED,
      title: 'Investigation note added',
      description: `Note: "${data.title}"`,
      redFlagId: data.redFlagId,
      transactionId: data.transactionId,
      metadata: { noteId: note.id },
    });

    return note;
  }

  /**
   * Get notes for a case with optional filters
   */
  async getNotes(
    caseId: string,
    options: {
      transactionId?: string;
      redFlagId?: string;
      authorId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { transactionId, redFlagId, authorId, page = 1, limit = 50 } = options;

    const where: any = { caseId };
    if (transactionId) where.transactionId = transactionId;
    if (redFlagId) where.redFlagId = redFlagId;
    if (authorId) where.authorId = authorId;

    const [notes, total] = await Promise.all([
      prisma.investigationNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
          transaction: { select: { id: true, date: true, amount: true, type: true } },
          redFlag: { select: { id: true, ruleName: true, severity: true, status: true } },
        },
      }),
      prisma.investigationNote.count({ where }),
    ]);

    return {
      notes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a note
   */
  async updateNote(noteId: string, userId: string, data: { title?: string; content?: string }) {
    const note = await prisma.investigationNote.update({
      where: { id: noteId },
      data: {
        title: data.title,
        content: data.content,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return note;
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string) {
    await prisma.investigationNote.delete({ where: { id: noteId } });
    return { success: true };
  }

  // ============================================
  // Evidence Files
  // ============================================

  /**
   * Link evidence file to transaction or red flag
   */
  async linkEvidence(
    caseId: string,
    userId: string,
    data: {
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      path: string;
      hash: string;
      description?: string;
      category?: string;
      transactionId?: string;
      redFlagId?: string;
    }
  ) {
    // Create evidence record
    const evidence = await prisma.evidenceFile.create({
      data: {
        caseId,
        fileName: data.fileName,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        path: data.path,
        hash: data.hash,
        description: data.description,
        category: data.category,
        transactionId: data.transactionId,
        redFlagId: data.redFlagId,
        uploadedById: userId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        transaction: { select: { id: true, date: true, amount: true } },
        redFlag: { select: { id: true, ruleName: true, severity: true } },
      },
    });

    // Create timeline entry
    await this.addTimelineEntry(caseId, userId, {
      eventType: TimelineEventType.EVIDENCE_UPLOADED,
      title: 'Evidence uploaded',
      description: `File: ${data.originalName} (SHA256: ${data.hash.slice(0, 16)}...)`,
      redFlagId: data.redFlagId,
      transactionId: data.transactionId,
      metadata: { evidenceId: evidence.id, hash: data.hash },
    });

    return evidence;
  }

  /**
   * Get evidence file by ID
   */
  async getEvidenceById(caseId: string, evidenceId: string) {
    const evidence = await prisma.evidenceFile.findFirst({
      where: { id: evidenceId, caseId },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        transaction: { select: { id: true, date: true, amount: true } },
        redFlag: { select: { id: true, ruleName: true, severity: true } },
      },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    return evidence;
  }

  /**
   * Get evidence files with filters
   */
  async getEvidence(
    caseId: string,
    options: {
      transactionId?: string;
      redFlagId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { transactionId, redFlagId, page = 1, limit = 50 } = options;

    const where: any = { caseId };
    if (transactionId) where.transactionId = transactionId;
    if (redFlagId) where.redFlagId = redFlagId;

    const [files, total] = await Promise.all([
      prisma.evidenceFile.findMany({
        where,
        orderBy: { uploadedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          transaction: { select: { id: true, date: true, amount: true } },
          redFlag: { select: { id: true, ruleName: true, severity: true } },
        },
      }),
      prisma.evidenceFile.count({ where }),
    ]);

    return {
      files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Remove evidence link
   */
  async removeEvidence(caseId: string, userId: string, evidenceId: string) {
    const evidence = await prisma.evidenceFile.findFirst({ 
      where: { id: evidenceId, caseId } 
    });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    await prisma.evidenceFile.delete({ where: { id: evidenceId } });

    // Create timeline entry
    await this.addTimelineEntry(caseId, userId, {
      eventType: TimelineEventType.EVIDENCE_DELETED,
      title: 'Evidence removed',
      description: `File: ${evidence.originalName}`,
      redFlagId: evidence.redFlagId ?? undefined,
      transactionId: evidence.transactionId ?? undefined,
      metadata: { evidenceId },
    });

    return { success: true };
  }

  // ============================================
  // Timeline
  // ============================================

  /**
   * Add timeline entry
   */
  async addTimelineEntry(
    caseId: string,
    userId: string,
    data: {
      eventType: TimelineEventType;
      title: string;
      description?: string;
      redFlagId?: string;
      transactionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<any> {
    return prisma.investigationTimeline.create({
      data: {
        caseId,
        userId,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        redFlagId: data.redFlagId,
        transactionId: data.transactionId,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Get timeline for a case or red flag
   */
  async getTimeline(
    caseId: string,
    options: {
      redFlagId?: string;
      transactionId?: string;
      eventType?: TimelineEventType;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ entries: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const { redFlagId, transactionId, eventType, page = 1, limit = 50 } = options;

    const where: any = { caseId };
    if (redFlagId) where.redFlagId = redFlagId;
    if (transactionId) where.transactionId = transactionId;
    if (eventType) where.eventType = eventType;

    const [entries, total] = await Promise.all([
      prisma.investigationTimeline.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          redFlag: { select: { id: true, ruleName: true, severity: true, status: true } },
          transaction: { select: { id: true, date: true, amount: true, type: true } },
        },
      }),
      prisma.investigationTimeline.count({ where }),
    ]);

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // Red Flag Investigation Actions
  // ============================================

  /**
   * Update red flag investigation status
   */
  async updateRedFlagStatus(
    flagId: string,
    caseId: string,
    userId: string,
    status: InvestigationStatus,
    note?: string
  ) {
    const flag = await prisma.redFlag.update({
      where: { id: flagId },
      data: {
        status,
        reviewed: status !== InvestigationStatus.OPEN,
        reviewedBy: status !== InvestigationStatus.OPEN ? userId : null,
        reviewedAt: status !== InvestigationStatus.OPEN ? new Date() : null,
      },
      include: {
        transaction: { select: { id: true, date: true, amount: true, type: true } },
      },
    });

    // Create timeline entry
    await this.addTimelineEntry(caseId, userId, {
      eventType: TimelineEventType.FLAG_STATUS_CHANGED,
      title: `Flag status changed to ${status}`,
      description: note || `Status updated to ${status}`,
      redFlagId: flagId,
      metadata: { previousStatus: flag.status, newStatus: status },
    });

    return flag;
  }

  /**
   * Get red flag with investigation details
   */
  async getRedFlagDetails(flagId: string): Promise<any> {
    const flag = await prisma.redFlag.findUnique({
      where: { id: flagId },
      include: {
        transaction: {
          select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            type: true,
            counterparty: true,
            balance: true,
            mode: true,
          },
        },
        evidenceFiles: {
          include: {
            uploadedBy: { select: { id: true, name: true } },
          },
        },
        investigationNotes: {
          include: {
            author: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        timeline: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!flag) {
      throw new NotFoundException('Red flag not found');
    }

    return flag;
  }
}