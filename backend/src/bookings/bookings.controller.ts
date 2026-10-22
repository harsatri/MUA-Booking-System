import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
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
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Publik (tanpa guard). Harus sebelum route ber-parameter ':id'
  @Get('availability')
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.bookingsService.getAvailability(query.date, query.serviceId);
  }

  // Harus sebelum route ber-parameter ':id'
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findMine(@Req() req: AuthRequest) {
    return this.bookingsService.findMine(getUserId(req));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  create(@Req() req: AuthRequest, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(getUserId(req), dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.bookingsService.findAll();
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  cancel(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.bookingsService.cancel(getUserId(req), id);
  }
}
