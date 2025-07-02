import WebSocket from 'ws'

export default {
    pluginName: 'websocketPlugin',

    initialize: (_url: string, _onMessage: (_message: string) => void, _options?: WebSocket.ClientOptions): {
        success: true,
        client: WebSocket,
        sendMessage: (_message: string) => { success: true } | { success: false, error?: Error }
    } | { success: false, error?: Error } => {
        try {
            const _client = new WebSocket(_url, _options)
            _client.on('message', _onMessage)
            return {
                success: true,
                client: _client,
                sendMessage: (_message: string) => {
                    try {
                        _client.send(_message)
                        return { success: true }
                    } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
                }
            }
        } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
    }
}