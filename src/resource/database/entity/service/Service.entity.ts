import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum ServiceType {
    ProxmoxVE = 'Proxmox VE'
}

@Entity()
export class Service {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'enum', enum: ServiceType, nullable: false, comment: 'Service type' })
    type: ServiceType


    @Column({ type: 'varchar', length: 30, nullable: false, comment: 'Service name' })
    name: string

    @Column({ type: 'text', nullable: false, comment: 'Service description' })
    description: string


    @Column({ type: 'uuid', nullable: false, comment: 'Permission ID' })
    permission_id: string & { __brand: 'UUID' }
    

    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}