import { FastifyInstance } from 'fastify'
import { fastifyMultipart } from '@fastify/multipart'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { prisma } from '../lib/prisma'

// O node permite trabalhar com streams, que são formas de conseguir ler ou escrever dados aos poucos
// Por exemplo, ao fazer o upload de um arquivo, esperar o upload finalizar para salvar o arquivo em disco pode ser muito pesado para a aplicação,
// pois terá que armazenar todos os dados do arquivo até terminar o upload na memória da aplicação, que geralmente é muito limitada
// Usando o recurso de streams do node, ao fazer o upload de um arquivo, conforme os dados do upload chegam no back-end, vão sendo salvos no disco, sem a necessidade de guardá-los na memória
// Isso demora um tempo para esperar o upload finalizar
// O pipeline é mais uma forma de aguardar esse processo finalizar
// Porém, o pipeline usa uma API antiga, onde para saber que terminou o upload, usa callbacks, não tendo suporte para async/await
// O promisify transforma uma função que tem uma API mais antiga do node que usa callback para usar promises

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25 MB
    }
  })
  
  app.post('/videos', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Missing file input.' })
    }

    const extension = path.extname(data.filename)

    if (extension !== '.mp3') { // o processo de conversão de vídeo para áudio antes da transcrição é realizado no navegador
      // aqui recebe o áudio já convertido ao invés do vídeo
      return reply.status(400).send({ error: 'Invalid input type, please upload a mp3.' })
    }

    const fileBaseName = path.basename(data.filename, extension) // retorna o nome do arquivo sem a extensão
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
    const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)
    // __dirname retorna o diretório onde o arquivo contendo a variável __dirname está

    await pump(data.file, fs.createWriteStream(uploadDestination))
    // aguardar a pipeline do upload do arquivo
    // recebe aos poucos os dados do upload do arquivo do tipo stream e escreve o arquivo aos poucos conforme os dados vão chegando
  
    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      }
    })
    
    return {
      video,
    }
  })
}