import { Router } from 'express';
import { 
  createAssessmentHandler, 
  getAssessmentHandler, 
  listAssessmentsHandler,
  updateAssessmentHandler,
  deleteAssessmentHandler,
  addQuestionHandler, 
  listQuestionsHandler, 
  addAlternativeHandler, 
  listAlternativesHandler 
} from '../controllers/assessmentController.js';
import { submitAssessmentHandler } from '../controllers/submitController.js';
import { 
  startAttemptHandler, 
  createAttemptHandler, 
  getAttemptHandler, 
  listAttemptsByUserHandler, 
  listAttemptsByAssessmentHandler
  // REMOVIDO: updateAttemptHandler, deleteAttemptHandler, finalizeAttemptHandler
} from '../controllers/attemptController.js';
import { 
  createAnswerHandler, 
  upsertAnswerHandler, 
  getAnswerHandler, 
  listAnswersByAttemptHandler, 
  listAnswersByQuestionHandler, 
  getAttemptStatisticsHandler,
  calculateAttemptScoreHandler
  // REMOVIDO: updateAnswerHandler, deleteAnswerHandler
} from '../controllers/answerController.js';
import { listDissertativeHandler, reviewAttemptHandler } from '../controllers/reviewController.js';

export const assessmentRouter = Router();

// ===== ROTAS DE AVALIAÇÕES =====
// Validação de edição controlada pelo FRONTEND baseada em 'total_inscricoes' do course service
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/', listAssessmentsHandler); // Lista com filtro por curso_id
assessmentRouter.get('/:codigo', getAssessmentHandler);
assessmentRouter.put('/:codigo', updateAssessmentHandler); // Frontend bloqueia se total_inscricoes > 0
assessmentRouter.delete('/:codigo', deleteAssessmentHandler); // Frontend bloqueia se total_inscricoes > 0

// ===== ROTAS DE QUESTÕES =====
// Validação de edição controlada pelo FRONTEND baseada em 'total_inscricoes' do course service
assessmentRouter.post('/:codigo/questions', addQuestionHandler); // Frontend bloqueia se total_inscricoes > 0
assessmentRouter.get('/:codigo/questions', listQuestionsHandler);

// ===== ROTAS DE ALTERNATIVAS =====
// Validação de edição controlada pelo FRONTEND baseada em 'total_inscricoes' do course service
assessmentRouter.post('/questions/:questaoId/alternatives', addAlternativeHandler); // Frontend bloqueia se total_inscricoes > 0
assessmentRouter.get('/questions/:questaoId/alternatives', listAlternativesHandler);

// ===== ROTAS DE TENTATIVAS =====
// APENAS LEITURA E CRIAÇÃO - TENTATIVAS NÃO PODEM SER EDITADAS OU DELETADAS

// Início de tentativa controlado (com regras de negócio)
assessmentRouter.post('/:codigo/attempts/start', startAttemptHandler);

// CRUD de tentativas - APENAS CREATE e READ
assessmentRouter.post('/attempts', createAttemptHandler);
assessmentRouter.get('/attempts/:id', getAttemptHandler);
// REMOVIDO: PUT, DELETE, FINALIZE

// Listagem de tentativas
assessmentRouter.get('/users/:funcionario_id/attempts', listAttemptsByUserHandler);
assessmentRouter.get('/avaliacoes/:avaliacao_id/attempts', listAttemptsByAssessmentHandler);

// ===== ROTAS DE RESPOSTAS =====
// APENAS LEITURA E CRIAÇÃO - RESPOSTAS NÃO PODEM SER EDITADAS OU DELETADAS

assessmentRouter.post('/answers', createAnswerHandler);
assessmentRouter.post('/answers/upsert', upsertAnswerHandler); // Permitido para salvar rascunhos durante tentativa
assessmentRouter.get('/answers/:id', getAnswerHandler);
// REMOVIDO: PUT, DELETE

// Listagem de respostas
assessmentRouter.get('/attempts/:tentativa_id/answers', listAnswersByAttemptHandler);
assessmentRouter.get('/questions/:questao_id/answers', listAnswersByQuestionHandler);

// ===== ROTAS DE ESTATÍSTICAS =====
assessmentRouter.get('/attempts/:tentativa_id/statistics', getAttemptStatisticsHandler);
assessmentRouter.get('/attempts/:tentativa_id/score', calculateAttemptScoreHandler);

// ===== ROTAS DE SUBMISSÃO E REVISÃO =====
assessmentRouter.post('/:codigo/submit', submitAssessmentHandler);
assessmentRouter.get('/attempts/:attemptId/dissertative', listDissertativeHandler);
assessmentRouter.patch('/attempts/:attemptId/review', reviewAttemptHandler);
