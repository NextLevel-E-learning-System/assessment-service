import { insertAssessment, findByCodigo } from '../repositories/assessmentRepository.js';
import { HttpError } from '../utils/httpError.js';
export async function createAssessment(d:any){ try { await insertAssessment(d); return { codigo:d.codigo }; } catch(err:any){ if(err.code==='23505') throw new HttpError(409,'duplicado'); throw err; } }
export async function getAssessment(codigo:string){ const a = await findByCodigo(codigo); if(!a) throw new HttpError(404,'nao_encontrado'); return a; }
