import { withClient } from '../db.js';

// Ajustado para o schema real assessment_service.*
export interface NewAssessment { 
  codigo: string; 
  curso_id: string; 
  titulo: string; 
  tempo_limite?: number | null; 
  tentativas_permitidas?: number | null; 
  nota_minima?: number | null;
  modulo_id: string;
}

export interface Assessment extends NewAssessment {
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
  curso_titulo?: string;
}

export interface UpdateAssessmentData {
  titulo?: string;
  tempo_limite?: number | null;
  tentativas_permitidas?: number | null;
  nota_minima?: number | null;
  ativo?: boolean;
}

// No schema real não existe "ordem" nem tabela de alternativas; as opções ficam em opcoes_resposta[] e a correta em resposta_correta.
export interface NewQuestion { assessment_codigo:string; enunciado:string; tipo:'MULTIPLA_ESCOLHA'|'VERDADEIRO_FALSO'|'DISSERTATIVA'; opcoes_resposta?:string[]; resposta_correta?:string; peso?:number|null }
// SIMPLIFICADO: Question já tem todas as informações necessárias
export interface Question { id:string; assessment_codigo:string; enunciado:string; tipo:'MULTIPLA_ESCOLHA'|'VERDADEIRO_FALSO'|'DISSERTATIVA'; opcoes_resposta:string[]; resposta_correta:string|null; peso:number }

const TABLE_AVALIACOES = 'assessment_service.avaliacoes';
const TABLE_QUESTOES = 'assessment_service.questoes';

export async function insertAssessment(d: NewAssessment) {
  await withClient(c => c.query(
    `INSERT INTO ${TABLE_AVALIACOES} (codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, modulo_id, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
    [d.codigo, d.curso_id, d.titulo, d.tempo_limite || null, d.tentativas_permitidas || null, d.nota_minima || null, d.modulo_id]
  ));
}

export async function findByCodigo(codigo: string): Promise<Assessment | null> {
  return withClient(async c => {
    const r = await c.query(
      `SELECT a.codigo,
              a.curso_id,
              a.titulo,
              a.tempo_limite,
              a.tentativas_permitidas,
              a.nota_minima,
              a.modulo_id,
              a.ativo,
              a.criado_em,
              a.atualizado_em,
              c.titulo AS curso_titulo
         FROM ${TABLE_AVALIACOES} a
         LEFT JOIN course_service.cursos c ON c.codigo = a.curso_id
        WHERE a.codigo = $1`,
      [codigo]
    );
    return r.rows[0] || null;
  });
}

// Buscar avaliação ativa por módulo
export async function findActiveByModulo(moduloId: string): Promise<Assessment | null> {
  return withClient(async c => {
    const r = await c.query(
      `SELECT codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, modulo_id, ativo, criado_em, atualizado_em
       FROM ${TABLE_AVALIACOES} 
       WHERE modulo_id = $1 AND ativo = true 
       LIMIT 1`, 
      [moduloId]
    );
    return r.rows[0] || null;
  });
}

export async function listAssessmentsByCourse(curso_id: string): Promise<Assessment[]> {
  return withClient(async c => {
    const r = await c.query(
      `SELECT codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, modulo_id, ativo, criado_em, atualizado_em
       FROM ${TABLE_AVALIACOES} WHERE curso_id = $1 ORDER BY criado_em DESC`, [curso_id]);
    return r.rows;
  });
}

export async function updateAssessmentDb(codigo: string, data: UpdateAssessmentData): Promise<boolean> {
  return withClient(async c => {
    const setParts: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramCount = 1;

    if (data.titulo !== undefined) {
      setParts.push(`titulo = $${paramCount++}`);
      values.push(data.titulo);
    }
    if (data.tempo_limite !== undefined) {
      setParts.push(`tempo_limite = $${paramCount++}`);
      values.push(data.tempo_limite);
    }
    if (data.tentativas_permitidas !== undefined) {
      setParts.push(`tentativas_permitidas = $${paramCount++}`);
      values.push(data.tentativas_permitidas);
    }
    if (data.nota_minima !== undefined) {
      setParts.push(`nota_minima = $${paramCount++}`);
      values.push(data.nota_minima);
    }
    if (data.ativo !== undefined) {
      setParts.push(`ativo = $${paramCount++}`);
      values.push(data.ativo);
    }

    if (setParts.length === 0) return false;

    setParts.push(`atualizado_em = NOW()`);
    values.push(codigo);

    const result = await c.query(
      `UPDATE ${TABLE_AVALIACOES} SET ${setParts.join(', ')} WHERE codigo = $${paramCount}`,
      values
    );

    return (result.rowCount || 0) > 0;
  });
}

export async function deleteAssessmentDb(codigo: string): Promise<boolean> {
  return withClient(async c => {
    // ALTERADO: não deletamos fisicamente a avaliação; apenas marcamos como inativa
    const result = await c.query(`UPDATE ${TABLE_AVALIACOES} SET ativo = false, atualizado_em = NOW() WHERE codigo = $1 AND ativo = true`, [codigo]);
    return (result.rowCount || 0) > 0; // true se foi inativada agora (era ativa antes)
  });
}

export async function insertQuestion(q:NewQuestion): Promise<string>{
	// Para VERDADEIRO_FALSO, se não vier opcoes_resposta, usamos padrão ['VERDADEIRO','FALSO']
		const opcoes = q.opcoes_resposta && q.opcoes_resposta.length>0 ? q.opcoes_resposta : (q.tipo==='VERDADEIRO_FALSO'? ['VERDADEIRO','FALSO'] : (q.tipo==='MULTIPLA_ESCOLHA'? [] : []));
	return withClient(async c=>{
		const r = await c.query(
			`insert into ${TABLE_QUESTOES} (avaliacao_id, tipo_questao, enunciado, opcoes_resposta, resposta_correta, peso)
			 values ($1,$2,$3,$4,$5,$6) returning id`,
			[q.assessment_codigo, q.tipo, q.enunciado, opcoes, q.resposta_correta||null, q.peso||1]
		);
		return r.rows[0].id as string;
	});
}

// SIMPLIFICADO: Apenas questões sem alternatives artificiais
export async function listQuestionsSimple(assessmentCodigo: string): Promise<Question[]> {
  return withClient(async c => {
    const r = await c.query(
      `SELECT id, avaliacao_id as assessment_codigo, enunciado, tipo_questao as tipo, opcoes_resposta, resposta_correta, peso
       FROM ${TABLE_QUESTOES} WHERE avaliacao_id = $1 ORDER BY criado_em`,
      [assessmentCodigo]
    );
    return r.rows.map(row => ({
      id: row.id,
      assessment_codigo: row.assessment_codigo,
      enunciado: row.enunciado,
      tipo: row.tipo,
      opcoes_resposta: row.opcoes_resposta || [],
      resposta_correta: row.resposta_correta,
      peso: Number(row.peso) || 1
    }));
  });
}

export interface QuestionForStudent {
  id: string;
  enunciado: string;
  tipo: 'MULTIPLA_ESCOLHA' | 'VERDADEIRO_FALSO' | 'DISSERTATIVA';
  opcoes_resposta: string[];
  peso: number;
}

export async function listQuestionsForStudent(assessmentCodigo: string): Promise<QuestionForStudent[]> {
  return withClient(async c => {
    const r = await c.query(
      `SELECT id, enunciado, tipo_questao as tipo, opcoes_resposta, peso
       FROM ${TABLE_QUESTOES} WHERE avaliacao_id = $1 ORDER BY criado_em`,
      [assessmentCodigo]
    );
    return r.rows.map(row => ({
      id: row.id,
      enunciado: row.enunciado,
      tipo: row.tipo,
      opcoes_resposta: row.opcoes_resposta || [],
      peso: Number(row.peso) || 1
    }));
  });
}

// ==== NOVOS MÉTODOS PARA EDIÇÃO/REMOÇÃO DE QUESTÕES ====
export interface UpdateQuestionData { enunciado?:string; opcoes_resposta?:string[]; resposta_correta?:string|null; peso?:number; tipo?: 'MULTIPLA_ESCOLHA'|'VERDADEIRO_FALSO'|'DISSERTATIVA' }

export async function updateQuestionDb(id:string, data:UpdateQuestionData): Promise<boolean> {
  return withClient(async c => {
    // Monta SET dinâmico
  const setParts:string[] = [];
  const values:unknown[] = [];
    let p = 1;
    if (data.enunciado !== undefined){ setParts.push(`enunciado = $${p++}`); values.push(data.enunciado); }
    if (data.opcoes_resposta !== undefined){ setParts.push(`opcoes_resposta = $${p++}`); values.push(data.opcoes_resposta); }
    if (data.resposta_correta !== undefined){ setParts.push(`resposta_correta = $${p++}`); values.push(data.resposta_correta); }
    if (data.peso !== undefined){ setParts.push(`peso = $${p++}`); values.push(data.peso); }
    if (data.tipo !== undefined){ setParts.push(`tipo_questao = $${p++}`); values.push(data.tipo); }
    if (!setParts.length) return false;
    setParts.push('atualizado_em = NOW()');
    values.push(id);
    const r = await c.query(`UPDATE ${TABLE_QUESTOES} SET ${setParts.join(', ')} WHERE id = $${p}`, values);
    return (r.rowCount||0) > 0;
  });
}

export async function deleteQuestionDb(id:string): Promise<boolean> {
  return withClient(async c => {
    const r = await c.query(`DELETE FROM ${TABLE_QUESTOES} WHERE id = $1`, [id]);
    return (r.rowCount||0) > 0;
  });
}

// REMOVIDO: insertAlternative, listAlternatives - não são mais necessários
// As alternativas são gerenciadas diretamente nas questões via opcoes_resposta[]
