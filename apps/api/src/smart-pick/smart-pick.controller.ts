import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SmartPickService } from './smart-pick.service';

@UseGuards(JwtAuthGuard)
@Controller('smart-pick')
export class SmartPickController {
    constructor(private readonly smartPick: SmartPickService) { }
}
