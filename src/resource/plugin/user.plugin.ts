import axios from 'axios'
import { Token, TokenMethod, TokenStatus } from '../database/entity/Token.entity'
import { getDatabaseClient } from '../database/main'
import utilityPlugin from './utility.plugin'
import tokenPlugin from './token.plugin'
import CryptoJS from 'crypto-js'
import dayjs from 'dayjs'
import { User, UserStatus } from '../database/entity/User.entity'
import { ArrayContains } from 'typeorm'
import { Permission } from '../database/entity/Permission.entity'
import { Exception } from './error.plugin'

export default {
    pluginName: 'userPlugin',


    User: {
        search: async (_uuid: string & { __brand: 'UUID' }): Promise<
            {
                success: true,
                id: string & { __brand: 'UUID' },
                username: string,
                fullName: string,
                emailAddress: string,
                phoneNumber: string,
                status: 'Pending' | 'Normal' | 'Suspended',

                permissions: Array<{ id: string & { __brand: 'UUID' }, name: string, isManager: boolean, isDefault: boolean }>,

                suspend: () => Promise<{ success: true } | { success: false, error?: Error }>,
                unsuspend: () => Promise<{ success: true } | { success: false, error?: Error }>
            }
            | { success: false, error?: Error }
        > => {
            try {
                const _users = await getDatabaseClient().manager.getRepository(User).find({ where: { uuid: _uuid, is_active: true } })
                if(_users.length !== 1) return { success: false, error: new Error('Wrong user id.') }

                const _permissions = await Promise.all(_users[0].permission.map(async _permission => {
                    const _permissions = await getDatabaseClient().manager.getRepository(Permission).find({ where: { uuid: _permission, is_active: true } })
                    if(_permissions.length !== 1) return new Error('Wrong permission id.')
                    return { id: _permissions[0].uuid, name: _permissions[0].name, isManager: _permissions[0].is_manager, isDefault: _permissions[0].is_default }
                }))
                for(const _permission of _permissions) {
                    if(_permission instanceof Error) return { success: false, error: new Error('Failed to fetch permission.', { cause: _permission }) }
                }

                return {
                    success: true,
                    id: _users[0].uuid,
                    username: _users[0].username,
                    fullName: _users[0].full_name,
                    emailAddress: _users[0].email_address,
                    phoneNumber: _users[0].phone_number,
                    status: _users[0].status,

                    permissions: _permissions as Array<{ id: string & { __brand: 'UUID' }, name: string, isManager: boolean, isDefault: boolean }>,

                    suspend: async () => {
                        try {
                            if(_users[0].status !== UserStatus.Normal) return { success: false, error: new Error('Invalid user status.') }
                            await getDatabaseClient().manager.getRepository(User).update({ uuid: _users[0].uuid, is_active: true }, { status: UserStatus.Suspended })
                            return { success: true }
                        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
                    },
                    unsuspend: async () => {
                        try {
                            if(_users[0].status !== UserStatus.Suspended) return { success: false, error: new Error('Invalid user status.') }
                            await getDatabaseClient().manager.getRepository(User).update({ uuid: _users[0].uuid, is_active: true }, { status: UserStatus.Normal })
                            return { success: true }
                        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
                    }
                }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        }
    },
    oAuth: {
        getUser: async (_accessToken: { tokenType: 'Bearer' | 'Basic', accessToken: string & { __brand: 'TOKEN' } }): Promise<
            { success: true, id: string, username?: string, name?: string, birthdate?: Date, gender?: 'male' | 'female', emailAddress?: string, phoneNumber?: string }
            | { success: false, error?: Error }
        > => {
            try {
                const _appToken = await tokenPlugin.Authorization.getAppToken()
                if(_appToken.success == false) return { success: false, error: new Error('Failed to issue App token.', { cause: _appToken.error }) }
                const _result = await axios.get(`${ process.env.LUNA_ACCOUNTS_API_ENDPOINT }/v0/oauth/userinfo`, { headers: { 'X-APP-TOKEN': `${ _appToken.token.tokenType } ${ _appToken.token.token }`, authorization: `${ _accessToken.tokenType } ${ _accessToken.accessToken }` } })
                if(_result.status !== 200) return { success: false, error: new Error('Failed to fetch user data.') }
                console.log(JSON.stringify(_result.data))
                return {
                    success: true,
                    id: _result.data.data.id,
                    username: _result.data.data.username,
                    name: _result.data.data.name,
                    birthdate: _result.data.data.birthdate ? _result.data.data.birthdate : undefined,
                    gender: _result.data.data.gender ? _result.data.data.gender : undefined,
                    emailAddress: _result.data.data.email_address ? _result.data.data.email_address : undefined,
                    phoneNumber: _result.data.data.phone_number ? _result.data.data.phone_number : undefined,
                }
            } catch(_error) { console.log(_error.response); return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        }
    }
}