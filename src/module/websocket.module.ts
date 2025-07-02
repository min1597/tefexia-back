import { Module } from '@nestjs/common'
import { WebsocketGateway } from '../gateway/websocket.gateway'

@Module({
  providers: [ WebsocketGateway ]
})
export class WebsocketModule {  }
