import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { PaymentsService } from './payments.service';

const getUserId = (req: AuthRequest): string => {
  if (!req.user) {
    throw new UnauthorizedException('Token tidak ditemukan');
  }
  return req.user.sub;
};

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('bookings/:id/pay')
  @UseGuards(JwtAuthGuard)
  pay(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.paymentsService.createPayment(getUserId(req), id);
  }

  @Post('bookings/:id/sync')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  sync(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.paymentsService.syncPayment(getUserId(req), id);
  }

  // Publik: dipanggil server Midtrans; keabsahan diverifikasi lewat signature.
  @Post('notification')
  @HttpCode(200)
  notification(@Body() dto: MidtransNotificationDto) {
    return this.paymentsService.handleNotification(dto);
  }
}
