import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
    ) { }

    async login(username: string, password: string) {
        try {
            const user = await this.userService.validateUser(username, password);

            const payload = {
                sub: user.id,
                username: user.username,
            };

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    imageUrl: user.imageUrl,
                },
                access_token: this.jwtService.sign(payload),
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid credentials');
        }
    }
}