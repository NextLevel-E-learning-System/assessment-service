import { Router } from 'express';
import { createAssessmentHandler, getAssessmentHandler } from '../controllers/assessmentController.js';
export const assessmentRouter = Router();
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/:codigo', getAssessmentHandler);
