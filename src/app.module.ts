import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorsModule } from './core/sensors/sensors.module';
import { GroupsModule } from './core/groups/groups.module';
import { ApplicationConfigService } from './core/application-config/application-config.service';
import { ApplicationConfigModule } from './core/application-config/application-config.module';
import { AuthModule } from './core/auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './core/auth/jwt/jwt-auth.guard';
import { TasksModule } from './core/tasks/tasks.module';

@Module({
  imports: [
    ApplicationConfigModule,
    MongooseModule.forRootAsync({
      useFactory: async (config: ApplicationConfigService) => {
        return config.mongooseModuleOptions;
      },
      inject: [ApplicationConfigService],
    }),
    SensorsModule,
    GroupsModule,
    AuthModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, AppService],
  exports: [AppService],
})
export class AppModule {}
