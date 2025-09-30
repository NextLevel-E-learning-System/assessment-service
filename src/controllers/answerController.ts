import { Request, Response } from 'express';
import * as answerRepository from '../repositories/answerRepository.js';

export async function createAnswerHandler(req: Request, res: Response) {
  try {
    const { tentativa_id, questao_id, resposta_funcionario, pontuacao, feedback } = req.body;
    
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
      pontuacao,
      feedback
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
    const { tentativa_id, questao_id, resposta_funcionario, pontuacao, feedback } = req.body;
    
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
      pontuacao,
      feedback
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

export async function calculateAttemptScoreHandler(req: Request, res: Response) {
  try {
    const { tentativa_id } = req.params;
    
    // USANDO answerRepository diretamente - lógica consolidada
    const answers = await answerRepository.findAnswersByAttempt(tentativa_id);
    
    if (answers.length === 0) {
      return res.status(404).json({
        erro: 'nenhuma_resposta',
        mensagem: 'Nenhuma resposta encontrada para esta tentativa'
      });
    }

    let pontuacao_total = 0;
    let questoes_total = 0;
    
    for (const answer of answers) {
      if (answer.pontuacao !== null) {
        pontuacao_total += answer.pontuacao;
      }
      questoes_total++;
    }
    
    const nota_percentual = questoes_total > 0 ? (pontuacao_total / questoes_total) * 100 : 0;
    
    return res.json({
      tentativa_id,
      pontuacao_total,
      questoes_total,
      nota_percentual: Math.round(nota_percentual * 100) / 100, // 2 casas decimais
      mensagem: 'Nota calculada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao calcular nota da tentativa:', error);
    return res.status(500).json({ 
      erro: 'erro_interno', 
      mensagem: 'Erro interno do servidor' 
    });
  }
}