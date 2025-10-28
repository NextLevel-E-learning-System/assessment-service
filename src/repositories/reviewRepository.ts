import { withClient } from '../db.js';

interface RawAnswer { 
  id: string; 
  questao_id: string; 
  resposta_funcionario: string | null; 
  peso: number; 
  tipo: string; 
  resposta_correta: string | null;
  enunciado: string;
  pontuacao: number | null;
  feedback: string | null;
}

interface ReviewScoreInput {
  respostaId: string;
  pontuacao: number;
  feedback?: string;
}

export async function listDissertativeAnswers(attemptId: string) {
  return withClient(async c => {
    const r = await c.query(`
      select 
        r.id, 
        r.questao_id, 
        r.resposta_funcionario, 
        r.pontuacao,
        r.feedback,
        q.peso, 
        q.tipo_questao as tipo, 
        q.resposta_correta,
        q.enunciado
      from assessment_service.respostas r
      join assessment_service.questoes q on q.id = r.questao_id
      join assessment_service.tentativas t on t.id = r.tentativa_id
      where r.tentativa_id = $1 and q.tipo_questao = 'DISSERTATIVA'
      order by q.id
    `, [attemptId]);
    return r.rows as RawAnswer[];
  });
}

export async function applyReview(attemptId: string, scores: ReviewScoreInput[]) {
  return withClient(async c => {
    await c.query('begin');
    try {
      for (const s of scores) {
        // Atualizar resposta com nova pontuação e feedback
        await c.query(
          'update assessment_service.respostas set pontuacao = $2, feedback = $3 where id = $1',
          [s.respostaId, s.pontuacao, s.feedback || null]
        );
      }

      // Recalcular nota total da tentativa de forma ponderada
      // Para cada questão: pontuacao (0-100) × peso
      // Soma tudo e divide pela soma dos pesos → resultado 0-100
      const agg = await c.query(`
        select 
          coalesce(sum(r.pontuacao * q.peso), 0) as soma_ponderada,
          coalesce(sum(q.peso), 0) as soma_pesos_total
        from assessment_service.respostas r
        join assessment_service.questoes q on q.id = r.questao_id
        where r.tentativa_id = $1 and r.pontuacao is not null
      `, [attemptId]);

      const { soma_ponderada, soma_pesos_total } = agg.rows[0];
      const nota = (Number(soma_pesos_total) > 0) ? (Number(soma_ponderada) / Number(soma_pesos_total)) : 0;
      
      console.log(`Recálculo nota (reviewRepository): soma_ponderada=${soma_ponderada}, peso_total=${soma_pesos_total}, nota=${nota}`);
      
      await c.query(
        'update assessment_service.tentativas set nota_obtida = $2 where id = $1',
        [attemptId, nota]
      );
      
      await c.query('commit');
      return { nota: Math.round(nota * 100) / 100 };
    } catch (e) {
      await c.query('rollback');
      throw e;
    }
  });
}

export async function finalizeReviewedAttempt(attemptId: string, notaMin: number) {
  return withClient(async c => {
    const t = await c.query(
      'select nota_obtida, funcionario_id, avaliacao_id from assessment_service.tentativas where id = $1',
      [attemptId]
    );
    if (t.rowCount === 0) return null;
    
    const { nota_obtida, funcionario_id, avaliacao_id } = t.rows[0];
    const nota = Number(nota_obtida) || 0;
    const aprovado = nota >= notaMin;
    
    await c.query(
      'update assessment_service.tentativas set status = $2, data_fim = coalesce(data_fim, now()) where id = $1',
      [attemptId, aprovado ? 'APROVADO' : 'REPROVADO']
    );
    
    return { nota, aprovado, funcionario_id, avaliacao_id };
  });
}

// Obter feedback de uma resposta específica (simplificado)
export async function getAnswerFeedback(respostaId: string) {
  return withClient(async c => {
    const r = await c.query(`
      select 
        r.feedback,
        r.pontuacao,
        r.criado_em
      from assessment_service.respostas r
      where r.id = $1
    `, [respostaId]);
    
    return r.rows[0] || null;
  });
}

// NOVA FUNCIONALIDADE: Listar tentativas pendentes de revisão (fila de correções)
export async function listPendingReviews(limit: number = 50, offset: number = 0, curso_id?: string) {
  return withClient(async c => {
    let query = `
      select 
        t.id as tentativa_id,
        t.funcionario_id,
        t.avaliacao_id as avaliacao_codigo,
        t.data_inicio,
        t.data_fim as data_submissao,
        a.titulo as avaliacao_titulo,
        a.curso_id,
        f.nome as funcionario_nome,
        f.email as funcionario_email,
        count(q.id) as questoes_dissertativas,
        'PENDENTE_REVISAO' as status
      from assessment_service.tentativas t
      join assessment_service.avaliacoes a on a.codigo = t.avaliacao_id
      left join user_service.funcionarios f on f.id = t.funcionario_id
      join assessment_service.respostas r on r.tentativa_id = t.id
      join assessment_service.questoes q on q.id = r.questao_id
      where t.status = 'PENDENTE_REVISAO' 
      and q.tipo_questao = 'DISSERTATIVA'
    `;
    
    const params: (string | number)[] = [];
    
    if (curso_id) {
      params.push(curso_id);
      query += ` and a.curso_id = $${params.length}`;
    }
    
    query += `
      group by t.id, t.funcionario_id, t.avaliacao_id, t.data_inicio, t.data_fim, a.titulo, a.curso_id, f.nome, f.email
      order by t.data_inicio asc
      limit $${params.length + 1} offset $${params.length + 2}
    `;
    
    params.push(limit, offset);
    
    const r = await c.query(query, params);
    
    return r.rows.map(row => ({
      tentativa_id: row.tentativa_id,
      avaliacao_codigo: row.avaliacao_codigo,
      avaliacao_titulo: row.avaliacao_titulo,
      funcionario: {
        id: row.funcionario_id,
        nome: row.funcionario_nome,
        email: row.funcionario_email
      },
      data_submissao: row.data_submissao,
      questoes_dissertativas: parseInt(row.questoes_dissertativas),
      status: row.status
    }));
  });
}