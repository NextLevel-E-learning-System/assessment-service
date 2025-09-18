import express from 'express';
import cors from 'cors';
import { loadOpenApi } from './config/openapi.js';
import { logger } from './config/logger.js';
import { assessmentRouter } from './routes/assessmentRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
export function createServer(){
  const app = express();
  app.use(express.json());
  app.use(cors({origin:'*'}));
  app.use((req,_res,next)=>{ (req as any).log = logger; next(); });
  app.get('/openapi.json', async (_req, res) => {
    try {
      const openapiSpec = await loadOpenApi('Assessment Service API');
      res.json(openapiSpec);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load OpenAPI spec' });
    }
  });
  app.use('/assessments/v1', assessmentRouter);
  app.use(errorHandler);
  return app;
}