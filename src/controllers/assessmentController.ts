import { Request, Response, NextFunction } from 'express';
import { createAssessmentSchema } from '../validation/assessmentSchemas.js';
import { createAssessment, getAssessment } from '../services/assessmentService.js';
import { HttpError } from '../utils/httpError.js';
export async function createAssessmentHandler(req:Request,res:Response,next:NextFunction){ const parsed=createAssessmentSchema.safeParse(req.body); if(!parsed.success) return next(new HttpError(400,'validation_error',parsed.error.issues)); try { const r= await createAssessment(parsed.data); res.status(201).json(r);} catch(e){ next(e);} }
export async function getAssessmentHandler(req:Request,res:Response,next:NextFunction){ try { const r= await getAssessment(req.params.codigo); res.json(r);} catch(e){ next(e);} }
