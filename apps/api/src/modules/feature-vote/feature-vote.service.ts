import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { VoteStatus } from '@forensiq/database';
import { CreateFeatureRequestDto, UpdateFeatureRequestDto, CastVoteDto } from './feature-vote.dto';

@Injectable()
export class FeatureVoteService {
  private readonly logger = new Logger(FeatureVoteService.name);

  async createFeatureRequest(dto: CreateFeatureRequestDto, userId?: string, pilotId?: string) {
    this.logger.log(`Creating feature request: ${dto.title}`);
    
    const feature = await prisma.featureRequest.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category || 'general',
        submittedBy: userId || pilotId,
        submittedByType: pilotId ? 'pilot' : 'user',
      },
    });

    // Auto-upvote by creator
    if (userId || pilotId) {
      await prisma.featureVote.create({
        data: {
          featureId: feature.id,
          userId,
          pilotId,
          voteType: 'upvote',
        },
      });

      // Update vote count
      await prisma.featureRequest.update({
        where: { id: feature.id },
        data: { voteCount: 1 },
      });
    }

    return feature;
  }

  async findAllFeatures(filters?: { status?: VoteStatus; category?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;

    return prisma.featureRequest.findMany({
      where,
      include: {
        votes: {
          include: {
            pilot: { select: { firmName: true } },
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { voteCount: 'desc' },
    });
  }

  async findOne(id: string) {
    const feature = await prisma.featureRequest.findUnique({
      where: { id },
      include: {
        votes: {
          include: {
            pilot: { select: { firmName: true, contactName: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!feature) {
      throw new NotFoundException(`Feature request ${id} not found`);
    }

    return feature;
  }

  async updateFeatureRequest(id: string, dto: UpdateFeatureRequestDto) {
    this.logger.log(`Updating feature request ${id}`);
    return prisma.featureRequest.update({
      where: { id },
      data: dto,
    });
  }

  async castVote(dto: CastVoteDto, userId?: string, pilotId?: string) {
    this.logger.log(`Casting ${dto.voteType} on feature ${dto.featureId}`);
    
    // Check if vote exists
    const existing = await prisma.featureVote.findFirst({
      where: {
        featureId: dto.featureId,
        OR: [
          { userId: userId || undefined },
          { pilotId: pilotId || undefined },
        ],
      },
    });

    if (existing) {
      // Update existing vote
      await prisma.featureVote.update({
        where: { id: existing.id },
        data: { 
          voteType: dto.voteType,
          comment: dto.comment,
        },
      });
    } else {
      // Create new vote
      await prisma.featureVote.create({
        data: {
          featureId: dto.featureId,
          userId,
          pilotId,
          voteType: dto.voteType,
          comment: dto.comment,
        },
      });
    }

    // Recalculate vote count
    const votes = await prisma.featureVote.findMany({
      where: { featureId: dto.featureId },
    });

    const upvoteCount = votes.filter(v => v.voteType === 'upvote').length;
    const downvoteCount = votes.filter(v => v.voteType === 'downvote').length;

    await prisma.featureRequest.update({
      where: { id: dto.featureId },
      data: { voteCount: upvoteCount - downvoteCount },
    });

    return this.findOne(dto.featureId);
  }

  async getTopFeatures(limit = 10) {
    return prisma.featureRequest.findMany({
      where: { status: VoteStatus.OPEN },
      orderBy: { voteCount: 'desc' },
      take: limit,
      include: {
        votes: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async getFeatureStats() {
    const [total, open, inProgress, completed] = await Promise.all([
      prisma.featureRequest.count(),
      prisma.featureRequest.count({ where: { status: VoteStatus.OPEN } }),
      prisma.featureRequest.count({ where: { status: VoteStatus.IN_PROGRESS } }),
      prisma.featureRequest.count({ where: { status: VoteStatus.COMPLETED } }),
    ]);

    const byCategory = await prisma.featureRequest.groupBy({
      by: ['category'],
      _count: true,
    });

    return {
      total,
      open,
      inProgress,
      completed,
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
    };
  }
}