import { withClient } from '../db.js';

export interface CreateAttemptInput {
  funcionario_id: string;
  avaliacao_id: string;
  status?: string;
}

export interface Attempt {
  id: string;
  funcionario_id: string;
  avaliacao_id: string;
  data_inicio: Date;
  data_fim?: Date | null;
  nota_obtida?: number | null;
  status: string;
  criado_em: Date;
}

export interface UpdateAttemptInput {
  data_fim?: Date;
  nota_obtida?: number;
  status?: string;
}

export interface StartAttemptResult {
  id: string;
  funcionario_id: string;
  avaliacao_id: string;
  data_inicio: Date;
  deadline?: Date | null;
}

const TABLE_TENTATIVAS = 'assessment_service.tentativas';

export async function createAttempt(data: CreateAttemptInput): Promise<string> {
  return withClient(async c => {
    const result = await c.query(
      `INSERT INTO ${TABLE_TENTATIVAS} (funcionario_id, avaliacao_id, status) 
       VALUES ($1, $2, $3) RETURNING id`,
      [data.funcionario_id, data.avaliacao_id, data.status || 'EM_ANDAMENTO']
    );
    return result.rows[0].id;
  });
}

// NOVA: Substituir startAttempt do submissionRepository
export async function startAttempt(
  avaliacao_id: string, 
  funcionario_id: string, 
  tempoLimiteMinutos?: number | null, 
  initialStatus: 'EM_ANDAMENTO' | 'EM_ANDAMENTO_RECUPERACAO' = 'EM_ANDAMENTO'
): Promise<StartAttemptResult> {
  return withClient(async c => {
    const result = await c.query(
      `INSERT INTO ${TABLE_TENTATIVAS} (funcionario_id, avaliacao_id, status) 
       VALUES ($1, $2, $3) RETURNING id, funcionario_id, avaliacao_id, data_inicio`,
      [funcionario_id, avaliacao_id, initialStatus]
    );
    
    let deadline: Date | null = null;
    if (tempoLimiteMinutos && tempoLimiteMinutos > 0) {
      deadline = new Date(Date.now() + tempoLimiteMinutos * 60000);
    }
    
    return {
      id: result.rows[0].id,
      funcionario_id: result.rows[0].funcionario_id,
      avaliacao_id: result.rows[0].avaliacao_id,
      data_inicio: result.rows[0].data_inicio,
      deadline
    };
  });
}

// NOVA: Substituir finalizeAttempt do submissionRepository
export async function finalizeAttempt(attemptId: string, nota: number | null, status: string): Promise<void> {
  return withClient(async c => {
    await c.query(
      `UPDATE ${TABLE_TENTATIVAS} 
       SET data_fim = NOW(), nota_obtida = $2, status = $3 
       WHERE id = $1`,
      [attemptId, nota, status]
    );
  });
}

export async function findAttemptById(id: string): Promise<Attempt | null> {
  return withClient(async c => {
    const result = await c.query(
      `SELECT id, funcionario_id, avaliacao_id, data_inicio, data_fim, nota_obtida, status, criado_em
       FROM ${TABLE_TENTATIVAS} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  });
}

export async function findAttemptsByUser(funcionario_id: string, avaliacao_id?: string): Promise<Attempt[]> {
  return withClient(async c => {
    let query = `SELECT id, funcionario_id, avaliacao_id, data_inicio, data_fim, nota_obtida, status, criado_em
                 FROM ${TABLE_TENTATIVAS} WHERE funcionario_id = $1`;
    const params = [funcionario_id];
    
    if (avaliacao_id) {
      query += ' AND avaliacao_id = $2';
      params.push(avaliacao_id);
    }
    
    query += ' ORDER BY data_inicio DESC';
    
    const result = await c.query(query, params);
    return result.rows;
  });
}

export async function findAttemptsByAssessment(avaliacao_id: string): Promise<Attempt[]> {
  return withClient(async c => {
    const result = await c.query(
      `SELECT id, funcionario_id, avaliacao_id, data_inicio, data_fim, nota_obtida, status, criado_em
       FROM ${TABLE_TENTATIVAS} WHERE avaliacao_id = $1
       ORDER BY data_inicio DESC`,
      [avaliacao_id]
    );
    return result.rows;
  });
}

// TENTATIVAS NÃO PODEM SER EDITADAS OU DELETADAS
// São dados históricos dos alunos e devem ser preservados

export async function countAttemptsByUser(funcionario_id: string, avaliacao_id: string): Promise<number> {
  return withClient(async c => {
    const result = await c.query(
      `SELECT COUNT(*) as count FROM ${TABLE_TENTATIVAS} 
       WHERE funcionario_id = $1 AND avaliacao_id = $2`,
      [funcionario_id, avaliacao_id]
    );
    return parseInt(result.rows[0].count);
  });
}