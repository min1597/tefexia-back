import { Order } from '../database/entity/Order.entity'
import { getDatabaseClient } from '../database/main'
import userPlugin from './user.plugin'
import paymentPlugin from './payment.plugin'
import axios from 'axios'
import utilityPlugin from './utility.plugin'
import { User } from '../database/entity/User.entity'
import CryptoJS from 'crypto-js'

export default {
    pluginName: 'paymentPlugin',

    Payment: {
        create: async (
            _orderId: string & { __brand: 'UUID' }
        ): Promise<{ success: true, paymentId: string & { __brand: 'UUID' } } | { success: false, error?: Error }> => {
            try {
                const _orderResult = await paymentPlugin.Order.search(_orderId)
                if(_orderResult.success !== true) return { success: false, error: new Error('Failed to fetch order data.', { cause: _orderResult.error }) }

                const _user = await getDatabaseClient().manager.findOne(User, { where: { uuid: _orderResult.userId, is_active: true } })
                if(_user == null) return { success: false, error: new Error('Failed to fetch user data.') }

                const _paypalAuthenticationResult = await axios.post(
                    `${ process.env.PAYPAL_API_ENDPOINT }/v1/oauth2/token`,
                    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
                    { headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${ CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(`${ process.env.PAYPAL_CLIENT_ID }:${ process.env.PAYPAL_CLIENT_SECRET }`)) }`
                    } }
                )
                if(_paypalAuthenticationResult.status !== 200) return { success: false, error: new Error('Failed to authenticate with PayPal.') }

                const _paymentResult = await axios.post(`${ process.env.PAYPAL_API_ENDPOINT }/v2/checkout/orders`, {
                    purchase_units: [ { amount: { currency_code: 'USD', value: (_orderResult.suppliedAmount + _orderResult.vat + _orderResult.taxFreeAmount) }, reference_id: 'd9f80740-38f0-11e8-b467-0ed5f89f718b' } ],
                    intent: 'CAPTURE',
                    // payment_source: {
                    //     paypal: {
                    //         experience_context: {
                    //             payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
                    //             payment_method_selected: 'PAYPAL',
                    //             brand_name: 'Tefexia ',
                    //             locale: 'en-US',
                    //             landing_page: 'LOGIN',
                    //             shipping_preference: 'GET_FROM_FILE',
                    //             user_action: 'PAY_NOW',
                    //             return_url: 'https://example.com/returnUrl',
                    //             cancel_url: 'https://example.com/cancelUrl'
                    //         }
                    //     }
                    // }
                }, { headers: { authorization: `Bearer ${ _paypalAuthenticationResult.data.access_token }` } })
                if(_paymentResult.status !== 201) return { success: false, error: new Error('Failed to create payment.') }
                await getDatabaseClient().manager.update(Order, { uuid: _orderResult.id }, { payment_id: _paymentResult.data.id })

                return { success: true, paymentId: _paymentResult.data.id }
            } catch(_error) { console.log(_error); return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
    },
    Order: {
        search: async (
            _orderId: string & { __brand: 'UUID' }
        ): Promise<{
            success: true,
            id: string & { __brand: 'UUID' },
            name: string,
            products: Array<{ name: string, price: number, isTaxFree: boolean }>,
            suppliedAmount: number,
            vat: number,
            taxFreeAmount: number,
            secret: string,
            userId: string & { __brand: 'UUID' }
        } | { success: false, error?: Error }> => {
            try {
                const _order = await getDatabaseClient().manager.findOne(Order, { where: { uuid: _orderId } })
                if(_order == null) return { success: false, error: new Error('Wrong order id.') }

                return { success: true, id: _order.uuid, name: _order.name, products: _order.products.map((_product) => ({ name: _product.name, price: Number(_product.price), isTaxFree: _product.is_tax_free })), suppliedAmount: _order.supplied_amount, vat: _order.vat, taxFreeAmount: _order.tax_free_amount, secret: _order.secret, userId: _order.user_id }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        create: async (
            _orderName: string,
            _products: Array<{ name: string, price: number, isTaxFree: boolean }>,
            _suppliedAmount: number,
            _vat: number,
            _taxFreeAmount: number,
            _secret: string,
            _userId: string & { __brand: 'UUID' },
            _instanceId: string & { __brand: 'UUID' }
        ): Promise<{ success: true, orderId: string & { __brand: 'UUID' } } | { success: false, error?: Error }> => {
            try {
                const _userinfo = await userPlugin.User.search(_userId)
                if(_userinfo.success !== true) return { success: false, error: new Error('An unknown error has occured.') }

                const _order = await getDatabaseClient().manager.getRepository(Order).save({
                    name: _orderName,
                    products: _products.map(_product => ({ name: _product.name, price: Number(_product.price), is_tax_free: _product.isTaxFree })),
                    supplied_amount: _suppliedAmount,
                    vat: _vat,
                    tax_free_amount: _taxFreeAmount,
                    secret: _secret,
                    user_id: _userinfo.id,
                    instance_id: _instanceId
                })

                return { success: true, orderId: _order.uuid }
            } catch(_error) { console.log(_error); return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
    }
}