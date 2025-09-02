import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { z } from 'zod';
import { withClient } from './db.js';
 
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export function createServer() {
  const app = express();
  app.use(express.json());
  app.use(cors({ origin: '*'}));
  app.use((req, _res, next) => { (req as any).log = logger; next(); });

  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', (_req, res) => res.json({ status: 'ok' }));

  app.post('/assessments/v1', async (req, res) => {
    const schema = z.object({ codigo: z.string(), curso_id: z.string(), titulo: z.string(), tempo_limite: z.number().int().positive().optional(), tentativas_permitidas: z.number().int().positive().optional(), nota_minima: z.number().positive().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'validation_error', details: parsed.error.issues });
    try {
      await withClient(c => c.query('insert into avaliacoes (codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, ativo) values ($1,$2,$3,$4,$5,$6,true)', [parsed.data.codigo, parsed.data.curso_id, parsed.data.titulo, parsed.data.tempo_limite || null, parsed.data.tentativas_permitidas || null, parsed.data.nota_minima || null]));
      res.status(201).json({ codigo: parsed.data.codigo });
    } catch (err:any) {
      if (err.code === '23505') return res.status(409).json({ error: 'duplicado' });
      logger.error({ err }, 'create_assessment_failed');
      res.status(500).json({ error: 'internal_error' });
    }
  });

  app.get('/assessments/v1/:codigo', async (req, res) => {
    try {
      const row = await withClient(async c => {
        const r = await c.query('select codigo, curso_id, titulo, tempo_limite, tentativas_permitidas, nota_minima, ativo from avaliacoes where codigo=$1', [req.params.codigo]);
        return r.rows[0];
      });
      if (!row) return res.status(404).json({ error: 'nao_encontrado' });
      res.json(row);
    } catch (err:any) {
      logger.error({ err }, 'get_assessment_failed');
      res.status(500).json({ error: 'internal_error' });
    }
  });

  return app;
}