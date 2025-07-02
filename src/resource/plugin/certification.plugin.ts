import axios from 'axios'
import CryptoJS from 'crypto-js'

export default {
    pluginName: 'certificationPlugin',

    Certification: {
        create: async (_type: 'EMAIL_VERIFICATION'): Promise<
            { success: true, verificationId: string & { __brand: 'UUID' } }
            | { success: false, error?: Error }
        > => {
            try {
                const _verificationResult = await axios.post(`${ process.env.LUNA_SECURITY_API_ENDPOINT }/v0/external/verification`, {
                    type: _type.toLowerCase()
                }, { headers: { authorization: `Basic ${ CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(`${ process.env.LUNA_SECURITY_APPLICATION_ID }:${ process.env.LUNA_SECURITY_SECRET }`)) }` } })
                if(_verificationResult.status !== 200) return { success: false, error: new Error('Failed to create verification.') }

                return { success: true, verificationId: _verificationResult.data.data.id }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        },
        validate: async (_verificationId: string & { __brand: 'UUID' }): Promise<
            { success: true, status: 'pending' | 'in_progress' | 'successed' | 'failure' | 'expired', personal: {
                type: 'EMAIL_VERIFICATION',
                emailAddress: string
            } | null }
            | { success: false, error?: Error }
        > => {
            try {
                const _verificationResult = await axios.get(`${ process.env.LUNA_SECURITY_API_ENDPOINT }/v0/external/verification/${ _verificationId }`, { headers: { authorization: `Basic ${ CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(`${ process.env.LUNA_SECURITY_APPLICATION_ID }:${ process.env.LUNA_SECURITY_SECRET }`)) }` } })
                if(_verificationResult.status !== 200) return { success: false, error: new Error('Failed to create verification.') }

                return { success: true, status: _verificationResult.data.data.status, personal: {
                    type: _verificationResult.data.data.type.toUpperCase(),
                    emailAddress: _verificationResult.data.data.email_address
                } }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        }
    }
}