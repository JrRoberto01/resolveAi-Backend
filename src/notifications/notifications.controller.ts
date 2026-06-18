import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) {}

    @Get()
    async findAll(@Request() request) {
        const userId = Number(request.user?.id);
        return this.notificationsService.findAll(userId);
    }

    @Get('unread-count')
    async unreadCount(@Request() request) {
        const userId = Number(request.user?.id);
        return this.notificationsService.unreadCount(userId);
    }

    @Patch('read-all')
    async markAllAsRead(@Request() request) {
        const userId = Number(request.user?.id);
        return this.notificationsService.markAllAsRead(userId);
    }

    @Patch(':id/read')
    async markAsRead(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = Number(request.user?.id);
        return this.notificationsService.markAsRead(userId, id);
    }
}
