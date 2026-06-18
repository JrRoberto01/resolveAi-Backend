import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

type NotificationType =
    | 'SUPPORTED_OCCURRENCE_RESOLVED'
    | 'OCCURRENCE_COMMENTED'
    | 'OCCURRENCE_SUPPORTED'
    | 'PASSWORD_CHANGED';

type CreateNotificationPayload = {
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    occurrenceId?: number;
};

@Injectable()
export class NotificationsService {
    constructor(private prismaService: PrismaService) {}

    async create(payload: CreateNotificationPayload) {
        const notification = await this.prismaService.notification.create({
            data: {
                userId: payload.userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                occurrenceId: payload.occurrenceId,
            },
            include: this.defaultInclude(),
        });

        return this.serializeNotification(notification);
    }

    async createMany(payloads: CreateNotificationPayload[]) {
        if (!payloads.length) {
            return { count: 0 };
        }

        return this.prismaService.notification.createMany({
            data: payloads.map((payload) => ({
                userId: payload.userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                occurrenceId: payload.occurrenceId,
            })),
        });
    }

    async findAll(userId: number) {
        const notifications = await this.prismaService.notification.findMany({
            where: {
                userId,
                deletedAt: null,
            },
            include: this.defaultInclude(),
            orderBy: {
                createdAt: 'desc',
            },
            take: 50,
        });

        return notifications.map((notification) =>
            this.serializeNotification(notification),
        );
    }

    async unreadCount(userId: number) {
        const count = await this.prismaService.notification.count({
            where: {
                userId,
                readAt: null,
                deletedAt: null,
            },
        });

        return { count };
    }

    async markAsRead(userId: number, id: number) {
        const notification = await this.prismaService.notification.findFirst({
            where: {
                id,
                userId,
                deletedAt: null,
            },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        const updatedNotification = await this.prismaService.notification.update({
            where: { id },
            data: {
                readAt: notification.readAt ?? new Date(),
            },
            include: this.defaultInclude(),
        });

        return this.serializeNotification(updatedNotification);
    }

    async markAllAsRead(userId: number) {
        const result = await this.prismaService.notification.updateMany({
            where: {
                userId,
                readAt: null,
                deletedAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });

        return { updated: result.count };
    }

    private defaultInclude() {
        return {
            occurrence: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    address: true,
                },
            },
        };
    }

    private serializeNotification(notification: any) {
        return {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            occurrenceId: notification.occurrenceId,
            occurrence: notification.occurrence,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
        };
    }
}
