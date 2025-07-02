import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum KVMType {
    SipeedNanoKVM = 'SipeedNanoKVM',

    Manual = 'Manual'
}

export enum ClusterStatus {
    Active = 'Active',
    Inactive = 'Inactive'
}

@Entity()
export class Cluster {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }

    

    @Column({ type: 'text', nullable: false, comment: 'Cluster label' })
    label: string


    @Column({ type: 'uuid', nullable: false, comment: 'Product ID' })
    product_id: string & { __brand: 'UUID' }


    @Column({ type: 'uuid', nullable: true, default: null, comment: 'Instance ID' })
    instance_id: string & { __brand: 'UUID' } | null



    @Column({ type: 'enum', enum: KVMType, nullable: false, comment: 'KVM type' })
    kvm_type: KVMType


    @Column({ type: 'text', nullable: true, default: null, comment: 'KVM URL' })
    kvm_endpoint: string | null

    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'KVM credentials' })
    kvm_credentials: {
        username: string,
        password: string
    } | null


    @Column({ type: 'uuid', nullable: true, default: null, comment: 'Router ID' })
    router_id: string & { __brand: 'UUID' } | null


    @Column({ type: 'text', nullable: true, default: null, comment: 'MAC address' })
    mac_address: string | null



    @Column({ type: 'enum', enum: ClusterStatus, nullable: false, comment: 'Cluster status' })
    status: ClusterStatus


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean


    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}