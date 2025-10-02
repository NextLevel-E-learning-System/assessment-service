import { 
  insertAssessment, 
  findByCodigo, 
  findAssessmentWithQuestions,
  updateAssessmentDb,
  deleteAssessmentDb,
  listAssessmentsByCourse,
  insertQuestion, 
  listQuestionsSimple,
  updateQuestionDb,
  deleteQuestionDb,
  NewAssessment, 
  NewQuestion, 
  UpdateAssessmentData 
} from '../repositories/assessmentRepository.js';
import { HttpError } from '../utils/httpError.js';

export async function createAssessment(d: NewAssessment) {
  try {
    await insertAssessment(d);
    return { codigo: d.codigo };
  } catch (err: unknown) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === '23505') {
      throw new HttpError(409, 'duplicado');
    }
    throw err;
  }
}

export async function getAssessment(codigo: string) {
  const a = await findByCodigo(codigo);
  if (!a) throw new HttpError(404, 'nao_encontrado');
  return a;
}

export async function listAssessments(curso_id?: string) {
  if (curso_id) {
    return listAssessmentsByCourse(curso_id);
  }
  return [];
}

export async function updateAssessment(codigo: string, data: UpdateAssessmentData) {
  const updated = await updateAssessmentDb(codigo, data);
  if (!updated) {
    throw new HttpError(404, 'nao_encontrado');
  }
  return { codigo, atualizado: true };
}

export async function deleteAssessment(codigo: string) {
  const inactivated = await deleteAssessmentDb(codigo);
  if (!inactivated) {
    throw new HttpError(404, 'nao_encontrado_ou_ja_inativo');
  }
  return { codigo, inativado: true };
}

export async function addQuestion(d: NewQuestion) {
  const id = await insertQuestion(d);
  return { id };
}

// Buscar avaliação completa com questões
export async function getAssessmentWithQuestions(codigo: string) {
  const result = await findAssessmentWithQuestions(codigo);
  if (!result) throw new HttpError(404, 'nao_encontrado');
  return result;
}

// Retorna questões simples (sem alternatives artificiais)
export async function getQuestions(assessmentCodigo: string) {
  return listQuestionsSimple(assessmentCodigo);
}

// ==== NOVOS SERVIÇOS DE QUESTÃO ====
export async function updateQuestion(id:string, data: Parameters<typeof updateQuestionDb>[1]) {
  const ok = await updateQuestionDb(id, data);
  if (!ok) throw new HttpError(404, 'questao_nao_encontrada');
  return { id, atualizado: true };
}

export async function deleteQuestion(id:string) {
  const ok = await deleteQuestionDb(id);
  if (!ok) throw new HttpError(404, 'questao_nao_encontrada');
  return { id, removido: true };
}
