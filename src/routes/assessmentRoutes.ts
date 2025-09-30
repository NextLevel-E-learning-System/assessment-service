import { Router } from 'express';
import { createAssessmentHandler, getAssessmentHandler, addQuestionHandler, listQuestionsHandler, addAlternativeHandler, listAlternativesHandler } from '../controllers/assessmentController.js';
import { submitAssessmentHandler } from '../controllers/submitController.js';
import { 
  startAttemptHandler, 
  createAttemptHandler, 
  getAttemptHandler, 
  listAttemptsByUserHandler, 
  listAttemptsByAssessmentHandler, 
  updateAttemptHandler, 
  deleteAttemptHandler, 
  finalizeAttemptHandler 
} from '../controllers/attemptController.js';
import { 
  createAnswerHandler, 
  upsertAnswerHandler, 
  getAnswerHandler, 
  listAnswersByAttemptHandler, 
  listAnswersByQuestionHandler, 
  updateAnswerHandler, 
  deleteAnswerHandler, 
  getAttemptStatisticsHandler 
} from '../controllers/answerController.js';
import { listDissertativeHandler, reviewAttemptHandler } from '../controllers/reviewController.js';

export const assessmentRouter = Router();

// Rotas de avaliações
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/:codigo', getAssessmentHandler);

// Rotas de questões
assessmentRouter.post('/:codigo/questions', addQuestionHandler);
assessmentRouter.get('/:codigo/questions', listQuestionsHandler);

// Rotas de alternativas
assessmentRouter.post('/questions/:questaoId/alternatives', addAlternativeHandler);
assessmentRouter.get('/questions/:questaoId/alternatives', listAlternativesHandler);

// Rotas de tentativas - início controlado
assessmentRouter.post('/:codigo/attempts/start', startAttemptHandler);

// Rotas de tentativas - CRUD completo
assessmentRouter.post('/attempts', createAttemptHandler);
assessmentRouter.get('/attempts/:id', getAttemptHandler);
assessmentRouter.put('/attempts/:id', updateAttemptHandler);
assessmentRouter.delete('/attempts/:id', deleteAttemptHandler);
assessmentRouter.post('/attempts/:id/finalize', finalizeAttemptHandler);

// Rotas de listagem de tentativas
assessmentRouter.get('/users/:funcionario_id/attempts', listAttemptsByUserHandler);
assessmentRouter.get('/avaliacoes/:avaliacao_id/attempts', listAttemptsByAssessmentHandler);

// Rotas de respostas - CRUD completo
assessmentRouter.post('/answers', createAnswerHandler);
assessmentRouter.post('/answers/upsert', upsertAnswerHandler);
assessmentRouter.get('/answers/:id', getAnswerHandler);
assessmentRouter.put('/answers/:id', updateAnswerHandler);
assessmentRouter.delete('/answers/:id', deleteAnswerHandler);

// Rotas de listagem de respostas
assessmentRouter.get('/attempts/:tentativa_id/answers', listAnswersByAttemptHandler);
assessmentRouter.get('/questions/:questao_id/answers', listAnswersByQuestionHandler);

// Rotas de estatísticas
assessmentRouter.get('/attempts/:tentativa_id/statistics', getAttemptStatisticsHandler);

// Rotas de submissão e revisão
assessmentRouter.post('/:codigo/submit', submitAssessmentHandler);
assessmentRouter.get('/attempts/:attemptId/dissertative', listDissertativeHandler);
assessmentRouter.patch('/attempts/:attemptId/review', reviewAttemptHandler);
