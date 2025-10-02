import { withClient } from '../db.js';

// Interface limpa focada apenas no workflow de submissão completa
export interface SubmissionAnswerInput { questao_id:string; resposta:string }
export interface CreateSubmissionInput { assessment_codigo:string; user_id:string; respostas: SubmissionAnswerInput[] }
export interface StoredSubmission { id:string; assessment_codigo:string; user_id:string; nota:number; aprovado:boolean; data_fim:Date }

const TABLE_TENTATIVAS = 'assessment_service.tentativas';
const TABLE_RESPOSTAS = 'assessment_service.respostas';

// MANTÉM: Workflow completo de submissão (usado pelo submitService)
export async function createSubmission(data:CreateSubmissionInput, nota:number, aprovado:boolean): Promise<StoredSubmission>{
  return withClient(async c => {
    // cria tentativa em andamento
    const tentativa = await c.query(`insert into ${TABLE_TENTATIVAS}(funcionario_id, avaliacao_id) values ($1,$2) returning id, avaliacao_id, funcionario_id, data_inicio`, [data.user_id, data.assessment_codigo]);
    const tentativaId = tentativa.rows[0].id as string;
    // insere respostas
    for(const r of data.respostas){
      await c.query(`insert into ${TABLE_RESPOSTAS}(tentativa_id, questao_id, resposta_funcionario) values ($1,$2,$3) on conflict (tentativa_id, questao_id) do update set resposta_funcionario=excluded.resposta_funcionario`, [tentativaId, r.questao_id, r.resposta]);
    }
    // finaliza tentativa
    const status = aprovado ? 'APROVADO' : 'REPROVADO';
    const upd = await c.query(`update ${TABLE_TENTATIVAS} set data_fim=now(), nota_obtida=$2, status=$3 where id=$1 returning id, avaliacao_id, funcionario_id, nota_obtida, status, data_fim`, [tentativaId, nota, status]);
    return {
      id: upd.rows[0].id,
      assessment_codigo: upd.rows[0].avaliacao_id,
      user_id: upd.rows[0].funcionario_id,
      nota: Number(upd.rows[0].nota_obtida)||0,
      aprovado,
      data_fim: upd.rows[0].data_fim
    };
  });
}

export async function listSubmissions(assessmentCodigo:string, userId:string){
  return withClient(async c=>{
    const s = await c.query(`select id, avaliacao_id, funcionario_id, nota_obtida, status, data_fim from ${TABLE_TENTATIVAS} where avaliacao_id=$1 and funcionario_id=$2 and status in ('APROVADO','REPROVADO') order by data_fim desc nulls last`,[assessmentCodigo,userId]);
    return s.rows.map(r=>({
      id:r.id,
      assessment_codigo:r.avaliacao_id,
      user_id:r.funcionario_id,
      nota:Number(r.nota_obtida)||0,
      status:r.status,
      data_fim:r.data_fim
    }));
  });
}

export interface AttemptSummary { id:string; status:string; nota:number|null }
export async function listAttemptsForUser(assessmentCodigo:string, userId:string): Promise<AttemptSummary[]>{
  return withClient(async c=>{
    const r = await c.query(`select id, status, nota_obtida, data_inicio from ${TABLE_TENTATIVAS} where avaliacao_id=$1 and funcionario_id=$2 order by data_inicio asc`,[assessmentCodigo,userId]);
  return r.rows.map(row=>({ id:row.id, status:row.status, nota: row.nota_obtida !== null ? Number(row.nota_obtida) : null }));
  });
}