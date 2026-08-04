import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('schools')
@UseGuards(JwtAuthGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Get()
  findAll(@Query('archived') archived?: string) {
    return this.schoolsService.findAll(archived === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schoolsService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  create(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.update(id, dto);
  }

  @Patch(':id/archive')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  archive(@Param('id') id: string) {
    return this.schoolsService.archive(id);
  }

  // --- School Years ---

  @Post(':schoolId/years')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  createYear(@Param('schoolId') schoolId: string, @Body() dto: CreateSchoolYearDto) {
    return this.schoolsService.createYear(schoolId, dto);
  }

  @Patch(':schoolId/years/:yearId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  updateYear(
    @Param('schoolId') schoolId: string,
    @Param('yearId') yearId: string,
    @Body() dto: UpdateSchoolYearDto,
  ) {
    return this.schoolsService.updateYear(schoolId, yearId, dto);
  }

  @Delete(':schoolId/years/:yearId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  deleteYear(@Param('schoolId') schoolId: string, @Param('yearId') yearId: string) {
    return this.schoolsService.deleteYear(schoolId, yearId);
  }

  // --- Periods ---

  @Post(':schoolId/years/:yearId/periods')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  createPeriod(
    @Param('schoolId') schoolId: string,
    @Param('yearId') yearId: string,
    @Body() dto: CreatePeriodDto,
  ) {
    return this.schoolsService.createPeriod(schoolId, yearId, dto);
  }

  @Patch(':schoolId/years/:yearId/periods/:periodId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  updatePeriod(
    @Param('schoolId') schoolId: string,
    @Param('yearId') yearId: string,
    @Param('periodId') periodId: string,
    @Body() dto: UpdatePeriodDto,
  ) {
    return this.schoolsService.updatePeriod(schoolId, yearId, periodId, dto);
  }

  @Delete(':schoolId/years/:yearId/periods/:periodId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  deletePeriod(
    @Param('schoolId') schoolId: string,
    @Param('yearId') yearId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.schoolsService.deletePeriod(schoolId, yearId, periodId);
  }
}
