import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

const resourceInclude = {
  lessons: {
    include: {
      lesson: {
        select: { id: true, title: true },
      },
    },
  },
} satisfies Prisma.ResourceInclude;

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; type?: string;
    page?: number; limit?: number;
  }) {
    const { search, type, page = 1, limit = 20 } = params;

    const where: Prisma.ResourceWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (type) {
      where.type = type as any;
    }

    const [data, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        include: resourceInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id },
      include: resourceInclude,
    });
    if (!resource) throw new NotFoundException('Ressource introuvable');
    return resource;
  }

  async create(dto: CreateResourceDto, filePath: string) {
    return this.prisma.resource.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        filePath,
        tags: dto.tags || [],
      },
      include: resourceInclude,
    });
  }

  async update(id: string, dto: UpdateResourceDto) {
    await this.findOne(id);
    return this.prisma.resource.update({
      where: { id },
      data: dto,
      include: resourceInclude,
    });
  }

  async remove(id: string) {
    const resource = await this.findOne(id);
    await this.prisma.lessonResource.deleteMany({ where: { resourceId: id } });
    await this.prisma.resource.delete({ where: { id } });
    return resource;
  }
}
