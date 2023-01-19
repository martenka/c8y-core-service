import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Sensor, SensorSchema } from './models/Sensor';
import { SensorsModule } from './core/sensors/sensors.module';
import { GroupsModule } from './core/groups/groups.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@localhost:27017`,
      { dbName: process.env.MONGO_DB },
    ),
    MongooseModule.forFeature([{ name: Sensor.name, schema: SensorSchema }]),
    SensorsModule,
    GroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
