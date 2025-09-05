import { findByCodigo } from '../repositories/assessmentRepository.js';
import { publishEvent } from '../events/publisher.js';
import { withClient } from '../db.js';

type Resposta = Record<string, unknown>;
interface GradeInput { codigo:string; userId:string; respostas:Resposta[] }

export async function gradeSubmission(input:GradeInput){
  const assessment = await findByCodigo(input.codigo);
  if(!assessment) throw new Error('assessment_not_found');
  const nota = input.respostas && input.respostas.length>0 ? 100 : 0; // mock
  const notaMin = assessment.nota_minima ?? 0;
  const aprovado = nota >= notaMin;
  await withClient(c => c.query('insert into avaliacoes_submissoes(id, avaliacao_codigo, funcionario_id, nota, aprovado) values (gen_random_uuid(), $1,$2,$3,$4)',[assessment.codigo, input.userId, nota, aprovado]));
  const payload = { assessmentCode: assessment.codigo, courseId: assessment.curso_id, userId: input.userId, score: nota, passed: aprovado };
  await publishEvent(aprovado ? 'assessment.passed.v1' : 'assessment.failed.v1', payload);
  return { aprovado, nota };
}
