import { Request, Response, NextFunction } from 'express';
import { gradeSubmission } from '../services/submitService.js';
import { HttpError } from '../utils/httpError.js';

interface SubmitPayload { userId?:string; attemptId?:string; respostas?: { questao_id:string; resposta:string }[] }

export async function submitAssessmentHandler(req:Request,res:Response,next:NextFunction){
  try {
    const { codigo } = req.params;
    const body:SubmitPayload = req.body || {};
    const userId = (req.headers['x-user-id'] as string) || body.userId;
    if(!userId) throw new HttpError(400,'missing_user');
  if(!body.attemptId) throw new HttpError(400,'missing_attemptId');
  if(!Array.isArray(body.respostas)) throw new HttpError(400,'invalid_respostas');
  const result = await gradeSubmission({ codigo, userId, attemptId: body.attemptId, respostas: body.respostas });
    res.status(201).json(result);
  } catch(e){ next(e);} }
