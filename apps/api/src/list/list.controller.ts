import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListService } from './list.service';

@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListController {
    constructor(private readonly listService: ListService) { }
}
