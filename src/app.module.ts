import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorsModule } from './core/sensors/sensors.module';
import { GroupsModule } from './core/groups/groups.module';

import { FilesModule } from './core/files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@localhost:27017`,
      {
        dbName: process.env.MONGO_DB,
        minPoolSize: 3,
        maxPoolSize: 5,
      },
    ),
    SensorsModule,
    GroupsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
