import { Request, Response } from 'express';
import { 
  listDissertativeAnswers, 
  applyReview, 
  finalizeReviewedAttempt,
  getAnswerFeedback,
  listPendingReviews
} from '../repositories/reviewRepository.js';
import { findAttemptById } from '../repositories/attemptRepository.js';
import { publishEvent } from '../config/rabbitmq.js';

// GET /assessments/v1/attempts/:attemptId/dissertative
export async function listDissertativeHandler(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    
    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json({ 
        erro: 'tentativa_nao_encontrada',
        mensagem: 'Tentativa não encontrada' 
      });
    }
    
    if (attempt.status !== 'AGUARDANDO_CORRECAO') {
      return res.status(409).json({ 
        erro: 'status_invalido',
        mensagem: 'Tentativa não está pendente de revisão' 
      });
    }
    
    const answers = await listDissertativeAnswers(attemptId);
    
    return res.json({ 
      tentativa_id: attemptId, 
      respostas_dissertativas: answers,
      total: answers.length,
      mensagem: 'Respostas dissertativas listadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar respostas dissertativas:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

// PATCH /assessments/v1/attempts/:attemptId/review
export async function reviewAttemptHandler(req: Request, res: Response) {
  try {
    const { attemptId } = req.params;
    const { scores, notaMinima = 70 } = req.body as { 
      scores: { respostaId: string; pontuacao: number; feedback?: string }[]; 
      notaMinima?: number; 
    };
    
    const revisorId = req.headers['x-user-id'] as string;
    if (!revisorId) {
      return res.status(400).json({
        erro: 'revisor_obrigatorio',
        mensagem: 'ID do revisor é obrigatório (header x-user-id)'
      });
    }
    
    if (!Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        erro: 'scores_obrigatorio',
        mensagem: 'scores é obrigatório e deve conter pelo menos uma pontuação'
      });
    }
    
    const attempt = await findAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json({ 
        erro: 'tentativa_nao_encontrada',
        mensagem: 'Tentativa não encontrada' 
      });
    }
    
    if (attempt.status !== 'AGUARDANDO_CORRECAO') {
      return res.status(409).json({ 
        erro: 'status_invalido',
        mensagem: 'Tentativa não está pendente de revisão' 
      });
    }
    
    // Aplicar notas e feedback (simplificado)
    await applyReview(attemptId, scores);
    
    // Finalizar tentativa e publicar eventos
    const final = await finalizeReviewedAttempt(attemptId, notaMinima);
    
    if (final) {
      // Publicar evento após correção dissertativa completa
      const { findByCodigo } = await import('../repositories/assessmentRepository.js');
      
      const assessment = await findByCodigo(final.avaliacao_id);
      if (assessment) {
        const payload = {
          assessmentCode: assessment.codigo,
          courseId: assessment.curso_id,
          courseTitle: assessment.curso_titulo ?? assessment.curso_id,
          userId: final.funcionario_id,
          score: final.nota,
          passed: final.aprovado
        };
        await publishEvent(final.aprovado ? 'assessment.passed.v1' : 'assessment.failed.v1', payload);
      }
    }
    
    return res.json({ 
      tentativa_id: attemptId, 
      nota: final?.nota, 
      aprovado: final?.aprovado,
      total_scores_aplicados: scores.length,
      mensagem: 'Revisão aplicada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao aplicar revisão:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function getAnswerFeedbackHandler(req: Request, res: Response) {
  try {
    const { respostaId } = req.params;
    
    const feedback = await getAnswerFeedback(respostaId);
    
    if (!feedback) {
      return res.status(404).json({
        erro: 'feedback_nao_encontrado',
        mensagem: 'Nenhum feedback encontrado para esta resposta'
      });
    }
    
    return res.json({
      resposta_id: respostaId,
      feedback: feedback,
      mensagem: 'Feedback obtido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao obter feedback da resposta:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

// GET /assessments/v1/reviews/pending
export async function listPendingReviewsHandler(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const curso_id = req.query.curso_id as string | undefined;
    
    if (limit > 100) {
      return res.status(400).json({
        erro: 'limite_excedido',
        mensagem: 'Limite máximo é 100 registros por página'
      });
    }
    
    const pendingReviews = await listPendingReviews(limit, offset, curso_id);
    
    return res.json({
      success: true,
      data: pendingReviews,
      total: pendingReviews.length,
      limit,
      offset,
      mensagem: 'Fila de correções pendentes listada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar correções pendentes:', error);
    return res.status(500).json({ 
      success: false,
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}