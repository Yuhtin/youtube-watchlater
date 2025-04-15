import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ColumnType } from '@prisma/client';

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) { }

  async create(data: any) {
    try {
      const existingPlaylist = await this.prisma.playlist.findFirst({
        where: {
          id: data.id,
          userId: data.userId
        }
      });

      if (existingPlaylist) {
        return {
          statusCode: 409,
          message: "Playlist already exists in your collection",
          data: existingPlaylist
        };
      }

      return await this.prisma.playlist.create({
        data: {
          ...data,
        },
      });
    } catch (error) {
      return {
        statusCode: 500,
        message: "Failed to add playlist",
        error: error.message
      };
    }
  }

  async findAllByUser(userId: string) {
    return this.prisma.playlist.findMany({
      where: {
        userId,
      },
      include: {
        cards: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.playlist.findUnique({
      where: {
        id,
      },
      include: {
        cards: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async calculatePlaylistStatus(playlistId: string) {
    const cards = await this.prisma.card.findMany({
      where: {
        playlistId,
      },
      select: {
        status: true,
      },
    });

    if (cards.length === 0) {
      return ColumnType.WATCH_LATER;
    }

    const allWatched = cards.every(card => card.status === ColumnType.WATCHED);
    if (allWatched) {
      return ColumnType.WATCHED;
    }

    const anyWatchingOrWatched = cards.some(card =>
      card.status === ColumnType.WATCHING || card.status === ColumnType.WATCHED
    );
    if (anyWatchingOrWatched) {
      return ColumnType.WATCHING;
    }

    return ColumnType.WATCH_LATER;
  }

  async updateCardsStatus(playlistId: string, userId: string, status: ColumnType) {
    return this.prisma.card.updateMany({
      where: {
        playlistId,
        userId,
      },
      data: {
        status,
      },
    });
  }
}