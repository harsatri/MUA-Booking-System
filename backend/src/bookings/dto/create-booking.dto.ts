import { Transform, TransformFnParams } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBookingDto {
  @IsString()
  serviceId!: string;

  @IsDateString()
  startTime!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  location?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  notes?: string;
}
