import { NestFactory } from '@nestjs/core'
import { AppModule } from './module/app.module'
import * as dotenv from 'dotenv'
import { WsAdapter } from '@nestjs/platform-ws'
import { connectDatabase, getDatabaseClient } from './resource/database/main'
import * as Express from 'express'
import { clients } from './gateway/websocket.gateway'
import { HttpException, ValidationPipe } from '@nestjs/common'
import { GlobalExceptionFilter } from './middleware/error.middleware'
import { ValidationError } from 'class-validator'
import utilityPlugin from './resource/plugin/utility.plugin'
import queuePlugin from './resource/plugin/queue.plugin'
import hypervisorPlugin from './resource/plugin/hypervisor.plugin'
import { Series } from './resource/database/entity/service/Series.entity'
import paymentPlugin from './resource/plugin/payment.plugin'

dotenv.config()

const parseValidationError = (_error: ValidationError) => Array.from(new Set([ ... Object.values(_error.constraints ?? {  }), ... _error.children.flatMap(_children => parseValidationError(_children)) ]))

async function bootstrap () {
  await connectDatabase()
  const app = await NestFactory.create(AppModule, { cors: { origin: '*', allowedHeaders: '*' } })
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true
  })
  app.useWebSocketAdapter(new WsAdapter(app)) 
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    exceptionFactory: async (_errors: ValidationError[]) => {
      return new HttpException({ message: Array.from(new Set(_errors.flatMap(_error => parseValidationError(_error)))) }, 403)
    }
  }))
  app.use(Express.json({ limit: '50mb' }))
  app.use(Express.urlencoded({ limit: '50mb', extended: true }))
  app.useGlobalFilters(new GlobalExceptionFilter())
  await app.listen(process.env.BIND_PORT ? Number(process.env.BIND_PORT) : 4000)

  setInterval(() => {
    queuePlugin.Queue.installInstance()
  }, 1000 * 10)
}
bootstrap()
