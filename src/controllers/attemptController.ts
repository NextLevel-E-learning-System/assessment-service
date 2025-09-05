import { Request, Response, NextFunction } from 'express';
import { startAttempt } from '../repositories/submissionRepository.js';
import { findByCodigo } from '../repositories/assessmentRepository.js';
import { HttpError } from '../utils/httpError.js';

export async function startAttemptHandler(req:Request,res:Response,next:NextFunction){
  try {
    const { codigo } = req.params;
    const userId = (req.headers['x-user-id'] as string) || req.body.userId;
    if(!userId) throw new HttpError(400,'missing_user');
    const assessment = await findByCodigo(codigo);
    if(!assessment) throw new HttpError(404,'assessment_not_found');
    const started = await startAttempt(assessment.codigo, userId, assessment.tempo_limite||null);
    res.status(201).json({ attemptId: started.id, assessment: assessment.codigo, startedAt: started.data_inicio, deadline: started.deadline });
  } catch(e){ next(e); }
}
