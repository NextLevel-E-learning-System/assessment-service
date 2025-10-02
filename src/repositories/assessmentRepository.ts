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
export interface Question { id:string; assessment_codigo:string; enunciado:string; tipo:'MULTIPLA_ESCOLHA'|'VERDADEIRO_FALSO'|'DISSERTATIVA'; opcoes_resposta:string[]; resposta_correta:string|null; peso:number }

// Interfaces de "Alternative" continuam para compatibilidade de API existente, porém são derivadas de opcoes_resposta
export interface NewAlternative { questao_id:string; texto:string; correta:boolean }
export interface Alternative { id:string; questao_id:string; texto:string; correta:boolean }

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
      `SELECT codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, modulo_id, ativo, criado_em, atualizado_em
       FROM ${TABLE_AVALIACOES} WHERE codigo = $1`, [codigo]);
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
    // Primeiro deletar questões relacionadas (que por sua vez deletam respostas via FK CASCADE)
    await c.query('DELETE FROM assessment_service.questoes WHERE avaliacao_id = $1', [codigo]);
    
    // Depois deletar a avaliação
    const result = await c.query(`DELETE FROM ${TABLE_AVALIACOES} WHERE codigo = $1`, [codigo]);
    return (result.rowCount || 0) > 0;
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

// Questões com alternativas incluídas para simplificar frontend
export interface QuestionWithAlternatives extends Question {
  alternatives: Alternative[];
}

export async function listQuestions(assessmentCodigo:string): Promise<Question[]>{
	return withClient(async c=>{
		const r = await c.query(
			`select id, avaliacao_id as assessment_codigo, enunciado, tipo_questao as tipo, opcoes_resposta, resposta_correta, peso
			 from ${TABLE_QUESTOES} where avaliacao_id=$1 order by id`,
			[assessmentCodigo]
		);
		return r.rows.map(row=>({
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

export async function listQuestionsWithAlternatives(assessmentCodigo:string): Promise<QuestionWithAlternatives[]>{
	return withClient(async c=>{
		const r = await c.query(
			`select id, avaliacao_id as assessment_codigo, enunciado, tipo_questao as tipo, opcoes_resposta, resposta_correta, peso
			 from ${TABLE_QUESTOES} where avaliacao_id=$1 order by id`,
			[assessmentCodigo]
		);
		return r.rows.map(row=>{
			const opts:string[] = row.opcoes_resposta || [];
			const correta = row.resposta_correta;
			const alternatives = opts.map(txt=>({ 
				id: txt, 
				questao_id: row.id, 
				texto: txt, 
				correta: txt===correta 
			}));
			
			return {
				id: row.id,
				assessment_codigo: row.assessment_codigo,
				enunciado: row.enunciado,
				tipo: row.tipo,
				opcoes_resposta: row.opcoes_resposta || [],
				resposta_correta: row.resposta_correta,
				peso: Number(row.peso) || 1,
				alternatives
			};
		});
	});
}

// Inserção de "alternative" = atualizar array opcoes_resposta e (opcionalmente) resposta_correta
export async function insertAlternative(a:NewAlternative): Promise<string>{
	return withClient(async c=>{
		const q = await c.query(`select opcoes_resposta, resposta_correta from ${TABLE_QUESTOES} where id=$1`,[a.questao_id]);
		if(q.rowCount===0) throw new Error('question_not_found');
		const current:string[] = q.rows[0].opcoes_resposta || [];
		if(!current.includes(a.texto)) current.push(a.texto);
		const resposta_correta = a.correta ? a.texto : q.rows[0].resposta_correta;
		await c.query(`update ${TABLE_QUESTOES} set opcoes_resposta=$2, resposta_correta=$3 where id=$1`,[a.questao_id,current,resposta_correta]);
		// Usamos o próprio texto como id lógico (mantendo compatibilidade onde alternativa_id era usado)
		return a.texto;
	});
}
export async function listAlternatives(questaoId:string): Promise<Alternative[]>{
	return withClient(async c=>{
		const q = await c.query(`select opcoes_resposta, resposta_correta from ${TABLE_QUESTOES} where id=$1`,[questaoId]);
		if(q.rowCount===0) return [];
		const opts:string[] = q.rows[0].opcoes_resposta || [];
		const correta = q.rows[0].resposta_correta;
		return opts.map(txt=>({ id: txt, questao_id: questaoId, texto: txt, correta: txt===correta }));
	});
}
