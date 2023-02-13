import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorsModule } from './core/sensors/sensors.module';
import { GroupsModule } from './core/groups/groups.module';
import { FilesModule } from './core/files/files.module';
import { ApplicationConfigService } from './core/application-config/application-config.service';
import { ApplicationConfigModule } from './core/application-config/application-config.module';

@Module({
  imports: [
    ApplicationConfigModule,
    MongooseModule.forRootAsync({
      useFactory: async (config: ApplicationConfigService) => {
        console.dir(config.mongooseModuleOptions);
        return config.mongooseModuleOptions;
      },
      inject: [ApplicationConfigService],
    }),
    SensorsModule,
    GroupsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [AppService],
})
export class AppModule {}
