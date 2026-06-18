import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { SignInDTO, SignUpDTO, updateUserDTO } from './authDTO';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

type JwtPayload = { id: number; name: string; email: string; };

@Injectable()
export class AuthService {
    constructor(
        private prismaService: PrismaService,
        private jwtService: JwtService,
        private notificationsService: NotificationsService,
    ) { }

    async signup(data: SignUpDTO) {
        const userAlreadyExists = await this.prismaService.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if (userAlreadyExists) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await this.prismaService.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });

        return {
            id: user.id,
            name: user.name,
            email: user.email,
        };
    }

    async signin(data: SignInDTO) {
        const user = await this.prismaService.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordMatch = await bcrypt.compare(data.password, user.password);

        if (!passwordMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const { accessToken, refreshToken } = await this.generateTokens({
            id: user.id,
            name: user.name,
            email: user.email,
        });

        await this.updateRefreshToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
        };
    }

    async refreshToken(refreshToken: string) {
        let payload: JwtPayload;

        try {
            payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET',
            });
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.prismaService.user.findUnique({
            where: { id: payload.id },
        });

        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        const refreshTokenMatches = await bcrypt.compare(
            refreshToken,
            user.refreshToken,
        );

        if (!refreshTokenMatches) {
            throw new UnauthorizedException('Access denied');
        }

        const tokens = await this.generateTokens({
            id: user.id,
            name: user.name,
            email: user.email,
        });

        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    async logout(userId: number) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        await this.prismaService.user.update({
            where: { id: userId },
            data: {
                refreshToken: null,
            },
        });

        return { message: 'Logged out successfully' };
    }

    async me(userId: number) {
        const user = await this.prismaService.user.findFirst({
            where: {
                id: userId,
                deletedAt: null,
            },
            select: this.userSelect(),
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return this.serializeUser(user);
    }

    async updateMe(userId: number, data: updateUserDTO) {
        const user = await this.prismaService.user.findFirst({
            where: {
                id: userId,
                deletedAt: null,
            },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const updateData: {
            name?: string;
            image?: string;
            password?: string;
        } = {};

        if (data.name !== undefined) {
            updateData.name = data.name;
        }

        if (data.image !== undefined) {
            updateData.image = data.image;
        }

        if (data.password) {
            if (!data.currentPassword) {
                throw new UnauthorizedException('Current password is required');
            }

            const currentPasswordMatches = await bcrypt.compare(
                data.currentPassword,
                user.password,
            );

            if (!currentPasswordMatches) {
                throw new UnauthorizedException('Invalid current password');
            }

            updateData.password = await bcrypt.hash(data.password, 10);
        }

        const passwordWasChanged = Boolean(updateData.password);

        const updatedUser = await this.prismaService.user.update({
            where: { id: userId },
            data: updateData,
            select: this.userSelect(),
        });

        if (passwordWasChanged) {
            await this.notificationsService.create({
                userId,
                type: 'PASSWORD_CHANGED',
                title: 'Senha alterada',
                message: 'Sua senha foi alterada com sucesso.',
            });
        }

        return this.serializeUser(updatedUser);
    }

    async update(id: number, data: updateUserDTO) {
        const user = await this.prismaService.user.findFirst({
            where: { id },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (data.email) {
            const conflictEmail = await this.prismaService.user.findFirst({
                where: {
                    email: data.email,
                    deletedAt: null,
                    NOT: { id },
                },
            });

            if (conflictEmail) {
                throw new ConflictException(
                    'There is already an account registered with this e-mail',
                );
            }
        }

        if (data.password) {
            const samePassword = await bcrypt.compare(data.password, user.password);

            if (samePassword) {
                throw new ConflictException('Choose a different password');
            }

            data.password = await bcrypt.hash(data.password, 10);
        }

        const updatedUser = await this.prismaService.user.update({
            where: { id },
            data: {
                ...data,
            },
        });

        return { updatedUser };
    }

    private async generateTokens(user: JwtPayload) {
        const payload: JwtPayload = {
            id: user.id,
            name: user.name,
            email: user.email,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET || 'ACCESS_SECRET',
                expiresIn: '3m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'REFRESH_SECRET',
                expiresIn: '10m',
            }),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    private async updateRefreshToken(userId: number, refreshToken: string) {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        await this.prismaService.user.update({
            where: { id: userId },
            data: {
                refreshToken: hashedRefreshToken,
            },
        });
    }

    private userSelect() {
        return {
            id: true,
            name: true,
            email: true,
            image: true,
            latitude: true,
            longitude: true,
            group: true,
            createdAt: true,
            modifiedAt: true,
            deletedAt: true,
        };
    }

    private serializeUser(user: any) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            latitude: user.latitude === null ? null : Number(user.latitude),
            longitude: user.longitude === null ? null : Number(user.longitude),
            group: user.group,
            city: null,
            state: null,
            createdAt: user.createdAt,
            modifiedAt: user.modifiedAt,
            deletedAt: user.deletedAt,
        };
    }
}
