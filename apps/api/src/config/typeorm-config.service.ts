import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { GlobalSubscriber } from '../subscribers/global.subscriber';

@Injectable()
export class TypeormConfigService implements TypeOrmOptionsFactory {
    private logger = new Logger(TypeormConfigService.name);
    constructor(private configService: ConfigService) {}

    createTypeOrmOptions(): TypeOrmModuleOptions {
        const dbConfig = this.configService.get('db');
        // this.logger.debug(
        //     `Database Config for env ${this.configService.get(
        //         'ENVIRONMENT',
        //     )}:\n\n${JSON.stringify(dbConfig, null, 2)}\n\n`,
        // );
        return {
            type: dbConfig.type,
            host: dbConfig.host,
            username: dbConfig.username,
            password: dbConfig.password,
            port: dbConfig.port,
            database: dbConfig.type === 'sqlite' ? dbConfig.path : dbConfig.name,
            migrationsRun: dbConfig.migrationsRun,
            synchronize: dbConfig.synchronize,
            logging: dbConfig.logging,
            autoLoadEntities: true,
            subscribers: [GlobalSubscriber],
        };
    }
}
