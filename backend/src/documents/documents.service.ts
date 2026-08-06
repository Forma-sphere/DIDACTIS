import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SourceModule, DocumentType } from '@prisma/client';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { generatePdf } from './generators/pdf.generator';
import { generateWord } from './generators/word.generator';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const documentInclude = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} satisfies Prisma.DocumentInclude;

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents');

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async findAll(params: {
    search?: string; type?: string; sourceModule?: string;
    page?: number; limit?: number;
  }) {
    const { search, type, sourceModule, page = 1, limit = 20 } = params;

    const where: Prisma.DocumentWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (type && Object.values(DocumentType).includes(type as DocumentType)) {
      where.type = type as DocumentType;
    }
    if (sourceModule && Object.values(SourceModule).includes(sourceModule as SourceModule)) {
      where.sourceModule = sourceModule as SourceModule;
    }

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: documentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: documentInclude,
    });
    if (!doc) throw new NotFoundException('Document introuvable');
    return doc;
  }

  async generate(dto: GenerateDocumentDto, userId: string) {
    const sections = await this.buildSections(dto.sourceModule, dto.sourceId);
    const sourceTitle = sections.title;
    const ext = dto.type === DocumentType.PDF ? '.pdf' : '.docx';
    const filename = `${randomUUID()}${ext}`;
    const filePath = join(UPLOADS_DIR, filename);
    const relativePath = `./uploads/documents/${filename}`;

    if (dto.type === DocumentType.PDF) {
      await generatePdf(filePath, sourceTitle, sections.sections);
    } else {
      await generateWord(filePath, sourceTitle, sections.sections);
    }

    const title = `${sourceTitle}${ext}`;

    return this.prisma.document.create({
      data: {
        title,
        type: dto.type,
        sourceModule: dto.sourceModule,
        sourceId: dto.sourceId,
        filePath: relativePath,
        createdById: userId,
      },
      include: documentInclude,
    });
  }

  async remove(id: string) {
    const doc = await this.findOne(id);
    const absPath = join(process.cwd(), doc.filePath.replace(/^\.\//, ''));
    try { unlinkSync(absPath); } catch { /* file may already be gone */ }
    return this.prisma.document.delete({ where: { id } });
  }

  private async buildSections(
    sourceModule: SourceModule,
    sourceId: string,
  ): Promise<{ title: string; sections: { heading: string; content: string }[] }> {
    switch (sourceModule) {
      case SourceModule.LESSON:
        return this.buildLessonSections(sourceId);
      case SourceModule.SEQUENCE:
        return this.buildSequenceSections(sourceId);
      case SourceModule.PROGRESSION:
        return this.buildProgressionSections(sourceId);
      case SourceModule.JOURNAL:
        return this.buildJournalSections(sourceId);
      case SourceModule.ASSESSMENT:
        return this.buildAssessmentSections(sourceId);
      default:
        throw new BadRequestException('Module source non supporté');
    }
  }

  private async buildLessonSections(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        sequence: { select: { title: true } },
        class: { select: { name: true } },
        competencies: { include: { competency: { select: { code: true, name: true } } } },
      },
    });
    if (!lesson) throw new NotFoundException('Préparation introuvable');

    return {
      title: lesson.title,
      sections: [
        { heading: 'Informations', content: `Séquence : ${lesson.sequence?.title || '—'}\nClasse : ${lesson.class?.name || '—'}\nDurée : ${lesson.duration} min` },
        { heading: 'Objectif', content: lesson.objective },
        { heading: 'Déroulement', content: lesson.content },
        { heading: 'Compétences', content: lesson.competencies.map((c) => `${c.competency.code} — ${c.competency.name}`).join('\n') || 'Aucune' },
      ],
    };
  }

  private async buildSequenceSections(id: string) {
    const sequence = await this.prisma.sequence.findUnique({
      where: { id },
      include: {
        progression: { select: { title: true } },
        competencies: { include: { competency: { select: { code: true, name: true } } } },
        lessons: { select: { title: true, duration: true, order: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!sequence) throw new NotFoundException('Séquence introuvable');

    return {
      title: sequence.title,
      sections: [
        { heading: 'Informations', content: `Progression : ${sequence.progression?.title || '—'}\nDescription : ${sequence.description || '—'}` },
        { heading: 'Compétences', content: sequence.competencies.map((c) => `${c.competency.code} — ${c.competency.name}`).join('\n') || 'Aucune' },
        { heading: 'Préparations', content: sequence.lessons.map((l, i) => `${i + 1}. ${l.title} (${l.duration} min)`).join('\n') || 'Aucune' },
      ],
    };
  }

  private async buildProgressionSections(id: string) {
    const progression = await this.prisma.progression.findUnique({
      where: { id },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        schoolYear: { select: { name: true } },
        competencies: { include: { competency: { select: { code: true, name: true, domain: true } } } },
        sequences: { select: { title: true, order: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!progression) throw new NotFoundException('Progression introuvable');

    return {
      title: progression.title,
      sections: [
        { heading: 'Informations', content: `École : ${progression.school?.name || '—'}\nClasse : ${progression.class?.name || '—'}\nAnnée scolaire : ${progression.schoolYear?.name || '—'}\nDescription : ${progression.description || '—'}` },
        { heading: 'Compétences', content: progression.competencies.map((c) => `[${c.competency.domain}] ${c.competency.code} — ${c.competency.name}`).join('\n') || 'Aucune' },
        { heading: 'Séquences', content: progression.sequences.map((s, i) => `${i + 1}. ${s.title}`).join('\n') || 'Aucune' },
      ],
    };
  }

  private async buildJournalSections(id: string) {
    const day = await this.prisma.journalDay.findUnique({
      where: { id },
      include: {
        class: { select: { name: true } },
        lessons: {
          include: { lesson: { select: { title: true, duration: true } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!day) throw new NotFoundException('Journée introuvable');

    const dateStr = new Date(day.date).toLocaleDateString('fr-FR');

    return {
      title: `Cahier-journal — ${dateStr}`,
      sections: [
        { heading: 'Informations', content: `Classe : ${day.class?.name || '—'}\nDate : ${dateStr}` },
        { heading: 'Notes', content: day.notes || '—' },
        { heading: 'Programme', content: day.lessons.map((jl) => `${jl.startTime} - ${jl.endTime} : ${jl.lesson.title} (${jl.lesson.duration} min)`).join('\n') || 'Aucune activité' },
      ],
    };
  }

  private async buildAssessmentSections(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        class: { select: { name: true } },
        competencies: { include: { competency: { select: { code: true, name: true } } } },
        results: {
          include: {
            student: { select: { firstName: true, lastName: true } },
            competency: { select: { code: true } },
          },
        },
      },
    });
    if (!assessment) throw new NotFoundException('Évaluation introuvable');

    const statusLabels: Record<string, string> = {
      NOT_EVALUATED: 'Non évalué', IN_PROGRESS: 'En cours',
      ACQUIRED: 'Acquis', EXCEEDED: 'Dépassé',
    };

    const dateStr = new Date(assessment.date).toLocaleDateString('fr-FR');

    const studentIds = [...new Set(assessment.results.map((r) => r.studentId))];
    const resultLines = studentIds.map((sid) => {
      const studentResults = assessment.results.filter((r) => r.studentId === sid);
      const student = studentResults[0]?.student;
      const name = student ? `${student.lastName} ${student.firstName}` : sid;
      const compLines = studentResults.map((r) => `  ${r.competency.code} : ${statusLabels[r.status] || r.status}`);
      return `${name}\n${compLines.join('\n')}`;
    });

    return {
      title: assessment.title,
      sections: [
        { heading: 'Informations', content: `Classe : ${assessment.class?.name || '—'}\nDate : ${dateStr}\nDescription : ${assessment.description || '—'}` },
        { heading: 'Compétences', content: assessment.competencies.map((c) => `${c.competency.code} — ${c.competency.name}`).join('\n') || 'Aucune' },
        { heading: 'Résultats', content: resultLines.join('\n\n') || 'Aucun résultat saisi' },
      ],
    };
  }
}
