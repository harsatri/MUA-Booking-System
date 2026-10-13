import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBookingDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Layanan tidak ditemukan');
    }

    const startTime = new Date(dto.startTime);
    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Waktu booking harus di masa depan');
    }
    const endTime = new Date(startTime.getTime() + service.durationMin * 60_000);

    const conflict = await this.prisma.booking.findFirst({
      where: {
        status: { not: BookingStatus.CANCELLED },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
    if (conflict) {
      throw new ConflictException('Jadwal sudah terisi');
    }

    return this.prisma.booking.create({
      data: {
        userId,
        serviceId: service.id,
        startTime,
        endTime,
        location: dto.location,
        notes: dto.notes,
        totalPrice: service.price,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { service: true },
      orderBy: { startTime: 'desc' },
    });
  }

  findAll() {
    return this.prisma.booking.findMany({
      include: {
        service: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async cancel(userId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking tidak ditemukan');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bukan booking milikmu');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
