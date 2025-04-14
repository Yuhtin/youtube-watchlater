import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) { }

    async create(data: { username: string; password: string; imageUrl?: string }) {
        const existingUser = await this.prisma.user.findUnique({
            where: { username: data.username },
        });

        if (existingUser) {
            throw new ConflictException('Username already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        return this.prisma.user.create({
            data: {
                username: data.username,
                password: hashedPassword,
                imageUrl: data.imageUrl,
            },
        });
    }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        cards: true
                    }
                }
            },
        });
    }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async validateUser(username: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { password: _, ...result } = user;
        return result;
    }
}