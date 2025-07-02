import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common'
import Express from 'express'
import { Exception } from 'src/resource/plugin/error.plugin'

@Injectable()
export default class implements NestMiddleware {
    async use(_request: Express.Request, _response: Express.Response, _next: Express.NextFunction) {
        try {
            _next()
        } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }
}
