import { IsIn, IsOptional, IsString } from "class-validator"
import { IsOnlyDate } from "../plugin/validator.plugin"

export class CredentialsDTO {
    @IsString({ message: 'Invalid username.' })
    username: string

    @IsString({ message: 'Invalid password.' })
    password: string
}

export class ProfileDTO {
    @IsString({ message: 'Invalid first name.' })
    first_name: string

    @IsOptional()
    @IsString({ message: 'Invalid middle name.' })
    middle_name?: string

    @IsString({ message: 'Invalid last name.' })
    last_name: string

    @IsString({ message: 'Invalid nick name.' })
    nick_name: string

    @IsIn([ 'male', 'female' ], { message: 'Invalid gender.' })
    gender: 'male' | 'female'

    @IsOnlyDate({ message: 'Invalid birth date.' })
    birth_date: string
}