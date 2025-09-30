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

export async function updateAttempt(id: string, data: UpdateAttemptInput): Promise<boolean> {
  return withClient(async c => {
    const setParts: string[] = [];
    const values: (string | number | Date | null)[] = [];
    let paramCount = 1;

    if (data.data_fim !== undefined) {
      setParts.push(`data_fim = $${paramCount++}`);
      values.push(data.data_fim);
    }
    if (data.nota_obtida !== undefined) {
      setParts.push(`nota_obtida = $${paramCount++}`);
      values.push(data.nota_obtida);
    }
    if (data.status !== undefined) {
      setParts.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (setParts.length === 0) return false;

    values.push(id);
    const result = await c.query(
      `UPDATE ${TABLE_TENTATIVAS} SET ${setParts.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    return (result.rowCount || 0) > 0;
  });
}

export async function deleteAttempt(id: string): Promise<boolean> {
  return withClient(async c => {
    // Primeiro deletar respostas relacionadas
    await c.query('DELETE FROM assessment_service.respostas WHERE tentativa_id = $1', [id]);
    
    // Depois deletar a tentativa
    const result = await c.query(`DELETE FROM ${TABLE_TENTATIVAS} WHERE id = $1`, [id]);
    return (result.rowCount || 0) > 0;
  });
}

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