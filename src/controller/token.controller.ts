import { Controller, Get, Post, Request, Response, Headers, Next, HttpStatus, Param } from '@nestjs/common'
import utilityPlugin    from 'src/resource/plugin/utility.plugin'
import { Exception }    from 'src/resource/plugin/error.plugin'
import * as Express     from 'express'
import tokenPlugin      from 'src/resource/plugin/token.plugin'
import useragent        from 'useragent'
import dayjs            from 'dayjs'

@Controller()
export class TokenController {
  constructor (

  ) {  }

  @Post('v0/session')
  async newSession (
    @Request() _request:    Express.Request,
    @Response() _response:  Express.Response,
    @Next() _next:          Express.NextFunction
  ) {
    try {
      const _sessionToken = await tokenPlugin.Session.createSession({ ipAddress: (_request.headers['x-forwarded-for'] as string) || _request.socket.remoteAddress, agent: JSON.stringify(useragent.parse(_request.headers['user-agent']).toJSON()) })
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to issue session token.', HttpStatus.UNAUTHORIZED, _sessionToken.error))
      return _response.status(200).json({ success: true, data: { token: _sessionToken.token, token_type: _sessionToken.tokenType }, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }

  @Get('v0/session')
  async getSession (
    @Request() _request:                        Express.Request,
    @Response() _response:                      Express.Response,
    @Headers('authorization') _authorization:   string,
    @Next() _next:                              Express.NextFunction
  ) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      return _response.status(200).json({ success: true, data: { token: _sessionToken.token, token_type: _sessionToken.tokenType, expires_in: dayjs(_sessionToken.expiresDate).diff(), is_authorized: _sessionToken.userId == null ? false : true }, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }
}