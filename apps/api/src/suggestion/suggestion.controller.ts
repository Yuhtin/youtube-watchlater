import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards, Request } from '@nestjs/common';
import { SuggestionService } from './suggestion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('suggestions')
export class SuggestionController {
    constructor(private readonly suggestionService: SuggestionService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    async findAll(@Query('userId') userId: string, @Request() req) {
        if (req.user.userId !== userId) {
            return { success: false, message: 'Unauthorized' };
        }
        return this.suggestionService.findAllForUser(userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() suggestionData: any, @Request() req) {
        if (req.user.userId !== suggestionData.fromUserId) {
            return { success: false, message: 'Unauthorized' };
        }
        return this.suggestionService.create(suggestionData);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateData: any, @Request() req) {
        const suggestion = await this.suggestionService.findOne(id);
        
        if (!suggestion) {
            return { success: false, message: 'Suggestion not found' };
        }
        
        if (req.user.userId !== suggestion.toUserId) {
            return { success: false, message: 'Unauthorized' };
        }
        
        return this.suggestionService.update(id, updateData);
    }
}