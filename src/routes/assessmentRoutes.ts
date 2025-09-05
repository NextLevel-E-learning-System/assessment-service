import { Router } from 'express';
import { createAssessmentHandler, getAssessmentHandler } from '../controllers/assessmentController.js';
import { submitAssessmentHandler } from '../controllers/submitController.js';
export const assessmentRouter = Router();
assessmentRouter.post('/', createAssessmentHandler);
assessmentRouter.get('/:codigo', getAssessmentHandler);
assessmentRouter.post('/:codigo/submit', submitAssessmentHandler);
