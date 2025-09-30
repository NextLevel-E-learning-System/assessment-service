import { withClient } from '../db.js';

export interface CreateAnswerInput {
  tentativa_id: string;
  questao_id: string;
  resposta_funcionario: string;
  pontuacao?: number | null;
}

export interface Answer {
  id: string;
  tentativa_id: string;
  questao_id: string;
  resposta_funcionario: string | null;
  pontuacao: number | null;
  criado_em: Date;
}

export interface UpdateAnswerInput {
  resposta_funcionario?: string;
  pontuacao?: number | null;
}

const TABLE_RESPOSTAS = 'assessment_service.respostas';

export async function createAnswer(data: CreateAnswerInput): Promise<string> {
  return withClient(async c => {
    const result = await c.query(
      `INSERT INTO ${TABLE_RESPOSTAS} (tentativa_id, questao_id, resposta_funcionario, pontuacao) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [data.tentativa_id, data.questao_id, data.resposta_funcionario, data.pontuacao || null]
    );
    return result.rows[0].id;
  });
}

export async function upsertAnswer(data: CreateAnswerInput): Promise<string> {
  return withClient(async c => {
    const result = await c.query(
      `INSERT INTO ${TABLE_RESPOSTAS} (tentativa_id, questao_id, resposta_funcionario, pontuacao) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (tentativa_id, questao_id) 
       DO UPDATE SET resposta_funcionario = EXCLUDED.resposta_funcionario, pontuacao = EXCLUDED.pontuacao
       RETURNING id`,
      [data.tentativa_id, data.questao_id, data.resposta_funcionario, data.pontuacao || null]
    );
    return result.rows[0].id;
  });
}

export async function findAnswerById(id: string): Promise<Answer | null> {
  return withClient(async c => {
    const result = await c.query(
      `SELECT id, tentativa_id, questao_id, resposta_funcionario, pontuacao, criado_em
       FROM ${TABLE_RESPOSTAS} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  });
}

export async function findAnswersByAttempt(tentativa_id: string): Promise<Answer[]> {
  return withClient(async c => {
    const result = await c.query(
      `SELECT id, tentativa_id, questao_id, resposta_funcionario, pontuacao, criado_em
       FROM ${TABLE_RESPOSTAS} WHERE tentativa_id = $1
       ORDER BY criado_em ASC`,
      [tentativa_id]
    );
    return result.rows;
  });
}

export async function findAnswersByQuestion(questao_id: string): Promise<Answer[]> {
  return withClient(async c => {
    const result = await c.query(
      `SELECT id, tentativa_id, questao_id, resposta_funcionario, pontuacao, criado_em
       FROM ${TABLE_RESPOSTAS} WHERE questao_id = $1
       ORDER BY criado_em DESC`,
      [questao_id]
    );
    return result.rows;
  });
}

export async function getAttemptStatistics(tentativa_id: string) {
  return withClient(async c => {
    const result = await c.query(
      `SELECT 
         COUNT(*) as total_questoes,
         COUNT(resposta_funcionario) as questoes_respondidas,
         AVG(pontuacao) as pontuacao_media,
         SUM(pontuacao) as pontuacao_total
       FROM ${TABLE_RESPOSTAS} 
       WHERE tentativa_id = $1`,
      [tentativa_id]
    );
    
    const row = result.rows[0];
    return {
      total_questoes: parseInt(row.total_questoes) || 0,
      questoes_respondidas: parseInt(row.questoes_respondidas) || 0,
      pontuacao_media: parseFloat(row.pontuacao_media) || 0,
      pontuacao_total: parseFloat(row.pontuacao_total) || 0
    };
  });
}