import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { JwtStrategy } from './jwt/jwt.strategy';
import { LocalStrategy } from './local/local.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (config: ApplicationConfigService) => config.jwtConfig,
      inject: [ApplicationConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthModule],
})
export class AuthModule {}
