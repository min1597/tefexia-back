import jsonwebtoken from 'jsonwebtoken'
import { Cidr, IpAddress } from 'cidr-calc'
import * as Crypto from 'crypto'

let _publicKey = process.env.PUBLIC_KEY
let _privateKey = process.env.PRIVATE_KEY

if(typeof _publicKey !== 'string' || typeof _privateKey !== 'string') {
    const _keyPair = Crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    _publicKey = _keyPair.publicKey
    _privateKey = _keyPair.privateKey
}

export default {
    pluginName: 'utilityPlugin',
    
    getRandomStrings: (_length: number, _chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'): string => {
        let _string = ''
        for (let i=0; i<_length; i++) {
            _string += _chars.charAt(Math.floor(Math.random() * _chars.length))
        }
        return _string    
    },
    tokenParser: (_string: string): { token: string & { __brand: 'TOKEN' }, tokenType: 'Basic' | 'Bearer' } => {
        if(_string.split(' ').length !== 2) throw 'Not match the Token Format.'
        const _tokenType = _string.split(' ')[0].toLowerCase() == 'basic' ? 'Basic' : 'Bearer'
        if(_tokenType == 'Bearer') { if(_string.split(' ')[0].toLowerCase() !== 'bearer') { throw new Error('Wrong token format.') } }
        return { token: _string.split(' ')[1] as string & { __brand: 'TOKEN' }, tokenType: _tokenType }    
    },
    validateUUID: (_uuid: string): string & { __brand: 'UUID' } => {
        if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(_uuid) == false) throw new Error('Invalid id.')
        return _uuid as string & { __brand: 'UUID' }
    },
    isEmailAddress: (_emailAddress: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_emailAddress),
    isBase64: (_string: string): boolean => /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/.test(_string),
    isUrl: (_string: string): boolean => {
        try {
            const _url = new URL(_string)
            return _url.protocol === 'http:' || _url.protocol === 'https:'
        } catch(_error) { return false }
    },
    subnetSplitter: (_ipAddress: string, _fromSubnetMask: number, _toSubnetMask: number) => {
        if(_fromSubnetMask < 0 || _fromSubnetMask > 32) return { success: false, error: new Error('Wrong from subnet mask.') }
        if(_toSubnetMask < 0 || _toSubnetMask > 32) return { success: false, error: new Error('Wrong to subnet mask.') }
        if(_fromSubnetMask >= _toSubnetMask) return { success: false, error: new Error('Wrong subnet mask.') }
        const _cidr = new Cidr(IpAddress.of(_ipAddress), _fromSubnetMask)
        let _cache = _cidr.toIpRange().startIpAddr
    
        const _splittedIpAddresses: Array<string> = [  ]
    
        for(let _index = 0; _index < (2 ** (32 - _fromSubnetMask)); _index ++) {
            if(_index % (2 ** (32 - _toSubnetMask)) == 0) _splittedIpAddresses.push(`${ _cache.regularNotation() }/${ _toSubnetMask }`)
            _cache = _cache.next()
        }
    
        return { success: true, cidr: _splittedIpAddresses }
    },
    JWT: {
        encode: (_object: Object, _expiresDate: Date): string => {
            return jsonwebtoken.sign({
                ... _object,
                iss: 'Luna co.',
                iat: new Date().getTime() / 1000,
                exp: _expiresDate.getTime() / 1000
            }, process.env.PRIVATE_KEY, { algorithm: (process.env.ALGORITHM == 'ES256K' ? 'ES256' : process.env.ALGORITHM ) as jsonwebtoken.Algorithm })
        },
        verify: (_token: string): boolean => {
            try {
                jsonwebtoken.verify(_token, process.env.PUBLIC_KEY)
                return true
            } catch(_error) { return false }
        },
        decode: (_token: string): string | jsonwebtoken.JwtPayload => {
            return jsonwebtoken.decode(_token)
        }    
    },
    RSA: {
        publicKey: _publicKey,
        encode: (_text: string): { success: true, data: string } | { success: false, error?: Error } => {
            try {
                const _buffer = Buffer.from(_text, 'utf-8')
                return { success: true, data: Crypto.publicEncrypt(_publicKey, _buffer).toString('hex') }
            } catch(_error) { return { success: false, error: new Error('Failed to encode.') } }
        },
        decode: (_hash: string): { success: true, data: string } | { success: false, error?: Error } => { 
            try {
                const _buffer = Buffer.from(_hash, 'hex')
                return { success: true, data: Crypto.privateDecrypt(_privateKey, _buffer).toString('utf-8') }
            } catch(_error) { return { success: false, error: new Error('Invalid hash.') } }
        }
    }
}