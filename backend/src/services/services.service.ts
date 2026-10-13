import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
    constructor(private prisma: PrismaService) { }

    findAll() {
        return this.prisma.service.findMany({ where: { isActive: true } });
    }

    async findOne(id: string) {
        const service = await this.prisma.service.findUnique({ where: { id } });
        if (!service) throw new NotFoundException('Layanan tidak ditemukan');
        return service;
    }

    create(dto: CreateServiceDto) {
        return this.prisma.service.create({ data: dto });
    }

    async update(id: string, dto: UpdateServiceDto) {
        await this.findOne(id);
        return this.prisma.service.update({ where: { id }, data: dto });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.service.update({
            where: { id },
            data: { isActive: false },
        });
    }
}