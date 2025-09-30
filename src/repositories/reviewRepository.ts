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

      // Recalcular nota total
      const agg = await c.query(`
        select 
          coalesce(sum(coalesce(r.pontuacao, 0)), 0) as soma, 
          coalesce(sum(q.peso), 0) as soma_pesos
        from assessment_service.respostas r
        join assessment_service.questoes q on q.id = r.questao_id
        where r.tentativa_id = $1 
        and (
          q.tipo_questao in ('MULTIPLA_ESCOLHA', 'VERDADEIRO_FALSO') 
          or (q.tipo_questao = 'DISSERTATIVA' and r.pontuacao is not null)
        )
      `, [attemptId]);

      const { soma, soma_pesos } = agg.rows[0];
      const nota = (Number(soma_pesos) > 0) ? (Number(soma) / Number(soma_pesos)) * 100 : 0;
      
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
      'select nota_obtida from assessment_service.tentativas where id = $1',
      [attemptId]
    );
    if (t.rowCount === 0) return null;
    
    const nota = Number(t.rows[0].nota_obtida) || 0;
    const aprovado = nota >= notaMin;
    
    await c.query(
      'update assessment_service.tentativas set status = $2, data_fim = coalesce(data_fim, now()) where id = $1',
      [attemptId, aprovado ? 'APROVADO' : 'REPROVADO']
    );
    
    return { nota, aprovado };
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
export async function listPendingReviews(limit: number = 50, offset: number = 0) {
  return withClient(async c => {
    const r = await c.query(`
      select 
        t.id as tentativa_id,
        t.funcionario_id,
        t.avaliacao_id,
        t.data_inicio,
        a.titulo as avaliacao_titulo,
        f.nome as funcionario_nome,
        f.email as funcionario_email,
        count(q.id) as total_dissertativas
      from assessment_service.tentativas t
      join assessment_service.avaliacoes a on a.codigo = t.avaliacao_id
      left join user_service.funcionarios f on f.id = t.funcionario_id
      join assessment_service.respostas r on r.tentativa_id = t.id
      join assessment_service.questoes q on q.id = r.questao_id
      where t.status = 'PENDENTE_REVISAO' 
      and q.tipo_questao = 'DISSERTATIVA'
      group by t.id, t.funcionario_id, t.avaliacao_id, t.data_inicio, a.titulo, f.nome, f.email
      order by t.data_inicio asc
      limit $1 offset $2
    `, [limit, offset]);
    
    return r.rows;
  });
}