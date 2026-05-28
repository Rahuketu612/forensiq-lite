import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionParserService } from './parser.service';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionParserService],
  exports: [TransactionsService],
})
export class TransactionsModule {}