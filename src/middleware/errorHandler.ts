import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';
import { logger } from '../config/logger.js';
export function errorHandler(err:any,_req:Request,res:Response,_next:NextFunction){ if(err instanceof HttpError) return res.status(err.status).json({error:err.message,details:err.details}); logger.error({err},'unhandled_error'); return res.status(500).json({error:'internal_error'}); }
