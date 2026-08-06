import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sourceModule') sourceModule?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.documentsService.findAll({
      search,
      type,
      sourceModule,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  generate(
    @Body() dto: GenerateDocumentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.documentsService.generate(dto, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
