import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { CertificationController } from 'src/controller/certification.controller'
import internalMiddleware from 'src/middleware/internal.middleware'
import { EntityManager } from 'typeorm'

@Module({
    imports: [  ],
    controllers: [ CertificationController ],
    providers: [ EntityManager ],
})

export class CertificationModule implements NestModule {
    configure(_consumer: MiddlewareConsumer) {
        _consumer
            .apply(internalMiddleware)
            .forRoutes(CertificationController)
    }
}
  