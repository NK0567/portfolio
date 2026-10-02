import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { createAuditLog } from '../utils/logger';
import { deleteUploadedFile } from '../middlewares/upload.middleware';

/**
 * Dépôt d'images indépendant d'une ressource.
 *
 * Les routes existantes attachent un fichier à la création d'un projet
 * (coverImage) ou d'une compétence (logo). La galerie d'un projet pose un
 * problème différent : on veut ajouter une capture, la voir tout de suite, en
 * retirer une autre, le tout avant d'enregistrer le projet.
 *
 * Passer par ce point d'entrée sépare les deux moments. Le fichier monte
 * d'abord et renvoie son chemin, puis le formulaire enregistre la liste des
 * chemins dans `images`. L'alternative, un envoi multipart de dix fichiers au
 * moment de l'enregistrement, oblige à tout recommencer si la validation
 * échoue sur un autre champ.
 */

/** POST /api/uploads/image : renvoie le chemin public du fichier déposé. */
export const uploadSingleImage = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    throw AppError.badRequest('Aucun fichier reçu. Le champ doit se nommer « file ».');
  }

  res.status(201).json({
    success: true,
    data: {
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
};

/**
 * DELETE /api/uploads : supprime un fichier déposé.
 *
 * Le chemin est lu dans le corps et non dans l'URL : un chemin contient des
 * barres obliques, qu'il faudrait encoder puis décoder, avec le risque de
 * traversée de répertoire que ça implique. deleteUploadedFile vérifie de
 * toute façon que la cible reste dans le dossier d'uploads.
 *
 * Utile quand on retire une capture avant d'avoir enregistré le projet :
 * sans ça, le fichier resterait sur le disque sans que rien ne le référence.
 */
export const deleteUpload = async (req: Request, res: Response): Promise<void> => {
  const { path: filePath } = req.body as { path?: unknown };

  if (typeof filePath !== 'string' || !filePath.startsWith('/uploads/')) {
    throw AppError.badRequest('Chemin invalide.');
  }

  deleteUploadedFile(filePath);

  await createAuditLog(req, {
    action: 'UPLOAD_DELETE',
    resource: 'Upload',
    details: { path: filePath },
  });

  // 200 et non 204 : le frontend lit systématiquement `success`, et une
  // réponse sans corps l'obligerait à traiter cette route à part.
  res.status(200).json({ success: true, message: 'Fichier supprimé.' });
};
