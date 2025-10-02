import { Request, Response, NextFunction } from 'express';
import { createAssessmentSchema, updateAssessmentSchema } from '../validation/assessmentSchemas.js';
import { 
  createAssessment, 
  getAssessment, 
  getAssessmentWithQuestions,
  updateAssessment,
  deleteAssessment,
  listAssessments,
  addQuestion, 
  getQuestions,
  updateQuestion,
  deleteQuestion
} from '../services/assessmentService.js';
import { HttpError } from '../utils/httpError.js';

export async function createAssessmentHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = createAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'validation_error', parsed.error.issues));
  }

  try {
    const result = await createAssessment(parsed.data);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function getAssessmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getAssessment(req.params.codigo);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function getAssessmentWithQuestionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getAssessmentWithQuestions(req.params.codigo);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function listAssessmentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const curso_id = req.query.curso_id as string;
    const result = await listAssessments(curso_id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function updateAssessmentHandler(req: Request, res: Response, next: NextFunction) {
  const parsed = updateAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'validation_error', parsed.error.issues));
  }

  try {
    const result = await updateAssessment(req.params.codigo, parsed.data);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function deleteAssessmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await deleteAssessment(req.params.codigo);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

interface AddQuestionPayload {
  assessment_codigo: string;
  enunciado: string;
  tipo: 'MULTIPLA_ESCOLHA' | 'VERDADEIRO_FALSO' | 'DISSERTATIVA';
  opcoes_resposta?: string[];
  resposta_correta?: string;
  peso?: number;
}

export async function addQuestionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload: AddQuestionPayload = {
      assessment_codigo: req.params.codigo,
      enunciado: req.body.enunciado,
      tipo: req.body.tipo,
      opcoes_resposta: req.body.opcoes_resposta,
      resposta_correta: req.body.resposta_correta,
      peso: req.body.peso
    };
    const result = await addQuestion(payload);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function listQuestionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getQuestions(req.params.codigo);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function updateQuestionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { enunciado, opcoes_resposta, resposta_correta, peso, tipo } = req.body;
    const result = await updateQuestion(id, { enunciado, opcoes_resposta, resposta_correta, peso, tipo });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function deleteQuestionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await deleteQuestion(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

// REMOVIDO: addAlternativeHandler e listAlternativesHandler
// As alternativas agora são gerenciadas automaticamente junto com as questões
