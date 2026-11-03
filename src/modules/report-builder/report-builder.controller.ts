import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Authorize } from '../../common/authorization/decorators/authorize.decorator.js';
import { CurrentUser } from '../../common/authorization/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/authorization/interfaces/authenticated-user.interface.js';
import { BUILDER, ReportBuilderService } from './report-builder.service.js';
import type { ReportDefinition } from './report-builder.types.js';

@Controller('report-builder')
export class ReportBuilderController {
  constructor(private readonly builder: ReportBuilderService) {}
  @Get('connections')
  @Authorize(BUILDER.read)
  connections(@CurrentUser() user: AuthenticatedUser) {
    return this.builder.connections(user);
  }
  @Get('connections/manage')
  @Authorize(BUILDER.connections)
  manage(@CurrentUser() user: AuthenticatedUser) {
    return this.builder.connections(user, true);
  }
  @Post('connections')
  @Authorize(BUILDER.connections)
  createConnection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.builder.saveConnection(user, body);
  }
  @Put('connections/:id')
  @Authorize(BUILDER.connections)
  updateConnection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.builder.saveConnection(user, body, id);
  }
  @Delete('connections/:id')
  @Authorize(BUILDER.connections)
  removeConnection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.builder.removeConnection(user, id);
  }
  @Get('connections/:id/schema')
  @Authorize(BUILDER.read)
  schema(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.builder.schema(user, id);
  }
  @Post('connections/:id/test')
  @Authorize(BUILDER.connections)
  async test(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.builder.connections(user, true);
    const tables = await this.builder.schema(user, id);
    return { connected: true, tables: tables.length };
  }
  @Get('reports')
  @Authorize(BUILDER.read)
  reports(@CurrentUser() user: AuthenticatedUser) {
    return this.builder.reports(user);
  }
  @Get('reports/:id')
  @Authorize(BUILDER.read)
  report(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.builder.report(user, id);
  }
  @Post('reports')
  @Authorize(BUILDER.read, BUILDER.edit)
  createReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; definition: ReportDefinition },
  ) {
    return this.builder.saveReport(user, body);
  }
  @Put('reports/:id')
  @Authorize(BUILDER.read, BUILDER.edit)
  updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name: string; definition: ReportDefinition },
  ) {
    return this.builder.saveReport(user, body, id);
  }
  @Delete('reports/:id')
  @Authorize(BUILDER.read, BUILDER.edit)
  removeReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.builder.removeReport(user, id);
  }
  @Post('preview')
  @Authorize(BUILDER.read)
  preview(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { definition: ReportDefinition; parameters?: Record<string, string> },
  ) {
    return this.builder.preview(user, body);
  }
  @Post('export')
  @Authorize(BUILDER.read, BUILDER.export)
  export(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { definition: ReportDefinition; parameters?: Record<string, string> },
    @Res() response: Response,
  ) {
    return this.builder.export(user, body, response);
  }
}
