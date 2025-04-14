import { Controller, Get, Post, Body, Param, UnauthorizedException, Delete, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async deleteAccount(
        @Param('id') id: string, 
        @Body() body: { password: string },
        @Request() req
    ) {
        if (id !== req.user.userId) {
            return { 
                success: false,
                statusCode: 403,
                message: 'You can only delete your own account' 
            };
        }
        
        try {
            const user = await this.userService.findById(id, true);
            const userWithPassword = user as any;
            
            if (!user) {
                return {
                    success: false,
                    statusCode: 404,
                    message: 'User not found'
                };
            }
            
            const isPasswordValid = await this.userService.validatePassword(
                body.password,
                userWithPassword.password
            );
            
            if (!isPasswordValid) {
                return {
                    success: false,
                    statusCode: 401,
                    message: 'Invalid password'
                };
            }
            
            await this.userService.deleteUser(id);
            
            return {
                success: true,
                message: 'Account deleted successfully'
            };
        } catch (error) {
            return {
                success: false,
                statusCode: 500,
                message: 'Error deleting account',
                error: error.message
            };
        }
    }
}