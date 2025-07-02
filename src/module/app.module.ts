import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { typeOrmConfig } from 'src/resource/config/typeorm.config'
import { ConfigModule } from '@nestjs/config'
import { TokenModule } from './token.module'
import { WebsocketModule } from './websocket.module'
import { RequestMiddleware } from 'src/middleware/request.middleware'
import { UserModule } from './user.module'
import { CertificationModule } from './certification.module'
import { ServiceModule } from './service.module'

@Module({
  imports: [ ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot(typeOrmConfig as TypeOrmModuleOptions), TokenModule, UserModule, ServiceModule, CertificationModule, WebsocketModule ],
  controllers: [  ],
  providers: [  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer) {
    _consumer
      .apply(RequestMiddleware)
      .forRoutes('*')
  }
}
