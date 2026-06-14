import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OccurrenceStatus } from 'generated/prisma/client';

export class CreateOccurrenceDTO {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsString()
    category: string;

    @IsOptional()
    @IsEnum(OccurrenceStatus)
    status?: OccurrenceStatus;

    @IsOptional()
    @IsBoolean()
    anonymous?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    photos?: string[];
}

export class UpdateOccurrenceDTO {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsEnum(OccurrenceStatus)
    status?: OccurrenceStatus;

    @IsOptional()
    @IsBoolean()
    anonymous?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    latitude?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    photos?: string[];
}

export class ListOccurrenceDTO {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsEnum(OccurrenceStatus)
    status?: OccurrenceStatus;
}

export class CreateOccurrenceCommentDTO {
    @IsNotEmpty()
    @IsString()
    content: string;
}

export class UpdateOccurrenceCommentDTO {
    @IsNotEmpty()
    @IsString()
    content: string;
}
