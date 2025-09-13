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
  const openapiSpec = loadOpenApi('Assessment Service API');
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
  app.use('/assessments/v1', assessmentRouter);
  app.use(errorHandler);
  return app;
}