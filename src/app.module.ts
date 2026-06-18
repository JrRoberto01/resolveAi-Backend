import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { OccurrencesModule } from './occurrences/occurrences.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [AuthModule, OccurrencesModule, NotificationsModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
