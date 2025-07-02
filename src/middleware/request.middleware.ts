import { NestMiddleware, Injectable } from '@nestjs/common'
import * as Express from 'express'
import { Request } from 'src/resource/database/entity/Request.entity'
import { getDatabaseClient } from 'src/resource/database/main'
import * as useragent from 'useragent'

@Injectable()
export class RequestMiddleware implements NestMiddleware {
    async use (_request: Express.Request, _response: Express.Response, _next: Express.NextFunction) {
        const _sendFunction = _response.send
        _response.send = function (_body) {
            (async () => {
                if (_response.statusCode >= 200 && _response.statusCode < 300) {
                    const _Request = new Request()
                    _Request.ip_address = (_request.headers['x-forwarded-for'] as string) || _request.socket.remoteAddress || 'unknown'
                    _Request.browser = useragent.parse(_request.headers['user-agent'])
                    _Request.request_method = _request.method
                    _Request.body = _request.body
                    _Request.query = _request.query
                    _Request.headers = _request.headers
                    _Request.response_body = _body
                    _Request.http_status = _response.statusCode
                    await getDatabaseClient().manager.save(_Request)
                }
            })()
            return _sendFunction.apply(_response, arguments)
        }
        _next()
    }
}