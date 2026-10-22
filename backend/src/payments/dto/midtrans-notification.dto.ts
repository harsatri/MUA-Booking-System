import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Body notifikasi HTTP Midtrans (hanya field yang dipakai). */
export class MidtransNotificationDto {
  @IsString()
  @IsNotEmpty()
  order_id!: string;

  @IsString()
  @IsNotEmpty()
  status_code!: string;

  @IsString()
  @IsNotEmpty()
  gross_amount!: string;

  @IsString()
  @IsNotEmpty()
  signature_key!: string;

  @IsString()
  @IsNotEmpty()
  transaction_status!: string;

  @IsOptional()
  @IsString()
  fraud_status?: string;
}
