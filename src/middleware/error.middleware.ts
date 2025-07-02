import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(_exception: unknown, _host: ArgumentsHost) {
        const _ctx = _host.switchToHttp()
        const _response = _ctx.getResponse<Response>()
        const _request = _ctx.getRequest()

        const _statusCode =
            _exception instanceof HttpException
                ? _exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR
console.log(_exception)

        const _message =
            (_exception instanceof HttpException
                ? (
                    typeof _exception.getResponse() == 'string'
                        ? { message: _exception.getResponse() }
                        : _exception.getResponse()
                )
                : { message: 'Internal server error' }) as { message: string | string[] }

        _response.status(_statusCode).json({
            success: false,
            error: Array.isArray(_message.message) ? _message.message : [ _message.message ],
            data: null,
            request_at: new Date().toISOString()
        })
    }
}