import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { OccurrencesModule } from './occurrences/occurrences.module';

@Module({
  imports: [AuthModule, OccurrencesModule],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule {}
