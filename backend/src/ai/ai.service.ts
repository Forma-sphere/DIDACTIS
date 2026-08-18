import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ChatDto } from './dto/chat.dto';

const conversationInclude = {
  messages: {
    orderBy: { createdAt: 'asc' } as const,
  },
} satisfies Prisma.ConversationInclude;

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllConversations(userId: string, params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;

    const where: Prisma.ConversationWhereInput = { userId };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneConversation(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude,
    });
    if (!conversation) throw new NotFoundException('Conversation introuvable');
    if (conversation.userId !== userId) throw new ForbiddenException('Accès refusé');
    return conversation;
  }

  async createConversation(dto: CreateConversationDto, userId: string) {
    return this.prisma.conversation.create({
      data: { title: dto.title, userId },
      include: conversationInclude,
    });
  }

  async chat(dto: ChatDto, userId: string) {
    const conversation = await this.findOneConversation(dto.conversationId, userId);

    const userMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: dto.message,
      },
    });

    const assistantContent = this.generateResponse(dto.message);

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: assistantContent,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return { userMessage, assistantMessage };
  }

  async deleteConversation(id: string, userId: string) {
    await this.findOneConversation(id, userId);
    return this.prisma.conversation.delete({ where: { id } });
  }

  private generateResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase();

    if (msg.includes('bonjour') || msg.includes('salut') || msg.includes('hello')) {
      return 'Bonjour ! Je suis l\'assistant pédagogique Didactys. Comment puis-je vous aider aujourd\'hui ? Je peux vous accompagner sur vos préparations, séquences, progressions, évaluations ou tout autre aspect de votre enseignement.';
    }

    if (msg.includes('préparation') || msg.includes('leçon') || msg.includes('séance')) {
      return 'Pour vos préparations de séances, je vous recommande de :\n\n1. Définir clairement l\'objectif pédagogique\n2. Identifier les compétences visées dans le référentiel\n3. Prévoir les différentes phases (découverte, recherche, mise en commun, entraînement)\n4. Adapter la durée à l\'âge des élèves\n5. Préparer le matériel nécessaire\n\nVoulez-vous que je vous aide sur un point en particulier ?';
    }

    if (msg.includes('évaluation') || msg.includes('évaluer') || msg.includes('noter')) {
      return 'Pour l\'évaluation des compétences, voici quelques principes :\n\n1. Privilégiez l\'évaluation formative en cours d\'apprentissage\n2. Utilisez des critères de réussite clairs et communiqués aux élèves\n3. Variez les modalités (observation, production écrite, oral)\n4. Différenciez les supports si nécessaire\n5. Pensez à l\'auto-évaluation pour responsabiliser les élèves\n\nN\'hésitez pas à me poser des questions plus précises.';
    }

    if (msg.includes('progression') || msg.includes('programmer') || msg.includes('programmation')) {
      return 'Pour construire une progression efficace :\n\n1. Partez des programmes officiels et du socle commun\n2. Identifiez les compétences à travailler sur la période\n3. Organisez les apprentissages de façon progressive\n4. Prévoyez des temps de réinvestissement\n5. Articulez les différents domaines disciplinaires\n\nJe peux vous aider à structurer votre progression si vous me donnez plus de détails.';
    }

    if (msg.includes('séquence')) {
      return 'Une séquence pédagogique bien construite comprend généralement :\n\n1. Une situation de départ motivante\n2. Des séances de découverte et de recherche\n3. Des phases de structuration des connaissances\n4. Des exercices d\'entraînement progressifs\n5. Une évaluation sommative\n\nChaque séance doit avoir un objectif clair qui contribue à l\'objectif global de la séquence.';
    }

    if (msg.includes('différenciation') || msg.includes('différencier') || msg.includes('adaptation')) {
      return 'La différenciation pédagogique peut prendre plusieurs formes :\n\n1. **Par les contenus** : adapter les supports et les documents\n2. **Par les processus** : varier les méthodes de travail\n3. **Par les productions** : proposer différentes formes de restitution\n4. **Par l\'environnement** : aménager l\'espace et le temps\n\nL\'essentiel est de maintenir des objectifs ambitieux pour tous les élèves.';
    }

    if (msg.includes('merci')) {
      return 'Je vous en prie ! N\'hésitez pas à revenir vers moi si vous avez d\'autres questions. Bonne continuation dans vos préparations !';
    }

    return 'Je suis l\'assistant pédagogique Didactys. Je peux vous aider sur les sujets suivants :\n\n• Préparations de séances\n• Construction de séquences\n• Élaboration de progressions\n• Évaluation des compétences\n• Différenciation pédagogique\n• Gestion de classe\n\nPosez-moi votre question et je ferai de mon mieux pour vous accompagner.\n\n_Note : lorsqu\'un fournisseur d\'IA sera configuré, les réponses seront générées par intelligence artificielle._';
  }
}
