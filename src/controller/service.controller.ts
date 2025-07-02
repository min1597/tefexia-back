import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Request, Response, Headers, Next, HttpStatus, Query } from '@nestjs/common'
import dayjs from 'dayjs'
import * as Express from 'express'
import { User } from 'src/resource/database/entity/User.entity'
import { getDatabaseClient } from 'src/resource/database/main'
import { Exception } from 'src/resource/plugin/error.plugin'
import tokenPlugin from 'src/resource/plugin/token.plugin'
import userPlugin from 'src/resource/plugin/user.plugin'
import utilityPlugin from 'src/resource/plugin/utility.plugin'
import axios from 'axios'
import { IsArray, IsIn, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { Service } from 'src/resource/database/entity/service/Service.entity'
import { Product } from 'src/resource/database/entity/service/Product.entity'
import { Instance, InstanceStatus } from 'src/resource/database/entity/Instance.entity'
import { ArrayContains, Not } from 'typeorm'
import { Permission } from 'src/resource/database/entity/Permission.entity'
import { Certification, CertificationStatus, CertificationType } from 'src/resource/database/entity/Certification.entity'
import certificationPlugin from 'src/resource/plugin/certification.plugin'
import CryptoJS from 'crypto-js'
import { Series } from 'src/resource/database/entity/service/Series.entity'
import { ProxmoxVE } from 'src/resource/database/entity/hypervisor/ProxmoxVE.entity'
import paymentPlugin from 'src/resource/plugin/payment.plugin'
import { Order, OrderStatus } from 'src/resource/database/entity/Order.entity'

class PurchaseProductDTO {
    @IsUUID('4', { message: 'Invalid product id.' })
    product_id: string

    @IsString({ message: 'Invalid instance label.' })
    instance_label: string

    @IsString({ message: 'Invalid region.' })
    region: string

    @IsIn([ 'linux_ubuntu_22_04' ], { message: 'Invalid operating system.' })
    operating_system: 'linux_ubuntu_22_04'
}

@Controller()
export class ServiceController {
    constructor (

    ) {  }

    @Get('v0/service/service')
    async getServices (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _services = await getDatabaseClient().manager.getRepository(Service).find({ where: _userinfo.permissions.map(_permission => {
                return {
                    permission_id: _permission.id,
                    is_active: true,
                }
            }), order: { 'srl': 'asc' } })

            return _response.status(200).json({ success: true, data: {
                services: _services.map(_service => {
                    return {
                        id: _service.uuid,
                        name: _service.name,
                        description: _service.description
                    }
                })
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error.response.data); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Get('v0/service/service/:serviceId')
    async getSeries (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Param('serviceId') _serviceId: string,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            try {
                utilityPlugin.validateUUID(_serviceId)
            } catch(_error) { return _next(new Exception(_request, 'Invalid service id.', HttpStatus.BAD_REQUEST, _error)) }

            const _service = await getDatabaseClient().manager.getRepository(Service).findOne({ where: { uuid: utilityPlugin.validateUUID(_serviceId), is_active: true } })
            if(_service == null) return _next(new Exception(_request, 'Wrong service id.', HttpStatus.BAD_REQUEST))

            if(_userinfo.permissions.map(_permission => _permission.id).includes(_service.permission_id) == false) return _next(new Exception(_request, 'Unauthorized service.', HttpStatus.FORBIDDEN))

            const _series = await getDatabaseClient().manager.getRepository(Series).find({ where: _userinfo.permissions.map(_permission => {
                return {
                    service_id: _service.uuid,
                    permission_id: _permission.id,
                    is_active: true
                }
            }), order: { 'srl': 'asc' } })

            return _response.status(200).json({ success: true, data: {
                series: _series.map(_series => {
                    return {
                        id: _series.uuid,
                        name: _series.name,
                        description: _series.description,
                        regions: _series.regions.map(_region => {
                            return {
                                name: _region.name,
                                city_code: _region.city_code
                            }
                        })
                    }
                })
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error.response.data); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Get('v0/service/service/:serviceId/series/:seriesId/:regionName')
    async getProducts (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Param('serviceId') _serviceId: string,
        @Param('seriesId') _seriesId: string,
        @Param('regionName') _regionName: string,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            try {
                utilityPlugin.validateUUID(_serviceId)
            } catch(_error) { return _next(new Exception(_request, 'Invalid service id.', HttpStatus.BAD_REQUEST, _error)) }

            const _service = await getDatabaseClient().manager.getRepository(Service).findOne({ where: { uuid: utilityPlugin.validateUUID(_serviceId), is_active: true } })
            if(_service == null) return _next(new Exception(_request, 'Wrong service id.', HttpStatus.BAD_REQUEST))

            if(_userinfo.permissions.map(_permission => _permission.id).includes(_service.permission_id) == false) return _next(new Exception(_request, 'Unauthorized service.', HttpStatus.FORBIDDEN))

            try {
                utilityPlugin.validateUUID(_serviceId)
            } catch(_error) { return _next(new Exception(_request, 'Invalid service id.', HttpStatus.BAD_REQUEST, _error)) }

            const _series = await getDatabaseClient().manager.getRepository(Series).findOne({ where: { uuid: utilityPlugin.validateUUID(_seriesId), service_id: _service.uuid, is_active: true } })
            if(_series == null) return _next(new Exception(_request, 'Wrong service id.', HttpStatus.BAD_REQUEST))

            if(_series.regions.find(_region => _region.city_code == _regionName) == undefined) return _next(new Exception(_request, 'Wrong region name.', HttpStatus.BAD_REQUEST))
            
            const _clusters = _series.regions.find(_region => _region.city_code == _regionName).clusters

            const _peakStock = {
                memory: 0,
                cpu: 0,
                disk: 0
            }

            for(const _index in _clusters) {
                if(_clusters[_index].type == 'ProxmoxVE') {
                    const _proxmoxVE = await getDatabaseClient().manager.getRepository(ProxmoxVE).findOne({ where: { uuid: _clusters[_index].id, is_active: true } })
                    if(_proxmoxVE == null) return _next(new Exception(_request, 'Wrong cluster id.', HttpStatus.BAD_REQUEST))

                    const _instances = await getDatabaseClient().manager.find(Instance, { where: [ InstanceStatus.ACTIVE, InstanceStatus.WAITING_FOR_PAYMENT ].map(_status => {
                        return {
                            status: _status,
                            cluster_id: _clusters[_index].id,
                            is_active: true
                        }
                    }) })

                    const _usedStock = {
                        memory: 0,
                        cpu: 0,
                        disk: 0
                    }
                    
                    const _usedStocks =(await Promise.all(_instances.map(async _instance => {
                        const _product = await getDatabaseClient().manager.getRepository(Product).findOne({ where: { uuid: _instance.product_id, is_active: true } })
                        if(_product == null) return 0

                        return [ _product.specification.memory, _product.specification.cpu, _product.specification.disk ]
                    }))).forEach(_stock => {
                        _usedStock.memory += _stock[0]
                        _usedStock.cpu += _stock[1]
                        _usedStock.disk += _stock[2]
                    })

                    const _availableStock = {
                        memory: _proxmoxVE.specification.memory - _usedStock.memory,
                        cpu: _proxmoxVE.specification.cpu - _usedStock.cpu,
                        disk: _proxmoxVE.specification.disk - _usedStock.disk
                    }

                    if(_availableStock.memory > _peakStock.memory) {
                        _peakStock.cpu = _availableStock.cpu
                        _peakStock.memory = _availableStock.memory
                        _peakStock.disk = _availableStock.disk
                    }
                }
            }

            if(_userinfo.permissions.map(_permission => _permission.id).includes(_series.permission_id) == false) return _next(new Exception(_request, 'Unauthorized service.', HttpStatus.FORBIDDEN))

            const _products = await getDatabaseClient().manager.getRepository(Product).find({ where: { series_id: _series.uuid, is_active: true }, order: { 'price': 'asc' } })

            return _response.status(200).json({ success: true, data: {
                products: _products.map(_product => {
                    return {
                        id: _product.uuid,
                        image: _product.image,
                        name: _product.name,
                        description: _product.description,
                        price: _product.price,

                        is_available: (_peakStock.memory >= _product.specification.memory) && (_peakStock.cpu >= _product.specification.cpu) && (_peakStock.disk >= _product.specification.disk)
                    }
                })
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Post('v0/instance')
    async purchaseProduct (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Body() _body: PurchaseProductDTO,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))

            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            const _product = await getDatabaseClient().manager.getRepository(Product).findOne({ where: { uuid: utilityPlugin.validateUUID(_body.product_id), is_active: true } })
            if(_product == null) return _next(new Exception(_request, 'Wrong product id.', HttpStatus.BAD_REQUEST))

            if(_userinfo.permissions.filter(_permission => _permission.id == _product.permission_id).length !== 1) return _next(new Exception(_request, 'Wrong product id.', HttpStatus.FORBIDDEN))
            
            const _user = await getDatabaseClient().manager.getRepository(User).findOne({ where: { uuid: _userinfo.id, is_active: true } })
            if(_user == null) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR))

            const _series = await getDatabaseClient().manager.getRepository(Series).findOne({ where: { uuid: _product.series_id, is_active: true } })
            if(_userinfo.permissions.filter(_permission => _permission.id == _series.permission_id).length !== 1) return _next(new Exception(_request, 'Wrong series.', HttpStatus.FORBIDDEN))

            const _service = await getDatabaseClient().manager.getRepository(Service).findOne({ where: { uuid: _series.service_id, is_active: true } })
            if(_userinfo.permissions.filter(_permission => _permission.id == _service.permission_id).length !== 1) return _next(new Exception(_request, 'Wrong service.', HttpStatus.FORBIDDEN))

            if(_series.regions.find(_region => _region.city_code == _body.region) == undefined) return _next(new Exception(_request, 'Wrong region name.', HttpStatus.BAD_REQUEST))
            
            const _clusters = _series.regions.find(_region => _region.city_code == _body.region).clusters


            const _peakStock: {
                memory: number,
                cpu: number,
                disk: number,
                clusterId: string & { __brand: 'UUID' } | null
            } = {
                memory: 0,
                cpu: 0,
                disk: 0,
                clusterId: null
            }

            for(const _index in _clusters) {
                if(_clusters[_index].type == 'ProxmoxVE') {
                    const _proxmoxVE = await getDatabaseClient().manager.getRepository(ProxmoxVE).findOne({ where: { uuid: _clusters[_index].id, is_active: true } })
                    if(_proxmoxVE == null) return _next(new Exception(_request, 'Wrong cluster id.', HttpStatus.BAD_REQUEST))

                    const _instances = await getDatabaseClient().manager.find(Instance, { where: [ InstanceStatus.ACTIVE, InstanceStatus.WAITING_FOR_PAYMENT ].map(_status => {
                        return {
                            status: _status,
                            cluster_id: _clusters[_index].id,
                            is_active: true
                        }
                    }) })

                    const _usedStock = {
                        memory: 0,
                        cpu: 0,
                        disk: 0
                    }
                    
                    const _usedStocks =(await Promise.all(_instances.map(async _instance => {
                        const _product = await getDatabaseClient().manager.getRepository(Product).findOne({ where: { uuid: _instance.product_id, is_active: true } })
                        if(_product == null) return 0

                        return [ _product.specification.memory, _product.specification.cpu, _product.specification.disk ]
                    }))).forEach(_stock => {
                        _usedStock.memory += _stock[0]
                        _usedStock.cpu += _stock[1]
                        _usedStock.disk += _stock[2]
                    })

                    const _availableStock = {
                        memory: _proxmoxVE.specification.memory - _usedStock.memory,
                        cpu: _proxmoxVE.specification.cpu - _usedStock.cpu,
                        disk: _proxmoxVE.specification.disk - _usedStock.disk
                    }

                    if(_availableStock.memory > _peakStock.memory) {
                        _peakStock.cpu = _availableStock.cpu
                        _peakStock.memory = _availableStock.memory
                        _peakStock.disk = _availableStock.disk
                        _peakStock.clusterId = _clusters[_index].id
                    }
                }
            }

            if(
                _product.specification.memory > _peakStock.memory
                || _product.specification.cpu > _peakStock.cpu
                || _product.specification.disk > _peakStock.disk
            ) return _next(new Exception(_request, 'No available stock.', HttpStatus.BAD_REQUEST))

            const _instance = await getDatabaseClient().manager.getRepository(Instance).save({
                name: _body.instance_label,

                operating_system: _body.operating_system,

                product_id: _product.uuid,
                series_id: _series.uuid,
                service_id: _service.uuid,

                cluster_id: _peakStock.clusterId,

                expires_date: dayjs().add(1, 'day').toDate(),

                user_id: [ _user.uuid ]
            })

            const _order = await paymentPlugin.Order.create('Instance', [
                { name: _product.name, price: _product.price, isTaxFree: true }
            ], 0, 0, _product.price, utilityPlugin.getRandomStrings(10), _user.uuid, _instance.uuid)
            if(_order.success == false) return _next(new Exception(_request, 'Failed to create order.', HttpStatus.INTERNAL_SERVER_ERROR, _order.error))

            const _payment = await paymentPlugin.Payment.create(_order.orderId)
            if(_payment.success == false) return _next(new Exception(_request, 'Failed to create payment.', HttpStatus.INTERNAL_SERVER_ERROR, _payment.error))

            return _response.status(200).json({ success: true, data: {
                payment_id: _payment.paymentId,
                instance_id: _instance.uuid
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Post('v0/instance/:instanceId/confirm')
    async confirmPayment (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Param('instanceId') _instanceId: string,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            try {
                utilityPlugin.validateUUID(_instanceId)
            } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }

            const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
            if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

            if(_instance.user_id.includes(_sessionToken.userId) == false) return _next(new Exception(_request, 'Unauthorized access.', HttpStatus.BAD_REQUEST, new Error('Unauthorized access to payment option.')))

            if(_instance.status !== InstanceStatus.WAITING_FOR_PAYMENT) return _next(new Exception(_request, 'Instance is not waiting for payment.', HttpStatus.BAD_REQUEST, new Error('Instance is not waiting for payment.')))

            const _order = await getDatabaseClient().manager.getRepository(Order).findOne({ where: { instance_id: _instance.uuid, is_active: true }, order: { created_date: 'desc' } })
            const _paypalAuthenticationResult = await axios.post(
                `${ process.env.PAYPAL_API_ENDPOINT }/v1/oauth2/token`,
                new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
                { headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${ CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(`${ process.env.PAYPAL_CLIENT_ID }:${ process.env.PAYPAL_CLIENT_SECRET }`)) }`
                } }
            )
            if(_paypalAuthenticationResult.status !== 200) return { success: false, error: new Error('Failed to authenticate with PayPal.') }
            const _captureResult: { success: true, data: any, status: number, raw?: any } | { success: false, error: string, status: number, raw?: any } = await new Promise((_resolve, _reject) => {
                axios.post(`${ process.env.PAYPAL_API_ENDPOINT }/v2/checkout/orders/${ _order.payment_id }/capture`, {  }, { headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ _paypalAuthenticationResult.data.access_token }`
                } })
                    .then(_result => _resolve({ success: true, data: _result.data, status: _result.status, raw: _result }))
                    .catch(_error => _resolve({ success: false, error: _error.response.data.error, status: _error.response.status, raw: _error }))
            })

            if(_captureResult.status == 422 || (_captureResult.success == true && _captureResult.data.status !== 'COMPLETED')) return _response.status(200).json({ success: true, data: {
                payment_id: _order.payment_id,
                instance_id: _instance.uuid
            }, error: null, requested_at: new Date().toISOString() })

            if(_captureResult.success == false) return _next(new Exception(_request, 'Failed to capture payment.', HttpStatus.INTERNAL_SERVER_ERROR, new Error('Failed to capture payment.')))
            

            await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid, is_active: true }, { status: InstanceStatus.PENDING, expires_date: null })
            await getDatabaseClient().manager.getRepository(Order).update({ uuid: _order.uuid, is_active: true }, { status: OrderStatus.DONE })

            return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Get('v0/instance')
    async getInstances (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            let _instances = await getDatabaseClient().manager.find(Instance, { where: { user_id: ('manage' in _request.query == true && _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == true) ? undefined : ArrayContains([ _sessionToken.userId ]), is_active: true } })

            for (const _index in _instances) {
                if('expires_date' in _instances[_index]) {
                    const _expiresDate = dayjs(_instances[_index].expires_date)
                    if(_expiresDate.diff() <= 0) {
                        const _updateStatus = [
                            InstanceStatus.WAITING_FOR_PAYMENT
                        ].includes(_instances[_index].status) ? InstanceStatus.FAILURE : InstanceStatus.TERMINATED
                        await getDatabaseClient().manager.getRepository(Instance).update({
                            uuid: _instances[_index].uuid,
                            is_active: true
                        }, {
                            status: _updateStatus,
                            expires_date: null
                        })
                        _instances = _instances.filter(_instance => _instance.uuid !== _instances[_index].uuid)
                        continue
                    }
                }
                if(_instances[_index].status === InstanceStatus.FAILURE) {
                    if(dayjs(_instances[_index].updated_date).add(1, 'hour').diff() <= 0) {
                        await getDatabaseClient().manager.getRepository(Instance).update({
                            uuid: _instances[_index].uuid,
                            is_active: true
                        }, {
                            is_active: false
                        })
                        _instances = _instances.filter(_instance => _instance.uuid !== _instances[_index].uuid)
                        continue
                    }
                }
            }

            return _response.status(200).json({ success: true, data: { instances: await Promise.all(_instances.map(async _instance => {
                return {
                    id: _instance.uuid,
                    name: _instance.name,
                    status: _instance.status.toLowerCase(),
                    expires_at: _instance.expires_date ? _instance.expires_date.toISOString() : null,
                    created_at: _instance.created_date.toISOString()
                }
            })) }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    @Get('v0/instance/:instanceId')
    async getInstance (
        @Request() _request: Express.Request,
        @Response() _response: Express.Response,
        @Headers('authorization') _authorization: string,
        @Param('instanceId') _instanceId: string,
        @Next() _next: Express.NextFunction
    ) {
        try {
            const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
            if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

            if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
            const _userinfo = await userPlugin.User.search(_sessionToken.userId)
            if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

            try {
                utilityPlugin.validateUUID(_instanceId)
            } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }

            const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
            if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

            if([ InstanceStatus.ACTIVE ].includes(_instance.status) == false) return _next(new Exception(_request, 'Instance is not successful.', HttpStatus.BAD_REQUEST, new Error('Instance is not successful.')))
            if(
                _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == false
                && _instance.user_id.includes(_sessionToken.userId) == false
            ) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

            const _product = await getDatabaseClient().manager.getRepository(Product).findOne({ where: { uuid: _instance.product_id, is_active: true } })
            if(_product == null) return _next(new Exception(_request, 'Failed to fetch product.', HttpStatus.BAD_REQUEST, new Error('Product not found.')))
            
            const _series = await getDatabaseClient().manager.getRepository(Series).findOne({ where: { uuid: _product.series_id, is_active: true } })
            if(_series == null) return _next(new Exception(_request, 'Failed to fetch series.', HttpStatus.BAD_REQUEST, new Error('Series not found.')))

            const _service = await getDatabaseClient().manager.getRepository(Service).findOne({ where: { uuid: _series.service_id, is_active: true } })
            if(_service == null) return _next(new Exception(_request, 'Failed to fetch service.', HttpStatus.BAD_REQUEST, new Error('Service not found.')))

            return _response.status(200).json({ success: true, data: {
                id: _instance.uuid,
                name: _instance.name,
                status: _instance.status.toLowerCase(),

                product: {
                    id: _product.uuid,
                    series: `${ _service.name } ${ _series.name }`,
                    name: _product.name,
                    price: _product.price
                },

                expires_at: _instance.expires_date ? _instance.expires_date.toISOString() : null,
                created_at: _instance.created_date.toISOString()
            }, error: null, requested_at: new Date().toISOString() })
        } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    }

    // @Post('v0/instance/:instanceId/extend')
    // async extendInstance (
    //     @Request() _request: Express.Request,
    //     @Response() _response: Express.Response,
    //     @Headers('authorization') _authorization: string,
    //     @Param('instanceId') _instanceId: string,
    //     @Next() _next: Express.NextFunction
    // ) {
    //     try {
    //         const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    //         if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

    //         if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
    //         const _userinfo = await userPlugin.User.search(_sessionToken.userId)
    //         if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

    //         try {
    //             utilityPlugin.validateUUID(_instanceId)
    //         } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }

    //         const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
    //         if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))
            
    //         if(
    //             _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == false
    //             && _instance.user_id.includes(_sessionToken.userId) == false
    //         ) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if([ InstanceStatus.RUNNING, InstanceStatus.UNDER_ATTACK ].includes(_instance.status) == false) return _next(new Exception(_request, 'Instance is not successful.', HttpStatus.BAD_REQUEST, new Error('Instance is not successful.')))

    //         if(_instance.user_id[0] !== _sessionToken.userId) return _next(new Exception(_request, 'Unauthorized access.', HttpStatus.BAD_REQUEST, new Error('Unauthorized access to payment option.')))

    //         const _provider = await getDatabaseClient().manager.getRepository(Provider).findOne({ where: { uuid: _instance.provider_id, is_active: true } })
    //         if(_provider == null) return _next(new Exception(_request, 'Failed to fetch provider.', HttpStatus.BAD_REQUEST, new Error('Provider not found.')))

    //         const _webhookResult = await axios.post(`${ _provider.webhook_url }`, {
    //             type: 'instance.extend.requested',
    //             data: {
    //                 instance_id: _instance.uuid
    //             }
    //         })
    //     } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    // }

    // @Delete('v0/instance/:instanceId')
    // async deleteInstance (
    //     @Request() _request: Express.Request,
    //     @Response() _response: Express.Response,
    //     @Headers('authorization') _authorization: string,
    //     @Param('instanceId') _instanceId: string,
    //     @Next() _next: Express.NextFunction
    // ) {
    //     try {
    //         const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    //         if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

    //         if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
    //         const _userinfo = await userPlugin.User.search(_sessionToken.userId)
    //         if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

    //         try {
    //             utilityPlugin.validateUUID(_instanceId)
    //         } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }
            
    //         const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
    //         if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if(
    //             _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == false
    //             && _instance.user_id.includes(_sessionToken.userId) == false
    //         ) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if([ InstanceStatus.CANCELLED, InstanceStatus.FAILURE, InstanceStatus.EXPIRED ].includes(_instance.status) == false) return _next(new Exception(_request, 'Wrong instance status.', HttpStatus.BAD_REQUEST, new Error('Wrong instance status.')))

    //         await getDatabaseClient().manager.getRepository(Instance).update({ uuid: _instance.uuid }, { is_active: false })

    //         return _response.status(200).json({ success: true, data: null, error: null, requested_at: new Date().toISOString() })
    //     } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    // }

    // @Get('v0/product/:productId')
    // async getProduct (
    //     @Request() _request: Express.Request,
    //     @Response() _response: Express.Response,
    //     @Headers('authorization') _authorization: string,
    //     @Param('productId') _productId: string,
    //     @Next() _next: Express.NextFunction
    // ) {
    //     try {
    //         const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    //         if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

    //         if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
    //         const _userinfo = await userPlugin.User.search(_sessionToken.userId)
    //         if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

    //         try {
    //             utilityPlugin.validateUUID(_productId)
    //         } catch(_error) { return _next(new Exception(_request, 'Invalid product id.', HttpStatus.BAD_REQUEST, _error)) }

    //         const _product = await getDatabaseClient().manager.getRepository(Product).findOne({ where: { uuid: utilityPlugin.validateUUID(_productId), is_active: true } })
    //         if(_product == null) return _next(new Exception(_request, 'Wrong product id.', HttpStatus.BAD_REQUEST, new Error('Product not found.')))

    //         const _service = await getDatabaseClient().manager.getRepository(Service).findOne({ where: { uuid: _product.service_id, is_active: true } })
    //         if(_service == null) return _next(new Exception(_request, 'Failed to fetch service.', HttpStatus.BAD_REQUEST, new Error('Service not found.')))

    //         const _provider = await getDatabaseClient().manager.getRepository(Provider).findOne({ where: { uuid: _service.provider_id, is_active: true } })
    //         if(_provider == null) return _next(new Exception(_request, 'Failed to fetch provider.', HttpStatus.BAD_REQUEST, new Error('Provider not found.')))

    //         return _response.status(200).json({ success: true, data: {
    //             id: _product.uuid,
    //             name: _product.name,
    //             service_name: _service.name,
    //             provider_name: _provider.name,
    //             description: _product.description,
    //             service_cycle: _product.service_cycle.toLowerCase(),
    //             price: _product.price
    //         }, error: null, requested_at: new Date().toISOString() })
    //     } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    // }

    // @Get('v0/instance/:instanceId/data/:dataName')
    // async getInstanceData (
    //     @Request() _request: Express.Request,
    //     @Response() _response: Express.Response,
    //     @Headers('authorization') _authorization: string,
    //     @Param('instanceId') _instanceId: string,
    //     @Param('dataName') _dataName: string,
    //     @Next() _next: Express.NextFunction
    // ) {
    //     try {
    //         const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    //         if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

    //         if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
    //         const _userinfo = await userPlugin.User.search(_sessionToken.userId)
    //         if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

    //         try {
    //             utilityPlugin.validateUUID(_instanceId)
    //         } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }
            
    //         const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
    //         if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if(
    //             _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == false
    //             && _instance.user_id.includes(_sessionToken.userId) == false
    //         ) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if([ InstanceStatus.RUNNING, InstanceStatus.UNDER_ATTACK ].includes(_instance.status) == false) return _next(new Exception(_request, 'Instance is not successful.', HttpStatus.BAD_REQUEST, new Error('Instance is not successful.')))
            
    //         const _data = _instance.display_data.find(_displayData => _displayData.value === _dataName && _displayData.is_http == true)
    //         if(_data == undefined) return _next(new Exception(_request, 'Invalid data.', HttpStatus.BAD_REQUEST, new Error('Invalid data.')))

    //         if((_data.is_http ?? false) == true) {
    //             const _dataResult = await axios.post(_instance.action_url, {
    //                 type: 'instance.data.get',
    //                 data: {
    //                     instance_id: _instance.uuid,
    //                     name: _data.value
    //                 }
    //             })
    //             return _response.status(200).json({ success: true, data: _dataResult.data.data.value, error: null, requested_at: new Date().toISOString() })
    //         } else return _next(new Exception(_request, 'Invalid data.', HttpStatus.BAD_REQUEST, new Error('Invalid data.')))
    //     } catch(_error) { console.log(_error.response.data); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    // }

    // @Get('v0/instance/:instanceId/actions')
    // async getInstanceActions (
    //     @Request() _request: Express.Request,
    //     @Response() _response: Express.Response,
    //     @Headers('authorization') _authorization: string,
    //     @Param('instanceId') _instanceId: string,
    //     @Next() _next: Express.NextFunction
    // ) {
    //     try {
    //         const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    //         if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

    //         if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
    //         const _userinfo = await userPlugin.User.search(_sessionToken.userId)
    //         if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

    //         try {
    //             utilityPlugin.validateUUID(_instanceId)
    //         } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }

    //         const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
    //         if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if(
    //             _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == false
    //             && _instance.user_id.includes(_sessionToken.userId) == false
    //         ) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if([ InstanceStatus.RUNNING, InstanceStatus.UNDER_ATTACK ].includes(_instance.status) == false) return _next(new Exception(_request, 'Instance is not successful.', HttpStatus.BAD_REQUEST, new Error('Instance is not successful.')))

    //         const _product = await getDatabaseClient().manager.getRepository(Product).findOne({ where: { uuid: _instance.product_id, is_active: true } })
    //         if(_product == null) return _next(new Exception(_request, 'Failed to fetch product.', HttpStatus.BAD_REQUEST, new Error('Product not found.')))
            
    //         const _service = await getDatabaseClient().manager.getRepository(Service).findOne({ where: { uuid: _product.service_id, is_active: true } })
    //         if(_service == null) return _next(new Exception(_request, 'Failed to fetch service.', HttpStatus.BAD_REQUEST, new Error('Service not found.')))

    //         const _provider = await getDatabaseClient().manager.getRepository(Provider).findOne({ where: { uuid: _instance.provider_id, is_active: true } })
    //         if(_provider == null) return _next(new Exception(_request, 'Failed to fetch provider.', HttpStatus.BAD_REQUEST, new Error('Provider not found.')))

    //         return _response.status(200).json({ success: true, data: _instance.actions.map(_actionButton => {
    //             return {
    //                 color: _actionButton.color,
    //                 icon: _actionButton.icon,
    //                 label: _actionButton.label,
    //                 value: _actionButton.value
    //             }
    //         }), error: null, requested_at: new Date().toISOString() })
    //     } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    // }

    // @Post('v0/instance/:instanceId/action')
    // async actionInstance (
    //     @Request() _request: Express.Request,
    //     @Response() _response: Express.Response,
    //     @Headers('authorization') _authorization: string,
    //     @Param('instanceId') _instanceId: string,
    //     @Body() _body: { action: string },
    //     @Next() _next: Express.NextFunction
    // ) {
    //     try {
    //         const _sessionToken = await tokenPlugin.Session.getSummary(utilityPlugin.tokenParser(_authorization))
    //         if(_sessionToken.success == false) return _next(new Exception(_request, 'Failed to load session token.', HttpStatus.FORBIDDEN, _sessionToken.error))

    //         if(typeof _sessionToken.userId !== 'string') return _next(new Exception(_request, 'Not authenticated.', HttpStatus.UNAUTHORIZED))
            
    //         const _userinfo = await userPlugin.User.search(_sessionToken.userId)
    //         if(_userinfo.success == false) return _next(new Exception(_request, 'Failed to fetch user data.', HttpStatus.INTERNAL_SERVER_ERROR, _userinfo.error))

    //         try {
    //             utilityPlugin.validateUUID(_instanceId)
    //         } catch(_error) { return _next(new Exception(_request, 'Invalid instance id.', HttpStatus.BAD_REQUEST, _error)) }
            
    //         const _instance = await getDatabaseClient().manager.getRepository(Instance).findOne({ where: { uuid: utilityPlugin.validateUUID(_instanceId), is_active: true } })
    //         if(_instance == null) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if(
    //             _userinfo.permissions.some(_permission => _permission.id == process.env.COMMON_MANAGER_PERMISSION_ID as string & { __brand: 'UUID' }) == false
    //             && _instance.user_id.includes(_sessionToken.userId) == false
    //         ) return _next(new Exception(_request, 'Wrong instance id.', HttpStatus.BAD_REQUEST, new Error('Instance not found.')))

    //         if([ InstanceStatus.RUNNING, InstanceStatus.UNDER_ATTACK ].includes(_instance.status) == false) return _next(new Exception(_request, 'Instance is not successful.', HttpStatus.BAD_REQUEST, new Error('Instance is not successful.')))
            
    //         const _action = _instance.actions.find(_action => _action.value === _body.action)
    //         if(_action == undefined) return _next(new Exception(_request, 'Invalid action.', HttpStatus.BAD_REQUEST, new Error('Invalid action.')))

    //         if(_instance.action_url == null) return _next(new Exception(_request, 'Action URL is not set.', HttpStatus.BAD_REQUEST, new Error('Action URL is not set.')))

    //         const _webhookResult = await axios.post(_instance.action_url, {
    //             type: `instance.action.${ _action.value }`,
    //             data: {
    //                 instance_id: _instance.uuid
    //             }
    //         })
    //         if(_webhookResult.status !== 200) return _next(new Exception(_request, 'Failed to send action.', HttpStatus.BAD_REQUEST, new Error('Failed to send webhook.')))
    //         if(_webhookResult.data.data?.popup) {
    //             return _response.status(200).json({
    //                 success: true,
    //                 data: {
    //                     popup: _webhookResult.data.data.popup
    //                 },
    //                 error: null,
    //                 requested_at: new Date().toISOString()
    //             })
    //         } else if(_webhookResult.data.data?.reaction) {
    //             return _response.status(200).json({
    //                 success: true,
    //                 data: {
    //                     reaction: _webhookResult.data.data.reaction
    //                 },
    //                 error: null,
    //                 requested_at: new Date().toISOString()
    //             })
    //         }
    //     } catch(_error) { console.log(_error); return _next(new Exception(_request, 'An unknown error has occured.', HttpStatus.INTERNAL_SERVER_ERROR, _error)) }
    // }
}