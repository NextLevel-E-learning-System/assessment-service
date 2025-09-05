import { Request, Response } from 'express';
import { listDissertativeAnswers, applyReview, finalizeReviewedAttempt } from '../repositories/reviewRepository.js';
import { getAttempt } from '../repositories/submissionRepository.js';

// GET /assessments/v1/attempts/:attemptId/dissertative
export async function listDissertativeHandler(req:Request,res:Response){
  const { attemptId } = req.params;
  const attempt = await getAttempt(attemptId);
  if(!attempt) return res.status(404).json({message:'Tentativa não encontrada'});
  if(attempt.status !== 'PENDENTE_REVISAO') return res.status(409).json({message:'Tentativa não está pendente de revisão'});
  const answers = await listDissertativeAnswers(attemptId);
  return res.json({ attemptId, answers });
}

// PATCH /assessments/v1/attempts/:attemptId/review
export async function reviewAttemptHandler(req:Request,res:Response){
  const { attemptId } = req.params;
  const { scores, notaMinima = 70 } = req.body as { scores: { respostaId:string; pontuacao:number }[]; notaMinima?:number };
  if(!Array.isArray(scores) || scores.length===0){
    return res.status(400).json({message:'scores é obrigatório'});
  }
  const attempt = await getAttempt(attemptId);
  if(!attempt) return res.status(404).json({message:'Tentativa não encontrada'});
  if(attempt.status !== 'PENDENTE_REVISAO') return res.status(409).json({message:'Tentativa não está pendente de revisão'});
  // aplica notas
  await applyReview(attemptId, scores);
  const final = await finalizeReviewedAttempt(attemptId, notaMinima);
  return res.json({ attemptId, nota: final?.nota, aprovado: final?.aprovado });
}