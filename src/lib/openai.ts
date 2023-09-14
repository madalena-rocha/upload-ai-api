import 'dotenv/config'
import { OpenAI } from 'openai'

// A chave da API precisa vir de dentro do arquivo .env
// Por padrão, a versão utilizada do node não consegue ler variáveis ambiente de forma nativa
// O dotenv serve para ler essas variáveis ambiente
// Todas as variáveis declaradas no arquivo .env são inseridas dentro da variável global do node, process.env

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
})
