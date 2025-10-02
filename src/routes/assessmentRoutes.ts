import { Router } from 'express';
import { 
  createAssessmentHandler, 
  getAssessmentHandler, 
  listAssessmentsHandler,
  updateAssessmentHandler,
  deleteAssessmentHandler,
  addQuestionHandler, 
  listQuestionsHandler
  // REMOVIDO: addAlternativeHandler, listAlternativesHandler
} from '../controllers/assessmentController.js';
import { submitAssessmentHandler } from '../controllers/submitController.js';
import { 
  startAttemptHandler, 
  getAttemptHandler, 
  listAttemptsByUserHandler
  // REMOVIDO: createAttemptHandler, listAttemptsByAssessmentHandler (redundantes)
} from '../controllers/attemptController.js';
import { 
  upsertAnswerHandler, 
  listAnswersByAttemptHandler
  // REMOVIDO: createAnswerHandler (redundante com upsert), getAnswerHandler, listAnswersByQuestionHandler, getAttemptStatisticsHandler, calculateAttemptScoreHandler (desnecessários para frontend)
} from '../controllers/answerController.js';
import { 
  listDissertativeHandler, 
  reviewAttemptHandler,
  getAnswerFeedbackHandler,
  listPendingReviewsHandler
} from '../controllers/reviewController.js';

export const assessmentRouter = Router();

// ===== ROTAS PRINCIPAIS DE AVALIAÇÕES =====
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/', listAssessmentsHandler); // Lista com filtro por curso_id
assessmentRouter.get('/:codigo', getAssessmentHandler);
assessmentRouter.put('/:codigo', updateAssessmentHandler); 
assessmentRouter.delete('/:codigo', deleteAssessmentHandler); 

// ===== ROTAS DE QUESTÕES (COM ALTERNATIVAS INCLUÍDAS) =====
assessmentRouter.post('/:codigo/questions', addQuestionHandler); 
assessmentRouter.get('/:codigo/questions', listQuestionsHandler); // Agora inclui alternativas automaticamente

// ===== ROTAS DE TENTATIVAS SIMPLIFICADAS =====
// Início de tentativa controlado (com regras de negócio)
assessmentRouter.post('/:codigo/attempts/start', startAttemptHandler);
assessmentRouter.get('/attempts/:id', getAttemptHandler);
assessmentRouter.get('/users/:funcionario_id/attempts', listAttemptsByUserHandler);

// ===== ROTAS DE RESPOSTAS SIMPLIFICADAS =====
assessmentRouter.post('/answers/upsert', upsertAnswerHandler); // Único endpoint necessário para salvar respostas
assessmentRouter.get('/attempts/:tentativa_id/answers', listAnswersByAttemptHandler);

// ===== SUBMISSÃO E CORREÇÃO =====
assessmentRouter.post('/:codigo/submit', submitAssessmentHandler);

// ===== CORREÇÃO DISSERTATIVA (R16) =====
assessmentRouter.get('/attempts/:attemptId/dissertative', listDissertativeHandler);
assessmentRouter.patch('/attempts/:attemptId/review', reviewAttemptHandler);
assessmentRouter.get('/answers/:respostaId/feedback', getAnswerFeedbackHandler);
assessmentRouter.get('/reviews/pending', listPendingReviewsHandler);
