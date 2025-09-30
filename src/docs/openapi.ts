export const openapiSpec = {
  "openapi": "3.0.3",
  "info": { 
    "title": "Assessment Service API", 
    "version": "1.5.0",
    "description": `API para gerenciamento de avaliações com suporte completo a questões dissertativas.

**REQUISITOS IMPLEMENTADOS:**

**R14: Criar Avaliações**
• Tipos de questão: múltipla escolha, verdadeiro/falso, dissertativa ✅
• Configurar: tempo limite, número de tentativas, nota mínima ✅  
• Banco de questões reutilizáveis por categoria ✅
• Correção automática (objetivas) e manual (dissertativas) ✅

**R16: Corrigir Avaliações**
• Fila de correções pendentes ✅
• Interface para correção de questões dissertativas ✅
• Feedback personalizado por aluno ✅
• Histórico de correções realizadas ✅

**REGRAS DE INTEGRIDADE:**
• Tentativas e respostas: APENAS leitura e criação (preservação do histórico)
• Avaliações/questões: Frontend controla edição baseado em 'total_inscricoes' do course service

**VALIDAÇÃO NO FRONTEND:**
• Course service retorna 'total_inscricoes' em GET /courses/:codigo
• Se total_inscricoes > 0: Bloquear edição para INSTRUTOR
• ADMIN/GERENTE: Sempre podem editar (independente de inscrições)

**FLUXO DISSERTATIVO:**
1. Submissão → Status 'PENDENTE_REVISAO' se houver questões dissertativas
2. Correção manual → POST /attempts/:id/review com feedback
3. Finalização → Status 'APROVADO'/'REPROVADO' + publicação de eventos
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
      },
      "post": { 
        "summary": "Submeter respostas (avaliar)", 
        "tags": ["submissions"], 
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }], 
        "requestBody": { 
          "required": true, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "required": ["userId","attemptId","respostas"], 
                "properties": { 
                  "userId": { "type": "string" }, 
                  "attemptId": { "type": "string" }, 
                  "respostas": { 
                    "type": "array", 
                    "items": { 
                      "type": "object", 
                      "required": ["questao_id","resposta"], 
                      "properties": { 
                        "questao_id": { "type": "string" }, 
                        "resposta": { "type": "string" } 
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
            "description": "Avaliação submetida", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "resultado": { "$ref": "#/components/schemas/SubmissionResult" }, 
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
        "summary": "Listar questões", 
        "tags": ["questions"], 
        "parameters": [{ "name": "codigo", "in": "path", "required": true, "schema": { "type": "string" } }], 
        "responses": { 
          "200": { 
            "description": "Lista de questões", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "questoes": { "type": "array", "items": { "$ref": "#/components/schemas/Question" } }, 
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
                  "pontuacao": { "type": "number" }
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
                  "pontuacao": { "type": "number" }
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
        "description": "Calcula a nota final da tentativa baseada nas respostas e pontuações",
        "parameters": [{ "name": "tentativa_id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": {
            "description": "Nota calculada",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "nota": { "type": "number", "description": "Nota de 0 a 10" },
                    "total_questoes": { "type": "integer" },
                    "questoes_respondidas": { "type": "integer" },
                    "pontuacao_total": { "type": "number" },
                    "pontuacao_maxima": { "type": "number" },
                    "mensagem": { "type": "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/assessments/v1/questions/{questaoId}/alternatives": { 
      "post": { 
        "summary": "Adicionar alternativa", 
        "tags": ["alternatives"], 
        "parameters": [{ "name": "questaoId", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }], 
        "requestBody": { 
          "required": true, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "required": ["texto","correta"], 
                "properties": { 
                  "texto": { "type": "string" }, 
                  "correta": { "type": "boolean" } 
                } 
              } 
            } 
          } 
        }, 
        "responses": { 
          "201": { 
            "description": "Alternativa criada", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "alternativa": { "$ref": "#/components/schemas/Alternative" }, 
                    "mensagem": { "type": "string" } 
                  } 
                } 
              } 
            } 
          }, 
          "404": { 
            "description": "Questão não encontrada", 
            "content": { 
              "application/json": { 
                "schema": { "$ref": "#/components/schemas/ErrorResponse" } 
              } 
            } 
          } 
        } 
      }, 
      "get": { 
        "summary": "Listar alternativas", 
        "tags": ["alternatives"], 
        "parameters": [{ "name": "questaoId", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }], 
        "responses": { 
          "200": { 
            "description": "Lista de alternativas", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "alternativas": { "type": "array", "items": { "$ref": "#/components/schemas/Alternative" } }, 
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
        "parameters": [{ "name": "attemptId", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }], 
        "requestBody": { 
          "required": true, 
          "content": { 
            "application/json": { 
              "schema": { 
                "type": "object", 
                "required": ["scores"], 
                "properties": { 
                  "notaMinima": { "type": "number" }, 
                  "scores": { 
                    "type": "array", 
                    "items": { 
                      "type": "object", 
                      "required": ["respostaId","pontuacao"], 
                      "properties": { 
                        "respostaId": { "type": "string", "format": "uuid" }, 
                        "pontuacao": { "type": "number" },
                        "feedback": { "type": "string", "description": "Feedback personalizado para o aluno" }
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
            "description": "Revisão aplicada", 
            "content": { 
              "application/json": { 
                "schema": { 
                  "type": "object", 
                  "properties": { 
                    "tentativa": { "$ref": "#/components/schemas/Attempt" }, 
                    "nota_final": { "type": "number" }, 
                    "aprovado": { "type": "boolean" }, 
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
      "Alternative": {
        "type": "object",
        "required": ["id", "questao_id", "texto", "correta"],
        "properties": {
          "id": { "type": "string" },
          "questao_id": { "type": "string", "format": "uuid" },
          "texto": { "type": "string" },
          "correta": { "type": "boolean" }
        }
      },
      "Attempt": {
        "type": "object",
        "required": ["id", "funcionario_id", "avaliacao_id", "data_inicio", "status", "criado_em"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "funcionario_id": { "type": "string", "format": "uuid" },
          "avaliacao_id": { "type": "string" },
          "data_inicio": { "type": "string", "format": "date-time" },
          "data_fim": { "type": "string", "format": "date-time", "nullable": true },
          "nota_obtida": { "type": "number", "nullable": true },
          "status": { "type": "string", "enum": ["EM_ANDAMENTO", "FINALIZADA", "APROVADO", "REPROVADO", "PENDENTE_REVISAO", "EXPIRADA"] },
          "criado_em": { "type": "string", "format": "date-time" }
        }
      },
      "Answer": {
        "type": "object",
        "required": ["id", "tentativa_id", "questao_id", "criado_em"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "tentativa_id": { "type": "string", "format": "uuid" },
          "questao_id": { "type": "string", "format": "uuid" },
          "resposta_funcionario": { "type": "string", "nullable": true },
          "pontuacao": { "type": "number", "nullable": true },
          "feedback": { "type": "string", "nullable": true, "description": "Feedback do instrutor para questões dissertativas" },
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
      }
    }
  }
} as const;