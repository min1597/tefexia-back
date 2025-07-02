import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class Product {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'varchar', length: 30, nullable: false, comment: 'Product name' })
    name: string

    @Column({ type: 'text', nullable: false, comment: 'Product description' })
    description: string

    @Column({ type: 'text', nullable: true, default: null, comment: 'Product image' })
    image: string | null

    @Column({ type: 'int', nullable: false, comment: 'Product price' })
    price: number



    @Column({ type: 'uuid', nullable: false, comment: 'Series ID' })
    series_id: string & { __brand: 'UUID' }

    @Column({ type: 'uuid', nullable: false, comment: 'Permission ID' })
    permission_id: string & { __brand: 'UUID' }


    @Column({ type: 'jsonb', nullable: false, comment: 'Product specification' })
    specification: {
        memory: number,
        cpu: number,
        disk: number,
        bandwidth: number
    }



    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}