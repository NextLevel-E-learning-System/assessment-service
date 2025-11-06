import { Request, Response, NextFunction } from 'express';
import { listAttemptsForUser } from '../repositories/submissionRepository.js';
import { findByCodigo } from '../repositories/assessmentRepository.js';
import * as attemptRepository from '../repositories/attemptRepository.js';
import { HttpError } from '../utils/httpError.js';

export async function startAttemptHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo } = req.params;
    const userId = (req.headers['x-user-id'] as string) || req.body.userId;
    if (!userId) throw new HttpError(400, 'missing_user');
    
    const assessment = await findByCodigo(codigo);
    if (!assessment) throw new HttpError(404, 'assessment_not_found');
    
    // Gating por conclusão de módulos obrigatórios (curso concluído)
    const progressBase = process.env.PROGRESS_SERVICE_URL;
    if (progressBase) {
      try {
        const url = `${progressBase}/progress/v1/inscricoes/usuario/${encodeURIComponent(userId)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const inscricoes = await resp.json();
          type Inscricao = { id: string; curso_id: string; status: string };
          const arr: Inscricao[] = Array.isArray(inscricoes) ? inscricoes : [];
          const match = arr.find(i => i.curso_id === assessment.curso_id);
          if (!match || match.status !== 'CONCLUIDO') throw new HttpError(409, 'course_not_completed');
        } else {
          throw new HttpError(502, 'progress_service_unavailable');
        }
      } catch (err) {
        if (err instanceof HttpError) throw err;
        throw new HttpError(502, 'progress_lookup_failed');
      }
    }
    
    // Regra de tentativas (sem recuperação)
    const attempts = await listAttemptsForUser(assessment.codigo, userId);
    const finalizadas = attempts.filter(a => ['APROVADO', 'REPROVADO', 'AGUARDANDO_CORRECAO', 'EXPIRADA'].includes(a.status));
    if (finalizadas.some(a => a.status === 'APROVADO')) throw new HttpError(409, 'already_passed');
    const tentativasPermitidas = assessment.tentativas_permitidas || 1;
    if (finalizadas.length >= tentativasPermitidas) throw new HttpError(409, 'attempt_limit_reached');

    // Inicia tentativa sempre EM_ANDAMENTO
    const started = await attemptRepository.startAttempt(
      assessment.codigo,
      userId,
      assessment.tempo_limite || null
    );
    
    res.status(201).json({ 
      attemptId: started.id, 
      assessment: assessment.codigo, 
      startedAt: started.data_inicio, 
      deadline: started.deadline
    });
  } catch (e) { 
    next(e); 
  }
}

// Novos handlers para CRUD de tentativas - USANDO REPOSITORIES DIRETAMENTE
export async function createAttemptHandler(req: Request, res: Response) {
  try {
    const { funcionario_id, avaliacao_id, status } = req.body;
    
    if (!funcionario_id || !avaliacao_id) {
      return res.status(400).json({ 
        erro: 'dados_obrigatorios', 
        mensagem: 'funcionario_id e avaliacao_id são obrigatórios' 
      });
    }

    // USANDO attemptRepository diretamente
    const attemptId = await attemptRepository.createAttempt({
      funcionario_id,
      avaliacao_id,
      status
    });

    const attempt = await attemptRepository.findAttemptById(attemptId);

    return res.status(201).json({
      tentativa: attempt,
      mensagem: 'Tentativa criada com sucesso'
    });
  } catch (error: unknown) {
    console.error('Erro ao criar tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function getAttemptHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // USANDO attemptRepository diretamente
    const attempt = await attemptRepository.findAttemptById(id);
    
    if (!attempt) {
      return res.status(404).json({ 
        erro: 'tentativa_nao_encontrada', 
        mensagem: 'Tentativa não encontrada' 
      });
    }

    return res.json({
      tentativa: attempt,
      mensagem: 'Tentativa encontrada'
    });
  } catch (error) {
    console.error('Erro ao buscar tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function listAttemptsByUserHandler(req: Request, res: Response) {
  try {
    const { funcionario_id } = req.params;
    const { avaliacao_id } = req.query as { avaliacao_id?: string };
    
    // USANDO attemptRepository diretamente
    const attempts = await attemptRepository.findAttemptsByUser(funcionario_id, avaliacao_id);
    
    return res.json({
      tentativas: attempts,
      total: attempts.length,
      mensagem: 'Tentativas listadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar tentativas do usuário:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function listAttemptsByAssessmentHandler(req: Request, res: Response) {
  try {
    const { avaliacao_id } = req.params;
    
    // USANDO attemptRepository diretamente
    const attempts = await attemptRepository.findAttemptsByAssessment(avaliacao_id);
    
    return res.json({
      tentativas: attempts,
      total: attempts.length,
      mensagem: 'Tentativas da avaliação listadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar tentativas da avaliação:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

// ===============================================
// OPERAÇÕES REMOVIDAS: UPDATE E DELETE
// ===============================================
// As tentativas são dados históricos dos funcionários e não podem ser editadas ou removidas
// As seguintes operações foram removidas intencionalmente:
// - updateAttemptHandler
// - deleteAttemptHandler
// - finalizeAttemptHandler (somente o sistema pode finalizar automaticamente)

// NOTA: Apenas leitura e criação são permitidas para preservar a integridade dos dados históricos
