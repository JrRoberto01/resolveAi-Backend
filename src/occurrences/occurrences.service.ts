import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    CreateOccurrenceCommentDTO,
    CreateOccurrenceDTO,
    ListOccurrenceDTO,
    RankingOccurrenceDTO,
    UpdateOccurrenceCommentDTO,
    UpdateOccurrenceDTO,
} from './occurrenceDTO';

@Injectable()
export class OccurrencesService {
    constructor(private prismaService: PrismaService) {}

    async create(userId: number, data: CreateOccurrenceDTO) {
        const occurrence = await this.prismaService.occurrence.create({
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                status: data.status,
                anonymous: data.anonymous ?? false,
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.address,
                photos: data.photos ?? [],
                authorId: userId,
            },
            ...this.defaultInclude(userId),
        });

        return this.serializeOccurrence(occurrence, userId);
    }

    async findAll(userId: number, filters: ListOccurrenceDTO) {
        const occurrences = await this.prismaService.occurrence.findMany({
            where: {
                deletedAt: null,
                category: filters.category,
                status: filters.status,
                ...(filters.search
                    ? {
                          OR: [
                              {
                                  title: {
                                      contains: filters.search,
                                      mode: 'insensitive',
                                  },
                              },
                              {
                                  description: {
                                      contains: filters.search,
                                      mode: 'insensitive',
                                  },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...this.defaultInclude(userId),
        });

        return occurrences.map((occurrence) =>
            this.serializeOccurrence(occurrence, userId),
        );
    }

    async findSupported(userId: number) {
        const occurrences = await this.prismaService.occurrence.findMany({
            where: {
                deletedAt: null,
                supports: {
                    some: {
                        userId,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            ...this.defaultInclude(userId),
        });

        return occurrences.map((occurrence) =>
            this.serializeOccurrence(occurrence, userId),
        );
    }

    async ranking(filters: RankingOccurrenceDTO) {
        const days = filters.days ?? 7;
        const rangeKm = filters.rangeKm ?? 25;
        const latitude = filters.latitude;
        const longitude = filters.longitude;
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - days);

        const occurrences = await this.prismaService.occurrence.findMany({
            where: {
                deletedAt: null,
                createdAt: {
                    gte: periodStart,
                },
                latitude: {
                    not: null,
                },
                longitude: {
                    not: null,
                },
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
                supports: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        supports: true,
                        comments: {
                            where: {
                                deletedAt: null,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const occurrencesInRange = occurrences.filter((occurrence) => {
            if (latitude === undefined || longitude === undefined) {
                return true;
            }

            return this.calculateDistanceKm(
                latitude,
                longitude,
                Number(occurrence.latitude),
                Number(occurrence.longitude),
            ) <= rangeKm;
        });

        const categoryCounts = new Map<string, number>();
        const userScores = new Map<
            number,
            {
                userId: number;
                name: string;
                image: string | null;
                created: number;
                supports: number;
                resolved: number;
                score: number;
            }
        >();

        let supportsRegistered = 0;

        occurrencesInRange.forEach((occurrence) => {
            categoryCounts.set(
                occurrence.category,
                (categoryCounts.get(occurrence.category) ?? 0) + 1,
            );

            if (!occurrence.anonymous && occurrence.author) {
                const authorScore = this.getUserScore(userScores, occurrence.author);
                authorScore.created += 1;
                authorScore.score += 3;

                if (occurrence.status === 'RESOLVED') {
                    authorScore.resolved += 1;
                    authorScore.score += 2;
                }
            }

            occurrence.supports.forEach((support) => {
                if (support.createdAt >= periodStart) {
                    supportsRegistered += 1;
                    const supporterScore = this.getUserScore(
                        userScores,
                        support.user,
                    );
                    supporterScore.supports += 1;
                    supporterScore.score += 1;
                }
            });
        });

        const categoryRanking = Array.from(categoryCounts.entries())
            .map(([category, total]) => ({
                category,
                total,
            }))
            .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));

        const topOccurrences = occurrencesInRange
            .map((occurrence) => ({
                id: occurrence.id,
                title: occurrence.title,
                category: occurrence.category,
                address: occurrence.address,
                supportCount: occurrence._count.supports,
                commentsCount: occurrence._count.comments,
                status: occurrence.status,
                createdAt: occurrence.createdAt,
            }))
            .sort(
                (a, b) =>
                    b.supportCount - a.supportCount ||
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .slice(0, 10);

        const engagedUsers = Array.from(userScores.values())
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .slice(0, 10);

        const mostReportedCategory = categoryRanking[0]?.category ?? 'Sem dados';

        return {
            filters: {
                days,
                rangeKm,
                latitude,
                longitude,
            },
            summary: {
                created: occurrencesInRange.length,
                supports: supportsRegistered,
                resolved: occurrencesInRange.filter(
                    (occurrence) => occurrence.status === 'RESOLVED',
                ).length,
                topCategory: mostReportedCategory,
            },
            categoryRanking,
            topOccurrences,
            engagedUsers,
            featuredUsers: engagedUsers,
        };
    }

    async findOne(id: number, userId: number) {
        const occurrence = await this.findExistingOccurrence(id, userId);
        return this.serializeOccurrence(occurrence, userId);
    }

    async update(id: number, userId: number, data: UpdateOccurrenceDTO) {
        const occurrence = await this.findExistingOccurrence(id, userId);

        this.ensureOwner(occurrence.authorId, userId);

        const updatedOccurrence = await this.prismaService.occurrence.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                category: data.category,
                status: data.status,
                anonymous: data.anonymous,
                latitude: data.latitude,
                longitude: data.longitude,
                address: data.address,
                photos: data.photos,
            },
            ...this.defaultInclude(userId),
        });

        return this.serializeOccurrence(updatedOccurrence, userId);
    }

    async remove(id: number, userId: number) {
        const occurrence = await this.findExistingOccurrence(id, userId);

        this.ensureOwner(occurrence.authorId, userId);

        await this.prismaService.occurrence.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return { message: 'Occurrence deleted successfully' };
    }

    async toggleSupport(id: number, userId: number) {
        await this.findExistingOccurrence(id, userId);

        const existingSupport =
            await this.prismaService.occurrenceSupport.findUnique({
                where: {
                    userId_occurrenceId: {
                        userId,
                        occurrenceId: id,
                    },
                },
            });

        if (existingSupport) {
            await this.prismaService.occurrenceSupport.delete({
                where: {
                    id: existingSupport.id,
                },
            });
        } else {
            await this.prismaService.occurrenceSupport.create({
                data: {
                    userId,
                    occurrenceId: id,
                },
            });
        }

        const occurrence = await this.findExistingOccurrence(id, userId);

        return {
            supported: !existingSupport,
            occurrence: this.serializeOccurrence(occurrence, userId),
        };
    }

    async findComments(occurrenceId: number, userId: number) {
        await this.ensureOccurrenceExists(occurrenceId);

        const comments = await this.prismaService.occurrenceComment.findMany({
            where: {
                occurrenceId,
                deletedAt: null,
            },
            include: this.commentInclude(),
            orderBy: {
                createdAt: 'asc',
            },
        });

        return comments.map((comment) => this.serializeComment(comment, userId));
    }

    async createComment(
        occurrenceId: number,
        userId: number,
        data: CreateOccurrenceCommentDTO,
    ) {
        await this.ensureOccurrenceExists(occurrenceId);

        const content = data.content.trim();

        if (!content) {
            throw new BadRequestException('Comment content is required');
        }

        const comment = await this.prismaService.occurrenceComment.create({
            data: {
                content,
                occurrenceId,
                userId,
            },
            include: this.commentInclude(),
        });

        return this.serializeComment(comment, userId);
    }

    async updateComment(
        occurrenceId: number,
        commentId: number,
        userId: number,
        data: UpdateOccurrenceCommentDTO,
    ) {
        const comment = await this.findExistingComment(occurrenceId, commentId);
        this.ensureOwner(comment.userId, userId, 'You cannot change this comment');

        const content = data.content.trim();

        if (!content) {
            throw new BadRequestException('Comment content is required');
        }

        const updatedComment = await this.prismaService.occurrenceComment.update({
            where: {
                id: commentId,
            },
            data: {
                content,
            },
            include: this.commentInclude(),
        });

        return this.serializeComment(updatedComment, userId);
    }

    async removeComment(occurrenceId: number, commentId: number, userId: number) {
        const comment = await this.findExistingComment(occurrenceId, commentId);
        this.ensureOwner(comment.userId, userId, 'You cannot delete this comment');

        await this.prismaService.occurrenceComment.update({
            where: {
                id: commentId,
            },
            data: {
                deletedAt: new Date(),
            },
        });

        return { message: 'Comment deleted successfully' };
    }

    private async ensureOccurrenceExists(id: number) {
        const occurrence = await this.prismaService.occurrence.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (!occurrence) {
            throw new NotFoundException('Occurrence not found');
        }
    }

    private async findExistingComment(occurrenceId: number, commentId: number) {
        const comment = await this.prismaService.occurrenceComment.findFirst({
            where: {
                id: commentId,
                occurrenceId,
                deletedAt: null,
            },
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        return comment;
    }

    private async findExistingOccurrence(id: number, userId: number) {
        const occurrence = await this.prismaService.occurrence.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            ...this.defaultInclude(userId),
        });

        if (!occurrence) {
            throw new NotFoundException('Occurrence not found');
        }

        return occurrence;
    }

    private ensureOwner(authorId: number, userId: number, message = 'You cannot change this occurrence') {
        if (authorId !== userId) {
            throw new ForbiddenException(message);
        }
    }

    private defaultInclude(userId: number) {
        return {
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
                supports: {
                    where: {
                        userId,
                    },
                    select: {
                        id: true,
                    },
                },
                _count: {
                    select: {
                        supports: true,
                        comments: {
                            where: {
                                deletedAt: null,
                            },
                        },
                    },
                },
            },
        };
    }

    private commentInclude() {
        return {
            user: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                },
            },
        };
    }

    private calculateDistanceKm(
        originLatitude: number,
        originLongitude: number,
        targetLatitude: number,
        targetLongitude: number,
    ) {
        const earthRadiusKm = 6371;
        const latitudeDistance = this.toRadians(targetLatitude - originLatitude);
        const longitudeDistance = this.toRadians(targetLongitude - originLongitude);
        const originLatitudeRad = this.toRadians(originLatitude);
        const targetLatitudeRad = this.toRadians(targetLatitude);

        const a =
            Math.sin(latitudeDistance / 2) * Math.sin(latitudeDistance / 2) +
            Math.cos(originLatitudeRad) *
                Math.cos(targetLatitudeRad) *
                Math.sin(longitudeDistance / 2) *
                Math.sin(longitudeDistance / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadiusKm * c;
    }

    private toRadians(value: number) {
        return (value * Math.PI) / 180;
    }

    private getUserScore(userScores: Map<number, any>, user: any) {
        const existingScore = userScores.get(user.id);

        if (existingScore) {
            return existingScore;
        }

        const score = {
            userId: user.id,
            name: user.name,
            image: user.image,
            created: 0,
            supports: 0,
            resolved: 0,
            score: 0,
        };

        userScores.set(user.id, score);
        return score;
    }

    private serializeOccurrence(occurrence: any, userId: number) {
        const canEdit = occurrence.authorId === userId;

        return {
            id: occurrence.id,
            title: occurrence.title,
            description: occurrence.description,
            category: occurrence.category,
            status: occurrence.status,
            anonymous: occurrence.anonymous,
            latitude:
                occurrence.latitude === null ? null : Number(occurrence.latitude),
            longitude:
                occurrence.longitude === null
                    ? null
                    : Number(occurrence.longitude),
            address: occurrence.address,
            photos: occurrence.photos,
            authorId: occurrence.anonymous ? null : occurrence.authorId,
            author: occurrence.anonymous ? null : occurrence.author,
            canEdit,
            supportCount: occurrence._count?.supports ?? 0,
            commentsCount: occurrence._count?.comments ?? 0,
            supportedByMe: occurrence.supports?.length > 0,
            createdAt: occurrence.createdAt,
            modifiedAt: occurrence.modifiedAt,
            deletedAt: occurrence.deletedAt,
        };
    }

    private serializeComment(comment: any, userId?: number) {
        return {
            id: comment.id,
            content: comment.content,
            occurrenceId: comment.occurrenceId,
            userId: comment.userId,
            author: comment.user,
            canEdit: userId === undefined ? false : comment.userId === userId,
            createdAt: comment.createdAt,
            modifiedAt: comment.modifiedAt,
            deletedAt: comment.deletedAt,
        };
    }
}
