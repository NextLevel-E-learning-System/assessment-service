import { withClient } from '../db.js';

export interface NewAssessment { codigo:string; curso_id:string; titulo:string; tempo_limite?:number|null; tentativas_permitidas?:number|null; nota_minima?:number|null }
export interface Assessment extends NewAssessment { ativo:boolean }
export interface NewQuestion { assessment_codigo:string; enunciado:string; tipo:'MULTIPLA_ESCOLHA'|'VERDADEIRO_FALSO'; ordem?:number|null; peso?:number|null }
export interface Question extends NewQuestion { id:string }
export interface NewAlternative { questao_id:string; texto:string; correta:boolean }
export interface Alternative extends NewAlternative { id:string }

export async function insertAssessment(d:NewAssessment){ await withClient(c=>c.query('insert into avaliacoes (codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, ativo) values ($1,$2,$3,$4,$5,$6,true)', [d.codigo,d.curso_id,d.titulo,d.tempo_limite||null,d.tentativas_permitidas||null,d.nota_minima||null])); }
export async function findByCodigo(codigo:string): Promise<Assessment | null>{ return withClient(async c=>{ const r = await c.query('select codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, ativo from avaliacoes where codigo=$1',[codigo]); return r.rows[0]||null; }); }

export async function insertQuestion(q:NewQuestion): Promise<string>{
	return withClient(async c=>{
		const r = await c.query('insert into questoes (assessment_codigo,enunciado,tipo,ordem,peso) values ($1,$2,$3,$4,$5) returning id',[q.assessment_codigo,q.enunciado,q.tipo,q.ordem||null,q.peso||null]);
		return r.rows[0].id as string;
	});
}
export async function listQuestions(assessmentCodigo:string): Promise<Question[]>{
	return withClient(async c=>{ const r = await c.query('select id, assessment_codigo, enunciado, tipo, ordem, peso from questoes where assessment_codigo=$1 order by ordem nulls last, id',[assessmentCodigo]); return r.rows; });
}
export async function insertAlternative(a:NewAlternative): Promise<string>{
	return withClient(async c=>{ const r = await c.query('insert into alternativas (questao_id,texto,correta) values ($1,$2,$3) returning id',[a.questao_id,a.texto,a.correta]); return r.rows[0].id; });
}
export async function listAlternatives(questaoId:string): Promise<Alternative[]>{
	return withClient(async c=>{ const r = await c.query('select id, questao_id, texto, correta from alternativas where questao_id=$1',[questaoId]); return r.rows; });
}
