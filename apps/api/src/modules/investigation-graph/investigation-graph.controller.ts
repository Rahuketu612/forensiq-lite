import { Controller, Post, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvestigationGraphService } from './investigation-graph.service';
import { GraphFiltersDto } from './dto/graph.dto';

@Controller('cases/:caseId/graph')
@UseGuards(JwtAuthGuard)
export class InvestigationGraphController {
  constructor(private readonly graphService: InvestigationGraphService) {}

  @Post('generate')
  generateGraph(@Param('caseId', ParseUUIDPipe) caseId: string): Promise<{ nodeCount: number; edgeCount: number }> {
    return this.graphService.generateGraph(caseId);
  }

  @Get()
  getGraph(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Query() filters: GraphFiltersDto,
  ): Promise<any> {
    return this.graphService.getGraph(caseId, filters);
  }

  @Get('stats')
  getGraphStats(@Param('caseId', ParseUUIDPipe) caseId: string): Promise<any> {
    return this.graphService.getGraphStats(caseId);
  }

  @Get('nodes/:nodeId')
  getNodeById(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
  ): Promise<any> {
    return this.graphService.getNodeById(caseId, nodeId);
  }

  @Get('edges/:edgeId')
  getEdgeById(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('edgeId', ParseUUIDPipe) edgeId: string,
  ): Promise<any> {
    return this.graphService.getEdgeById(caseId, edgeId);
  }
}
