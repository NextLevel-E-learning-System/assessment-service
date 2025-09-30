import * as answerRepository from '../repositories/answerRepository.js';

export async function createAnswer(data: answerRepository.CreateAnswerInput) {
  const answerId = await answerRepository.createAnswer(data);
  return await answerRepository.findAnswerById(answerId);
}

export async function upsertAnswer(data: answerRepository.CreateAnswerInput) {
  const answerId = await answerRepository.upsertAnswer(data);
  return await answerRepository.findAnswerById(answerId);
}

export async function getAnswerById(id: string) {
  return await answerRepository.findAnswerById(id);
}

export async function getAnswersByAttempt(tentativa_id: string) {
  return await answerRepository.findAnswersByAttempt(tentativa_id);
}

export async function getAnswersByQuestion(questao_id: string) {
  return await answerRepository.findAnswersByQuestion(questao_id);
}

export async function updateAnswer(id: string, data: answerRepository.UpdateAnswerInput) {
  return await answerRepository.updateAnswer(id, data);
}

export async function deleteAnswer(id: string) {
  return await answerRepository.deleteAnswer(id);
}

export async function deleteAnswersByAttempt(tentativa_id: string) {
  return await answerRepository.deleteAnswersByAttempt(tentativa_id);
}

export async function getAttemptStatistics(tentativa_id: string) {
  return await answerRepository.getAttemptStatistics(tentativa_id);
}

export async function calculateAttemptScore(tentativa_id: string) {
  const answers = await answerRepository.findAnswersByAttempt(tentativa_id);
  
  if (answers.length === 0) {
    return { nota: 0, total_questoes: 0, questoes_respondidas: 0 };
  }

  const totalScore = answers.reduce((sum, answer) => sum + (answer.pontuacao || 0), 0);
  const maxPossibleScore = answers.length; // Assumindo peso 1 por questão
  const nota = (totalScore / maxPossibleScore) * 10; // Escala de 0 a 10

  return {
    nota: Math.round(nota * 100) / 100, // Arredondar para 2 casas decimais
    total_questoes: answers.length,
    questoes_respondidas: answers.filter(a => a.resposta_funcionario).length,
    pontuacao_total: totalScore,
    pontuacao_maxima: maxPossibleScore
  };
}