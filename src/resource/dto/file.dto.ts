import { IsString } from 'class-validator'


export class FileDTO {
    @IsString({ message: 'Invalid file name.' })
    file_name: string

    @IsString({ message: 'Invalid data.' })
    data: string
}