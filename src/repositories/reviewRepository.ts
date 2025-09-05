import { withClient } from '../db.js';

interface RawAnswer { id:string; questao_id:string; resposta_funcionario:string|null; peso:number; tipo:string; resposta_correta:string|null }

export async function listDissertativeAnswers(attemptId:string){
  return withClient(async c=>{
    const r = await c.query(`
      select r.id, r.questao_id, r.resposta_funcionario, q.peso, q.tipo_questao as tipo, q.resposta_correta
      from assessment_service.respostas r
      join assessment_service.questoes q on q.id = r.questao_id
      join assessment_service.tentativas t on t.id = r.tentativa_id
      where r.tentativa_id=$1 and q.tipo_questao='DISSERTATIVA'
    `,[attemptId]);
    return r.rows as RawAnswer[];
  });
}

export async function applyReview(attemptId:string, scores:{ respostaId:string; pontuacao:number }[]){
  return withClient(async c=>{
    await c.query('begin');
    try {
      for(const s of scores){
        await c.query('update assessment_service.respostas set pontuacao=$2 where id=$1',[s.respostaId, s.pontuacao]);
      }
      // recalcular nota total: soma pontuacao / soma pesos *100 (só objetivas + dissertativas avaliadas)
      const agg = await c.query(`
        select coalesce(sum(coalesce(r.pontuacao,0)),0) as soma, coalesce(sum(q.peso),0) as soma_pesos
        from assessment_service.respostas r
        join assessment_service.questoes q on q.id = r.questao_id
        where r.tentativa_id=$1 and (q.tipo_questao in ('MULTIPLA_ESCOLHA','VERDADEIRO_FALSO') or (q.tipo_questao='DISSERTATIVA' and r.pontuacao is not null))
      `,[attemptId]);
      const { soma, soma_pesos } = agg.rows[0];
      const nota = (Number(soma_pesos)>0)? (Number(soma)/Number(soma_pesos))*100 : 0;
      await c.query('update assessment_service.tentativas set nota_obtida=$2 where id=$1',[attemptId, nota]);
      await c.query('commit');
      return { nota: Math.round(nota*100)/100 };
    } catch(e){
      await c.query('rollback');
      throw e;
    }
  });
}

export async function finalizeReviewedAttempt(attemptId:string, notaMin:number){
  return withClient(async c=>{
    const t = await c.query('select nota_obtida from assessment_service.tentativas where id=$1',[attemptId]);
    if(t.rowCount===0) return null;
    const nota = Number(t.rows[0].nota_obtida)||0;
    const aprovado = nota >= notaMin;
    await c.query('update assessment_service.tentativas set status=$2, data_fim=coalesce(data_fim, now()) where id=$1',[attemptId, aprovado? 'APROVADO':'REPROVADO']);
    return { nota, aprovado };
  });
}