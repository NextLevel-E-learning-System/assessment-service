import { Request, Response, NextFunction } from 'express';
import { createAssessmentSchema } from '../validation/assessmentSchemas.js';
import { createAssessment, getAssessment, addQuestion, getQuestions, addAlternative, getAlternatives } from '../services/assessmentService.js';
import { HttpError } from '../utils/httpError.js';
export async function createAssessmentHandler(req:Request,res:Response,next:NextFunction){ const parsed=createAssessmentSchema.safeParse(req.body); if(!parsed.success) return next(new HttpError(400,'validation_error',parsed.error.issues)); try { const r= await createAssessment(parsed.data); res.status(201).json(r);} catch(e){ next(e);} }
export async function getAssessmentHandler(req:Request,res:Response,next:NextFunction){ try { const r= await getAssessment(req.params.codigo); res.json(r);} catch(e){ next(e);} }
interface AddQuestionPayload { assessment_codigo:string; enunciado:string; tipo:'MULTIPLA_ESCOLHA'|'VERDADEIRO_FALSO'; ordem?:number; peso?:number }
export async function addQuestionHandler(req:Request,res:Response,next:NextFunction){
	try { const payload: AddQuestionPayload = { assessment_codigo: req.params.codigo, enunciado: req.body.enunciado, tipo: req.body.tipo, ordem: req.body.ordem, peso: req.body.peso }; const r = await addQuestion(payload); res.status(201).json(r);} catch(e){ next(e);} }
export async function listQuestionsHandler(req:Request,res:Response,next:NextFunction){
	try { const r = await getQuestions(req.params.codigo); res.json(r);} catch(e){ next(e);} }
interface AddAlternativePayload { questao_id:string; texto:string; correta:boolean }
export async function addAlternativeHandler(req:Request,res:Response,next:NextFunction){
	try { const payload: AddAlternativePayload = { questao_id: req.params.questaoId, texto: req.body.texto, correta: !!req.body.correta }; const r = await addAlternative(payload); res.status(201).json(r);} catch(e){ next(e);} }
export async function listAlternativesHandler(req:Request,res:Response,next:NextFunction){
	try { const r = await getAlternatives(req.params.questaoId); res.json(r);} catch(e){ next(e);} }
