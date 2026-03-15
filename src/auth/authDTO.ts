import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Min, MinLength } from "class-validator";

enum UserGroup {
    DEFAULT = 'DEFAULT',
    PRO = 'PRO',
    GOVERNMENT = 'GOVERNMENT',
    ADMIN = 'ADMIN'
}

export class SignUpDTO {
    @IsNotEmpty()
    name: string;

    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    image: string;
}

export class SignInDTO {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    password: string;
}

export class updateUserDTO {
    @IsOptional()
    name: string;

    @IsOptional()
    @IsEmail()
    email: string;

    @IsOptional()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    image: string;

    @IsOptional()
    @IsEnum(UserGroup)
    group: UserGroup;
}