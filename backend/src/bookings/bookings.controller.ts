import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

const getUserId = (req: AuthRequest): string => {
  if (!req.user) {
    throw new UnauthorizedException('Token tidak ditemukan');
  }
  return req.user.sub;
};

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(getUserId(req), dto);
  }

  // Harus sebelum route ber-parameter ':id'
  @Get('my')
  findMine(@Req() req: AuthRequest) {
    return this.bookingsService.findMine(getUserId(req));
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.bookingsService.findAll();
  }

  @Patch(':id/cancel')
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.cancel(getUserId(req), id);
  }
}
