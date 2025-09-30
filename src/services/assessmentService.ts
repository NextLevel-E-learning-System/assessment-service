import { 
  insertAssessment, 
  findByCodigo, 
  updateAssessmentDb,
  deleteAssessmentDb,
  listAssessmentsByCourse,
  insertQuestion, 
  listQuestions, 
  insertAlternative, 
  listAlternatives, 
  NewAssessment, 
  NewQuestion, 
  NewAlternative,
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
  // Se não especificar curso_id, retorna lista vazia por segurança
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
  const deleted = await deleteAssessmentDb(codigo);
  if (!deleted) {
    throw new HttpError(404, 'nao_encontrado');
  }
  return { codigo, removido: true };
}

export async function addQuestion(d: NewQuestion) {
  const id = await insertQuestion(d);
  return { id };
}

export async function getQuestions(assessmentCodigo: string) {
  return listQuestions(assessmentCodigo);
}

export async function addAlternative(d: NewAlternative) {
  const id = await insertAlternative(d);
  return { id };
}

export async function getAlternatives(questaoId: string) {
  return listAlternatives(questaoId);
}
