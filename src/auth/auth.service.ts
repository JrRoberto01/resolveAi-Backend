import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { SignInDTO, SignUpDTO, updateUserDTO } from './authDTO';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private prismaService: PrismaService, private jwtService: JwtService) { }

    async signup(data: SignUpDTO) {
        const userAlreadyExists = await this.prismaService.user.findUnique({
            where: {
                email: data.email
            },
        });

        if (userAlreadyExists) {
            throw new UnauthorizedException('User already exists');
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
        }
    }

    async signin(data: SignInDTO) {
        const user = await this.prismaService.user.findUnique({
            where: {
                email: data.email
            },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const passwordMatch = await bcrypt.compare(data.password, user.password);

        if (!passwordMatch) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const accessToken = await this.jwtService.signAsync({
            id: user.id,
            name: user.name,
            email: user.email,
        });

        return { accessToken };
    }

    async me(userId: number) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            select: {
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
            }
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
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
                throw new ConflictException('There is already an account registered with this e-mail');
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
            }
        });

        return { updatedUser };
    }
}