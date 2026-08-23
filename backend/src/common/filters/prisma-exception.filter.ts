import { ArgumentsHost, Catch, ConflictException, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = this.mapException(exception);
    const response = host.switchToHttp().getResponse();
    const status = mapped.getStatus();
    response.status(status).json({ statusCode: status, message: mapped.message });
  }

  private mapException(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ') ?? 'value';
        return new ConflictException(`A record with this ${target} already exists.`);
      }
      case 'P2025':
        return new NotFoundException('The requested record could not be found.');
      default:
        return new ConflictException('The request could not be completed due to a data conflict.');
    }
  }
}
