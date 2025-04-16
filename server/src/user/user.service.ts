import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

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
                        cards: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        cards: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const { password, ...result } = user;
        return result;
    }

    async validateUser(username: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.validatePassword(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { password: _, ...result } = user;
        return result;
    }

    async findById(id: string, includePassword: boolean = false) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        cards: true,
                    },
                },
            },
        });

        if (!user) {
            return null;
        }

        if (!includePassword) {
            const { password, ...result } = user;
            return result;
        }
        
        return user;
    }

    async validatePassword(plainTextPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            return await bcrypt.compare(plainTextPassword, hashedPassword);
        } catch (error) {
            console.error('Error comparing passwords:', error);
            return false;
        }
    }

    async deleteUser(id: string): Promise<void> {
        await this.prisma.card.deleteMany({
            where: { userId: id },
        });

        try {
            await this.prisma.user.delete({
                where: { id },
            });
        } catch (error) {
            if (error.code === 'P2025') {
                throw new NotFoundException(`User with ID ${id} not found`);
            }
            throw error;
        }
    }

    async updateUser(id: string, updateData: any) {
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        
        const user = await this.prisma.user.update({
            where: { id },
            data: updateData
        });
        
        const { password, ...result } = user;
        return result;
    }

    async findByUsername(username: string) {
        const user = await this.prisma.user.findUnique({
            where: { username }
        });
        
        if (!user) {
            return null;
        }
        
        const { password, ...result } = user;
        return result;
    }
}