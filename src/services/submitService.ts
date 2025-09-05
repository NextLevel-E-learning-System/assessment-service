import { findByCodigo, listQuestions } from '../repositories/assessmentRepository.js';
import { publishEvent } from '../events/publisher.js';
import { getAttempt, saveAnswers, finalizeAttempt, SubmissionAnswerInput } from '../repositories/submissionRepository.js';

interface GradeInput { codigo:string; userId:string; attemptId:string; respostas:SubmissionAnswerInput[] }

export async function gradeSubmission(input:GradeInput){
  const assessment = await findByCodigo(input.codigo);
  if(!assessment) throw new Error('assessment_not_found');
  const attempt = await getAttempt(input.attemptId);
  if(!attempt) throw new Error('attempt_not_found');
  if(attempt.funcionario_id !== input.userId) throw new Error('attempt_user_mismatch');
  if(attempt.status !== 'EM_ANDAMENTO') throw new Error('attempt_already_finished');

  // valida tempo limite
  if(assessment.tempo_limite){
    const limiteMs = assessment.tempo_limite * 60000;
    const decorrido = Date.now() - new Date(attempt.data_inicio).getTime();
    if(decorrido > limiteMs) {
      // finaliza como expirada
      await finalizeAttempt(attempt.id, 0, 'EXPIRADA');
      return { aprovado:false, nota:0, expirado:true };
    }
  }

  await saveAnswers(attempt.id, input.respostas);
  const questoes = await listQuestions(input.codigo);
  const respostasMap = new Map(input.respostas.map(r=>[r.questao_id, r.resposta]));
  let totalPeso = 0, pontosObtidos = 0, temDissertativa = false;
  for(const q of questoes){
    const peso = q.peso || 1; totalPeso += peso;
    const resp = respostasMap.get(q.id); if(!resp) continue;
    if(q.tipo==='MULTIPLA_ESCOLHA' || q.tipo==='VERDADEIRO_FALSO'){
      if(q.resposta_correta && resp === q.resposta_correta) pontosObtidos += peso;
    } else if(q.tipo==='DISSERTATIVA') temDissertativa = true;
  }
  const nota = totalPeso>0 ? Math.round(((pontosObtidos/totalPeso)*100)*100)/100 : 0;
  const notaMin = assessment.nota_minima ? Number(assessment.nota_minima) : 0;
  const aprovado = !temDissertativa && nota >= notaMin;
  const status = temDissertativa ? 'PENDENTE_REVISAO' : (aprovado ? 'APROVADO' : 'REPROVADO');
  await finalizeAttempt(attempt.id, nota, status);
  if(!temDissertativa){
    const payload = { assessmentCode: assessment.codigo, courseId: assessment.curso_id, userId: input.userId, score: nota, passed: aprovado };
    await publishEvent(aprovado ? 'assessment.passed.v1' : 'assessment.failed.v1', payload);
  }
  return { aprovado, nota, status };
}
