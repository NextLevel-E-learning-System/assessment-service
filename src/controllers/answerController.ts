import { Request, Response } from 'express';
import * as answerRepository from '../repositories/answerRepository.js';

export async function createAnswerHandler(req: Request, res: Response) {
  try {
    const { tentativa_id, questao_id, resposta_funcionario, pontuacao } = req.body;
    
    if (!tentativa_id || !questao_id || !resposta_funcionario) {
      return res.status(400).json({ 
        erro: 'dados_obrigatorios', 
        mensagem: 'tentativa_id, questao_id e resposta_funcionario são obrigatórios' 
      });
    }

    const answerId = await answerRepository.createAnswer({
      tentativa_id,
      questao_id,
      resposta_funcionario,
      pontuacao
    });

    const answer = await answerRepository.findAnswerById(answerId);

    return res.status(201).json({
      resposta: answer,
      mensagem: 'Resposta criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar resposta:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function upsertAnswerHandler(req: Request, res: Response) {
  try {
    const { tentativa_id, questao_id, resposta_funcionario, pontuacao } = req.body;
    
    if (!tentativa_id || !questao_id || !resposta_funcionario) {
      return res.status(400).json({ 
        erro: 'dados_obrigatorios', 
        mensagem: 'tentativa_id, questao_id e resposta_funcionario são obrigatórios' 
      });
    }

    const answerId = await answerRepository.upsertAnswer({
      tentativa_id,
      questao_id,
      resposta_funcionario,
      pontuacao
    });

    const answer = await answerRepository.findAnswerById(answerId);

    return res.status(200).json({
      resposta: answer,
      mensagem: 'Resposta salva com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function getAnswerHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const answer = await answerRepository.findAnswerById(id);
    
    if (!answer) {
      return res.status(404).json({ 
        erro: 'resposta_nao_encontrada', 
        mensagem: 'Resposta não encontrada' 
      });
    }

    return res.json({
      resposta: answer,
      mensagem: 'Resposta encontrada'
    });
  } catch (error) {
    console.error('Erro ao buscar resposta:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function listAnswersByAttemptHandler(req: Request, res: Response) {
  try {
    const { tentativa_id } = req.params;
    
    const answers = await answerRepository.findAnswersByAttempt(tentativa_id);
    
    return res.json({
      respostas: answers,
      total: answers.length,
      mensagem: 'Respostas da tentativa listadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar respostas da tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function listAnswersByQuestionHandler(req: Request, res: Response) {
  try {
    const { questao_id } = req.params;
    
    const answers = await answerRepository.findAnswersByQuestion(questao_id);
    
    return res.json({
      respostas: answers,
      total: answers.length,
      mensagem: 'Respostas da questão listadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao listar respostas da questão:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function updateAnswerHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { resposta_funcionario, pontuacao } = req.body;
    
    const updated = await answerRepository.updateAnswer(id, {
      resposta_funcionario,
      pontuacao
    });
    
    if (!updated) {
      return res.status(404).json({ 
        erro: 'resposta_nao_encontrada', 
        mensagem: 'Resposta não encontrada ou nenhum dado para atualizar' 
      });
    }

    const answer = await answerRepository.findAnswerById(id);
    
    return res.json({
      resposta: answer,
      mensagem: 'Resposta atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar resposta:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function deleteAnswerHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const deleted = await answerRepository.deleteAnswer(id);
    
    if (!deleted) {
      return res.status(404).json({ 
        erro: 'resposta_nao_encontrada', 
        mensagem: 'Resposta não encontrada' 
      });
    }

    return res.json({
      mensagem: 'Resposta deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar resposta:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}

export async function getAttemptStatisticsHandler(req: Request, res: Response) {
  try {
    const { tentativa_id } = req.params;
    
    const stats = await answerRepository.getAttemptStatistics(tentativa_id);
    
    return res.json({
      estatisticas: stats,
      mensagem: 'Estatísticas da tentativa obtidas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas da tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}