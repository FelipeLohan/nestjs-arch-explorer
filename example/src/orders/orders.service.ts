import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

export interface Order {
  id: number;
  userId: number;
  total: number;
}

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [
    { id: 1, userId: 1, total: 99.90 },
    { id: 2, userId: 2, total: 149.00 },
  ];

  constructor(private readonly usersService: UsersService) {}

  findAll() {
    return this.orders.map(order => ({
      ...order,
      user: this.usersService.findOne(order.userId),
    }));
  }
}
