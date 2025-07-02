import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum TokenStatus { Normal = 'Normal', Expired = 'Expired', Broken = 'Broken', Suspend = 'Suspend', Used = 'Used' }
export enum TokenMethod { SESSION_TOKEN = 'SESSION_TOKEN', TEMPORARY_TOKEN = 'TEMPORARY_TOKEN' }

@Entity()
export class Token {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }

    
    @Column({ type: 'varchar', length: 256, nullable: false, comment: 'Token' })
    token: string & { __brand: 'TOKEN' }

    @Column({ type: 'bigint', nullable: false, default: 0, comment: 'Token valid time (milliseconds)' })
    valid_time: string

    @Column({ type: 'enum', enum: TokenMethod, nullable: false, default: TokenMethod.SESSION_TOKEN, comment: 'Token method' })
    token_method: TokenMethod

    
    @Column({ type: 'uuid', nullable: true, default: null, comment: 'User UUID' })
    user_id: string & { __brand: 'UUID' } | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'IP Address' })
    ip_address: string | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Client agent' })
    client_agent: string | null


    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Token data' })
    data: object | null


    @Column({ type: 'uuid', nullable: true, default: null, comment: 'Application UUID (Subtoken)' })
    application_id: string & { __brand: 'UUID' } | null

    @Column({ type: 'text', array: true, nullable: true, default: null, comment: 'Permissions (Array)' })
    permissions: Array<string> | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Code verifier for authorization code' })
    code_challenge: string | null

    @Column({ type: 'varchar', length: 5, nullable: true, default: null, comment: 'Code verifier method for authorization code' })
    code_challenge_method: 'S256' | 'S512' | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Redirect uri for authorization code' })
    redirect_uri: string | null


    @Column({ type: 'enum', enum: TokenStatus, default: TokenStatus.Normal, comment: 'Token status' })
    status: TokenStatus

    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}
