import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date harus berformat YYYY-MM-DD' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  serviceId!: string;
}
