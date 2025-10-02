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
