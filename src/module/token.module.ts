import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { TokenController } from 'src/controller/token.controller'
import InternalMiddleware from 'src/middleware/internal.middleware'

@Module({
    imports: [  ],
    controllers: [ TokenController ],
    providers: [  ],
})

export class TokenModule implements NestModule {
    configure(_consumer: MiddlewareConsumer) {
        _consumer
            .apply(InternalMiddleware)
            .exclude(
                { path: 'v0/session', method: RequestMethod.POST }
            )
            .forRoutes(TokenController)
    }
}
  