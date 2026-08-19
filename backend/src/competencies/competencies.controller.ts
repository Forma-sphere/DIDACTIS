import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CompetenciesService } from './competencies.service';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('competencies')
@UseGuards(JwtAuthGuard)
export class CompetenciesController {
  constructor(private readonly competenciesService: CompetenciesService) {}

  @Get('domains')
  getDomains() {
    return this.competenciesService.getDomains();
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('domain') domain?: string,
    @Query('archived') archived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.competenciesService.findAll({
      search,
      domain,
      archived,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competenciesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  create(@Body() dto: CreateCompetencyDto) {
    return this.competenciesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  update(@Param('id') id: string, @Body() dto: UpdateCompetencyDto) {
    return this.competenciesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  archive(@Param('id') id: string) {
    return this.competenciesService.archive(id);
  }
}
