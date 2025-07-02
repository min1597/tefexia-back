import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum InstanceStatus {
    WAITING_FOR_PAYMENT = 'WAITING_FOR_PAYMENT',
    PENDING = 'PENDING',
    INSTALLING = 'INSTALLING',
    ACTIVE = 'ACTIVE',
    FAILURE = 'FAILURE',
    SUSPENDED = 'SUSPENDED',
    TERMINATED = 'TERMINATED'
}

@Entity()
export class Instance {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }



    @Column({ type: 'text', nullable: false, comment: 'Instance name' })
    name: string

    @Column({ type: 'uuid', nullable: false, comment: 'Product ID' })
    product_id: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: false, comment: 'Operating system' })
    operating_system: string


    @Column({ type: 'uuid', array: true, nullable: false, comment: 'User ID' })
    user_id: Array<string & { __brand: 'UUID' }>

    @Column({ type: 'uuid', nullable: true, default: null, comment: 'Cluster ID' })
    cluster_id: string & { __brand: 'UUID' } | null


    @Column({ type: 'enum', enum: InstanceStatus, default: InstanceStatus.WAITING_FOR_PAYMENT, comment: 'Instance status' })
    status: InstanceStatus


    @Column({ type: 'jsonb', nullable: false, default: {  }, comment: 'Additional data' })
    additional_data: {
        [ key in string ]: string
    }


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Expiration date' })
    expires_date: Date | null

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}