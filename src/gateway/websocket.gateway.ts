import { Logger } from '@nestjs/common'
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Cluster } from 'src/resource/database/entity/Cluster.entity'
import { Instance } from 'src/resource/database/entity/Instance.entity'
import { getDatabaseClient } from 'src/resource/database/main'
import utilityPlugin from 'src/resource/plugin/utility.plugin'
import * as WebSocket from 'ws'

export const clients: Array<{ client: WebSocket }> = new Array()

@WebSocketGateway({
    cors: { origin: '*' },
    path: '/v0/instance/vnc'
})

export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    constructor() {  }
    
    @WebSocketServer() server: WebSocket.Server
    private logger: Logger = new Logger('WebsocketGateway')

    afterInit(_server: WebSocket.Server) {
        this.logger.log('WebSocket Server initlizated.')
    }

    handleDisconnect(_client: WebSocket, ... _args: any[]) {
        clients.splice(clients.indexOf(clients.find(__client => __client.client == _client)), 1)
    }

    handleConnection(_client: WebSocket, ... _args: any[]) {
        clients.push({ client: _client })

        _client.onmessage = async (_message: WebSocket.MessageEvent) => {
            
        }
    }
}