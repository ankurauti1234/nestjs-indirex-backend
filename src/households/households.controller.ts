import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { HouseholdsService } from './households.service.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { HouseholdQueryDto, HouseholdMemberQueryDto } from './dto/household.dto.js';
import {
  CreateHouseholdTvDto,
  UpdateHouseholdTvDto,
  HouseholdTvQueryDto,
} from './dto/household-tv.dto.js';

@ApiTags('Households & Members')
@ApiCookieAuth('auth_session')
@Controller('households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  @RequirePermission('households:read')
  @ApiOperation({ summary: 'List households with pagination and region filter (Requires households:read permission)' })
  @ApiResponse({ status: 200, description: 'Paginated list of households with linked members and TVs' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions' })
  async findAll(@Query() queryDto: HouseholdQueryDto) {
    return this.householdsService.findAll(queryDto);
  }

  @Get(':hhId')
  @RequirePermission('households:read')
  @ApiOperation({ summary: 'Get household details by HH ID (Requires households:read permission)' })
  @ApiResponse({ status: 200, description: 'Household details with members and TVs' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async findOne(@Param('hhId') hhId: string) {
    return this.householdsService.findOne(hhId);
  }

  @Get(':hhId/members')
  @RequirePermission('households:read')
  @ApiOperation({ summary: 'List members of a household with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of household members' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async findMembers(
    @Param('hhId') hhId: string,
    @Query() queryDto: HouseholdMemberQueryDto,
  ) {
    return this.householdsService.findMembers(hhId, queryDto);
  }

  @Get(':hhId/members/:memberId')
  @RequirePermission('households:read')
  @ApiOperation({ summary: 'Get member details by HH ID and Member ID (e.g. HH1000/members/M1)' })
  @ApiResponse({ status: 200, description: 'Member details' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async findOneMember(
    @Param('hhId') hhId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.householdsService.findOneMember(hhId, memberId);
  }

  // --- Household TV Endpoints ---

  @Get(':hhId/tvs')
  @RequirePermission('households:read')
  @ApiOperation({ summary: 'List all TV sets in a household (Requires households:read permission)' })
  @ApiResponse({ status: 200, description: 'Paginated list of household TV sets with installed device info' })
  @ApiResponse({ status: 404, description: 'Household not found' })
  async findTvs(
    @Param('hhId') hhId: string,
    @Query() queryDto: HouseholdTvQueryDto,
  ) {
    return this.householdsService.findTvs(hhId, queryDto);
  }

  @Get(':hhId/tvs/:tvId')
  @RequirePermission('households:read')
  @ApiOperation({ summary: 'Get single TV set details by HH ID and TV ID (e.g. HH1000/tvs/TV1)' })
  @ApiResponse({ status: 200, description: 'TV set details' })
  @ApiResponse({ status: 404, description: 'TV set or household not found' })
  async findOneTv(
    @Param('hhId') hhId: string,
    @Param('tvId') tvId: string,
  ) {
    return this.householdsService.findOneTv(hhId, tvId);
  }

  @Post(':hhId/tvs')
  @RequirePermission('households:write')
  @ApiOperation({ summary: 'Add a new TV set to a household (Max 5 TVs allowed per household)' })
  @ApiResponse({ status: 201, description: 'TV set created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request: Maximum 5 TVs limit reached' })
  @ApiResponse({ status: 409, description: 'Conflict: TV set ID already exists' })
  async createTv(
    @Param('hhId') hhId: string,
    @Body() dto: CreateHouseholdTvDto,
  ) {
    return this.householdsService.createTv(hhId, dto);
  }

  @Patch(':hhId/tvs/:tvId')
  @RequirePermission('households:write')
  @ApiOperation({ summary: 'Update TV set metadata or assign/unassign installed telemetry device' })
  @ApiResponse({ status: 200, description: 'TV set updated successfully' })
  @ApiResponse({ status: 404, description: 'TV set or household not found' })
  async updateTv(
    @Param('hhId') hhId: string,
    @Param('tvId') tvId: string,
    @Body() dto: UpdateHouseholdTvDto,
  ) {
    return this.householdsService.updateTv(hhId, tvId, dto);
  }

  @Delete(':hhId/tvs/:tvId')
  @RequirePermission('households:write')
  @ApiOperation({ summary: 'Delete a TV set from a household' })
  @ApiResponse({ status: 200, description: 'TV set deleted successfully' })
  @ApiResponse({ status: 404, description: 'TV set or household not found' })
  async removeTv(
    @Param('hhId') hhId: string,
    @Param('tvId') tvId: string,
  ) {
    return this.householdsService.removeTv(hhId, tvId);
  }
}
