import { Controller, Get, Next, Request, Response } from '@nestjs/common'
import Express from 'express'
import gitManager from 'git-rev-sync'
import utilityPlugin from 'src/resource/plugin/utility.plugin'

@Controller()
export class AppController {
  constructor (

  ) {  }


  @Get('/')
  async main (
    @Request() _request: Express.Request,
    @Response() _response: Express.Response,
    @Next() _next: Express.NextFunction
  ) {
    _response.status(200).json({
      success: true,
      version: gitManager.short()
    })
  }

  @Get('/public')
  async getPublicKey (
    @Request() _request: Express.Request,
    @Response() _response: Express.Response,
    @Next() _next: Express.NextFunction
  ) {
    _response.status(200).json({
      success: true,
      public_key: utilityPlugin.RSA.publicKey
    })
  }
}
