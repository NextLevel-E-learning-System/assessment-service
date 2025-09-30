import { Request, Response, NextFunction } from 'express';
import { startAttempt, listAttemptsForUser } from '../repositories/submissionRepository.js';
import { findByCodigo } from '../repositories/assessmentRepository.js';
import * as attemptRepository from '../repositories/attemptRepository.js';
import { HttpError } from '../utils/httpError.js';

export async function startAttemptHandler(req:Request,res:Response,next:NextFunction){
  try {
    const { codigo } = req.params;
    const userId = (req.headers['x-user-id'] as string) || req.body.userId;
    if(!userId) throw new HttpError(400,'missing_user');
    const assessment = await findByCodigo(codigo);
    if(!assessment) throw new HttpError(404,'assessment_not_found');
    // Gating por conclusão de módulos obrigatórios (curso concluído)
    const progressBase = process.env.PROGRESS_SERVICE_URL; // ex: http://progress-service:3000
    if(progressBase){
      try {
        const url = `${progressBase}/progress/v1/inscricoes/usuario/${encodeURIComponent(userId)}`;
        const resp = await fetch(url);
        if(resp.ok){
          const inscricoes = await resp.json();
            type Inscricao = { id:string; curso_id:string; status:string };
            const arr:Inscricao[] = Array.isArray(inscricoes) ? inscricoes : [];
            const match = arr.find(i=> i.curso_id === assessment.curso_id);
            if(!match || match.status !== 'CONCLUIDO') throw new HttpError(409,'course_not_completed');
        } else {
          // Se o serviço não responde 200, tratamos como bloqueio conservador
          throw new HttpError(502,'progress_service_unavailable');
        }
      } catch(err){
        if(err instanceof HttpError) throw err;
        throw new HttpError(502,'progress_lookup_failed');
      }
    }
    // Regra de tentativas e recuperação
    const attempts = await listAttemptsForUser(assessment.codigo, userId);
    const finalizadas = attempts.filter(a=> ['APROVADO','REPROVADO','PENDENTE_REVISAO','EXPIRADA'].includes(a.status));
    const aprovadas = finalizadas.filter(a=> a.status==='APROVADO');
    if(aprovadas.length>0) throw new HttpError(409,'already_passed');
    const tentativasPermitidas = assessment.tentativas_permitidas || 1;
    const regularesUsadas = finalizadas.length;
    const menorNota = finalizadas.length? Math.min(...finalizadas.filter(a=> a.nota!==null).map(a=> a.nota as number).concat([Infinity])): null;
    const podeRecuperacao = (menorNota!==null && menorNota < 70) || (finalizadas.length>0 && finalizadas.every(a=> (a.nota??0) < 70));
    let isRecovery = false;
    if(regularesUsadas >= tentativasPermitidas){
      // só permite se ainda não houve uma tentativa de recuperação
      const jaRecuperacao = attempts.some(a=> a.isRecovery);
      if(!jaRecuperacao && podeRecuperacao){
        isRecovery = true;
      } else {
        throw new HttpError(409,'attempt_limit_reached');
      }
    }
    const started = await startAttempt(assessment.codigo, userId, assessment.tempo_limite||null, isRecovery? 'EM_ANDAMENTO_RECUPERACAO':'EM_ANDAMENTO');
    res.status(201).json({ attemptId: started.id, assessment: assessment.codigo, startedAt: started.data_inicio, deadline: started.deadline, recovery:isRecovery });
  } catch(e){ next(e); }
}

// Novos handlers para CRUD completo de tentativas
export async function createAttemptHandler(req: Request, res: Response) {
  try {
    const { funcionario_id, avaliacao_id, status } = req.body;
    
    if (!funcionario_id || !avaliacao_id) {
      return res.status(400).json({ 
        erro: 'dados_obrigatorios', 
        mensagem: 'funcionario_id e avaliacao_id são obrigatórios' 
      });
    }

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

export async function updateAttemptHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const updated = await attemptRepository.updateAttempt(id, updateData);
    
    if (!updated) {
      return res.status(404).json({ 
        erro: 'tentativa_nao_encontrada', 
        mensagem: 'Tentativa não encontrada ou nenhum dado para atualizar' 
      });
    }

    const attempt = await attemptRepository.findAttemptById(id);
    
    return res.json({
      tentativa: attempt,
      mensagem: 'Tentativa atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function deleteAttemptHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const deleted = await attemptRepository.deleteAttempt(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        erro: 'tentativa_nao_encontrada', 
        mensagem: 'Tentativa não encontrada' 
      });
    }

    return res.json({
      mensagem: 'Tentativa deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function finalizeAttemptHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nota_obtida, status } = req.body;
    
    const updated = await attemptRepository.updateAttempt(id, {
      data_fim: new Date(),
      nota_obtida,
      status: status || 'FINALIZADA'
    });
    
    if (!updated) {
      return res.status(404).json({ 
        erro: 'tentativa_nao_encontrada', 
        mensagem: 'Tentativa não encontrada' 
      });
    }

    const attempt = await attemptRepository.findAttemptById(id);
    
    return res.json({
      tentativa: attempt,
      mensagem: 'Tentativa finalizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao finalizar tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}
