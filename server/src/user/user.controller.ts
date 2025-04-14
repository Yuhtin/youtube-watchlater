import { Controller, Get, Post, Body, Param, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    create(@Body() createUserDto: { username: string; password: string; imageUrl?: string }) {
        return this.userService.create(createUserDto);
    }

    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userService.findOne(id);
    }

    @Post('login')
    async login(@Body() loginDto: { username: string; password: string }) {
        try {
            const user = await this.userService.validateUser(
                loginDto.username,
                loginDto.password,
            );
            return user;
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }
}