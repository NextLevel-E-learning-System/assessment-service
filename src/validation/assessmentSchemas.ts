import { z } from 'zod';

export const createAssessmentSchema = z.object({
  codigo: z.string(),
  curso_id: z.string(),
  titulo: z.string(),
  tempo_limite: z.number().int().positive().optional(),
  tentativas_permitidas: z.number().int().positive().optional(),
  nota_minima: z.number().positive().optional(),
  modulo_id: z.string().uuid()
});

export const updateAssessmentSchema = z.object({
  titulo: z.string().optional(),
  tempo_limite: z.number().int().positive().optional(),
  tentativas_permitidas: z.number().int().positive().optional(),
  nota_minima: z.number().positive().optional(),
  ativo: z.boolean().optional()
});
