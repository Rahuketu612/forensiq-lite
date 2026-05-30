import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { FeedbackStatus } from '@forensiq/database';
import { CreateFeedbackDto, UpdateFeedbackDto, AddCommentDto } from './feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  async create(dto: CreateFeedbackDto, userId: string) {
    this.logger.log(`Creating feedback for pilot ${dto.pilotId}`);
    
    // Perform basic sentiment analysis based on keywords
    const sentiment = this.analyzeSentiment(dto.description);

    return prisma.pilotFeedback.create({
      data: {
        pilotId: dto.pilotId,
        feedbackType: dto.feedbackType,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        pageUrl: dto.pageUrl,
        browserInfo: dto.browserInfo,
        screenshotUrl: dto.screenshotUrl,
        sentiment,
      },
    });
  }

  async findAll(filters?: { status?: FeedbackStatus; type?: string; priority?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.feedbackType = filters.type;
    if (filters?.priority) where.priority = filters.priority;

    return prisma.pilotFeedback.findMany({
      where,
      include: {
        pilot: { select: { firmName: true, contactName: true } },
        comments: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const feedback = await prisma.pilotFeedback.findUnique({
      where: { id },
      include: {
        pilot: true,
        respondedBy: { select: { name: true, email: true } },
        comments: { 
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return feedback;
  }

  async update(id: string, dto: UpdateFeedbackDto, userId: string) {
    this.logger.log(`Updating feedback ${id}`);
    
    const data: any = { ...dto };
    if (dto.response) {
      data.respondedById = userId;
      data.respondedAt = new Date();
      if (!dto.status) {
        data.status = FeedbackStatus.REVIEWED;
      }
    }

    return prisma.pilotFeedback.update({
      where: { id },
      data,
    });
  }

  async addComment(id: string, dto: AddCommentDto, userId: string) {
    return prisma.feedbackComment.create({
      data: {
        feedbackId: id,
        userId,
        comment: dto.comment,
      },
      include: { user: { select: { name: true, email: true } } },
    });
  }

  async getFeedbackStats() {
    const [total, byStatus, byType, byPriority, recent] = await Promise.all([
      prisma.pilotFeedback.count(),
      prisma.pilotFeedback.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.pilotFeedback.groupBy({
        by: ['feedbackType'],
        _count: true,
      }),
      prisma.pilotFeedback.groupBy({
        by: ['priority'],
        _count: true,
      }),
      prisma.pilotFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { pilot: { select: { firmName: true } } },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      byType: byType.map(t => ({ type: t.feedbackType, count: t._count })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count })),
      recent,
    };
  }

  private analyzeSentiment(text: string): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'helpful', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'broken', 'error', 'crash', 'slow', 'useless'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (positiveCount > negativeCount) return 'POSITIVE';
    if (negativeCount > positiveCount) return 'NEGATIVE';
    return 'NEUTRAL';
  }
}