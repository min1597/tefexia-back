import { Controller, Post, Body, Param, Request, Response, Headers, Next, HttpStatus, Get } from '@nestjs/common'
import { Certification, CertificationStatus, CertificationType } from 'src/resource/database/entity/Certification.entity'
import { getDatabaseClient }    from 'src/resource/database/main'
import certificationPlugin      from 'src/resource/plugin/certification.plugin'
import libphonenumber           from 'libphonenumber-js'
import utilityPlugin            from 'src/resource/plugin/utility.plugin'
import { Exception }            from 'src/resource/plugin/error.plugin'
import { Transform }            from 'class-transformer'
import * as Express             from 'express'
import tokenPlugin              from 'src/resource/plugin/token.plugin'
import { IsEnum }               from 'class-validator'

class CreateCertificationDTO {
    @IsEnum(CertificationType, { message: 'Invalid type.' })
    @Transform(({ value }) => value.toUpperCase())
    type: CertificationType
}

@Controller()
export class CertificationController {
    constructor (
        
    ) {  }

    @Post('v0/certification')
    async requestCertification (
        @Request() _request:                        Express.Request,
        @Body() _body:                              CreateCertificationDTO,
        @Response() _response:                      Express.Response,
        @Headers('authorization') _authorization:   string,
        @Next() _next:                              Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
            
            const _certificationResult = await certificationPlugin.Certification.create(_body.type)
            if(_certificationResult.success == false) return _next(new Exception(_request, _certificationResult.error instanceof Error ? _certificationResult.error.message : 'Failed to request certification.', HttpStatus.BAD_REQUEST, _certificationResult.error))
            
            const _Certification = new Certification()
            _Certification.type = _body.type
            _Certification.verification_id = _certificationResult.verificationId
            const _certification = await getDatabaseClient().manager.save(_Certification)

            return _response.status(200).json({ success: true, data: {
                id: _certification.verification_id
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Get('v0/certification/:verificationId/validate')
    async validateCertification (
        @Request() _request:                        Express.Request,
        @Param('verificationId') _verificationId:   string,
        @Response() _response:                      Express.Response,
        @Headers('authorization') _authorization:   string,
        @Next() _next:                              Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
            try {
                utilityPlugin.validateUUID(_verificationId)
            } catch(_error) { return _next(new Exception(_request, 'Wrong certification id.', HttpStatus.BAD_REQUEST, new Error())) }

            const _certifications = await getDatabaseClient().manager.getRepository(Certification).find({ where: { verification_id: utilityPlugin.validateUUID(_verificationId) } })
            if(_certifications.length !== 1) return _next(new Exception(_request, 'Wrong certification id.', HttpStatus.BAD_REQUEST, new Error()))
            if(_certifications[0].status !== CertificationStatus.Pending) return _next(new Exception(_request, 'Wrong certification.', HttpStatus.BAD_REQUEST, new Error()))

            const _certification = await certificationPlugin.Certification.validate(utilityPlugin.validateUUID(_verificationId))
            if(_certification.success == false) return _next(new Exception(_request, _certification.error instanceof Error ? _certification.error.message : 'Failed to request certification.', HttpStatus.BAD_REQUEST, _certification.error))
            if(_certification.status !== 'successed') return _next(new Exception(_request, 'Invalid certification.', HttpStatus.BAD_REQUEST, new Error('Invalid certification.')))

            await getDatabaseClient().manager.getRepository(Certification).update({ uuid: _certifications[0].uuid, is_active: true }, {
                target: _certification.personal.type == 'EMAIL_VERIFICATION'? _certification.personal.emailAddress : null,
                status: CertificationStatus.Successed,
                email_address: _certification.personal.type == 'EMAIL_VERIFICATION' ? _certification.personal.emailAddress : null
            })
            return _response.status(200).json({ success: true, data: {
                id: _certifications[0].uuid,
                email_address: _certification.personal.type == 'EMAIL_VERIFICATION' ? _certification.personal.emailAddress : null
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }
}