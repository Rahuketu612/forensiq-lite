import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { PilotStatus, PilotPhase } from '@forensiq/database';
import { CreatePilotDto, UpdatePilotDto, CreateDemoDto, RecordActivityDto, RecordMetricDto } from './pilot.dto';

@Injectable()
export class PilotService {
  private readonly logger = new Logger(PilotService.name);

  async create(dto: CreatePilotDto) {
    this.logger.log(`Creating new pilot for firm: ${dto.firmName}`);
    return prisma.pilot.create({
      data: {
        firmName: dto.firmName,
        firmSize: dto.firmSize,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        pilotStatus: dto.pilotStatus || PilotStatus.PROPOSED,
        currentPhase: dto.currentPhase || PilotPhase.DISCOVERY,
        objectives: dto.objectives || [],
      },
    });
  }

  async findAll(filters?: { status?: PilotStatus; phase?: PilotPhase }) {
    const where: any = {};
    if (filters?.status) where.pilotStatus = filters.status;
    if (filters?.phase) where.currentPhase = filters.phase;

    return prisma.pilot.findMany({
      where,
      include: {
        demos: true,
        feedback: { where: { status: 'SUBMITTED' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
        metrics: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const pilot = await prisma.pilot.findUnique({
      where: { id },
      include: {
        demos: { orderBy: { demoDate: 'desc' } },
        feedback: { include: { comments: { include: { user: true } } } },
        votes: { include: { feature: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 50 },
        metrics: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!pilot) {
      throw new NotFoundException(`Pilot with ID ${id} not found`);
    }

    return pilot;
  }

  async update(id: string, dto: UpdatePilotDto) {
    this.logger.log(`Updating pilot ${id}`);
    return prisma.pilot.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    this.logger.log(`Deleting pilot ${id}`);
    return prisma.pilot.delete({ where: { id } });
  }

  // Demo management
  async addDemo(pilotId: string, dto: CreateDemoDto) {
    return prisma.pilotDemo.create({
      data: {
        pilotId,
        demoDate: new Date(),
        demoType: dto.demoType,
        attendees: dto.attendees || [],
        outcome: dto.outcome,
        nextSteps: dto.nextSteps,
        notes: dto.notes,
      },
    });
  }

  async getDemos(pilotId: string) {
    return prisma.pilotDemo.findMany({
      where: { pilotId },
      orderBy: { demoDate: 'desc' },
    });
  }

  // Activity tracking
  async recordActivity(pilotId: string, dto: RecordActivityDto) {
    return prisma.pilotActivity.create({
      data: {
        pilotId,
        activity: dto.activity,
        metadata: dto.metadata,
      },
    });
  }

  // Metrics tracking
  async recordMetric(pilotId: string, dto: RecordMetricDto) {
    return prisma.pilotMetric.create({
      data: {
        pilotId,
        metricType: dto.metricType,
        value: dto.value,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
        metadata: dto.metadata,
      },
    });
  }

  // Analytics
  async getPilotSummary() {
    const [total, active, proposed, completed] = await Promise.all([
      prisma.pilot.count(),
      prisma.pilot.count({ where: { pilotStatus: PilotStatus.ACTIVE } }),
      prisma.pilot.count({ where: { pilotStatus: PilotStatus.PROPOSED } }),
      prisma.pilot.count({ where: { pilotStatus: PilotStatus.COMPLETED } }),
    ]);

    const recentActivity = await prisma.pilotActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { pilot: { select: { firmName: true, contactName: true } } },
    });

    const pendingFeedback = await prisma.pilotFeedback.count({
      where: { status: 'SUBMITTED' },
    });

    return {
      summary: { total, active, proposed, completed, pendingFeedback },
      recentActivity,
    };
  }
}