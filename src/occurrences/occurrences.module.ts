import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { OccurrencesController } from './occurrences.controller';
import { OccurrencesService } from './occurrences.service';

@Module({
    imports: [NotificationsModule],
    controllers: [OccurrencesController],
    providers: [OccurrencesService, PrismaService],
})
export class OccurrencesModule {}
