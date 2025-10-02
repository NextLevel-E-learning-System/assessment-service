// OpenAPI Specification mínima contendo apenas os endpoints realmente implementados em assessmentRoutes.ts
export const openapiSpec = {
  openapi: '3.0.3',
  info: { title: 'Assessment Service API', version: '1.9.0', description: 'Spec mínima somente com endpoints presentes em assessmentRoutes.ts' },
  tags: [
    { name: 'Assessment - Avaliações', description: 'CRUD de avaliações' },
    { name: 'Assessment - Questões', description: 'CRUD de questões' },
    { name: 'Assessment - Fluxos Consolidados', description: 'Fluxos completos (start, submit, review, history, pending)' }
  ],
  paths: {
    '/assessments/v1': {
      post: { summary: 'Criar avaliação', tags: ['Assessment - Avaliações'] },
      get: { summary: 'Listar avaliações', tags: ['Assessment - Avaliações'] }
    },
    '/assessments/v1/{codigo}': {
      get: { summary: 'Obter avaliação', tags: ['Assessment - Avaliações'] },
      put: { summary: 'Atualizar avaliação', tags: ['Assessment - Avaliações'] },
      delete: { summary: 'Inativar avaliação', tags: ['Assessment - Avaliações'] }
    },
    '/assessments/v1/{codigo}/complete': {
      get: { summary: 'Obter avaliação completa (com questões)', tags: ['Assessment - Avaliações'] }
    },
    '/assessments/v1/{codigo}/questions': {
      post: { summary: 'Adicionar questão', tags: ['Assessment - Questões'] },
      get: { summary: 'Listar questões', tags: ['Assessment - Questões'] }
    },
    '/assessments/v1/{codigo}/questions/{id}': {
      put: { summary: 'Atualizar questão', tags: ['Assessment - Questões'] },
      delete: { summary: 'Remover questão', tags: ['Assessment - Questões'] }
    },
    '/assessments/v1/{codigo}/start-complete': {
      post: { summary: 'Iniciar avaliação completa', tags: ['Assessment - Fluxos Consolidados'] }
    },
    '/assessments/v1/submit-complete': {
      post: { summary: 'Submeter avaliação completa', tags: ['Assessment - Fluxos Consolidados'] }
    },
    '/assessments/v1/attempts/{id}/review-complete': {
      get: { summary: 'Buscar tentativa para revisão', tags: ['Assessment - Fluxos Consolidados'] }
    },
    '/assessments/v1/attempts/{id}/finalize-review': {
      post: { summary: 'Finalizar revisão', tags: ['Assessment - Fluxos Consolidados'] }
    },
    '/assessments/v1/users/{funcionario_id}/history': {
      get: { summary: 'Histórico de tentativas do usuário', tags: ['Assessment - Fluxos Consolidados'] }
    },
    '/assessments/v1/reviews/pending': {
      get: { summary: 'Fila de correções pendentes', tags: ['Assessment - Fluxos Consolidados'] }
    }
  },
  components: {
    schemas: {
      Assessment: { type: 'object', properties: { codigo: { type: 'string' }, titulo: { type: 'string' } } },
      Question: { type: 'object', properties: { id: { type: 'string' }, enunciado: { type: 'string' } } },
      ReviewCorrection: { type: 'object', properties: { resposta_id: { type: 'string' }, pontuacao: { type: 'number' } } },
      StartAssessmentResponse: { type: 'object' },
      SubmitAssessmentRequest: { type: 'object' },
      SubmitAssessmentResponse: { type: 'object' },
      AttemptReviewData: { type: 'object' },
      FinalizeReviewResponse: { type: 'object' },
      UserHistoryResponse: { type: 'object' },
      PendingReview: { type: 'object' }
    }
  }
} as const;
