import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class Series {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'varchar', length: 30, nullable: false, comment: 'Series name' })
    name: string

    @Column({ type: 'text', nullable: false, comment: 'Series description' })
    description: string



    @Column({ type: 'uuid', nullable: false, comment: 'Service ID' })
    service_id: string & { __brand: 'UUID' }

    @Column({ type: 'uuid', nullable: false, comment: 'Permission ID' })
    permission_id: string & { __brand: 'UUID' }


    @Column({ type: 'jsonb', nullable: false, comment: 'Region' })
    regions: Array<{
        name: string,
        city_code: string,
        clusters: Array<{
            type: 'ProxmoxVE',
            id: string & { __brand: 'UUID' }
        }>
    }>


    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}