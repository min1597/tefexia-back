import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity()
export class ProxmoxVE {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'text', nullable: false, comment: 'Label' })
    label: string

    @Column({ type: 'text', nullable: true, default: null, comment: 'Proxmox VE host' })
    host: string

    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Proxmox VE API key' })
    credentials: { username: string, password: string }

    @Column({ type: 'text', nullable: true, default: null, comment: 'Node name' })
    node: string


    @Column({ type: 'jsonb', nullable: true, default: null, comment: 'Specification' })
    specification: {
        cpu: number,
        memory: number,
        disk: number
    }

    @Column({ type: 'text', nullable: true, default: null, comment: 'Storage' })
    storage: string


    @Column({ type: 'jsonb', nullable: false, default: {  }, comment: 'Template' })
    template: {
        [ operatingSystem: string ]: number
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