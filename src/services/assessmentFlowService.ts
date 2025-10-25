// Novo serviço para fluxos consolidados de avaliação
import { withClient } from '../db.js';
import { findByCodigo, listQuestionsForStudent } from '../repositories/assessmentRepository.js';
import * as attemptRepository from '../repositories/attemptRepository.js';
import * as answerRepository from '../repositories/answerRepository.js';
import { HttpError } from '../utils/httpError.js';

// Interface para iniciar avaliação com dados completos
export interface StartAssessmentResponse {
  tentativa: {
    id: string;
    avaliacao_id: string;
    funcionario_id: string;
    data_inicio: Date;
    status: string;
    tempo_limite?: number;
    tentativas_permitidas?: number;
  };
  avaliacao: {
    codigo: string;
    titulo: string;
    tempo_limite?: number;
    tentativas_permitidas?: number;
    nota_minima?: number;
  };
  questoes: Array<{
    id: string;
    enunciado: string;
    tipo: string;
    opcoes_resposta: string[];
    peso: number;
  }>;
  tentativas_anteriores: number;
}

// Interface para submeter avaliação completa
export interface SubmitAssessmentRequest {
  tentativa_id: string;
  respostas: Array<{
    questao_id: string;
    resposta_funcionario: string;
  }>;
}

export interface SubmitAssessmentResponse {
  tentativa_id: string;
  status: 'FINALIZADA' | 'PENDENTE_REVISAO' | 'APROVADO' | 'REPROVADO';
  nota_obtida?: number | null;
  nota_minima?: number | null;
  tem_dissertativas: boolean;
  questoes_dissertativas_pendentes?: number;
  respostas_salvas: number;
  mensagem: string;
}

/**
 * Inicia uma avaliação retornando TODOS os dados necessários em uma única chamada
 */
export async function startCompleteAssessment(
  avaliacao_codigo: string, 
  funcionario_id: string
): Promise<StartAssessmentResponse> {
  
  // 1. Buscar avaliação
  const avaliacao = await findByCodigo(avaliacao_codigo);
  if (!avaliacao) {
    throw new HttpError(404, 'assessment_not_found');
  }

  // 2. Validar pré-requisitos (curso concluído) - mesmo código anterior
  const progressBase = process.env.PROGRESS_SERVICE_URL;
  if (progressBase) {
    try {
      const url = `${progressBase}/progress/v1/inscricoes/usuario/${encodeURIComponent(funcionario_id)}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const inscricoes = await resp.json();
        type Inscricao = { id: string; curso_id: string; status: string };
        const arr: Inscricao[] = Array.isArray(inscricoes) ? inscricoes : [];
        const match = arr.find(i => i.curso_id === avaliacao.curso_id);
        if (!match || match.status !== 'CONCLUIDO') {
          throw new HttpError(409, 'course_not_completed');
        }
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.warn('Falha ao validar progresso do curso:', err);
    }
  }

  // 3. Verificar tentativas anteriores
  const tentativasAnteriores = await withClient(async c => {
    const result = await c.query(
      `SELECT id, status, nota_obtida FROM assessment_service.tentativas 
       WHERE avaliacao_id = $1 AND funcionario_id = $2 
       ORDER BY criado_em DESC`,
      [avaliacao_codigo, funcionario_id]
    );
    return result.rows;
  });

  const finalizadas = tentativasAnteriores.filter(t => 
    ['APROVADO', 'REPROVADO', 'PENDENTE_REVISAO', 'FINALIZADA'].includes(t.status)
  );
  
  const aprovadas = finalizadas.filter(t => t.status === 'APROVADO');
  if (aprovadas.length > 0) {
    throw new HttpError(409, 'already_passed');
  }

  const tentativasPermitidas = avaliacao.tentativas_permitidas || 1;
  if (finalizadas.length >= tentativasPermitidas) {
    throw new HttpError(409, 'attempt_limit_reached');
  }

  // 4. Criar nova tentativa
  const tentativaResult = await attemptRepository.startAttempt(
    avaliacao_codigo,
    funcionario_id
  );

  // 5. Buscar tentativa criada pelo ID
  const tentativa = await attemptRepository.findAttemptById(tentativaResult.id);
  if (!tentativa) {
    throw new HttpError(500, 'failed_to_create_attempt');
  }

  // 6. Buscar questões SEM resposta correta (para o aluno)
  const questoes = await listQuestionsForStudent(avaliacao_codigo);

  return {
    tentativa: {
      id: tentativa.id,
      avaliacao_id: tentativa.avaliacao_id,
      funcionario_id: tentativa.funcionario_id,
      data_inicio: tentativa.data_inicio,
      status: tentativa.status,
      tempo_limite: avaliacao.tempo_limite || undefined,
      tentativas_permitidas: avaliacao.tentativas_permitidas || undefined
    },
    avaliacao: {
      codigo: avaliacao.codigo,
      titulo: avaliacao.titulo,
      tempo_limite: avaliacao.tempo_limite || undefined,
      tentativas_permitidas: avaliacao.tentativas_permitidas || undefined,
      nota_minima: avaliacao.nota_minima || undefined
    },
    questoes,
    tentativas_anteriores: finalizadas.length
  };
}

/**
 * Submete avaliação completa processando todas as respostas e calculando nota final
 */
export async function submitCompleteAssessment(
  data: SubmitAssessmentRequest
): Promise<SubmitAssessmentResponse> {
  
  return withClient(async c => {
    // 1. Verificar se tentativa existe e está em andamento
    const tentativaResult = await c.query(
      `SELECT t.*, a.nota_minima, a.codigo as avaliacao_codigo
       FROM assessment_service.tentativas t
       JOIN assessment_service.avaliacoes a ON t.avaliacao_id = a.codigo
       WHERE t.id = $1`,
      [data.tentativa_id]
    );

    if (tentativaResult.rows.length === 0) {
      throw new HttpError(404, 'attempt_not_found');
    }

    const tentativa = tentativaResult.rows[0];
    if (tentativa.status !== 'EM_ANDAMENTO') {
      throw new HttpError(409, 'attempt_not_in_progress');
    }

    // 2. Buscar todas as questões da avaliação
    const questoesResult = await c.query(
      `SELECT id, tipo_questao, resposta_correta, peso 
       FROM assessment_service.questoes 
       WHERE avaliacao_id = $1`,
      [tentativa.avaliacao_codigo]
    );

    const questoes = questoesResult.rows;
    const questoesMap = new Map(questoes.map(q => [q.id, q]));

    // 3. Salvar todas as respostas
    let respostasSalvas = 0;
    const respostasComPontuacao: Array<{questao_id: string, pontuacao: number}> = [];
    let temDissertativas = false;

    for (const resposta of data.respostas) {
      const questao = questoesMap.get(resposta.questao_id);
      if (!questao) continue;

      let pontuacao: number | null = null;

      // Calcular pontuação automática para questões objetivas
      if (questao.tipo_questao === 'DISSERTATIVA') {
        temDissertativas = true;
        pontuacao = null; // Será preenchida pelo instrutor
      } else {
        // Resposta vazia = 0 pontos
        if (!resposta.resposta_funcionario?.trim()) {
          pontuacao = 0;
        } else if (questao.tipo_questao === 'MULTIPLA_ESCOLHA' || questao.tipo_questao === 'VERDADEIRO_FALSO') {
          pontuacao = resposta.resposta_funcionario.trim() === questao.resposta_correta ? questao.peso : 0;
        } else {
          pontuacao = 0; // Tipo não reconhecido
        }
      }

      // Salvar resposta
      await answerRepository.upsertAnswer({
        tentativa_id: data.tentativa_id,
        questao_id: resposta.questao_id,
        resposta_funcionario: resposta.resposta_funcionario?.trim() || '',
        pontuacao,
        feedback: null
      });

      respostasSalvas++;
      
      if (pontuacao !== null) {
        respostasComPontuacao.push({ questao_id: resposta.questao_id, pontuacao });
      }
    }

    // 4. Calcular nota se não há dissertativas pendentes
    let notaObtida: number | null = null;
    let status: string;

    if (temDissertativas) {
      status = 'PENDENTE_REVISAO';
    } else {
      // Calcular nota final
      const pesoTotal = questoes.reduce((sum, q) => sum + Number(q.peso), 0);
      const pontuacaoTotal = respostasComPontuacao.reduce((sum, r) => sum + r.pontuacao, 0);
      
      notaObtida = pesoTotal > 0 ? (pontuacaoTotal / pesoTotal) * 100 : 0;
      
      // Determinar status final
      const notaMinima = tentativa.nota_minima || 70;
      status = notaObtida >= notaMinima ? 'APROVADO' : 'REPROVADO';
    }

    // 5. Atualizar tentativa
    await c.query(
      `UPDATE assessment_service.tentativas 
       SET status = $2, data_fim = NOW(), nota_obtida = $3
       WHERE id = $1`,
      [data.tentativa_id, status, notaObtida]
    );

    const questoesDissertativasPendentes = temDissertativas ? 
      questoes.filter(q => q.tipo_questao === 'DISSERTATIVA').length : 0;

    return {
      tentativa_id: data.tentativa_id,
      status: status as 'FINALIZADA' | 'PENDENTE_REVISAO' | 'APROVADO' | 'REPROVADO',
      nota_obtida: notaObtida,
      nota_minima: tentativa.nota_minima,
      tem_dissertativas: temDissertativas,
      questoes_dissertativas_pendentes: questoesDissertativasPendentes,
      respostas_salvas: respostasSalvas,
      mensagem: temDissertativas ? 
        'Avaliação submetida. Aguarde correção das questões dissertativas.' :
        `Avaliação finalizada. Nota: ${notaObtida?.toFixed(1)}% (Status: ${status})`
    };
  });
}

/**
 * Busca tentativa com respostas para revisão (instrutor)
 */
export async function getAttemptForReview(tentativa_id: string) {
  return withClient(async c => {
    // Buscar tentativa com dados da avaliação
    const tentativaResult = await c.query(
      `SELECT t.*, a.titulo as avaliacao_titulo, a.nota_minima,
              f.nome as funcionario_nome, f.email as funcionario_email
       FROM assessment_service.tentativas t
       JOIN assessment_service.avaliacoes a ON t.avaliacao_id = a.codigo
       LEFT JOIN user_service.funcionarios f ON t.funcionario_id = f.id
       WHERE t.id = $1`,
      [tentativa_id]
    );

    if (tentativaResult.rows.length === 0) {
      throw new HttpError(404, 'attempt_not_found');
    }

    const tentativa = tentativaResult.rows[0];

    // Buscar questões com respostas
    const respostasResult = await c.query(
      `SELECT r.id as resposta_id, r.resposta_funcionario, r.pontuacao, r.feedback,
              q.id as questao_id, q.enunciado, q.tipo_questao, q.peso, q.resposta_correta
       FROM assessment_service.respostas r
       JOIN assessment_service.questoes q ON r.questao_id = q.id
       WHERE r.tentativa_id = $1
       ORDER BY q.criado_em`,
      [tentativa_id]
    );

    return {
      tentativa: {
        id: tentativa.id,
        funcionario_id: tentativa.funcionario_id,
        funcionario_nome: tentativa.funcionario_nome,
        funcionario_email: tentativa.funcionario_email,
        avaliacao_id: tentativa.avaliacao_id,
        avaliacao_titulo: tentativa.avaliacao_titulo,
        data_inicio: tentativa.data_inicio,
        data_fim: tentativa.data_fim,
        status: tentativa.status,
        nota_obtida: tentativa.nota_obtida,
        nota_minima: tentativa.nota_minima
      },
      respostas: respostasResult.rows.map(r => ({
        resposta_id: r.resposta_id,
        questao_id: r.questao_id,
        enunciado: r.enunciado,
        tipo_questao: r.tipo_questao,
        peso: Number(r.peso),
        resposta_correta: r.resposta_correta,
        resposta_funcionario: r.resposta_funcionario,
        pontuacao: r.pontuacao,
        feedback: r.feedback
      }))
    };
  });
}

/**
 * Aplica correções e recalcula nota final
 */
export async function applyReviewAndFinalize(
  tentativa_id: string, 
  correcoes: Array<{resposta_id: string, pontuacao: number, feedback?: string}>
) {
  return withClient(async c => {
    // 1. Aplicar correções nas respostas
    for (const correcao of correcoes) {
      await c.query(
        `UPDATE assessment_service.respostas 
         SET pontuacao = $2, feedback = $3
         WHERE id = $1`,
        [correcao.resposta_id, correcao.pontuacao, correcao.feedback || null]
      );
    }

    // 2. Recalcular nota final
    const notaResult = await c.query(
      `SELECT 
         SUM(r.pontuacao) as pontuacao_total,
         SUM(q.peso) as peso_total,
         t.avaliacao_id,
         a.nota_minima
       FROM assessment_service.respostas r
       JOIN assessment_service.questoes q ON r.questao_id = q.id
       JOIN assessment_service.tentativas t ON r.tentativa_id = t.id
       JOIN assessment_service.avaliacoes a ON t.avaliacao_id = a.codigo
       WHERE r.tentativa_id = $1
       GROUP BY t.avaliacao_id, a.nota_minima`,
      [tentativa_id]
    );

    if (notaResult.rows.length === 0) {
      throw new HttpError(404, 'attempt_not_found');
    }

    const { pontuacao_total, peso_total, nota_minima } = notaResult.rows[0];
    const notaFinal = peso_total > 0 ? (Number(pontuacao_total) / Number(peso_total)) * 100 : 0;
    const statusFinal = notaFinal >= (nota_minima || 70) ? 'APROVADO' : 'REPROVADO';

    // 3. Atualizar tentativa
    await c.query(
      `UPDATE assessment_service.tentativas 
       SET status = $2, nota_obtida = $3, data_fim = COALESCE(data_fim, NOW())
       WHERE id = $1`,
      [tentativa_id, statusFinal, notaFinal]
    );

    return {
      tentativa_id,
      nota_final: notaFinal,
      status: statusFinal,
      correcoes_aplicadas: correcoes.length,
      mensagem: `Correção finalizada. Nota: ${notaFinal.toFixed(1)}% (${statusFinal})`
    };
  });
}