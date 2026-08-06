import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { SaveResultsDto } from './dto/save-results.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('classId') classId?: string,
    @Query('archived') archived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assessmentsService.findAll({
      search,
      classId,
      archived,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  create(@Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: UpdateAssessmentDto) {
    return this.assessmentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  archive(@Param('id') id: string) {
    return this.assessmentsService.archive(id);
  }

  @Post(':id/results')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  saveResults(@Param('id') id: string, @Body() dto: SaveResultsDto) {
    return this.assessmentsService.saveResults(id, dto);
  }
}
