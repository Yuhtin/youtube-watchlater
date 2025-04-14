import { Controller, Get, Post, Body, Patch, Param, Delete, NotFoundException, Query } from '@nestjs/common';
import { CardService } from './card.service';
import { ColumnType } from '@prisma/client';

@Controller('cards')
export class CardController {
    constructor(private readonly cardService: CardService) { }

    @Post()
    create(@Body() body: any) {
        return this.cardService.create(body);
    }

    @Get()
    findAll(@Query('userId') userId: string) {
        if (!userId) {
            return { statusCode: 400, message: 'userId query parameter is required' };
        }
        return this.cardService.findAllByUser(userId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const card = await this.cardService.findOne(id);

        if (!card) {
            return { statusCode: 404, message: `Card with ID ${id} not found` };
        }

        return card;
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: any) {
        const card = await this.cardService.findOne(id);

        if (!card) {
            return { statusCode: 404, message: `Card with ID ${id} not found` };
        }

        return this.cardService.update(id, body);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        const card = await this.cardService.findOne(id);

        if (!card) {
            return { statusCode: 404, message: `Card with ID ${id} not found` };
        }

        return this.cardService.remove(id);
    }

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