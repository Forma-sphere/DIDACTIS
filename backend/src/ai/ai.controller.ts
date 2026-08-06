import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('conversations')
  findAllConversations(
    @CurrentUser('sub') userId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.findAllConversations(userId, {
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('conversations/:id')
  findOneConversation(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.aiService.findOneConversation(id, userId);
  }

  @Post('conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.aiService.createConversation(dto, userId);
  }

  @Post('chat')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.TEACHER)
  chat(
    @Body() dto: ChatDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.aiService.chat(dto, userId);
  }

  @Delete('conversations/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteConversation(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.aiService.deleteConversation(id, userId);
  }
}
