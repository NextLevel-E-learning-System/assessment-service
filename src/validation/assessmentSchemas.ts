import { z } from 'zod';
export const createAssessmentSchema = z.object({ codigo:z.string(), curso_id:z.string(), titulo:z.string(), tempo_limite:z.number().int().positive().optional(), tentativas_permitidas:z.number().int().positive().optional(), nota_minima:z.number().positive().optional() });
