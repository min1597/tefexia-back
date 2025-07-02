import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum CertificationType { EMAIL_VERIFICATION = 'EMAIL_VERIFICATION' }
export enum CertificationStatus { Pending = 'Pending', Successed = 'Successed', Registered = 'Registered', Failure = 'Failure', Used = 'Used' }

@Entity()
export class Certification {
    @PrimaryGeneratedColumn('increment', { comment: 'Serial number' })
    srl: number

    @PrimaryGeneratedColumn('uuid', { comment: 'Row ID' })
    uuid: string & { __brand: 'UUID' }


    @Column({ type: 'enum', enum: CertificationType, nullable: false, comment: 'Certification type' })
    type: CertificationType

    @Column({ type: 'text', nullable: true, default: null, comment: 'Certification data (e.g. Phone number, Email address)' })
    target: string | null

    @Column({ type: 'uuid', nullable: true, default: null, comment: 'Verification ID' })
    verification_id: string & { __brand: 'UUID' } | null
    

    @Column({ type: 'text', nullable: true, default: null, comment: 'Verification result' })
    user_name: string | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Verification result' })
    phone_number: string | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Verification result' })
    email_address: string | null

    @Column({ type: 'text', nullable: true, default: null, comment: 'Verification result' })
    birth_date: string | null


    @Column({ type: 'enum', enum: CertificationStatus, nullable: false, default: CertificationStatus.Pending, comment: 'Certification status' })
    status: CertificationStatus


    @Column({ type: 'uuid', nullable: true, default: null, comment: 'User UUID' })
    user_id: string & { __brand: 'UUID' } | null

    @Column({ type: 'boolean', default: true, comment: 'Data validity' })
    is_active: boolean

    @CreateDateColumn({ type: 'timestamptz', comment: 'Creation date' })
    created_date: Date

    @UpdateDateColumn({ type: 'timestamptz', comment: 'Update date' })
    updated_date: Date

    @Column({ type: 'timestamptz', nullable: true, default: null, comment: 'Delete date' })
    deleted_date: Date | null
}