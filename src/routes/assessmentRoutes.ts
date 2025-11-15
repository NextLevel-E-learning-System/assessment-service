import { Router } from 'express';
import { 
  createAssessmentHandler, 
  getModuleAssessmentHandler,
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
  getActiveAttemptHandler
} from '../controllers/assessmentFlowController.js';
import {
  listPendingReviewsHandler
} from '../controllers/reviewController.js';

export const assessmentRouter = Router();

// ===== GESTÃO DE AVALIAÇÕES =====
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/', listAssessmentsHandler);
assessmentRouter.put('/:codigo', updateAssessmentHandler); 
assessmentRouter.delete('/:codigo', deleteAssessmentHandler); 

// ===== GESTÃO DE QUESTÕES =====
assessmentRouter.post('/:codigo/questions', addQuestionHandler); 
assessmentRouter.get('/:codigo/questions', listQuestionsHandler);
assessmentRouter.put('/:codigo/questions/:id', updateQuestionHandler);
assessmentRouter.delete('/:codigo/questions/:id', deleteQuestionHandler);

// ===== FLUXOS CONSOLIDADOS v1.8.0 ⭐ =====
// Buscar avaliação de um módulo (sem resposta correta nas questões)
assessmentRouter.get('/module/:modulo_id/for-student', getModuleAssessmentHandler);

// Buscar tentativa ativa (em andamento)
assessmentRouter.get('/:codigo/active-attempt', getActiveAttemptHandler);

// Buscar histórico de tentativas do usuário para uma avaliação específica
assessmentRouter.get('/:codigo/my-attempts', async (req, res, next) => {
  try {
    const { codigo } = req.params;
    const funcionario_id = req.headers['x-user-id'] as string;
    
    if (!funcionario_id) {
      return res.status(400).json({ success: false, error: 'missing_user_id' });
    }

    const { withClient } = await import('../db.js');
    const tentativas = await withClient(async c => {
      const result = await c.query(
        `SELECT id, avaliacao_id, funcionario_id, data_inicio, data_fim, 
                nota_obtida, status, criado_em
         FROM assessment_service.tentativas
         WHERE avaliacao_id = $1 AND funcionario_id = $2
         ORDER BY criado_em DESC`,
        [codigo, funcionario_id]
      );
      return result.rows;
    });

    res.json({ success: true, data: tentativas });
  } catch (e) {
    next(e);
  }
});

// Inicia avaliação com TODOS os dados necessários
assessmentRouter.post('/:codigo/start-complete', startCompleteAssessmentHandler);

// Submete avaliação completa processando todas as respostas
assessmentRouter.post('/submit-complete', submitCompleteAssessmentHandler);

// Busca tentativa completa para revisão
assessmentRouter.get('/attempts/:id/review-complete', getAttemptForReviewHandler);

// Finaliza revisão aplicando todas as correções
assessmentRouter.post('/attempts/:id/finalize-review', finalizeReviewHandler);

// Fila de correções pendentes
assessmentRouter.get('/reviews/pending', listPendingReviewsHandler);
