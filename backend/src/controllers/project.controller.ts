import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { generateUniqueProjectSlug } from '../utils/slug';
import { deleteUploadedFile } from '../middlewares/upload.middleware';
import { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema';

/** Inclusion commune : les compétences liées, à plat pour le frontend. */
const withSkills = {
  skills: {
    include: {
      skill: {
        select: { id: true, name: true, category: true, logoUrl: true, level: true },
      },
    },
  },
} satisfies Prisma.ProjectInclude;

/** Aplatit skills[{skill}] en skills[] : le frontend n'a pas à connaître la table de jonction. */
const serialize = (project: any) => ({
  ...project,
  skills: project.skills?.map((s: any) => s.skill) ?? [],
});

/** POST /api/projects — création (admin) */
export const createProject = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as CreateProjectInput;

  // Vérifie que toutes les compétences référencées existent réellement,
  // pour renvoyer un message clair plutôt qu'une erreur de clé étrangère.
  if (data.skillIds.length > 0) {
    const found = await prisma.skill.count({ where: { id: { in: data.skillIds } } });
    if (found !== data.skillIds.length) {
      throw AppError.badRequest("Une ou plusieurs compétences référencées n'existent pas.");
    }
  }

  const slug = await generateUniqueProjectSlug(data.title);

  const project = await prisma.project.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      content: data.content,
      mainImage: data.mainImage,
      images: data.images,
      videoUrl: data.videoUrl ?? null,
      githubUrl: data.githubUrl ?? null,
      demoUrl: data.demoUrl ?? null,
      documentation: data.documentation ?? null,
      status: data.status,
      architecture: data.architecture as Prisma.InputJsonValue,
      features: data.features,
      challenges: data.challenges,
      order: data.order,
      date: data.date,
      skills: {
        create: data.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })),
      },
    },
    include: withSkills,
  });

  await createAuditLog(req, {
    action: 'PROJECT_CREATE',
    resource: 'Project',
    details: { projectId: project.id, title: project.title },
  });

  res.status(201).json({ success: true, data: serialize(project) });
};

/**
 * GET /api/projects — liste publique
 * Filtres : ?status=COMPLETED&skill=<uuid>&search=paiement
 */
export const getAllProjects = async (req: Request, res: Response): Promise<void> => {
  const { status, skill, search } = req.query as Record<string, string | undefined>;

  const where: Prisma.ProjectWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(skill ? { skills: { some: { skillId: skill } } } : {}),
    ...(search ? { title: { contains: search } } : {}),
  };

  const projects = await prisma.project.findMany({
    where,
    include: withSkills,
    orderBy: [{ order: 'asc' }, { date: 'desc' }],
  });

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects.map(serialize),
  });
};

/** GET /api/projects/:slug — détail public */
export const getProjectBySlug = async (req: Request, res: Response): Promise<void> => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug as string },
    include: withSkills,
  });

  if (!project) throw AppError.notFound('Projet introuvable.');

  res.status(200).json({ success: true, data: serialize(project) });
};

/** PUT /api/projects/:id — modification (admin) */
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const data = req.body as UpdateProjectInput;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Projet introuvable.');

  if (data.skillIds && data.skillIds.length > 0) {
    const found = await prisma.skill.count({ where: { id: { in: data.skillIds } } });
    if (found !== data.skillIds.length) {
      throw AppError.badRequest("Une ou plusieurs compétences référencées n'existent pas.");
    }
  }

  /*
   * Le slug n'est PAS régénéré à chaque modification. L'ancienne version le
   * recalculait avec un timestamp, ce qui cassait l'URL publique (et donc
   * l'indexation Google et les liens partagés) à la moindre correction de
   * titre. Il n'évolue que si le projet n'a encore aucun contenu indexé,
   * ce qu'on laisse à une action explicite côté admin.
   */
  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (data.skillIds) {
      await tx.projectSkill.deleteMany({ where: { projectId: id } });
    }

    return tx.project.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        mainImage: data.mainImage,
        images: data.images,
        videoUrl: data.videoUrl,
        githubUrl: data.githubUrl,
        demoUrl: data.demoUrl,
        documentation: data.documentation,
        status: data.status,
        architecture: data.architecture as Prisma.InputJsonValue | undefined,
        features: data.features,
        challenges: data.challenges,
        order: data.order,
        date: data.date,
        ...(data.skillIds
          ? {
              skills: {
                create: data.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })),
              },
            }
          : {}),
      },
      include: withSkills,
    });
  });

  // L'ancienne image de couverture devient orpheline si elle a été remplacée.
  if (data.mainImage && data.mainImage !== existing.mainImage) {
    deleteUploadedFile(existing.mainImage);
  }

  await createAuditLog(req, {
    action: 'PROJECT_UPDATE',
    resource: 'Project',
    details: { projectId: id, title: updated.title },
  });

  res.status(200).json({ success: true, data: serialize(updated) });
};

/** DELETE /api/projects/:id — suppression (admin) */
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw AppError.notFound('Projet introuvable.');

  // Les lignes ProjectSkill partent en cascade (onDelete: Cascade au schéma).
  await prisma.project.delete({ where: { id } });

  // Nettoyage des fichiers physiques, pour éviter que public/uploads
  // n'accumule indéfiniment des images qui ne servent plus.
  deleteUploadedFile(project.mainImage);
  const images = Array.isArray(project.images) ? (project.images as string[]) : [];
  images.forEach(deleteUploadedFile);

  await createAuditLog(req, {
    action: 'PROJECT_DELETE',
    resource: 'Project',
    details: { projectId: id, title: project.title },
  });

  res.status(200).json({ success: true, message: 'Projet supprimé.' });
};
