import axios from 'axios'
import https from 'https'
import pfsensePlugin from './pfsense.plugin'

export default {
    pluginName: 'pfsensePlugin',

    getDHCPLeases: async (_apiEndpoint: string, _apiKey: string): Promise<
        { success: true, leases: Array<{
            macAddress: string,
            ipAddress: string,
            hostname: string,
            expiresDate: Date | null
        }> }
        | { success: false, error: Error }
    > => {
        try {
            const _dhcpLeasesResult = await axios.get(`${ _apiEndpoint }/api/v2/status/dhcp_server/leases`, {
                headers: { 'X-API-Key': _apiKey, Accept: 'application/json' },
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                }),
                timeout: 5000
            })
            if(_dhcpLeasesResult.status !== 200) return { success: false, error: new Error('Failed to fetch DHCP leases.') }

            if(_dhcpLeasesResult.data.status !== 'ok') return { success: false, error: new Error('Failed to fetch DHCP leases.') }

            return { success: true, leases: _dhcpLeasesResult.data.data.map((_lease: {
                id: number,
                ip: string,
                mac: string,
                hostname: string,
                if: string,
                starts: string,
                ends: string,
                active_status: string,
                online_status: string,
                descr: string
            }) => {
                return {
                    macAddress: _lease.mac,
                    ipAddress: _lease.ip,
                    hostname: _lease.hostname,
                    expiresDate: _lease.ends ? new Date(_lease.ends) : null
                }
            }) }
        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
    },

    getIPv4: async (_apiEndpoint: string, _apiKey: string, _macAddress: string): Promise<
        { success: true, ipAddresses: Array<string> }
        | { success: false, error: Error }
    > => {
        try {
            const _dhcpLeases = await pfsensePlugin.getDHCPLeases(_apiEndpoint, _apiKey)
            if(_dhcpLeases.success !== true) return { success: false, error: new Error('Failed to fetch DHCP leases.', { cause: _dhcpLeases.error }) }
            console.log(_dhcpLeases.leases)
            const _leases = _dhcpLeases.leases.filter(_lease => _lease.macAddress == _macAddress)
            if(_leases.length == 0) return { success: false, error: new Error('Failed to fetch DHCP leases.') }
            return { success: true, ipAddresses: _leases.map(_lease => _lease.ipAddress) }
        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
    }
}