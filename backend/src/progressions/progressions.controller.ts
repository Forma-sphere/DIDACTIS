import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProgressionsService } from './progressions.service';
import { CreateProgressionDto } from './dto/create-progression.dto';
import { UpdateProgressionDto } from './dto/update-progression.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('progressions')
@UseGuards(JwtAuthGuard)
export class ProgressionsController {
  constructor(private readonly progressionsService: ProgressionsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('schoolId') schoolId?: string,
    @Query('classId') classId?: string,
    @Query('schoolYearId') schoolYearId?: string,
    @Query('archived') archived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.progressionsService.findAll({
      search,
      schoolId,
      classId,
      schoolYearId,
      archived,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.progressionsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  create(@Body() dto: CreateProgressionDto) {
    return this.progressionsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  update(@Param('id') id: string, @Body() dto: UpdateProgressionDto) {
    return this.progressionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  archive(@Param('id') id: string) {
    return this.progressionsService.archive(id);
  }
}
