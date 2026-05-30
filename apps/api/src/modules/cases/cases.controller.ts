import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CasesService } from './cases.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  CaseQueryDto,
  AssignCaseDto,
  CaseStatusUpdateDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@forensiq/database';

@ApiTags('Cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new case' })
  @ApiResponse({ status: 201, description: 'Case created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Case number already exists' })
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.casesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all cases with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Cases retrieved successfully' })
  async findAll(
    @Query() query: CaseQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.casesService.findAll(query, user.id);
  }

  @Get('users/assignable')
  @ApiOperation({ summary: 'Get list of users who can be assigned to cases' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAssignableUsers() {
    return this.casesService.getAssignableUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case details by ID' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update case details' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 409, description: 'Case number already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.casesService.update(id, dto, user.id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update case status' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case status updated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: CaseStatusUpdateDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.casesService.updateStatus(id, dto.status, user.id);
  }

  @Put(':id/assign')
  @ApiOperation({ summary: 'Assign case to a user' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case assigned successfully' })
  @ApiResponse({ status: 404, description: 'Case or user not found' })
  async assignCase(
    @Param('id') id: string,
    @Body() dto: AssignCaseDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.casesService.assignCase(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a case (only DRAFT or no transactions)' })
  @ApiParam({ name: 'id', description: 'Case ID' })
  @ApiResponse({ status: 204, description: 'Case deleted successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 403, description: 'Cannot delete case with transactions' })
  async delete(@Param('id') id: string) {
    return this.casesService.delete(id);
  }
}