import { Controller, Get, Post, Body, Param, UnauthorizedException, Delete, UseGuards, Request, Patch, BadRequestException, ForbiddenException, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    create(@Body() createUserDto: { username: string; password: string; imageUrl?: string }) {
        return this.userService.create(createUserDto);
    }


    @Get('search')
    async searchUsers(@Query('query') query: string) {
        if (!query || query.length < 3) {
            return [];
        }

        return this.userService.searchByUsername(query);
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
    @Patch(':id')
    async updateUsername(
        @Param('id') id: string,
        @Body() body: { username: string },
        @Request() req
    ) {
        if (id !== req.user.userId) {
            throw new ForbiddenException('You can only update your own account');
        }

        try {
            if (body.username) {
                const existingUser = await this.userService.findByUsername(body.username);
                if (existingUser && existingUser.id !== id) {
                    throw new BadRequestException('Username already exists');
                }
            }

            const updatedUser = await this.userService.updateUser(id, {
                username: body.username
            });

            return {
                success: true,
                message: 'Username updated successfully',
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username
                }
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException) {
                throw error;
            }

            throw new BadRequestException('Error updating username: ' + error.message);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/password')
    async updatePassword(
        @Param('id') id: string,
        @Body() body: { currentPassword: string; newPassword: string },
        @Request() req
    ) {
        if (id !== req.user.userId) {
            throw new ForbiddenException('You can only update your own account');
        }

        try {
            const user = await this.userService.findById(id, true);
            const userWithPassword = user as any;

            if (!user) {
                throw new BadRequestException('User not found');
            }

            const isPasswordValid = await this.userService.validatePassword(
                body.currentPassword,
                userWithPassword.password
            );

            if (!isPasswordValid) {
                throw new BadRequestException('Current password is incorrect');
            }

            await this.userService.updateUser(id, {
                password: body.newPassword
            });

            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException) {
                throw error;
            }

            throw new BadRequestException('Error updating password: ' + error.message);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/image')
    async updateProfileImage(
        @Param('id') id: string,
        @Body() body: { imageUrl: string },
        @Request() req
    ) {
        if (id !== req.user.userId) {
            throw new ForbiddenException('You can only update your own account');
        }

        try {
            if (!body.imageUrl || !this.validateImageUrl(body.imageUrl)) {
                throw new BadRequestException('Invalid image URL');
            }

            const updatedUser = await this.userService.updateUser(id, {
                imageUrl: body.imageUrl
            });

            return {
                success: true,
                message: 'Profile image updated successfully',
                imageUrl: updatedUser.imageUrl
            };
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof ForbiddenException) {
                throw error;
            }

            throw new BadRequestException('Error updating profile image: ' + error.message);
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

    private validateImageUrl(url: string): { valid: boolean; reason?: string } {
        try {
            const parsedUrl = new URL(url);

            if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
                return { valid: false, reason: 'URL must use HTTP or HTTPS protocol' };
            }

            const trustedDomains = [
                'i.imgur.com',
                'imgur.com',
                'images.unsplash.com',
                'unsplash.com',
                'picsum.photos',
                'googleusercontent.com',
                'ggpht.com',
                's3.amazonaws.com',
                'cloudfront.net',
                'githubusercontent.com',
                'ytimg.com',
                'twimg.com',
                'pbs.twimg.com',
                'media.giphy.com',
                'giphy.com',
                'tenor.com',
                'cloudinary.com',
                'res.cloudinary.com',
                'images.pexels.com',
                'staticflickr.com',
                'live.staticflickr.com',
                'upload.wikimedia.org'
            ];

            const domain = parsedUrl.hostname;
            const isDomainTrusted = trustedDomains.some(trusted =>
                domain === trusted || domain.endsWith('.' + trusted)
            );

            if (!isDomainTrusted) {
                return { valid: false, reason: 'Domain not in trusted image providers list' };
            }

            const path = parsedUrl.pathname.toLowerCase();
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
            const hasValidExtension = validExtensions.some(ext => path.endsWith(ext));

            if (!hasValidExtension) {
                return { valid: false, reason: 'URL must point to a valid image file format' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, reason: 'Invalid URL format' };
        }
    }
}