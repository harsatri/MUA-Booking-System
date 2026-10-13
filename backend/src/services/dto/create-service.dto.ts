import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;

export class CreateServiceDto {
    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    name: string;

    @Transform(trim)
    @IsOptional()
    @IsString()
    description?: string;

    @IsInt()
    @Min(0)
    price: number;

    @IsInt()
    @Min(1)
    durationMin: number;

    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    category: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}