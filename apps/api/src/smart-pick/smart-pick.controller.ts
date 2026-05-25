import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmartPickService } from './smart-pick.service';

@UseGuards(JwtAuthGuard)
@Controller('smart-pick')
export class SmartPickController {
    constructor(private readonly smartPick: SmartPickService) { }

    @Post('tonight')
    tonight(@Body() body: { timeMinutes: number; listId?: string; excludeVideoIds?: string[] }, @Req() req: any) {
        return this.smartPick.tonight(req.user.userId, body);
    }

    @Post('queue')
    queue(@Body() body: { timeMinutes: number; listId?: string }, @Req() req: any) {
        return this.smartPick.queue(req.user.userId, body);
    }

    @Post('queue/swap')
    queueSwap(@Body() body: { timeMinutes: number; listId?: string; keepVideoIds: string[] }, @Req() req: any) {
        return this.smartPick.queueSwap(req.user.userId, body);
    }
}
