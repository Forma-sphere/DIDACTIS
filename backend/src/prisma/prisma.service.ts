import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
    await this.seedAdmin();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async seedAdmin() {
    try {
      const existing = await this.user.findFirst({ where: { email: 'admin@didactys.fr' } });
      if (existing) return;

      const hashedPassword = await bcrypt.hash('Admin2024!', 12);
      await this.user.create({
        data: {
          email: 'admin@didactys.fr',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'Didactys',
          role: 'ADMIN',
          isActive: true,
          emailVerified: true,
        },
      });
      this.logger.log('Admin user created: admin@didactys.fr');
    } catch (e) {
      this.logger.warn('Seed admin skipped: ' + (e as Error).message);
    }
  }
}
