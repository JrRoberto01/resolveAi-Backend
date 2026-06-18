import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import {
    CreateOccurrenceCommentDTO,
    CreateOccurrenceDTO,
    ListOccurrenceDTO,
    RankingOccurrenceDTO,
    UpdateOccurrenceCommentDTO,
    UpdateOccurrenceDTO,
} from './occurrenceDTO';
import { OccurrencesService } from './occurrences.service';

@UseGuards(AuthGuard)
@Controller('occurrences')
export class OccurrencesController {
    constructor(private occurrencesService: OccurrencesService) {}

    @UseGuards(AuthGuard)
    @Post()
    async create(@Request() request, @Body() body: CreateOccurrenceDTO) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.create(userId, body);
    }

    @UseGuards(AuthGuard)
    @Get()
    async findAll(@Request() request, @Query() query: ListOccurrenceDTO) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.findAll(userId, query);
    }
    
    @UseGuards(AuthGuard)
    @Get('supported/me')
    async findSupported(@Request() request) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.findSupported(userId);
    }

    @UseGuards(AuthGuard)
    @Get('ranking')
    async ranking(@Query() query: RankingOccurrenceDTO) {
        return this.occurrencesService.ranking(query);
    }

    @UseGuards(AuthGuard)
    @Get('categories')
    async categories() {
        return this.occurrencesService.findCategories();
    }

    @UseGuards(AuthGuard)
    @Get(':id')
    async findOne(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.findOne(id, userId);
    }

    @UseGuards(AuthGuard)
    @Patch(':id')
    async update(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateOccurrenceDTO,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.update(id, userId, body);
    }

    @UseGuards(AuthGuard)
    @Delete(':id')
    async remove(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.remove(id, userId);
    }

    @UseGuards(AuthGuard)
    @Post(':id/support')
    async toggleSupport(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.toggleSupport(id, userId);
    }

    @UseGuards(AuthGuard)
    @Get(':id/comments')
    async findComments(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.findComments(id, userId);
    }

    @UseGuards(AuthGuard)
    @Post(':id/comments')
    async createComment(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
        @Body() body: CreateOccurrenceCommentDTO,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.createComment(id, userId, body);
    }
    
    @UseGuards(AuthGuard)
    @Patch(':id/comments/:commentId')
    async updateComment(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
        @Param('commentId', ParseIntPipe) commentId: number,
        @Body() body: UpdateOccurrenceCommentDTO,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.updateComment(id, commentId, userId, body);
    }

    @UseGuards(AuthGuard)
    @Delete(':id/comments/:commentId')
    async removeComment(
        @Request() request,
        @Param('id', ParseIntPipe) id: number,
        @Param('commentId', ParseIntPipe) commentId: number,
    ) {
        const userId = Number(request.user?.id);
        return this.occurrencesService.removeComment(id, commentId, userId);
    }
}
