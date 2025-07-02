import { HttpException, HttpStatus } from '@nestjs/common'
import { getDatabaseClient } from '../database/main'
import { Request } from '../database/entity/Request.entity'
import Express from 'express'
import useragent from 'useragent'

export class Exception extends HttpException {
    constructor (_request: Express.Request, _message: string, _status: HttpStatus, _error?: Error) {
        super({
            message: _message,
        }, _status, { cause: _error })
        this.synchronize(_request, {
            success: false,
            error: _message,
            data: null
        }, _status, _error)
    }

    private errorParser (_error: Error) {
        if(typeof _error !== 'undefined') {
            if(_error.cause instanceof Error) return `${ _error.stack }\n[Caused by]\n${ this.errorParser(_error.cause as Error) }`
        }
        return _error.stack
    }

    public async synchronize (_request: Express.Request, _responseBody: { success: false, error: string, data: null }, _statusCode: HttpStatus, _error?: Error) {
        try {
            const _Request = new Request()
            _Request.ip_address = (_request.headers['x-forwarded-for'] || _request.socket.remoteAddress) as string
            _Request.browser = useragent.parse(_request.headers['user-agent'])
            _Request.request_method = _request.method
            _Request.body = _request.body
            _Request.query = _request.query
            _Request.headers = _request.headers
            _Request.response_body = _responseBody
            _Request.http_status = _statusCode
            _Request.error_stack = _error ? this.errorParser(_error) : null
            await getDatabaseClient().manager.save(_Request)
        } catch(_error) {  }
    }
}
