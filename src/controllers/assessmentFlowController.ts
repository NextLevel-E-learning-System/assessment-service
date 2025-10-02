import { Request, Response, NextFunction } from 'express';
import { 
  startCompleteAssessment, 
  submitCompleteAssessment,
  getAttemptForReview,
  applyReviewAndFinalize
} from '../services/assessmentFlowService.js';
import { HttpError } from '../utils/httpError.js';
import { z } from 'zod';

const SubmitAssessmentSchema = z.object({
  tentativa_id: z.string().uuid(),
  respostas: z.array(z.object({
    questao_id: z.string().uuid(),
    resposta_funcionario: z.string()
  }))
});

const ReviewSchema = z.object({
  correcoes: z.array(z.object({
    resposta_id: z.string().uuid(),
    pontuacao: z.number().min(0),
    feedback: z.string().optional()
  }))
});

/**
 * POST /assessments/v1/:codigo/start-complete
 * Inicia avaliação retornando TODOS os dados necessários:
 * - Tentativa criada
 * - Dados da avaliação 
 * - Questões com alternativas
 * - Histórico de tentativas
 */
export async function startCompleteAssessmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo } = req.params;
    const funcionario_id = (req.headers['x-user-id'] as string) || req.body.funcionario_id;
    
    if (!funcionario_id) {
      throw new HttpError(400, 'missing_user_id');
    }

    const result = await startCompleteAssessment(codigo, funcionario_id);
    
    res.status(201).json({
      success: true,
      message: 'Avaliação iniciada com sucesso',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /assessments/v1/submit-complete
 * Submete avaliação completa processando todas as respostas:
 * - Salva todas as respostas
 * - Calcula pontuação automática (objetivas)
 * - Atualiza status da tentativa
 * - Retorna resultado final ou status de pendência
 */
export async function submitCompleteAssessmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = SubmitAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'validation_error', parsed.error.errors);
    }

    const result = await submitCompleteAssessment(parsed.data);
    
    res.json({
      success: true,
      message: 'Avaliação submetida com sucesso',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /assessments/v1/attempts/:id/review-complete
 * Busca tentativa completa para revisão (instrutor):
 * - Dados da tentativa e aluno
 * - Todas as questões com respostas
 * - Pontuações atuais e feedbacks
 */
export async function getAttemptForReviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    
    const result = await getAttemptForReview(id);
    
    res.json({
      success: true,
      message: 'Tentativa carregada para revisão',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /assessments/v1/attempts/:id/finalize-review
 * Aplica todas as correções e finaliza revisão:
 * - Atualiza pontuações e feedbacks
 * - Recalcula nota final
 * - Atualiza status para APROVADO/REPROVADO
 */
export async function finalizeReviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const parsed = ReviewSchema.safeParse(req.body);
    
    if (!parsed.success) {
      throw new HttpError(400, 'validation_error', parsed.error.errors);
    }

    const result = await applyReviewAndFinalize(id, parsed.data.correcoes);
    
    res.json({
      success: true,
      message: 'Revisão finalizada com sucesso',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /assessments/v1/users/:funcionario_id/history
 * Histórico completo de tentativas do usuário
 */
export async function getUserAssessmentHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { funcionario_id } = req.params;
    const { curso_id } = req.query;
    
    // Implementação usando repository existente
    const { listAttemptsForUser } = await import('../repositories/submissionRepository.js');
    
    let tentativas;
    if (curso_id) {
      // Buscar tentativas de um curso específico
      const { listAssessmentsByCourse } = await import('../repositories/assessmentRepository.js');
      const avaliacoes = await listAssessmentsByCourse(curso_id as string);
      
      tentativas = [];
      for (const avaliacao of avaliacoes) {
        const tentativasAvaliacao = await listAttemptsForUser(avaliacao.codigo, funcionario_id);
        tentativas.push(...tentativasAvaliacao.map(t => ({
          ...t,
          avaliacao_titulo: avaliacao.titulo,
          curso_id: avaliacao.curso_id
        })));
      }
    } else {
      // Buscar todas as tentativas do usuário
      const { withClient } = await import('../db.js');
      tentativas = await withClient(async c => {
        const result = await c.query(
          `SELECT t.*, a.titulo as avaliacao_titulo, a.curso_id
           FROM assessment_service.tentativas t
           JOIN assessment_service.avaliacoes a ON t.avaliacao_id = a.codigo  
           WHERE t.funcionario_id = $1
           ORDER BY t.criado_em DESC`,
          [funcionario_id]
        );
        return result.rows;
      });
    }
    
    res.json({
      success: true,
      message: 'Histórico carregado com sucesso',
      data: {
        funcionario_id,
        total_tentativas: tentativas.length,
        tentativas
      }
    });
  } catch (error) {
    next(error);
  }
}