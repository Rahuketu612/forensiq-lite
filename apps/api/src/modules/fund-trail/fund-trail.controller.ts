import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
import { FundTrailService } from './fund-trail.service';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Fund Trail')
@ApiBearerAuth()
@Controller('cases/:caseId/fund-trail')
export class FundTrailController {
  constructor(private readonly fundTrailService: FundTrailService) {}

  @Get()
  @ApiOperation({ summary: 'Get fund trail for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Fund trail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getFundTrail(
    @Param('caseId') caseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.fundTrailService.getFundTrail(caseId, user.id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate fund trail links for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 201, description: 'Fund trail generated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async generateFundTrail(
    @Param('caseId') caseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.fundTrailService.generateFundTrail(caseId, user.id);
  }

  @Delete('links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction link' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID to delete' })
  @ApiResponse({ status: 204, description: 'Link deleted successfully' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async deleteLink(
    @Param('caseId') caseId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.fundTrailService.deleteLink(linkId, user.id);
  }
}
