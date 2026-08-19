import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DirectionService } from './direction.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('direction')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DIRECTOR)
export class DirectionController {
  constructor(private readonly directionService: DirectionService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser('sub') userId: string) {
    return this.directionService.getDashboard(userId);
  }

  // --- Meetings ---

  @Get('meetings')
  findAllMeetings(
    @CurrentUser('sub') userId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directionService.findAllMeetings(userId, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('meetings/:id')
  findOneMeeting(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.findOneMeeting(id, userId);
  }

  @Post('meetings')
  createMeeting(
    @Body() dto: CreateMeetingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.createMeeting(dto, userId);
  }

  @Patch('meetings/:id')
  updateMeeting(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.updateMeeting(id, dto, userId);
  }

  @Delete('meetings/:id')
  deleteMeeting(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.deleteMeeting(id, userId);
  }

  // --- Projects ---

  @Get('projects')
  findAllProjects(
    @CurrentUser('sub') userId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.directionService.findAllProjects(userId, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('projects/:id')
  findOneProject(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.findOneProject(id, userId);
  }

  @Post('projects')
  createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.createProject(dto, userId);
  }

  @Patch('projects/:id')
  updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.updateProject(id, dto, userId);
  }

  @Delete('projects/:id')
  deleteProject(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.directionService.deleteProject(id, userId);
  }
}
