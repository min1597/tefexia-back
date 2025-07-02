import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { ServiceController } from 'src/controller/service.controller'
import InternalAuthorizedMiddleware from 'src/middleware/internal.authorized.middleware'
import { EntityManager } from 'typeorm'

@Module({
    imports: [  ],
    controllers: [ ServiceController ],
    providers: [ EntityManager ],
})

export class ServiceModule implements NestModule {
    configure(_consumer: MiddlewareConsumer) {
        _consumer
            .apply(InternalAuthorizedMiddleware)
            .forRoutes(ServiceController)
    }
}
  