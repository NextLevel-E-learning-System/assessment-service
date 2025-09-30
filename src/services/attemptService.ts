import * as attemptRepository from '../repositories/attemptRepository.js';
import * as assessmentRepository from '../repositories/assessmentRepository.js';

export async function createAttempt(data: attemptRepository.CreateAttemptInput) {
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

export async function getAttemptById(id: string) {
  return await attemptRepository.findAttemptById(id);
}

export async function getAttemptsByUser(funcionario_id: string, avaliacao_id?: string) {
  return await attemptRepository.findAttemptsByUser(funcionario_id, avaliacao_id);
}

export async function getAttemptsByAssessment(avaliacao_id: string) {
  return await attemptRepository.findAttemptsByAssessment(avaliacao_id);
}

export async function updateAttempt(id: string, data: attemptRepository.UpdateAttemptInput) {
  return await attemptRepository.updateAttempt(id, data);
}

export async function deleteAttempt(id: string) {
  return await attemptRepository.deleteAttempt(id);
}

export async function finalizeAttempt(id: string, nota_obtida?: number, status: string = 'FINALIZADA') {
  return await attemptRepository.updateAttempt(id, {
    data_fim: new Date(),
    nota_obtida,
    status
  });
}

export async function getAttemptCount(funcionario_id: string, avaliacao_id: string) {
  return await attemptRepository.countAttemptsByUser(funcionario_id, avaliacao_id);
}