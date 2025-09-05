import { findByCodigo, listQuestions } from '../repositories/assessmentRepository.js';
import { publishEvent } from '../events/publisher.js';
import { createSubmission, SubmissionAnswerInput } from '../repositories/submissionRepository.js';

interface GradeInput { codigo:string; userId:string; respostas:SubmissionAnswerInput[] }

export async function gradeSubmission(input:GradeInput){
  const assessment = await findByCodigo(input.codigo);
  if(!assessment) throw new Error('assessment_not_found');
  const questoes = await listQuestions(input.codigo);
  // Mapa de respostas enviadas
  const respostasMap = new Map(input.respostas.map(r=>[r.questao_id, r.resposta]));
  let totalPeso = 0;
  let pontosObtidos = 0;
  let temDissertativa = false;
  for(const q of questoes){
    const peso = q.peso || 1;
    totalPeso += peso;
    const resp = respostasMap.get(q.id);
    if(!resp) continue;
    if(q.tipo === 'VERDADEIRO_FALSO' || q.tipo === 'MULTIPLA_ESCOLHA'){
      if(q.resposta_correta && resp === q.resposta_correta){
        pontosObtidos += peso;
      }
    } else if(q.tipo === 'DISSERTATIVA') {
      temDissertativa = true; // aguardará revisão manual; não soma automaticamente
    }
  }
  const notaPerc = totalPeso>0 ? (pontosObtidos/totalPeso)*100 : 0;
  const nota = Math.round(notaPerc*100)/100; // duas casas se precisar
  const notaMin = assessment.nota_minima ? Number(assessment.nota_minima) : 0;
  const aprovado = !temDissertativa && nota >= notaMin; // se tiver dissertativa, aprovação depende de revisão
  // Persiste tentativa / respostas
  await createSubmission({ assessment_codigo: assessment.codigo, user_id: input.userId, respostas: input.respostas }, nota, aprovado);
  const payload = { assessmentCode: assessment.codigo, courseId: assessment.curso_id, userId: input.userId, score: nota, passed: aprovado };
  await publishEvent(aprovado ? 'assessment.passed.v1' : 'assessment.failed.v1', payload);
  return { aprovado, nota };
}
