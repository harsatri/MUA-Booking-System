import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Booking, BookingStatus } from '@prisma/client';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';

const SNAP_URL = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
const STATUS_URL = (orderId: string): string =>
  `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`;

const DP_RATE = 0.3;
const ITEM_NAME_MAX = 50;

const PAYMENT_UNAVAILABLE =
  'Layanan pembayaran sedang tidak dapat dihubungi. Silakan coba lagi beberapa saat.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly serverKey: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.serverKey = config.getOrThrow<string>('MIDTRANS_SERVER_KEY');
    this.frontendUrl = (
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001'
    ).replace(/\/+$/, '');
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.serverKey}:`).toString('base64')}`;
  }

  private async getOwnedBooking(userId: string, id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking tidak ditemukan');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('Bukan booking milikmu');
    }
    return booking;
  }

  async createPayment(
    userId: string,
    bookingId: string,
  ): Promise<{ redirectUrl: string }> {
    const booking = await this.getOwnedBooking(userId, bookingId);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Hanya booking berstatus menunggu yang dapat dibayar',
      );
    }
    if (booking.startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Jadwal booking sudah lewat');
    }

    const dpAmount = Math.round(booking.totalPrice * DP_RATE);
    const orderId = `MUA-${booking.id}-${Date.now()}`;

    const [service, user] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: booking.serviceId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!service || !user) {
      throw new NotFoundException('Data booking tidak lengkap');
    }

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: dpAmount },
      customer_details: {
        first_name: user.name,
        email: user.email,
      },
      item_details: [
        {
          id: service.id,
          price: dpAmount,
          quantity: 1,
          name: `DP ${service.name}`.slice(0, ITEM_NAME_MAX),
        },
      ],
      callbacks: { finish: `${this.frontendUrl}/bookings?payment=finish` },
    };

    let res: Response;
    try {
      res = await fetch(SNAP_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      this.logger.error('Gagal menghubungi Midtrans Snap (jaringan)');
      throw new BadGatewayException(PAYMENT_UNAVAILABLE);
    }

    const body: unknown = await res.json().catch(() => null);
    const redirectUrl = isRecord(body) ? str(body.redirect_url) : undefined;
    if (!res.ok || !redirectUrl) {
      this.logger.error(`Midtrans Snap menolak permintaan (HTTP ${res.status})`);
      throw new BadGatewayException(PAYMENT_UNAVAILABLE);
    }

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { orderId, dpAmount, paymentUrl: redirectUrl },
    });
    return { redirectUrl };
  }

  async handleNotification(dto: MidtransNotificationDto): Promise<{ ok: true }> {
    const expected = createHash('sha512')
      .update(dto.order_id + dto.status_code + dto.gross_amount + this.serverKey)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(dto.signature_key);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('Signature tidak valid');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { orderId: dto.order_id },
    });
    if (!booking) {
      return { ok: true };
    }
    if (Number(dto.gross_amount) !== booking.dpAmount) {
      throw new BadRequestException('Nominal pembayaran tidak sesuai');
    }

    await this.applyStatus(booking, dto.transaction_status, dto.fraud_status);
    return { ok: true };
  }

  async syncPayment(userId: string, bookingId: string): Promise<Booking> {
    const booking = await this.getOwnedBooking(userId, bookingId);
    if (!booking.orderId) {
      return booking;
    }

    let res: Response;
    try {
      res = await fetch(STATUS_URL(booking.orderId), {
        headers: { Accept: 'application/json', Authorization: this.authHeader },
      });
    } catch {
      this.logger.error('Gagal menghubungi Midtrans status API (jaringan)');
      throw new BadGatewayException(PAYMENT_UNAVAILABLE);
    }
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok || !isRecord(body)) {
      this.logger.error(`Midtrans status API gagal (HTTP ${res.status})`);
      throw new BadGatewayException(PAYMENT_UNAVAILABLE);
    }

    // Transaksi belum pernah dibuka di Snap -> Midtrans membalas tanpa transaction_status.
    const transactionStatus = str(body.transaction_status);
    const grossAmount = str(body.gross_amount);
    const amountMatches =
      grossAmount === undefined || Number(grossAmount) === booking.dpAmount;
    if (transactionStatus && amountMatches) {
      await this.applyStatus(booking, transactionStatus, str(body.fraud_status));
    }

    const fresh = await this.prisma.booking.findUnique({
      where: { id: booking.id },
    });
    return fresh ?? booking;
  }

  /**
   * Tandai PAID hanya dari PENDING saat pembayaran sukses. Atomik via updateMany
   * sehingga idempoten dan tidak pernah menurunkan/mengubah status lain.
   */
  async applyStatus(
    booking: Pick<Booking, 'id'>,
    transactionStatus: string,
    fraudStatus?: string,
  ): Promise<void> {
    const success =
      transactionStatus === 'settlement' ||
      (transactionStatus === 'capture' && fraudStatus === 'accept');
    if (!success) return;

    await this.prisma.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.PENDING },
      data: { status: BookingStatus.PAID, paidAt: new Date() },
    });
  }
}
