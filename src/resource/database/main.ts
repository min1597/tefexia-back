import { typeOrmConfig } from '../config/typeorm.config'
import { DataSource, DataSourceOptions } from 'typeorm'

let _client: DataSource | null = null
export function getDatabaseClient () {
    if(_client == null) throw 'Database is not initialized.'
    else return _client
}
export async function connectDatabase () {
    return _client = await (new DataSource(typeOrmConfig as DataSourceOptions)).initialize()
}