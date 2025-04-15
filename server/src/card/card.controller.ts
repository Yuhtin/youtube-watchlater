import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, NotFoundException } from '@nestjs/common';
import { CardService } from './card.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ColumnType } from '@prisma/client';

@Controller('cards')
export class CardController {
    constructor(private readonly cardService: CardService) { }

    @Get('count/:userId')
    async getPublicCardCount(@Param('userId') userId: string) {
        const count = await this.cardService.countCardsByUser(userId);
        return { count };
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() body: any, @Request() req) {
        const result = await this.cardService.create({
            ...body,
            userId: req.user.userId,
        });

        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(
        @Query('userId') userId: string,
        @Query('search') search: string,
        @Query('minDuration') minDuration: string,
        @Query('maxDuration') maxDuration: string,
        @Query('fromDate') fromDate: string,
        @Query('toDate') toDate: string,
        @Request() req
    ) {
        if (userId !== req.user.userId) {
            return { statusCode: 403, message: 'Unauthorized access to other user data' };
        }

        const filter: any = { userId };

        if (search) {
            filter.title = {
                contains: search,
                mode: 'insensitive'
            };
        }

        if (minDuration || maxDuration) {
            filter.durationSeconds = {};

            if (minDuration) {
                filter.durationSeconds.gte = parseInt(minDuration, 10);
            }

            if (maxDuration) {
                filter.durationSeconds.lte = parseInt(maxDuration, 10);
            }
        }

        if (fromDate || toDate) {
            filter.addedAt = {};

            if (fromDate) {
                filter.addedAt.gte = new Date(fromDate);
            }

            if (toDate) {
                filter.addedAt.lte = new Date(toDate);
            }
        }

        return this.cardService.findAllWithFilter(userId, filter);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const card = await this.cardService.findOne(id);

        if (!card) {
            return { statusCode: 404, message: `Card with ID ${id} not found` };
        }

        return card;
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        const card = await this.cardService.findOne(id);

        if (!card) {
            return { statusCode: 404, message: `Card with ID ${id} not found` };
        }

        return this.cardService.update(id, body);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        const card = await this.cardService.findOne(id);

        if (!card) {
            return { statusCode: 404, message: `Card with ID ${id} not found` };
        }

        return this.cardService.remove(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/reorder')
    async reorderCard(
        @Param('id') id: string,
        @Body() body: { status: ColumnType, order: number }
    ) {
        try {
            return await this.cardService.reorderCards(id, body.status, body.order);
        } catch (error) {
            if (error.message === 'Card not found') {
                throw new NotFoundException(`Card with ID ${id} not found`);
            }

            throw error;
        }
    }
}