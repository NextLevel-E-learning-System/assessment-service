import * as attemptRepository from '../repositories/attemptRepository.js';
import * as assessmentRepository from '../repositories/assessmentRepository.js';

// LÓGICA DE NEGÓCIO: Validação de tentativas
export async function createAttemptWithValidation(data: attemptRepository.CreateAttemptInput) {
  // Verificar se a avaliação existe
  const assessment = await assessmentRepository.findByCodigo(data.avaliacao_id);
  if (!assessment) {
    throw new Error('assessment_not_found');
  }

  // Verificar limite de tentativas se especificado
  if (assessment.tentativas_permitidas) {
    const count = await attemptRepository.countAttemptsByUser(data.funcionario_id, data.avaliacao_id);
    if (count >= assessment.tentativas_permitidas) {
      throw new Error('attempts_limit_exceeded');
    }
  }

  const attemptId = await attemptRepository.createAttempt(data);
  return await attemptRepository.findAttemptById(attemptId);
}

// REMOVIDO: Wrappers desnecessários (getAttemptById, getAttemptsByUser, etc.)
// Controllers devem usar attemptRepository diretamente para CRUD simples