import { Router } from 'express';
import { 
  createAssessmentHandler, 
  getAssessmentHandler, 
  getAssessmentWithQuestionsHandler,
  listAssessmentsHandler,
  updateAssessmentHandler,
  deleteAssessmentHandler,
  addQuestionHandler, 
  listQuestionsHandler,
  updateQuestionHandler,
  deleteQuestionHandler
} from '../controllers/assessmentController.js';
import {
  startCompleteAssessmentHandler,
  submitCompleteAssessmentHandler,
  getAttemptForReviewHandler,
  finalizeReviewHandler,
  getUserAssessmentHistoryHandler
} from '../controllers/assessmentFlowController.js';
import {
  listPendingReviewsHandler
} from '../controllers/reviewController.js';

export const assessmentRouter = Router();

// ===== GESTÃO DE AVALIAÇÕES =====
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/', listAssessmentsHandler);
assessmentRouter.get('/:codigo', getAssessmentHandler);
assessmentRouter.get('/:codigo/complete', getAssessmentWithQuestionsHandler); // NOVO: Avaliação + questões
assessmentRouter.put('/:codigo', updateAssessmentHandler); 
assessmentRouter.delete('/:codigo', deleteAssessmentHandler); 

// ===== GESTÃO DE QUESTÕES =====
assessmentRouter.post('/:codigo/questions', addQuestionHandler); 
assessmentRouter.get('/:codigo/questions', listQuestionsHandler);
assessmentRouter.put('/:codigo/questions/:id', updateQuestionHandler);
assessmentRouter.delete('/:codigo/questions/:id', deleteQuestionHandler);

// ===== FLUXOS CONSOLIDADOS v1.8.0 ⭐ =====
// Inicia avaliação com TODOS os dados necessários
assessmentRouter.post('/:codigo/start-complete', startCompleteAssessmentHandler);

// NOVO: Buscar avaliação de um módulo para o aluno iniciar (sem resposta correta)
assessmentRouter.get('/module/:modulo_id/for-student', async (req, res, next) => {
  try {
    const { modulo_id } = req.params;
    const { withClient } = await import('../db.js');
    
    const avaliacao = await withClient(async c => {
      const result = await c.query(
        `SELECT codigo, titulo, tempo_limite, tentativas_permitidas, nota_minima, modulo_id 
         FROM assessment_service.avaliacoes 
         WHERE modulo_id = $1 AND ativo = true 
         LIMIT 1`,
        [modulo_id]
      );
      return result.rows[0] || null;
    });
    
    if (!avaliacao) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma avaliação ativa encontrada para este módulo'
      });
    }
    
    res.json({
      success: true,
      data: avaliacao
    });
  } catch (error) {
    next(error);
  }
});

// Submete avaliação completa processando todas as respostas
assessmentRouter.post('/submit-complete', submitCompleteAssessmentHandler);

// Busca tentativa completa para revisão
assessmentRouter.get('/attempts/:id/review-complete', getAttemptForReviewHandler);

// Finaliza revisão aplicando todas as correções
assessmentRouter.post('/attempts/:id/finalize-review', finalizeReviewHandler);

// Histórico completo de tentativas
assessmentRouter.get('/users/:funcionario_id/history', getUserAssessmentHistoryHandler);

// Fila de correções pendentes
assessmentRouter.get('/reviews/pending', listPendingReviewsHandler);
