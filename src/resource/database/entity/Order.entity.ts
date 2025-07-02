import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum OrderStatus {
    PENDING = 'PENDING',
    DONE = 'DONE',
    CANCELED = 'CANCELED',
    EXPIRED = 'EXPIRED',
    FAILURE = 'FAILURE'
}

@Entity()
export class Order {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: true, default: null, comment: 'Payment ID' })
    payment_id: string | null

    @Column({ type: 'text', nullable: false, comment: 'Order name' })
    name: string

    @Column({ type: 'jsonb', nullable: false, comment: 'Products' })
    products: Array<{ name: string, price: number, is_tax_free: boolean }>
    

    @Column({ type: 'int', nullable: false, comment: 'Supplied amount' })
    supplied_amount: number

    @Column({ type: 'int', nullable: false, comment: 'VAT' })
    vat: number

    @Column({ type: 'int', nullable: false, comment: 'Tax free amount' })
    tax_free_amount: number

    @Column({ type: 'text', nullable: false, comment: 'Secret' })
    secret: string


    @Column({ type: 'enum', enum: OrderStatus, nullable: false, default: OrderStatus.PENDING, comment: 'Status' })
    status: OrderStatus


    @Column({ type: 'uuid', nullable: false, comment: 'Instance ID' })
    instance_id: string & { __brand: 'UUID' }


    @Column({ type: 'uuid', nullable: false, comment: 'User ID' })
    user_id: string & { __brand: 'UUID' }


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}