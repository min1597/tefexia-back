import { HttpStatus } from '@nestjs/common'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum TokenStatus { Normal = 'Normal', Expired = 'Expired', Broken = 'Broken', Suspend = 'Suspend', Used = 'Used' }
export enum TokenMethod { SESSION_TOKEN = 'SESSION_TOKEN', TEMPORARY_TOKEN = 'TEMPORARY_TOKEN' }

@Entity()
export class Request {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: false, comment: 'Client ip address' })
    ip_address: string

    @Column({ type: 'jsonb', nullable: false, comment: 'Client browser detail' })
    browser: object

    @Column({ type: 'varchar', length: 10, nullable: false, comment: 'Request method' })
    request_method: string

    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Request body' })
    body: object | null

    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Request query' })
    query: object | null

    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Request headers' })
    headers: object | null

    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Response body' })
    response_body: object | null

    @Column({ type: 'enum', enum: HttpStatus, nullable: true, default: null, comment: 'Http status' })
    http_status: HttpStatus | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Error stack' })
    error_stack: string | null


    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}