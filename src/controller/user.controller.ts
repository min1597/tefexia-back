import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus } from '@nestjs/common'
import { IsEmail, IsIn, IsObject, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator'
import { Gender, User, UserStatus } from 'src/resource/database/entity/User.entity'
import { getDatabaseClient }        from 'src/resource/database/main'
import { Permission }               from 'src/resource/database/entity/Permission.entity'
import utilityPlugin                from 'src/resource/plugin/utility.plugin'
import { Exception }                from 'src/resource/plugin/error.plugin'
import * as Express                 from 'express'
import tokenPlugin                  from 'src/resource/plugin/token.plugin'
import userPlugin                   from 'src/resource/plugin/user.plugin'
import CryptoJS                     from 'crypto-js'
import dayjs                        from 'dayjs'
import { CredentialsDTO } from 'src/resource/dto/user.dto'
import { Type } from 'class-transformer'
import bcrypt from 'bcrypt'

class SignInDTO {
  @IsIn([ 'credentials' ], { message: 'Invalid signin type.' })
  type: 'credentials'

  @ValidateIf(_object => _object.type == 'credentials')
  @Type(() => CredentialsDTO)
  @ValidateNested()
  credentials: CredentialsDTO
}

class SignUpDTO {
  @ValidateIf(_object => _object.type == 'credentials')
  @Type(() => CredentialsDTO)
  @ValidateNested()
  credentials: CredentialsDTO

  @IsString({ message: 'Invalid full name.' })
  full_name: string

  @IsString({ message: 'Invalid phone number.' })
  phone_number: string

  @IsEmail({  }, { message: 'Invalid email address.' })
  email_address: string
}

@Controller()
export class UserController {
  constructor (
  ) {  }


  @Post('v0/signin')
  async signin (
    @Request() _request:                        Express.Request,
    @Body() _body:                              SignInDTO,
    @Response() _response:                      Express.Response,
    @Headers('authorization') _authorization:   string,
    @Next() _next:                              Express.NextFunction
  ) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      if(typeof _sessionToken.userId == 'string') return _next(new Exception(_request, 'Already authorized.', HttpStatus.BAD_REQUEST))
      
      if(_body.type !== 'credentials') return _next(new Exception(_request, 'Invalid signin type.', HttpStatus.BAD_REQUEST))

      const _user = await getDatabaseClient().manager.findOne(User, { where: { username: _body.credentials.username, is_active: true } })
      if(_user == null) return _next(new Exception(_request, 'Wrong username.', HttpStatus.FORBIDDEN))

      const _passwordResult = await bcrypt.compare(_body.credentials.password, _user.password)
      if(_passwordResult == false) return _next(new Exception(_request, 'Wrong password.', HttpStatus.FORBIDDEN))

      if(_user.status !== UserStatus.Normal) {
        switch (_user.status) {
          case UserStatus.Pending:
            return _next(new Exception(_request, 'Pending approval.', HttpStatus.UNAUTHORIZED))
          case UserStatus.Suspended:
            return _next(new Exception(_request, 'Suspended.', HttpStatus.FORBIDDEN))
        }
      }
      const _result = await _sessionToken.signin(_user.uuid)
      if(_result.success == false) return _next(new Exception(_request, 'Failed to modify token.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))

      return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }

  @Post('v0/signup')
  async signup (
    @Request() _request:                        Express.Request,
    @Body() _body:                              SignUpDTO,
    @Response() _response:                      Express.Response,
    @Headers('authorization') _authorization:   string,
    @Next() _next:                              Express.NextFunction
  ) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))
      if(typeof _sessionToken.userId == 'string') return _next(new Exception(_request, 'Already signed up.', HttpStatus.BAD_REQUEST))

      const _permissions = await getDatabaseClient().manager.getRepository(Permission).find({ where: { is_default: true, is_active: true } })

      const _User = new User()
      _User.username = _body.credentials.username
      _User.password = await bcrypt.hash(_body.credentials.password, 10)
      _User.full_name = _body.full_name
      _User.email_address = _body.email_address
      _User.phone_number = _body.phone_number
      _User.permission = _permissions.map(_permission => _permission.uuid)

      const _user = await getDatabaseClient().manager.save(_User)
      if(_user.status == UserStatus.Normal) {
        const _result = await _sessionToken.signin(_user.uuid)
        if(_result.success == false) return _next(new Exception(_request, 'Failed to sign in.', HttpStatus.INTERNAL_SERVER_ERROR, _result.error))
      }

      return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }
  
  @Get('v0/userinfo')
  async userinfo (
    @Request() _request:                        Express.Request,
    @Response() _response:                      Express.Response,
    @Headers('authorization') _authorization:   string,
    @Next() _next:                              Express.NextFunction,
  ) {
    try {
      const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
      if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

      if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

      const _userinfo = await userPlugin.User.search(_sessionToken.userId)
      if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

      return _response.status(200).json({ success: true, data: {
        id: _userinfo.id,

        full_name: _userinfo.fullName,
        username: _userinfo.username,

        phone_number: _userinfo.phoneNumber,
        email_address: _userinfo.emailAddress
      }, error: null, requested_at: new Date().toISOString() })
    } catch(_error) { return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
  }
}
