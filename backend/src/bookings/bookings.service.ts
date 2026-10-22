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
import {
  CLOSE_MIN,
  OPEN_MIN,
  SLOT_MIN,
  addMinutes,
  formatHHmm,
  toWibParts,
  wibDayStart,
} from './booking-hours';

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface AvailabilityResult {
  date: string;
  durationMin: number;
  slots: AvailabilitySlot[];
}

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailability(
    date: string,
    serviceId: string,
  ): Promise<AvailabilityResult> {
    const dayStart = wibDayStart(date);
    if (!dayStart) {
      throw new BadRequestException('Tanggal tidak valid');
    }
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Layanan tidak ditemukan');
    }

    const dayEnd = addMinutes(dayStart, 24 * 60);
    const booked = await this.prisma.booking.findMany({
      where: {
        status: { not: BookingStatus.CANCELLED },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    });

    const now = Date.now();
    const slots: AvailabilitySlot[] = [];
    for (
      let min = OPEN_MIN;
      min + service.durationMin <= CLOSE_MIN;
      min += SLOT_MIN
    ) {
      const start = addMinutes(dayStart, min);
      const end = addMinutes(start, service.durationMin);
      const taken = booked.some(
        (b) => b.startTime < end && b.endTime > start,
      );
      slots.push({
        time: formatHHmm(min),
        available: start.getTime() > now && !taken,
      });
    }

    return { date, durationMin: service.durationMin, slots };
  }

  async create(userId: string, dto: CreateBookingDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, isActive: true },
    });
    if (!service) {
      throw new NotFoundException('Layanan tidak ditemukan');
    }

    const startTime = new Date(dto.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Waktu booking tidak valid');
    }
    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Waktu booking harus di masa depan');
    }

    const { minuteOfDay, subMinuteMs } = toWibParts(startTime);
    if (subMinuteMs !== 0 || minuteOfDay % SLOT_MIN !== 0) {
      throw new BadRequestException(
        `Waktu booking harus sejajar slot ${SLOT_MIN} menit`,
      );
    }
    if (
      minuteOfDay < OPEN_MIN ||
      minuteOfDay + service.durationMin > CLOSE_MIN
    ) {
      throw new BadRequestException(
        `Di luar jam operasional (${formatHHmm(OPEN_MIN)}-${formatHHmm(CLOSE_MIN)} WIB)`,
      );
    }
    const endTime = addMinutes(startTime, service.durationMin);

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
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.DONE
    ) {
      throw new BadRequestException(
        booking.status === BookingStatus.CANCELLED
          ? 'Booking sudah dibatalkan'
          : 'Booking yang sudah selesai tidak dapat dibatalkan',
      );
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
