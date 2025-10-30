// Novo serviço para fluxos consolidados de avaliação
import type { PoolClient } from 'pg';
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
  status: 'AGUARDANDO_CORRECAO' | 'APROVADO' | 'REPROVADO';
  nota_obtida?: number | null;
  nota_minima?: number | null;
  tem_dissertativas: boolean;
  questoes_dissertativas_pendentes?: number;
  respostas_salvas: number;
  mensagem: string;
}

async function syncProgressAfterModuleCompletion(
  client: PoolClient,
  funcionarioId: string,
  moduloId: string,
  cursoIdHint: string | null,
  origin: 'submission' | 'review'
): Promise<void> {
  try {
    const moduleInfoResult = await client.query(
      `SELECT curso_id, xp_modulo FROM course_service.modulos WHERE id = $1`,
      [moduloId]
    );

    if (moduleInfoResult.rows.length === 0) {
      console.warn(`[progress-sync:${origin}] módulo ${moduloId} não encontrado na tabela course_service.modulos`);
      return;
    }

    const moduleInfo = moduleInfoResult.rows[0];
    const cursoId = (cursoIdHint || moduleInfo.curso_id) as string | null;

    if (!cursoId) {
      console.warn(`[progress-sync:${origin}] módulo ${moduloId} não possui curso associado`);
      return;
    }

    const xpModulo = Number(moduleInfo.xp_modulo || 0);

    const enrollmentResult = await client.query(
      `SELECT id
         FROM progress_service.inscricoes
        WHERE funcionario_id = $1
          AND curso_id = $2
        ORDER BY data_inscricao DESC
        LIMIT 1`,
      [funcionarioId, cursoId]
    );

    if (enrollmentResult.rows.length === 0) {
      console.warn(`[progress-sync:${origin}] inscrição não encontrada para funcionário ${funcionarioId} no curso ${cursoId}`);
      return;
    }

    const inscricaoId = enrollmentResult.rows[0].id as string;

    const progressResult = await client.query(
      `SELECT id, data_inicio, data_conclusao
         FROM progress_service.progresso_modulos
        WHERE inscricao_id = $1
          AND modulo_id = $2
        FOR UPDATE`,
      [inscricaoId, moduloId]
    );

    let moduleCompletedNow = false;

    if (progressResult.rows.length === 0) {
      await client.query(
        `INSERT INTO progress_service.progresso_modulos
           (id, inscricao_id, modulo_id, data_inicio, data_conclusao, tempo_gasto, criado_em, atualizado_em)
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW(), 1, NOW(), NOW())`,
        [inscricaoId, moduloId]
      );
      moduleCompletedNow = true;
    } else {
      const progressRow = progressResult.rows[0];
      if (progressRow.data_conclusao) {
        console.log(
          `[progress-sync:${origin}] módulo ${moduloId} já estava concluído para inscrição ${inscricaoId}`
        );
      } else {
        const startedAt = progressRow.data_inicio ? new Date(progressRow.data_inicio) : new Date();
        const tempoGastoMin = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));

        await client.query(
          `UPDATE progress_service.progresso_modulos
              SET data_inicio   = COALESCE(data_inicio, NOW()),
                  data_conclusao = NOW(),
                  tempo_gasto    = $3,
                  atualizado_em  = NOW()
            WHERE inscricao_id = $1
              AND modulo_id    = $2`,
          [inscricaoId, moduloId, tempoGastoMin]
        );

        moduleCompletedNow = true;
      }
    }

    if (moduleCompletedNow && xpModulo > 0) {
      await client.query(
        `UPDATE user_service.funcionarios
            SET xp_total = xp_total + $1,
                nivel = CASE
                  WHEN xp_total + $1 >= 3000 THEN 'Avançado'
                  WHEN xp_total + $1 >= 1000 THEN 'Intermediário'
                  ELSE 'Iniciante'
                END,
                atualizado_em = NOW()
          WHERE id = $2`,
        [xpModulo, funcionarioId]
      );
    }

    const totalObrigatoriosResult = await client.query(
      `SELECT COUNT(*)::int AS total
         FROM course_service.modulos
        WHERE curso_id = $1
          AND obrigatorio = TRUE`,
      [cursoId]
    );

    const concluidosObrigatoriosResult = await client.query(
      `SELECT COUNT(*)::int AS concluidos
         FROM progress_service.progresso_modulos pm
         JOIN course_service.modulos m ON m.id = pm.modulo_id
        WHERE pm.inscricao_id = $1
          AND m.obrigatorio = TRUE
          AND pm.data_conclusao IS NOT NULL`,
      [inscricaoId]
    );

    const totalObrigatorios = Number(totalObrigatoriosResult.rows[0]?.total || 0);
    const concluidosObrigatorios = Number(concluidosObrigatoriosResult.rows[0]?.concluidos || 0);

    let progressoPercentual = 0;

    if (totalObrigatorios > 0) {
      progressoPercentual = Math.round((concluidosObrigatorios / totalObrigatorios) * 100);
    } else {
      const totalModulosResult = await client.query(
        `SELECT COUNT(*)::int AS total
           FROM course_service.modulos
          WHERE curso_id = $1`,
        [cursoId]
      );

      const concluidosTotaisResult = await client.query(
        `SELECT COUNT(*)::int AS concluidos
           FROM progress_service.progresso_modulos
          WHERE inscricao_id = $1
            AND data_conclusao IS NOT NULL`,
        [inscricaoId]
      );

      const totalModulos = Number(totalModulosResult.rows[0]?.total || 0);
      const concluidosTotais = Number(concluidosTotaisResult.rows[0]?.concluidos || 0);

      progressoPercentual = totalModulos > 0 ? Math.round((concluidosTotais / totalModulos) * 100) : 0;
    }

  progressoPercentual = Math.max(0, Math.min(100, progressoPercentual));

  const statusFinal = progressoPercentual >= 100 ? 'CONCLUIDO' : 'EM_ANDAMENTO';

    await client.query(
      `UPDATE progress_service.inscricoes
          SET progresso_percentual = $1,
              status = $2,
              data_conclusao = CASE
                WHEN $2 = 'CONCLUIDO' THEN COALESCE(data_conclusao, NOW())
                ELSE data_conclusao
              END,
              atualizado_em = NOW()
        WHERE id = $3`,
      [progressoPercentual, statusFinal, inscricaoId]
    );

    console.log(
      `[progress-sync:${origin}] inscrição ${inscricaoId} sincronizada (progresso=${progressoPercentual}%, status=${statusFinal})`
    );
  } catch (error) {
    console.error(`[progress-sync:${origin}] erro ao sincronizar progresso automaticamente`, error);
  }
}

/**
 * Busca tentativa ativa (em andamento) para uma avaliação
 */
export async function getActiveAttempt(
  avaliacao_codigo: string,
  funcionario_id: string
): Promise<StartAssessmentResponse | null> {
  
  // Buscar tentativa em andamento
  const tentativaAtiva = await withClient(async c => {
    const result = await c.query(
      `SELECT * FROM assessment_service.tentativas 
       WHERE avaliacao_id = $1 AND funcionario_id = $2 AND status = 'EM_ANDAMENTO'
       ORDER BY criado_em DESC LIMIT 1`,
      [avaliacao_codigo, funcionario_id]
    );
    return result.rows[0] || null;
  });

  if (!tentativaAtiva) {
    return null;
  }

  // Buscar avaliação
  const avaliacao = await findByCodigo(avaliacao_codigo);
  if (!avaliacao) {
    return null;
  }

  // Buscar questões
  const questoes = await listQuestionsForStudent(avaliacao_codigo);

  // Contar tentativas finalizadas anteriores
  const tentativasAnteriores = await withClient(async c => {
    const result = await c.query(
      `SELECT COUNT(*) as count FROM assessment_service.tentativas 
       WHERE avaliacao_id = $1 AND funcionario_id = $2 
       AND status IN ('APROVADO', 'REPROVADO', 'AGUARDANDO_CORRECAO')`,
      [avaliacao_codigo, funcionario_id]
    );
    return parseInt(result.rows[0].count);
  });

  return {
    tentativa: {
      id: tentativaAtiva.id,
      avaliacao_id: tentativaAtiva.avaliacao_id,
      funcionario_id: tentativaAtiva.funcionario_id,
      data_inicio: tentativaAtiva.data_inicio,
      status: tentativaAtiva.status,
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
    tentativas_anteriores: tentativasAnteriores
  };
}

/**
 * Inicia uma avaliação retornando TODOS os dados necessários em uma única chamada
 */
export async function startCompleteAssessment(
  avaliacao_codigo: string, 
  funcionario_id: string
): Promise<StartAssessmentResponse> {
  
  // 0. Verificar se já existe tentativa em andamento
  const tentativaAtiva = await getActiveAttempt(avaliacao_codigo, funcionario_id);
  if (tentativaAtiva) {
    return tentativaAtiva; // Retorna tentativa existente
  }

  // 1. Buscar avaliação
  const avaliacao = await findByCodigo(avaliacao_codigo);
  if (!avaliacao) {
    throw new HttpError(404, 'assessment_not_found');
  }

  // 2. Validar pré-requisitos: TODOS os módulos obrigatórios do curso devem estar concluídos
  const progressBase = process.env.PROGRESS_SERVICE_URL;
  if (progressBase && avaliacao.curso_id) {
    try {
      // Buscar progresso dos módulos do aluno neste curso
      const progressUrl = `${progressBase}/progress/v1/modulos/progresso?inscricao_id=&funcionario_id=${encodeURIComponent(funcionario_id)}`;
      const progressResp = await fetch(progressUrl);
      
      if (progressResp.ok) {
        const progressData = await progressResp.json();
        
        // Buscar módulos do curso para verificar quais são obrigatórios
        const courseServiceBase = process.env.COURSE_SERVICE_URL;
        if (courseServiceBase) {
          const modulesUrl = `${courseServiceBase}/courses/v1/${avaliacao.curso_id}/modules`;
          const modulesResp = await fetch(modulesUrl);
          
          if (modulesResp.ok) {
            const modulesData = await modulesResp.json();
            const modules = Array.isArray(modulesData) ? modulesData : modulesData.modulos || [];
            
            // Tipos para módulos e progresso
            type ModuleType = { id: string; titulo: string; obrigatorio: boolean };
            type ProgressType = { modulo_id: string; data_conclusao: string | null };
            
            // Filtrar módulos obrigatórios (excluindo o módulo da própria avaliação)
            const requiredModules = (modules as ModuleType[]).filter((m) => 
              m.obrigatorio && m.id !== avaliacao.modulo_id
            );
            
            if (requiredModules.length > 0) {
              // Verificar se todos os módulos obrigatórios estão concluídos
              const completedModuleIds = new Set(
                (Array.isArray(progressData) ? progressData : [] as ProgressType[])
                  .filter((p: ProgressType) => p.data_conclusao !== null)
                  .map((p: ProgressType) => p.modulo_id)
              );
              
              const incompletedRequired = requiredModules.filter(
                (m: ModuleType) => !completedModuleIds.has(m.id)
              );
              
              if (incompletedRequired.length > 0) {
                throw new HttpError(
                  403, 
                  'required_modules_not_completed',
                  { 
                    message: 'Você precisa concluir todos os módulos obrigatórios antes de fazer a avaliação',
                    incomplete_modules: incompletedRequired.map((m: ModuleType) => m.titulo)
                  }
                );
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.warn('Falha ao validar módulos obrigatórios:', err);
    }
  }

  // 3. Verificar tentativas anteriores e aplicar regra de recuperação
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
    ['APROVADO', 'REPROVADO', 'AGUARDANDO_CORRECAO'].includes(t.status)
  );
  
  // Obter nota mínima da avaliação
  const notaMinima = avaliacao.nota_minima || 70;
  
  // Verificar se já foi aprovado (status APROVADO ou nota >= nota_minima)
  const aprovadas = finalizadas.filter(t => 
    t.status === 'APROVADO' || (t.nota_obtida !== null && Number(t.nota_obtida) >= notaMinima)
  );
  
  if (aprovadas.length > 0) {
    throw new HttpError(409, 'already_passed', {
      message: 'Você já foi aprovado nesta avaliação'
    });
  }

  // Regra: Permite 2 tentativas (inicial + 1 recuperação se nota < nota_minima)
  // Se já tem 2 tentativas finalizadas e nenhuma aprovada, bloquear
  if (finalizadas.length >= 2) {
    throw new HttpError(409, 'attempt_limit_reached', {
      message: 'Você atingiu o limite de tentativas para esta avaliação (2 tentativas)',
      attempts_used: finalizadas.length
    });
  }

  // Se tem 1 tentativa e foi >= nota_minima, não permite nova tentativa
  if (finalizadas.length === 1) {
    const primeiraNotaString = finalizadas[0].nota_obtida;
    if (primeiraNotaString !== null) {
      const primeiraNota = Number(primeiraNotaString);
      if (primeiraNota >= notaMinima) {
        throw new HttpError(409, 'already_passed', {
          message: `Você já foi aprovado com nota >= ${notaMinima}`,
          nota: primeiraNota
        });
      }
      // Se nota < nota_minima, permite tentativa de recuperação (será a 2ª tentativa)
    }
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
      if (!questao) {
        console.warn(`Questão não encontrada: ${resposta.questao_id}`);
        continue;
      }

      let pontuacao: number | null = null;

      // Calcular pontuação automática para questões objetivas
      if (questao.tipo_questao === 'DISSERTATIVA') {
        temDissertativas = true;
        pontuacao = null; // Será preenchida pelo instrutor (mantém null para sinalizar pendência)
      } else {
        // Resposta vazia = 0 pontos
        if (!resposta.resposta_funcionario?.trim()) {
          pontuacao = 0;
        } else if (questao.tipo_questao === 'MULTIPLA_ESCOLHA' || questao.tipo_questao === 'VERDADEIRO_FALSO') {
          // Normalizar resposta (trim e case insensitive para V/F)
          const respostaClean = resposta.resposta_funcionario.trim();
          const respostaCorretaClean = questao.resposta_correta?.trim() || '';
          
          // Comparação case-insensitive
          // Pontuação é sempre 100 (correto) ou 0 (errado)
          // O peso é usado apenas no cálculo final da nota
          const match = respostaClean.toLowerCase() === respostaCorretaClean.toLowerCase();
          pontuacao = match ? 100 : 0;
          
          console.log(`Questão ${questao.id} (${questao.tipo_questao}): resposta="${respostaClean}", correta="${respostaCorretaClean}", match=${match}, pontuacao=${pontuacao}, peso=${questao.peso}`);
        } else {
          pontuacao = 0; // Tipo não reconhecido = 0 pontos
        }
      }

      try {
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
      } catch (error) {
        console.error(`Erro ao salvar resposta ${resposta.questao_id}:`, error);
        throw error;
      }
    }

    // 4. Calcular nota se não há dissertativas pendentes
    let notaObtida: number | null = null;
    let status: string;

    if (temDissertativas) {
      status = 'AGUARDANDO_CORRECAO';
    } else {
      // Calcular nota final ponderada
      // Para cada questão: pontuacao (0-100) × peso
      // Soma tudo e divide pela soma dos pesos
      // Resultado final: 0-100
      let somaPonderada = 0;
      let pesoTotal = 0;
      
      for (const questao of questoes) {
        const resposta = respostasComPontuacao.find(r => r.questao_id === questao.id);
        if (resposta) {
          somaPonderada += resposta.pontuacao * Number(questao.peso);
          pesoTotal += Number(questao.peso);
        }
      }
      
      notaObtida = pesoTotal > 0 ? (somaPonderada / pesoTotal) : 0;
      
      console.log(`Cálculo nota: somaPonderada=${somaPonderada}, pesoTotal=${pesoTotal}, notaFinal=${notaObtida}`);
      
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

    // 6. Se APROVADO, sincronizar progresso automaticamente
    if (status === 'APROVADO') {
      try {
        const avaliacaoRow = await c.query(
          `SELECT modulo_id, curso_id
             FROM assessment_service.avaliacoes
            WHERE codigo = $1`,
          [tentativa.avaliacao_codigo]
        );

        if (avaliacaoRow.rows.length > 0 && avaliacaoRow.rows[0].modulo_id) {
          const { modulo_id, curso_id } = avaliacaoRow.rows[0];

          await syncProgressAfterModuleCompletion(
            c,
            tentativa.funcionario_id,
            modulo_id,
            curso_id || null,
            'submission'
          );
        } else {
          console.warn('⚠️ Avaliação não possui módulo associado; não foi possível sincronizar progresso');
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar progresso após aprovação na avaliação:', error);
      }
    }

    const questoesDissertativasPendentes = temDissertativas ? 
      questoes.filter(q => q.tipo_questao === 'DISSERTATIVA').length : 0;

    return {
      tentativa_id: data.tentativa_id,
      status: status as  'AGUARDANDO_CORRECAO' | 'APROVADO' | 'REPROVADO',
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
      `SELECT t.*, a.titulo as avaliacao_titulo, a.nota_minima, a.codigo as avaliacao_codigo,
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
        q.id as questao_id, q.enunciado, q.tipo_questao, q.peso, q.resposta_correta, q.opcoes_resposta
       FROM assessment_service.respostas r
       JOIN assessment_service.questoes q ON r.questao_id = q.id
       WHERE r.tentativa_id = $1
       ORDER BY q.criado_em`,
      [tentativa_id]
    );

    // Separar questões dissertativas e objetivas
    const questoesDissertativas = respostasResult.rows
      .filter(r => r.tipo_questao === 'DISSERTATIVA')
      .map(r => ({
        questao_id: r.questao_id,
        resposta_id: r.resposta_id,
        enunciado: r.enunciado,
        peso: Number(r.peso),
        resposta_funcionario: r.resposta_funcionario,
        pontuacao_atual: r.pontuacao !== null ? Number(r.pontuacao) : undefined,
        feedback_atual: r.feedback || undefined
      }));

    const parseOpcoesResposta = (raw: unknown): string[] | undefined => {
      if (!raw) return undefined;
      if (Array.isArray(raw)) {
        return (raw as unknown[]).filter((item): item is string => typeof item === 'string');
      }

      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string');
          }
        } catch {
          // Ignorar erro de parse – formato inesperado
        }
      }

      return undefined;
    };

    const respostasObjetivas = respostasResult.rows
      .filter(r => r.tipo_questao !== 'DISSERTATIVA')
      .map(r => ({
        questao_id: r.questao_id,
        enunciado: r.enunciado,
        tipo: r.tipo_questao,
        peso: Number(r.peso),
        resposta_funcionario: r.resposta_funcionario,
        resposta_correta: r.resposta_correta,
        pontuacao: r.pontuacao !== null ? Number(r.pontuacao) : null,
        opcoes_resposta: parseOpcoesResposta(r.opcoes_resposta)
      }));

    const notaObjetivas = respostasObjetivas.length > 0
      ? respostasObjetivas.reduce((sum, r) => sum + (r.pontuacao ?? 0), 0)
      : undefined;

    return {
      tentativa: {
        id: tentativa.id,
        avaliacao_id: tentativa.avaliacao_id,
        funcionario_id: tentativa.funcionario_id,
        data_inicio: tentativa.data_inicio,
        data_fim: tentativa.data_fim,
        status: tentativa.status,
        nota_obtida: tentativa.nota_obtida !== null ? Number(tentativa.nota_obtida) : null
      },
      avaliacao: {
        codigo: tentativa.avaliacao_codigo,
        titulo: tentativa.avaliacao_titulo,
        nota_minima: tentativa.nota_minima
      },
      funcionario: {
        id: tentativa.funcionario_id,
        nome: tentativa.funcionario_nome,
        email: tentativa.funcionario_email
      },
      questoes_dissertativas: questoesDissertativas,
      respostas_objetivas: respostasObjetivas.length > 0 ? respostasObjetivas : undefined,
      nota_objetivas: notaObjetivas
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

    // 2. Recalcular nota final ponderada
    // Para cada resposta: pontuacao (0-100) × peso da questão
    // Soma tudo e divide pela soma dos pesos → resultado 0-100
    const notaResult = await c.query(
      `SELECT 
         SUM(r.pontuacao * q.peso) as soma_ponderada,
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

    const { soma_ponderada, peso_total, nota_minima, avaliacao_id } = notaResult.rows[0];
    const notaFinal = peso_total > 0 ? (Number(soma_ponderada) / Number(peso_total)) : 0;
    const passou = notaFinal >= (nota_minima || 70);
    const statusFinal = passou ? 'APROVADO' : 'REPROVADO';
    
    console.log(`Finalização revisão: soma_ponderada=${soma_ponderada}, peso_total=${peso_total}, notaFinal=${notaFinal}`);

    // 3. Atualizar tentativa
    await c.query(
      `UPDATE assessment_service.tentativas 
       SET status = $2, nota_obtida = $3, data_fim = COALESCE(data_fim, NOW())
       WHERE id = $1`,
      [tentativa_id, statusFinal, notaFinal]
    );

    // 3.5. Se APROVADO, sincronizar progresso automaticamente
    if (statusFinal === 'APROVADO') {
      try {
        const tentativaResult = await c.query(
          `SELECT t.funcionario_id, a.modulo_id, a.curso_id
             FROM assessment_service.tentativas t
             JOIN assessment_service.avaliacoes a ON t.avaliacao_id = a.codigo
            WHERE t.id = $1`,
          [tentativa_id]
        );

        if (tentativaResult.rows.length > 0) {
          const { funcionario_id, modulo_id, curso_id } = tentativaResult.rows[0];

          if (modulo_id) {
            await syncProgressAfterModuleCompletion(
              c,
              funcionario_id,
              modulo_id,
              curso_id || null,
              'review'
            );
          } else {
            console.warn('⚠️ Avaliação não possui módulo associado; não foi possível sincronizar progresso');
          }
        }
      } catch (error) {
        console.error('❌ Erro ao sincronizar progresso após aprovação na revisão:', error);
      }
    }

    // 4. Publicar evento
    const { publishEvent } = await import('../events/publisher.js');
    const { findByCodigo } = await import('../repositories/assessmentRepository.js');
    
    const assessment = await findByCodigo(avaliacao_id);
    if (assessment) {
      const tentativaData = await c.query(
        'SELECT funcionario_id FROM assessment_service.tentativas WHERE id = $1',
        [tentativa_id]
      );
      
      if (tentativaData.rows[0]) {
        const payload = { 
          assessmentCode: assessment.codigo, 
          courseId: assessment.curso_id, 
          userId: tentativaData.rows[0].funcionario_id, 
          score: notaFinal, 
          passed: passou 
        };
        await publishEvent(passou ? 'assessment.passed.v1' : 'assessment.failed.v1', payload);
      }
    }

    return {
      tentativa_id,
      status: statusFinal,
      nota_final: notaFinal,
      nota_minima: nota_minima,
      passou,
      mensagem: `Correção finalizada. Nota: ${notaFinal.toFixed(1)}% (${statusFinal})`
    };
  });
}