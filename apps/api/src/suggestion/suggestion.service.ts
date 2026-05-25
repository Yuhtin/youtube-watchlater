import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuggestionService {
    constructor(private prisma: PrismaService) {}

    async findAllForUser(userId: string) {
        return this.prisma.suggestion.findMany({
            where: {
                OR: [
                    { fromUserId: userId },
                    { toUserId: userId }
                ]
            },
            include: {
                fromUser: {
                    select: { id: true, username: true, imageUrl: true }
                },
                toUser: {
                    select: { id: true, username: true, imageUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.suggestion.findUnique({
            where: { id },
            include: {
                fromUser: true,
                toUser: true
            }
        });
    }

    async create(data: any) {
        return this.prisma.suggestion.create({
            data: {
                fromUserId: data.fromUserId,
                toUserId: data.toUserId,
                videoId: data.videoId,
                videoTitle: data.videoTitle,
                videoThumbnail: data.videoThumbnail,
                videoDuration: data.videoDuration,
                note: data.note,
                read: false,
                accepted: null
            }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.suggestion.update({
            where: { id },
            data
        });
    }
}