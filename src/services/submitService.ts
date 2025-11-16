import { findByCodigo, listQuestionsSimple } from '../repositories/assessmentRepository.js';
import { findAttemptById, finalizeAttempt } from '../repositories/attemptRepository.js';
import { upsertAnswer } from '../repositories/answerRepository.js';
import { publishEvent } from '../config/rabbitmq.js';

interface GradeInput { 
  codigo: string; 
  userId: string; 
  attemptId: string; 
  respostas: { questao_id: string; resposta: string }[] 
}

export async function gradeSubmission(input: GradeInput) {
  const assessment = await findByCodigo(input.codigo);
  if (!assessment) throw new Error('assessment_not_found');
  
  const attempt = await findAttemptById(input.attemptId);
  if (!attempt) throw new Error('attempt_not_found');
  if (attempt.funcionario_id !== input.userId) throw new Error('attempt_user_mismatch');
  if (attempt.status !== 'EM_ANDAMENTO') throw new Error('attempt_already_finished');

  // valida tempo limite
  if (assessment.tempo_limite) {
    const limiteMs = assessment.tempo_limite * 60000;
    const decorrido = Date.now() - new Date(attempt.data_inicio).getTime();
    if (decorrido > limiteMs) {
      // finaliza como expirada
      await finalizeAttempt(attempt.id, 0, 'EXPIRADA');
      return { aprovado: false, nota: 0, expirado: true };
    }
  }

  // Salva respostas usando upsert (consolidado)
  for (const resposta of input.respostas) {
    await upsertAnswer({
      tentativa_id: attempt.id,
      questao_id: resposta.questao_id,
      resposta_funcionario: resposta.resposta
    });
  }

  // Calcula nota considerando TODAS as questões da avaliação
  const questoes = await listQuestionsSimple(input.codigo);
  const respostasMap = new Map(input.respostas.map(r => [r.questao_id, r.resposta]));
  let totalPesoGeral = 0, pontosObtidosObjetivas = 0, temDissertativa = false;
  
  for (const q of questoes) {
    const peso = q.peso || 1; 
    totalPesoGeral += peso; // Peso de TODAS as questões (objetivas + dissertativas)
    const resp = respostasMap.get(q.id); 
    if (!resp) continue;
    
    if (q.tipo === 'MULTIPLA_ESCOLHA' || q.tipo === 'VERDADEIRO_FALSO') {
      // Apenas questões objetivas contam pontos agora
      if (q.resposta_correta && resp === q.resposta_correta) {
        pontosObtidosObjetivas += peso;
      }
    } else if (q.tipo === 'DISSERTATIVA') {
      temDissertativa = true;
      // Dissertativas não contam pontos ainda (aguarda correção manual)
    }
  }
  
  // Nota proporcional: apenas das questões objetivas até a correção das dissertativas
  const nota = totalPesoGeral > 0 ? Math.round(((pontosObtidosObjetivas / totalPesoGeral) * 100) * 100) / 100 : 0;
  const notaMin = assessment.nota_minima ? Number(assessment.nota_minima) : 0;
  const aprovado = !temDissertativa && nota >= notaMin;
  const status = temDissertativa ? 'AGUARDANDO_CORRECAO' : (aprovado ? 'APROVADO' : 'REPROVADO');
  
  await finalizeAttempt(attempt.id, nota, status);
  
  if (!temDissertativa) {
    const payload = { 
      assessmentCode: assessment.codigo, 
      courseId: assessment.curso_id, 
      userId: input.userId, 
      score: nota, 
      passed: aprovado 
    };
    await publishEvent(aprovado ? 'assessment.passed.v1' : 'assessment.failed.v1', payload);
  }
  
  return { aprovado, nota, status };
}
