import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { SignInDTO, SignUpDTO, updateUserDTO } from './authDTO';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('signin')
    async signin(@Body() body: SignInDTO) {
        return this.authService.signin(body);
    }

    @Post('signup')
    async signup(@Body() body: SignUpDTO) {
        return this.authService.signup(body);
    }

    @Post('refresh')
    async refresh(@Body() body: { refreshToken: string }) {
        return this.authService.refreshToken(body.refreshToken);
    }


    @UseGuards(AuthGuard)
    @Get('me')
    async me(@Request() request) {
        const userId = Number(request.user?.id);
        return this.authService.me(userId);
    }

    @UseGuards(AuthGuard)
    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() data: updateUserDTO) {
        return this.authService.update(id, data);
    }
}
