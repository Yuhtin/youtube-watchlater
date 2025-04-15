import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ColumnType, Prisma } from '@prisma/client';
import { PlaylistService } from 'src/playlist/playlist.service';

@Injectable()
export class CardService {
    constructor(private prisma: PrismaService, private playlistService : PlaylistService) { }

    private parseDuration(duration: string): number {
        if (!duration) {
            return 0;
        }

        try {
            const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
            const match = duration.match(regex);

            if (!match) {
                console.warn(`Invalid duration format: ${duration}`);
                return 0;
            }

            const hours = match[1] ? parseInt(match[1], 10) : 0;
            const minutes = match[2] ? parseInt(match[2], 10) : 0;
            const seconds = match[3] ? parseInt(match[3], 10) : 0;

            return hours * 3600 + minutes * 60 + seconds;
        } catch (error) {
            console.error(`Error parsing duration: ${duration}`, error);
            return 0;
        }
    }

    async create(data: any) {
        try {
            const existingCard = await this.prisma.card.findFirst({
                where: {
                    id: data.id,
                    userId: data.userId
                }
            });

            if (existingCard) {
                return {
                    statusCode: 409,
                    message: "Video already exists in your collection",
                    data: existingCard
                };
            }

            // Add durationSeconds if duration is provided
            if (data.duration) {
                data.durationSeconds = this.parseDuration(data.duration);
            }

            return await this.prisma.card.create({
                data: {
                    ...data,
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                return {
                    statusCode: 409,
                    message: "Video already exists in your collection",
                };
            }

            return {
                statusCode: 500,
                message: "Failed to add video",
                error: error.message
            };
        }
    }

    async reorderCards(cardId: string, newStatus: ColumnType, newOrder: number) {
        const card = await this.prisma.card.findUnique({
            where: { id: cardId }
        });

        if (!card) {
            throw new Error('Card not found');
        }

        return this.prisma.$transaction(async (prisma) => {
            if (card.status !== newStatus) {
                await prisma.card.updateMany({
                    where: {
                        status: card.status,
                        userId: card.userId,
                        order: {
                            gt: card.order
                        }
                    },
                    data: {
                        order: {
                            decrement: 1
                        }
                    }
                });

                await prisma.card.updateMany({
                    where: {
                        status: newStatus,
                        userId: card.userId,
                        order: {
                            gte: newOrder
                        }
                    },
                    data: {
                        order: {
                            increment: 1
                        }
                    }
                });
            } else {
                if (newOrder > card.order) {
                    await prisma.card.updateMany({
                        where: {
                            status: card.status,
                            userId: card.userId,
                            order: {
                                gt: card.order,
                                lte: newOrder
                            }
                        },
                        data: {
                            order: {
                                decrement: 1
                            }
                        }
                    });
                } else if (newOrder < card.order) {
                    await prisma.card.updateMany({
                        where: {
                            status: card.status,
                            userId: card.userId,
                            order: {
                                gte: newOrder,
                                lt: card.order
                            }
                        },
                        data: {
                            order: {
                                increment: 1
                            }
                        }
                    });
                }
            }

            return prisma.card.update({
                where: { id: cardId },
                data: {
                    status: newStatus,
                    order: newOrder
                }
            });
        });
    }

    async findAllByUser(userId: string) {
        return this.prisma.card.findMany({
            where: { userId },
            orderBy: {
                order: 'asc'
            }
        });
    }

    async findAllWithFilter(userId: string, filter: any) {
        return this.prisma.card.findMany({
            where: filter,
            orderBy: {
                order: 'asc',
            },
        });
    }

    async findOne(id: string) {
        return this.prisma.card.findUnique({ where: { id } });
    }

    async update(id: string, data: Prisma.CardUpdateInput) {
        return this.prisma.card.update({ where: { id }, data });
    }

    async remove(id: string) {
        return this.prisma.card.delete({ where: { id } });
    }

    async countCardsByUser(userId: string): Promise<number> {
        return this.prisma.card.count({
            where: {
                userId,
            },
        });
    }

    async updateCardStatus(id: string, status: ColumnType) {
        const card = await this.findOne(id);
        
        if (!card) {
            throw new Error('Card not found');
        }
        
        const updatedCard = await this.prisma.card.update({
            where: { id },
            data: { status },
        });
        
        if (updatedCard.playlistId) {
            await this.playlistService.calculatePlaylistStatus(updatedCard.playlistId);
        }
        
        return updatedCard;
    }
}