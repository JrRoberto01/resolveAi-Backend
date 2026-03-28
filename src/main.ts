import 'dotenv/config'; //Isso daqui garante que o JWT receba a secret antes de inciciar tudo, Precisamos descobrir alternativas para isso futuramente (Sem isso vai quebrar)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        }
    },
    ));
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
