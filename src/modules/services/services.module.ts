import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ServicesController } from './controllers/services.controller.js';
import { ServicesRepository } from './repositories/services.repository.js';
import { ServicesService } from './services/services.service.js';


@Module({
  imports: [DatabaseModule],

  controllers: [
    ServicesController,
  ],
  providers: [
    ServicesRepository,
    ServicesService,
  ],
  exports: [
    ServicesService,
    ServicesRepository,
  ],
})
export class ServicesModule { }