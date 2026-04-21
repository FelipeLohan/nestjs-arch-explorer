import { Module } from '@nestjs/common';
import { ExplorerModule } from 'nestjs-arch-explorer';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    // Plug in the explorer — disable in production
    ExplorerModule.forRoot({
      enabled: process.env.NODE_ENV !== 'production',
    }),

    // Example domain modules
    UsersModule,
    OrdersModule,
  ],
})
export class AppModule {}
