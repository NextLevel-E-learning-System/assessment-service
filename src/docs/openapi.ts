export const openapiSpec = {
  "openapi": "3.0.3",
  "info": { 
    "title": "Assessment Service API", 
    "version": "1.8.0",
    "description": `API consolidada para gerenciamento de avaliações com fluxos otimizados.

NOVIDADES v1.8.0:
- Endpoints consolidados que eliminam múltiplas chamadas HTTP
- Fluxo completo de avaliação em 1-2 requests
- Gestão automática de tentativas, respostas e correções
- Performance otimizada para frontend

PRINCIPAIS ENDPOINTS:
- POST /{codigo}/start-complete: Inicia avaliação com todos os dados
- POST /submit-complete: Submete avaliação completa
- GET /attempts/{id}/review-complete: Revisão consolidada
- POST /attempts/{id}/finalize-review: Finaliza correção
`
  },
  "paths": {
    "/assessments/v1": { 
      "post": { 
        "summary": "Criar avaliação", 
        "tags": ["assessments"], 
        "requestBody": { 
          "required": true, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "required": ["codigo", "curso_id", "titulo"], 
                "properties": { 
                  "codigo": { "type": "string" }, 
                  "curso_id": { "type": "string" }, 
                  "titulo": { "type": "string" }, 
                  "tempo_limite": { "type": "integer" }, 
                  "tentativas_permitidas": { "type": "integer" }, 
                  "nota_minima": { "type": "number" },
                  "modulo_id": { "type": "string", "format": "uuid" }
                } 
              } 
            } 
          } 
        }, 
        "responses": { 
          "201": { 
            "description": "Avaliação criada", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "avaliacao": { "$ref": "#/components/schemas/Assessment" }, 
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "409": { 
            "description": "Código duplicado", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      },
      "get": {
        "summary": "Listar avaliações",
        "tags": ["assessments"],
        "parameters": [
          { "name": "curso_id", "in": "query", "schema": { "type": "string" } },
          { "name": "ativo", "in": "query", "schema": { "type": "boolean" } }
        ],
        "responses": {
          "200": {
            "description": "Lista de avaliações",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "avaliacoes": { "type": "array", "items": { "$ref": "#/components/schemas/Assessment" } },
                    "total": { "type": "integer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/{codigo}": { 
      "get": { 
        "summary": "Obter avaliação", 
        "tags": ["assessments"], 
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }], 
        "responses": { 
          "200": { 
            "description": "Avaliação encontrada", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "avaliacao": { "$ref": "#/components/schemas/Assessment" }, 
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "404": { 
            "description": "Avaliação não encontrada", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      }, 
      "put": {
        "summary": "Atualizar avaliação",
        "tags": ["assessments"],
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "titulo": { "type": "string" },
                  "tempo_limite": { "type": "integer" },
                  "tentativas_permitidas": { "type": "integer" },
                  "nota_minima": { "type": "number" },
                  "ativo": { "type": "boolean" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Avaliação atualizada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "avaliacao": { "$ref": "#/components/schemas/Assessment" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Avaliação não encontrada",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Deletar avaliação",
        "tags": ["assessments"],
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }],
        "responses": {
          "200": {
            "description": "Avaliação deletada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Avaliação não encontrada",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/{codigo}/questions": { 
      "post": { 
        "summary": "Adicionar questão", 
        "tags": ["questions"], 
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }], 
        "requestBody": { 
          "required": true, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "required": ["enunciado","tipo"], 
                "properties": { 
                  "enunciado": { "type": "string" }, 
                  "tipo": { "type": "string", "enum": ["MULTIPLA_ESCOLHA","VERDADEIRO_FALSO","DISSERTATIVA"] }, 
                  "opcoes_resposta": { "type": "array", "items": { "type": "string" } }, 
                  "resposta_correta": { "type": "string" }, 
                  "peso": { "type": "number" } 
                } 
              } 
            } 
          } 
        }, 
        "responses": { 
          "201": { 
            "description": "Questão criada", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "questao": { "$ref": "#/components/schemas/Question" }, 
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "404": { 
            "description": "Avaliação não encontrada", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      }, 
      "get": { 
        "summary": "Listar questões com alternativas", 
        "description": "NOVO v1.7.0: Retorna questões com alternativas incluídas automaticamente",
        "tags": ["questions"], 
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }], 
        "responses": { 
          "200": { 
            "description": "Lista de questões com alternativas", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "array", 
                  "items": { "$ref": "#/components/schemas/QuestionWithAlternatives" }
                } 
              } 
            } 
          } 
        } 
      } 
    },
    "/assessments/v1/{codigo}/start-complete": {
      "post": {
        "summary": "Iniciar avaliação completa",
        "description": "NOVO v1.8.0: Inicia avaliação retornando TODOS os dados necessários em uma única chamada",
        "tags": ["consolidated-flows"],
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "funcionario_id": { "type": "string", "format": "uuid", "description": "ID do funcionário (opcional se enviado via header)" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Avaliação iniciada com dados completos",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" },
                    "data": { "$ref": "#/components/schemas/StartAssessmentResponse" }
                  }
                }
              }
            }
          },
          "409": {
            "description": "Conflito - já aprovado ou limite de tentativas",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/submit-complete": {
      "post": {
        "summary": "Submeter avaliação completa",
        "description": "NOVO v1.8.0: Processa todas as respostas, calcula nota e finaliza tentativa automaticamente",
        "tags": ["consolidated-flows"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/SubmitAssessmentRequest" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Avaliação processada com sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" },
                    "data": { "$ref": "#/components/schemas/SubmitAssessmentResponse" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{id}/review-complete": {
      "get": {
        "summary": "Buscar tentativa para revisão completa",
        "description": "NOVO v1.8.0: Retorna tentativa com todas as respostas para correção em uma única chamada",
        "tags": ["consolidated-flows"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Tentativa carregada para revisão",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" },
                    "data": { "$ref": "#/components/schemas/AttemptReviewData" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{id}/finalize-review": {
      "post": {
        "summary": "Finalizar revisão e calcular nota final",
        "description": "NOVO v1.8.0: Aplica todas as correções e recalcula nota final automaticamente",
        "tags": ["consolidated-flows"],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["correcoes"],
                "properties": {
                  "correcoes": {
                    "type": "array",
                    "items": { "$ref": "#/components/schemas/ReviewCorrection" }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Revisão finalizada com sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" },
                    "data": { "$ref": "#/components/schemas/FinalizeReviewResponse" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/users/{funcionario_id}/history": {
      "get": {
        "summary": "Histórico completo de tentativas",
        "description": "NOVO v1.8.0: Retorna histórico consolidado de todas as tentativas do usuário",
        "tags": ["consolidated-flows"],
        "parameters": [
          { "name": "funcionario_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } },
          { "name": "curso_id", "in": "query", "required": false, "schema": { "type": "string" }, "description": "Filtrar por curso específico" }
        ],
        "responses": {
          "200": {
            "description": "Histórico carregado com sucesso",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "message": { "type": "string" },
                    "data": { "$ref": "#/components/schemas/UserHistoryResponse" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/{codigo}/attempts/start": { 
      "post": { 
        "summary": "Iniciar tentativa", 
        "tags": ["attempts"], 
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }], 
        "requestBody": { 
          "required": false, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "properties": { 
                  "userId": { "type": "string" } 
                } 
              } 
            } 
          } 
        }, 
        "responses": { 
          "201": { 
            "description": "Tentativa iniciada", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "tentativa": { "$ref": "#/components/schemas/Attempt" }, 
                    "recovery": { "type": "boolean" }, 
                    "deadline": { "type": "string", "format": "date-time" }, 
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "404": { 
            "description": "Avaliação não encontrada", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          }, 
          "409": { 
            "description": "Limite atingido ou já aprovado", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      } 
    },
    "/assessments/v1/attempts": {
      "post": {
        "summary": "Criar tentativa diretamente",
        "tags": ["attempts"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["funcionario_id", "avaliacao_id"],
                "properties": {
                  "funcionario_id": { "type": "string", "format": "uuid" },
                  "avaliacao_id": { "type": "string" },
                  "status": { "type": "string", "enum": ["EM_ANDAMENTO", "FINALIZADA", "APROVADO", "REPROVADO"] }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Tentativa criada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tentativa": { "$ref": "#/components/schemas/Attempt" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{id}": {
      "get": {
        "summary": "Obter tentativa por ID",
        "tags": ["attempts"],
        "description": "⚠️ SOMENTE LEITURA: Tentativas são dados históricos e não podem ser editadas",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Tentativa encontrada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tentativa": { "$ref": "#/components/schemas/Attempt" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Tentativa não encontrada",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/users/{funcionario_id}/attempts": {
      "get": {
        "summary": "Listar tentativas do usuário",
        "tags": ["attempts"],
        "parameters": [
          { "name": "funcionario_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } },
          { "name": "avaliacao_id", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Lista de tentativas",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tentativas": { "type": "array", "items": { "$ref": "#/components/schemas/Attempt" } },
                    "total": { "type": "integer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/avaliacoes/{avaliacao_id}/attempts": {
      "get": {
        "summary": "Listar tentativas da avaliação",
        "tags": ["attempts"],
        "parameters": [
          { "name": "avaliacao_id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Lista de tentativas",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tentativas": { "type": "array", "items": { "$ref": "#/components/schemas/Attempt" } },
                    "total": { "type": "integer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/answers": {
      "post": {
        "summary": "Criar resposta",
        "tags": ["answers"],
        "description": "Cria uma nova resposta. Para questões dissertativas, pontuacao e feedback podem ser preenchidos posteriormente pelo instrutor.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["tentativa_id", "questao_id", "resposta_funcionario"],
                "properties": {
                  "tentativa_id": { "type": "string", "format": "uuid" },
                  "questao_id": { "type": "string", "format": "uuid" },
                  "resposta_funcionario": { "type": "string" },
                  "pontuacao": { "type": "number", "description": "Pontuação atribuída (preenchida pelo instrutor para dissertativas)" },
                  "feedback": { "type": "string", "description": "Feedback do instrutor para a resposta (especialmente dissertativas)" }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Resposta criada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "resposta": { "$ref": "#/components/schemas/Answer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/answers/upsert": {
      "post": {
        "summary": "Criar ou atualizar resposta",
        "tags": ["answers"],
        "description": "Cria uma nova resposta ou atualiza existente. Útil para salvar rascunhos durante tentativa ou para correção de dissertativas.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["tentativa_id", "questao_id", "resposta_funcionario"],
                "properties": {
                  "tentativa_id": { "type": "string", "format": "uuid" },
                  "questao_id": { "type": "string", "format": "uuid" },
                  "resposta_funcionario": { "type": "string" },
                  "pontuacao": { "type": "number", "description": "Pontuação atribuída (preenchida pelo instrutor para dissertativas)" },
                  "feedback": { "type": "string", "description": "Feedback do instrutor para a resposta (especialmente dissertativas)" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Resposta salva",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "resposta": { "$ref": "#/components/schemas/Answer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/answers/{id}": {
      "get": {
        "summary": "Obter resposta por ID",
        "tags": ["answers"],
        "description": "⚠️ SOMENTE LEITURA: Respostas são dados históricos e não podem ser editadas",
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Resposta encontrada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "resposta": { "$ref": "#/components/schemas/Answer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Resposta não encontrada",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{tentativa_id}/answers": {
      "get": {
        "summary": "Listar respostas da tentativa",
        "tags": ["answers"],
        "parameters": [{ "name": "tentativa_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Lista de respostas",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "respostas": { "type": "array", "items": { "$ref": "#/components/schemas/Answer" } },
                    "total": { "type": "integer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/questions/{questao_id}/answers": {
      "get": {
        "summary": "Listar respostas da questão",
        "tags": ["answers"],
        "parameters": [{ "name": "questao_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Lista de respostas",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "respostas": { "type": "array", "items": { "$ref": "#/components/schemas/Answer" } },
                    "total": { "type": "integer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{tentativa_id}/statistics": {
      "get": {
        "summary": "Obter estatísticas da tentativa",
        "tags": ["statistics"],
        "parameters": [{ "name": "tentativa_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Estatísticas da tentativa",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "estatisticas": { "$ref": "#/components/schemas/AttemptStatistics" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{tentativa_id}/score": {
      "get": {
        "summary": "Calcular nota da tentativa",
        "tags": ["statistics"],
        "description": "Calcula a nota final da tentativa respeitando pesos das questões. Se há questões dissertativas sem nota, retorna nota proporcional apenas das objetivas até a correção manual.",
        "parameters": [{ "name": "tentativa_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Nota calculada respeitando pesos",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tentativa_id": { "type": "string", "format": "uuid" },
                    "pontuacao_total": { "type": "number", "description": "Pontos obtidos respeitando peso das questões" },
                    "questoes_total": { "type": "integer", "description": "Total de questões na avaliação" },
                    "nota_percentual": { "type": "number", "description": "Nota final de 0 a 100" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/attempts/{attemptId}/dissertative": { 
      "get": { 
        "summary": "Listar respostas dissertativas para revisão", 
        "tags": ["review"], 
        "parameters": [{ "name": "attemptId", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }], 
        "responses": { 
          "200": { 
            "description": "Respostas dissertativas", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "respostas": { "type": "array", "items": { "$ref": "#/components/schemas/DissertativeAnswer" } }, 
                    "tentativa": { "$ref": "#/components/schemas/Attempt" }, 
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "404": { 
            "description": "Tentativa não encontrada", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          }, 
          "409": { 
            "description": "Tentativa não pendente de revisão", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      } 
    },
    "/assessments/v1/attempts/{attemptId}/review": { 
      "patch": { 
        "summary": "Aplicar revisão manual em questões dissertativas", 
        "tags": ["review"], 
        "description": "Aplica pontuação e feedback nas questões dissertativas. Recalcula automaticamente a nota final considerando peso de todas as questões e finaliza a tentativa com status APROVADO/REPROVADO. Publica eventos após finalização.",
        "parameters": [{ "name": "attemptId", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }], 
        "requestBody": { 
          "required": true, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "required": ["scores"], 
                "properties": { 
                  "notaMinima": { "type": "number", "default": 70, "description": "Nota mínima para aprovação (0-100)" }, 
                  "scores": { 
                    "type": "array", 
                    "description": "Array com pontuação e feedback para cada resposta dissertativa",
                    "items": { 
                      "type": "object", 
                      "required": ["respostaId","pontuacao"], 
                      "properties": { 
                        "respostaId": { "type": "string", "format": "uuid", "description": "ID da resposta a ser avaliada" }, 
                        "pontuacao": { "type": "number", "minimum": 0, "description": "Pontuação atribuída respeitando o peso da questão" },
                        "feedback": { "type": "string", "description": "Feedback personalizado para o aluno (persistido na tabela respostas)" }
                      } 
                    } 
                  } 
                } 
              } 
            } 
          } 
        }, 
        "responses": { 
          "200": { 
            "description": "Revisão aplicada com sucesso. Tentativa finalizada e eventos publicados.", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "tentativa_id": { "type": "string", "format": "uuid" },
                    "nota": { "type": "number", "description": "Nota final recalculada (0-100)" }, 
                    "aprovado": { "type": "boolean", "description": "Se aprovado baseado na nota mínima" }, 
                    "total_scores_aplicados": { "type": "integer", "description": "Quantas respostas foram avaliadas" },
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "404": { 
            "description": "Tentativa não encontrada", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          }, 
          "409": { 
            "description": "Tentativa não pendente", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      } 
    },
    "/assessments/v1/answers/{respostaId}/feedback": {
      "get": {
        "summary": "Obter feedback de uma resposta",
        "tags": ["review"],
        "description": "Retorna o feedback mais recente dado a uma resposta específica (agora direto da tabela respostas)",
        "parameters": [{ 
          "name": "respostaId", 
          "in": "path", 
          "required": true, 
          "schema": { "type": "string", "format": "uuid" },
          "description": "ID da resposta"
        }],
        "responses": {
          "200": {
            "description": "Feedback da resposta",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "resposta_id": { "type": "string", "format": "uuid" },
                    "feedback": { "$ref": "#/components/schemas/AnswerFeedback" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Feedback não encontrado",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/reviews/pending": {
      "get": {
        "summary": "Listar fila de correções pendentes",
        "tags": ["review"],
        "description": "Retorna lista de tentativas pendentes de correção dissertativa (R16: Fila de correções pendentes)",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": { "type": "integer", "minimum": 1, "maximum": 100, "default": 50 },
            "description": "Limite de registros por página"
          },
          {
            "name": "offset",
            "in": "query", 
            "schema": { "type": "integer", "minimum": 0, "default": 0 },
            "description": "Offset para paginação"
          }
        ],
        "responses": {
          "200": {
            "description": "Fila de correções pendentes",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "correcoes_pendentes": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/PendingReview" }
                    },
                    "total": { "type": "integer" },
                    "limit": { "type": "integer" },
                    "offset": { "type": "integer" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "ErrorResponse": {
        "type": "object",
        "required": ["erro", "mensagem"],
        "properties": {
          "erro": { "type": "string" },
          "mensagem": { "type": "string" }
        }
      },
      "Assessment": {
        "type": "object",
        "required": ["codigo", "curso_id", "titulo", "ativo"],
        "properties": {
          "codigo": { "type": "string" },
          "curso_id": { "type": "string" },
          "titulo": { "type": "string" },
          "tempo_limite": { "type": "integer", "nullable": true },
          "tentativas_permitidas": { "type": "integer", "nullable": true },
          "nota_minima": { "type": "number", "nullable": true },
          "modulo_id": { "type": "string", "format": "uuid", "nullable": true },
          "ativo": { "type": "boolean" }
        }
      },
      "Question": {
        "type": "object",
        "required": ["id", "assessment_codigo", "enunciado", "tipo", "opcoes_resposta", "peso"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "assessment_codigo": { "type": "string" },
          "enunciado": { "type": "string" },
          "tipo": { "type": "string", "enum": ["MULTIPLA_ESCOLHA", "VERDADEIRO_FALSO", "DISSERTATIVA"] },
          "opcoes_resposta": { "type": "array", "items": { "type": "string" } },
          "resposta_correta": { "type": "string", "nullable": true },
          "peso": { "type": "number" }
        }
      },
      "QuestionWithAlternatives": {
        "type": "object",
        "required": ["id", "assessment_codigo", "enunciado", "tipo", "opcoes_resposta", "peso", "alternatives"],
        "description": "NOVO v1.7.0: Questão com alternativas incluídas automaticamente",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "assessment_codigo": { "type": "string" },
          "enunciado": { "type": "string" },
          "tipo": { "type": "string", "enum": ["MULTIPLA_ESCOLHA", "VERDADEIRO_FALSO", "DISSERTATIVA"] },
          "opcoes_resposta": { "type": "array", "items": { "type": "string" } },
          "resposta_correta": { "type": "string", "nullable": true },
          "peso": { "type": "number" },
          "alternatives": { 
            "type": "array", 
            "items": { "$ref": "#/components/schemas/Alternative" },
            "description": "Alternativas derivadas de opcoes_resposta"
          }
        }
      },
      "Alternative": {
        "type": "object",
        "required": ["id", "questao_id", "texto", "correta"],
        "description": "DEPRECIADO v1.7.0: Mantido apenas para compatibilidade, derivado de opcoes_resposta",
        "properties": {
          "id": { "type": "string", "description": "Para compatibilidade, usa o próprio texto como ID" },
          "questao_id": { "type": "string", "format": "uuid" },
          "texto": { "type": "string" },
          "correta": { "type": "boolean" }
        }
      },
      "Attempt": {
        "type": "object",
        "required": ["id", "funcionario_id", "avaliacao_id", "data_inicio", "status", "criado_em"],
        "description": "Tentativa de avaliação. Status PENDENTE_REVISAO quando há questões dissertativas. Nota calculada respeitando pesos das questões.",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "funcionario_id": { "type": "string", "format": "uuid" },
          "avaliacao_id": { "type": "string" },
          "data_inicio": { "type": "string", "format": "date-time" },
          "data_fim": { "type": "string", "format": "date-time", "nullable": true },
          "nota_obtida": { "type": "number", "nullable": true, "description": "Nota final (0-100) calculada com peso das questões" },
          "status": { 
            "type": "string", 
            "enum": ["EM_ANDAMENTO", "FINALIZADA", "APROVADO", "REPROVADO", "PENDENTE_REVISAO", "EXPIRADA"],
            "description": "Status: PENDENTE_REVISAO para dissertativas, APROVADO/REPROVADO após correção completa"
          },
          "criado_em": { "type": "string", "format": "date-time" }
        }
      },
      "Answer": {
        "type": "object",
        "required": ["id", "tentativa_id", "questao_id", "criado_em"],
        "description": "Resposta do aluno. Constraint única (tentativa_id, questao_id) evita duplicatas. Feedback e pontuação preenchidos pelo instrutor para dissertativas.",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "tentativa_id": { "type": "string", "format": "uuid" },
          "questao_id": { "type": "string", "format": "uuid" },
          "resposta_funcionario": { "type": "string", "nullable": true, "description": "Resposta fornecida pelo aluno" },
          "pontuacao": { "type": "number", "nullable": true, "description": "Pontuação: automática para objetivas, manual para dissertativas" },
          "feedback": { "type": "string", "nullable": true, "description": "Feedback do instrutor persistido na resposta (v1.6.0)" },
          "criado_em": { "type": "string", "format": "date-time" }
        }
      },
      "DissertativeAnswer": {
        "type": "object",
        "required": ["id", "questao", "resposta_funcionario"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "questao": { "$ref": "#/components/schemas/Question" },
          "resposta_funcionario": { "type": "string" },
          "pontuacao": { "type": "number", "nullable": true }
        }
      },
      "SubmissionResult": {
        "type": "object",
        "required": ["tentativa_id", "nota", "aprovado", "total_questoes"],
        "properties": {
          "tentativa_id": { "type": "string", "format": "uuid" },
          "nota": { "type": "number" },
          "aprovado": { "type": "boolean" },
          "total_questoes": { "type": "integer" },
          "questoes_corretas": { "type": "integer" },
          "nota_minima": { "type": "number" },
          "tempo_gasto": { "type": "integer" },
          "detalhes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "questao_id": { "type": "string" },
                "correta": { "type": "boolean" },
                "pontuacao": { "type": "number" }
              }
            }
          }
        }
      },
      "AttemptStatistics": {
        "type": "object",
        "required": ["total_questoes", "questoes_respondidas", "pontuacao_media", "pontuacao_total"],
        "properties": {
          "total_questoes": { "type": "integer" },
          "questoes_respondidas": { "type": "integer" },
          "pontuacao_media": { "type": "number" },
          "pontuacao_total": { "type": "number" }
        }
      },
      "ReviewScore": {
        "type": "object",
        "required": ["respostaId", "pontuacao"],
        "properties": {
          "respostaId": { "type": "string", "format": "uuid" },
          "pontuacao": { "type": "number", "minimum": 0 },
          "feedback": { "type": "string" }
        }
      },
      "PendingReview": {
        "type": "object",
        "required": ["tentativa_id", "funcionario_id", "avaliacao_id", "data_inicio", "total_dissertativas"],
        "properties": {
          "tentativa_id": { "type": "string", "format": "uuid" },
          "funcionario_id": { "type": "string", "format": "uuid" },
          "avaliacao_id": { "type": "string" },
          "data_inicio": { "type": "string", "format": "date-time" },
          "avaliacao_titulo": { "type": "string" },
          "funcionario_nome": { "type": "string" },
          "funcionario_email": { "type": "string" },
          "total_dissertativas": { "type": "integer" }
        }
      },
      "AnswerFeedback": {
        "type": "object",
        "properties": {
          "feedback": { "type": "string", "nullable": true },
          "pontuacao": { "type": "number" },
          "criado_em": { "type": "string", "format": "date-time" }
        }
      },
      "StartAssessmentResponse": {
        "type": "object",
        "required": ["tentativa", "avaliacao", "questoes", "tentativas_anteriores"],
        "description": "NOVO v1.8.0: Resposta consolidada para início de avaliação",
        "properties": {
          "tentativa": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "format": "uuid" },
              "avaliacao_id": { "type": "string" },
              "funcionario_id": { "type": "string", "format": "uuid" },
              "data_inicio": { "type": "string", "format": "date-time" },
              "status": { "type": "string" },
              "tempo_limite": { "type": "integer", "nullable": true },
              "tentativas_permitidas": { "type": "integer", "nullable": true }
            }
          },
          "avaliacao": {
            "type": "object",
            "properties": {
              "codigo": { "type": "string" },
              "titulo": { "type": "string" },
              "tempo_limite": { "type": "integer", "nullable": true },
              "tentativas_permitidas": { "type": "integer", "nullable": true },
              "nota_minima": { "type": "number", "nullable": true }
            }
          },
          "questoes": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/QuestionWithAlternatives" }
          },
          "tentativas_anteriores": { "type": "integer" },
          "pode_recuperacao": { "type": "boolean" }
        }
      },
      "SubmitAssessmentRequest": {
        "type": "object",
        "required": ["tentativa_id", "respostas"],
        "description": "NOVO v1.8.0: Payload para submissão completa",
        "properties": {
          "tentativa_id": { "type": "string", "format": "uuid" },
          "respostas": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["questao_id", "resposta_funcionario"],
              "properties": {
                "questao_id": { "type": "string", "format": "uuid" },
                "resposta_funcionario": { "type": "string" }
              }
            }
          }
        }
      },
      "SubmitAssessmentResponse": {
        "type": "object",
        "required": ["tentativa_id", "status", "tem_dissertativas", "respostas_salvas", "mensagem"],
        "description": "NOVO v1.8.0: Resultado da submissão consolidada",
        "properties": {
          "tentativa_id": { "type": "string", "format": "uuid" },
          "status": { "type": "string", "enum": ["FINALIZADA", "PENDENTE_REVISAO", "APROVADO", "REPROVADO"] },
          "nota_obtida": { "type": "number", "nullable": true },
          "nota_minima": { "type": "number", "nullable": true },
          "tem_dissertativas": { "type": "boolean" },
          "questoes_dissertativas_pendentes": { "type": "integer" },
          "respostas_salvas": { "type": "integer" },
          "mensagem": { "type": "string" }
        }
      },
      "AttemptReviewData": {
        "type": "object",
        "required": ["tentativa", "respostas"],
        "description": "NOVO v1.8.0: Dados consolidados para revisão",
        "properties": {
          "tentativa": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "format": "uuid" },
              "funcionario_nome": { "type": "string" },
              "funcionario_email": { "type": "string" },
              "avaliacao_titulo": { "type": "string" },
              "data_inicio": { "type": "string", "format": "date-time" },
              "status": { "type": "string" },
              "nota_obtida": { "type": "number", "nullable": true }
            }
          },
          "respostas": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "resposta_id": { "type": "string", "format": "uuid" },
                "questao_id": { "type": "string", "format": "uuid" },
                "enunciado": { "type": "string" },
                "tipo_questao": { "type": "string" },
                "peso": { "type": "number" },
                "resposta_funcionario": { "type": "string", "nullable": true },
                "pontuacao": { "type": "number", "nullable": true },
                "feedback": { "type": "string", "nullable": true }
              }
            }
          }
        }
      },
      "ReviewCorrection": {
        "type": "object",
        "required": ["resposta_id", "pontuacao"],
        "description": "NOVO v1.8.0: Correção individual",
        "properties": {
          "resposta_id": { "type": "string", "format": "uuid" },
          "pontuacao": { "type": "number", "minimum": 0 },
          "feedback": { "type": "string", "nullable": true }
        }
      },
      "FinalizeReviewResponse": {
        "type": "object",
        "required": ["tentativa_id", "nota_final", "status", "correcoes_aplicadas", "mensagem"],
        "description": "NOVO v1.8.0: Resultado da finalização de revisão",
        "properties": {
          "tentativa_id": { "type": "string", "format": "uuid" },
          "nota_final": { "type": "number" },
          "status": { "type": "string", "enum": ["APROVADO", "REPROVADO"] },
          "correcoes_aplicadas": { "type": "integer" },
          "mensagem": { "type": "string" }
        }
      },
      "UserHistoryResponse": {
        "type": "object",
        "required": ["funcionario_id", "total_tentativas", "tentativas"],
        "description": "NOVO v1.8.0: Histórico consolidado do usuário",
        "properties": {
          "funcionario_id": { "type": "string", "format": "uuid" },
          "total_tentativas": { "type": "integer" },
          "tentativas": {
            "type": "array",
            "items": {
              "allOf": [
                { "$ref": "#/components/schemas/Attempt" },
                {
                  "type": "object",
                  "properties": {
                    "avaliacao_titulo": { "type": "string" },
                    "curso_id": { "type": "string" }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
} as const;