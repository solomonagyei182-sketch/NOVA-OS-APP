import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessDayService } from '../business-day/business-day.service';
import { dateToDayString } from '../business-day/date.util';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessDayService: BusinessDayService,
  ) {}

  async daily() {
    const day = await this.businessDayService.findByDate(dateToDayString());
    if (!day) {
      return { date: dateToDayString(), products: [], totalSalesToday: 0 };
    }

    const grouped = await this.prisma.sale.groupBy({
      by: ['productId'],
      where: { dayId: day.id },
      _sum: { quantity: true, price: true },
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    const rows = grouped.map((g) => ({
      productId: g.productId,
      productName: nameById.get(g.productId) ?? 'Unknown product',
      numberSold: g._sum.quantity ?? 0,
      totalAmount: g._sum.price ?? 0,
    }));

    return {
      date: day.date,
      products: rows.sort((a, b) => b.totalAmount - a.totalAmount),
      totalSalesToday: rows.reduce((sum, r) => sum + r.totalAmount, 0),
    };
  }

  async forProductInRange(productId: string, dateFrom: string, dateTo: string) {
    const aggregate = await this.prisma.sale.aggregate({
      where: {
        productId,
        createdAt: {
          gte: new Date(dateFrom),
          lte: new Date(`${dateTo}T23:59:59.999`),
        },
      },
      _sum: { quantity: true, price: true, commission: true },
      _count: true,
    });

    return {
      totalQuantitySold: aggregate._sum.quantity ?? 0,
      totalSalesAmount: aggregate._sum.price ?? 0,
      transactionCount: aggregate._count,
      totalCommission: aggregate._sum.commission ?? 0,
    };
  }
}
