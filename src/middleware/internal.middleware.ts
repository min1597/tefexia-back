import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common'
import Express from 'express'
import jsonwebtoken from 'jsonwebtoken'
import dayjs from 'dayjs'
import utilityPlugin from 'src/resource/plugin/utility.plugin'
import { Exception } from 'src/resource/plugin/error.plugin'
import { getDatabaseClient } from 'src/resource/database/main'
import { Token } from 'src/resource/database/entity/Token.entity'
import { TokenMethod } from 'src/resource/database/entity/Request.entity'

@Injectable()
export default class implements NestMiddleware {
    async use(_request: Express.Request, _response: Express.Response, _next: Express.NextFunction) {
        try {
            if(typeof _request.headers.authorization !== 'string') return _next(new Exception(_request, 'Required session.', HttpStatus.BAD_REQUEST))
            const _token = utilityPlugin.tokenParser(_request.headers.authorization)
            if(_token.tokenType == 'Bearer') { if(_token.token.split('.').length !== 1) { if(_token.token.split('.').length !== 3) return _next(new Exception(_request, 'Wrong session.', HttpStatus.BAD_REQUEST)) } }
            if(_token.tokenType == 'Bearer' && _token.token.split('.').length == 3) {
                try {
                    if(utilityPlugin.JWT.verify(_token.token) == false) throw new Error('Invalid token.')
                    const _jwtToken = utilityPlugin.JWT.decode(_token.token) as jsonwebtoken.JwtPayload
                    _token.token = _jwtToken.token
                } catch(_error) { return _next(new Exception(_request, 'Wrong session.', HttpStatus.BAD_REQUEST, _error)) }
            } else if(_token[0] == 'Basic') {
                if(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(_token.token) == false) return _next(new Exception(_request, 'Wrong session.', HttpStatus.BAD_REQUEST))
                const _basicToken = JSON.parse(CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(_token.token))).split(':')
                if(_basicToken.length !== 2) return _next(new Exception(_request, 'Wrong session.', HttpStatus.BAD_REQUEST))
                if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(_basicToken[0]) == false) return _next(new Exception(_request, 'Wrong session.', HttpStatus.BAD_REQUEST))
                _token.token = _basicToken[1]
            }
            const _tokens = await getDatabaseClient().getRepository(Token).find({ where: { token: _token.token, is_active: true } })
            if(_tokens.length !== 1) return _next(new Exception(_request, 'Wrong or expired session.', HttpStatus.BAD_REQUEST))
            if(dayjs(_tokens[0].created_date).add(Number(_tokens[0].valid_time), 'milliseconds').diff() <= 0) return _next(new Exception(_request, 'Expired session.', HttpStatus.BAD_REQUEST))
            if(_tokens[0].token_method !== TokenMethod.SESSION_TOKEN) return _next(new Exception(_request, 'Wrong session.', HttpStatus.BAD_REQUEST))

            _next()
        } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }
}
