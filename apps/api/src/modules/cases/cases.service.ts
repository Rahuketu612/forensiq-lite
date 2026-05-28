import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { CaseStatus } from '@forensiq/database';
import type { CreateCaseDto, UpdateCaseDto, CaseQueryDto, AssignCaseDto } from './dto';
import type { Case, User } from '@forensiq/database';

@Injectable()
export class CasesService {
  async create(dto: CreateCaseDto, userId: string): Promise<Case> {
    // Check if case number already exists
    const existingCase = await prisma.case.findUnique({
      where: { caseNumber: dto.caseNumber },
    });

    if (existingCase) {
      throw new ConflictException('Case number already exists');
    }

    return prisma.case.create({
      data: {
        caseNumber: dto.caseNumber,
        title: dto.title,
        description: dto.description,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone,
        clientAddress: dto.clientAddress,
        status: dto.status || CaseStatus.DRAFT,
        riskLevel: dto.riskLevel,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async findAll(query: CaseQueryDto, userId: string): Promise<{
    cases: Case[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { status, riskLevel, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', search } = query;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.case.count({ where });

    // Get paginated results
    const cases = await prisma.case.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: order },
    });

    return {
      cases,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Case> {
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: {
            transactions: true,
            flags: true,
          },
        },
      },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    return caseData;
  }

  async update(id: string, dto: UpdateCaseDto, userId: string): Promise<Case> {
    const existingCase = await prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    // Check for case number conflict
    if (dto.caseNumber && dto.caseNumber !== existingCase.caseNumber) {
      const conflict = await prisma.case.findUnique({
        where: { caseNumber: dto.caseNumber },
      });

      if (conflict) {
        throw new ConflictException('Case number already exists');
      }
    }

    return prisma.case.update({
      where: { id },
      data: {
        ...dto,
        // If status changing to CLOSED, set completedAt
        ...(dto.status === CaseStatus.CLOSED && { completedAt: new Date() }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async updateStatus(id: string, status: CaseStatus, userId: string): Promise<Case> {
    const existingCase = await prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    return prisma.case.update({
      where: { id },
      data: {
        status,
        ...(status === CaseStatus.CLOSED && { completedAt: new Date() }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async assignCase(id: string, dto: AssignCaseDto, userId: string): Promise<Case> {
    const existingCase = await prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    // Verify user exists
    const assignee = await prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!assignee) {
      throw new NotFoundException('User not found');
    }

    if (!assignee.isActive) {
      throw new ForbiddenException('Cannot assign to inactive user');
    }

    return prisma.case.update({
      where: { id },
      data: {
        assignedToId: dto.userId,
        assignedAt: new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    const existingCase = await prisma.case.findUnique({
      where: { id },
    });

    if (!existingCase) {
      throw new NotFoundException('Case not found');
    }

    // Only allow deletion of DRAFT cases or if user is ADMIN
    // For now, just check if case has transactions
    const transactionCount = await prisma.transaction.count({
      where: { caseId: id },
    });

    if (transactionCount > 0) {
      throw new ForbiddenException('Cannot delete case with transactions. Archive instead.');
    }

    await prisma.case.delete({
      where: { id },
    });
  }

  async getAssignableUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
      },
    });

    return users;
  }
}