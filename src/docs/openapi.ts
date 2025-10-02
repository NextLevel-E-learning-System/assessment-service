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
      post: {
        summary: 'Criar avaliação',
        tags: ['Assessment - Avaliações'],
        responses: {
          201: {
            description: 'Avaliação criada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    avaliacao: { $ref: '#/components/schemas/Assessment' },
                    mensagem: { type: 'string' }
                  }
                }
              }
            }
          },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Código já existe', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          500: { description: 'Erro interno' }
        }
      },
      get: {
        summary: 'Listar avaliações',
        tags: ['Assessment - Avaliações'],
        responses: {
          200: {
            description: 'Lista de avaliações',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    avaliacoes: { type: 'array', items: { $ref: '#/components/schemas/Assessment' } },
                    total: { type: 'integer' }
                  }
                }
              }
            }
          },
          500: { description: 'Erro interno' }
        }
      }
    },
    '/assessments/v1/{codigo}': {
      get: {
        summary: 'Obter avaliação',
        tags: ['Assessment - Avaliações'],
        responses: {
          200: { description: 'Avaliação encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Assessment' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        summary: 'Atualizar avaliação',
        tags: ['Assessment - Avaliações'],
        responses: {
          200: { description: 'Avaliação atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Assessment' } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      delete: {
        summary: 'Inativar avaliação',
        tags: ['Assessment - Avaliações'],
        responses: {
          204: { description: 'Inativada (sem conteúdo)' },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/{codigo}/complete': {
      get: {
        summary: 'Obter avaliação completa (com questões)',
        tags: ['Assessment - Avaliações'],
        responses: {
          200: { description: 'Avaliação completa', content: { 'application/json': { schema: { $ref: '#/components/schemas/AssessmentComplete' } } } },
          404: { description: 'Não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/{codigo}/questions': {
      post: {
        summary: 'Adicionar questão',
        tags: ['Assessment - Questões'],
        responses: {
          201: { description: 'Questão criada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Avaliação não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      get: {
        summary: 'Listar questões',
        tags: ['Assessment - Questões'],
        responses: {
          200: { description: 'Lista de questões', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Question' } } } } },
          404: { description: 'Avaliação não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/{codigo}/questions/{id}': {
      put: {
        summary: 'Atualizar questão',
        tags: ['Assessment - Questões'],
        responses: {
          200: { description: 'Questão atualizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } } },
          400: { description: 'Dados inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Questão ou avaliação não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      delete: {
        summary: 'Remover questão',
        tags: ['Assessment - Questões'],
        responses: {
          204: { description: 'Removida (sem conteúdo)' },
          404: { description: 'Questão ou avaliação não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/{codigo}/start-complete': {
      post: {
        summary: 'Iniciar avaliação completa',
        tags: ['Assessment - Fluxos Consolidados'],
        responses: {
          200: { description: 'Tentativa iniciada', content: { 'application/json': { schema: { $ref: '#/components/schemas/StartAssessmentResponse' } } } },
          400: { description: 'Fluxo inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Avaliação não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/submit-complete': {
      post: {
        summary: 'Submeter avaliação completa',
        tags: ['Assessment - Fluxos Consolidados'],
        responses: {
          200: { description: 'Submissão processada', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitAssessmentResponse' } } } },
          400: { description: 'Dados inválidos / tentativa inválida', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Tentativa ou avaliação não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/attempts/{id}/review-complete': {
      get: {
        summary: 'Buscar tentativa para revisão',
        tags: ['Assessment - Fluxos Consolidados'],
        responses: {
          200: { description: 'Dados para revisão', content: { 'application/json': { schema: { $ref: '#/components/schemas/AttemptReviewData' } } } },
          404: { description: 'Tentativa não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/attempts/{id}/finalize-review': {
      post: {
        summary: 'Finalizar revisão',
        tags: ['Assessment - Fluxos Consolidados'],
        responses: {
          200: { description: 'Revisão finalizada', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinalizeReviewResponse' } } } },
          400: { description: 'Correções inválidas', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Tentativa não encontrada', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Estado da tentativa não permite finalizar', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/users/{funcionario_id}/history': {
      get: {
        summary: 'Histórico de tentativas do usuário',
        tags: ['Assessment - Fluxos Consolidados'],
        responses: {
          200: { description: 'Histórico retornado', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserHistoryResponse' } } } },
          404: { description: 'Sem histórico / usuário não encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      }
    },
    '/assessments/v1/reviews/pending': {
      get: {
        summary: 'Fila de correções pendentes',
        tags: ['Assessment - Fluxos Consolidados'],
        responses: {
          200: { description: 'Lista de revisões pendentes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PendingReview' } } } } }
        }
      }
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
      PendingReview: { type: 'object' },
      AssessmentComplete: {
        type: 'object',
        properties: {
          avaliacao: { $ref: '#/components/schemas/Assessment' },
          questoes: { type: 'array', items: { $ref: '#/components/schemas/Question' } }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          erro: { type: 'string' },
          mensagem: { type: 'string' }
        }
      }
    }
  }
} as const;
