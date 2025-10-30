import { z } from 'zod';

// Schemas para tentativas
export const createAttemptSchema = z.object({
  funcionario_id: z.string().uuid('ID do funcionário deve ser um UUID válido'),
  avaliacao_id: z.string().min(1, 'ID da avaliação é obrigatório'),
  status: z.enum(['EM_ANDAMENTO','APROVADO', 'REPROVADO', 'AGUARDANDO_CORRECAO']).optional()
});

export const updateAttemptSchema = z.object({
  data_fim: z.string().datetime().optional(),
  nota_obtida: z.number().min(0).max(10).optional(),
  status: z.enum([ 'EM_ANDAMENTO', 'APROVADO', 'REPROVADO', 'AGUARDANDO_CORRECAO']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização'
});

export const finalizeAttemptSchema = z.object({
  nota_obtida: z.number().min(0).max(10).optional(),
  status: z.enum(['APROVADO', 'REPROVADO']).optional()
});

// Schemas para respostas
export const createAnswerSchema = z.object({
  tentativa_id: z.string().uuid('ID da tentativa deve ser um UUID válido'),
  questao_id: z.string().uuid('ID da questão deve ser um UUID válido'),
  resposta_funcionario: z.string().min(1, 'Resposta do funcionário é obrigatória'),
  pontuacao: z.number().min(0).optional()
});

export const updateAnswerSchema = z.object({
  resposta_funcionario: z.string().min(1).optional(),
  pontuacao: z.number().min(0).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Pelo menos um campo deve ser fornecido para atualização'
});

export const upsertAnswerSchema = createAnswerSchema;

// Schemas para submissão
export const submissionAnswerSchema = z.object({
  questao_id: z.string().uuid('ID da questão deve ser um UUID válido'),
  resposta: z.string().min(1, 'Resposta é obrigatória')
});

export const submitAssessmentSchema = z.object({
  userId: z.string().uuid('ID do usuário deve ser um UUID válido'),
  attemptId: z.string().uuid('ID da tentativa deve ser um UUID válido'),
  respostas: z.array(submissionAnswerSchema).min(1, 'Pelo menos uma resposta deve ser fornecida')
});

// Schemas para revisão
export const reviewScoreSchema = z.object({
  respostaId: z.string().uuid('ID da resposta deve ser um UUID válido'),
  pontuacao: z.number().min(0, 'Pontuação deve ser maior ou igual a 0')
});

export const reviewAttemptSchema = z.object({
  notaMinima: z.number().min(0).max(10).optional(),
  scores: z.array(reviewScoreSchema).min(1, 'Pelo menos uma pontuação deve ser fornecida')
});

// Schemas para consultas
export const attemptQuerySchema = z.object({
  avaliacao_id: z.string().optional()
});

export const assessmentQuerySchema = z.object({
  curso_id: z.string().optional(),
  ativo: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

// Types derivados dos schemas
export type CreateAttemptInput = z.infer<typeof createAttemptSchema>;
export type UpdateAttemptInput = z.infer<typeof updateAttemptSchema>;
export type FinalizeAttemptInput = z.infer<typeof finalizeAttemptSchema>;
export type CreateAnswerInput = z.infer<typeof createAnswerSchema>;
export type UpdateAnswerInput = z.infer<typeof updateAnswerSchema>;
export type UpsertAnswerInput = z.infer<typeof upsertAnswerSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
export type ReviewAttemptInput = z.infer<typeof reviewAttemptSchema>;
export type AttemptQueryInput = z.infer<typeof attemptQuerySchema>;
export type AssessmentQueryInput = z.infer<typeof assessmentQuerySchema>;