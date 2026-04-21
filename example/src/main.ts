import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('App running at http://localhost:3000');
  console.log('Architecture dashboard → http://localhost:3000/architecture');
}
bootstrap();
