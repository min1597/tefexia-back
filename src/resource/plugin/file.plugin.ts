import { getDatabaseClient } from 'src/resource/database/main'
import { File } from 'src/resource/database/entity/File.entity'

export default {
    pluginName: 'filePlugin',

    File: {
        upload: async (_fileData: {
            name: string,
            data: string
        }): Promise<
            { success: true, data: {
                name: string,
                id: string & { __brand: 'UUID' }
            }, error: null }
            | { success: false, error?: Error }
        > => {
            try {
                const _file = await getDatabaseClient().manager.getRepository(File).save({
                    name: _fileData.name,
                    data: _fileData.data
                })

                return { success: true, data: {
                    name: _file.name,
                    id: _file.uuid
                }, error: null }
            } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured.', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
        }
    }
}
