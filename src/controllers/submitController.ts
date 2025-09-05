import { Request, Response, NextFunction } from 'express';
import { gradeSubmission } from '../services/submitService.js';

export async function submitAssessmentHandler(req:Request,res:Response,next:NextFunction){
  try {
    const { codigo } = req.params;
    const { userId, respostas } = req.body || {};
    if(!userId) return res.status(400).json({ error:'missing_userId'});
    const result = await gradeSubmission({ codigo, userId, respostas: respostas||[] });
    res.status(201).json(result);
  } catch(e){ next(e);} }
