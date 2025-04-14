import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ColumnType, Prisma } from '@prisma/client';

@Injectable()
export class CardService {
    constructor(private prisma: PrismaService) { }

    async create(data: any) {
        const status = data.status || data.columnId || 'WATCH_LATER';

        const { columnId, ...cleanData } = data;

        const cardsWithSameStatus = await this.prisma.card.count({
            where: {
                status: status as ColumnType,
            },
        });

        return this.prisma.card.create({
            data: {
                ...cleanData,
                status: status as ColumnType,
                order: cardsWithSameStatus,
            },
        });
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

    async findAll() {
        return this.prisma.card.findMany({
            orderBy: {
                order: 'asc'
            }
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
}
