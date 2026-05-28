import { FundTrailService } from '../fund-trail.service';

describe('FundTrailService', () => {
  let service: FundTrailService;

  beforeEach(() => {
    service = new FundTrailService();
  });

  describe('calculateStringSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const result = (service as any).calculateStringSimilarity('payment received', 'payment received');
      expect(result).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', () => {
      const result = (service as any).calculateStringSimilarity('payment', 'transfer');
      expect(result).toBe(0.0);
    });

    it('should return higher score for overlapping strings', () => {
      const result = (service as any).calculateStringSimilarity('payment received', 'payment sent');
      expect(result).toBeGreaterThan(0.3);
      expect(result).toBeLessThan(0.7);
    });

    it('should be case insensitive', () => {
      const result = (service as any).calculateStringSimilarity('PAYMENT', 'payment');
      expect(result).toBe(1.0);
    });
  });

  describe('getRoundAmountScore', () => {
    it('should return 0 for zero amount', () => {
      const result = (service as any).getRoundAmountScore(0);
      expect(result).toBe(0);
    });

    it('should return high score for round amounts like 1000', () => {
      const result = (service as any).getRoundAmountScore(1000);
      expect(result).toBeGreaterThan(0.8);
    });

    it('should return moderate score for whole numbers', () => {
      const result = (service as any).getRoundAmountScore(1234);
      expect(result).toBe(0.8);
    });
  });

  describe('evaluateTransactionPair', () => {
    it('should link transactions with same amount', () => {
      const sourceTx = {
        id: '1',
        importId: 'imp1',
        caseId: 'case1',
        date: new Date('2024-01-01T10:00:00Z'),
        description: 'payment',
        amount: 1000,
        type: 'CREDIT',
        balance: null,
        counterparty: null,
        mode: 'OTHER',
        referenceNumber: null,
        rowNumber: null,
        rawData: null,
        riskScore: 0,
        riskFactors: [],
        createdAt: new Date(),
      };

      const targetTx = {
        ...sourceTx,
        id: '2',
        date: new Date('2024-01-01T10:05:00Z'),
        amount: 1000,
      };

      const result = (service as any).evaluateTransactionPair(sourceTx, targetTx);

      expect(result).not.toBeNull();
      expect(result?.linkReason).toBe('SAME_AMOUNT');
      expect(result?.confidenceScore).toBeGreaterThanOrEqual(0.5);
      expect(result?.amountMatch).toBe(true);
    });

    it('should return null for transactions with no matching criteria', () => {
      const sourceTx = {
        id: '1',
        importId: 'imp1',
        caseId: 'case1',
        date: new Date('2024-01-01T10:00:00Z'),
        description: null,
        amount: 500,
        type: 'CREDIT',
        balance: null,
        counterparty: null,
        mode: 'OTHER',
        referenceNumber: null,
        rowNumber: null,
        rawData: null,
        riskScore: 0,
        riskFactors: [],
        createdAt: new Date(),
      };

      const targetTx = {
        ...sourceTx,
        id: '2',
        date: new Date('2024-06-01T10:00:00Z'),
        amount: 99999,
        counterparty: 'Different Party',
        type: 'DEBIT',
        mode: 'NEFT',
      };

      const result = (service as any).evaluateTransactionPair(sourceTx, targetTx);
      expect(result).toBeNull();
    });
  });

  describe('findTransactionLinks', () => {
    it('should return empty array for empty input', () => {
      const result = (service as any).findTransactionLinks([]);
      expect(result).toEqual([]);
    });

    it('should find links between similar transactions', () => {
      const transactions = [
        {
          id: '1',
          importId: 'imp1',
          caseId: 'case1',
          date: new Date('2024-01-01T10:00:00Z'),
          description: 'payment received',
          amount: 1000,
          type: 'CREDIT',
          balance: null,
          counterparty: 'ABC Corp',
          mode: 'NEFT',
          referenceNumber: null,
          rowNumber: null,
          rawData: null,
          riskScore: 0,
          riskFactors: [],
          createdAt: new Date(),
        },
        {
          id: '2',
          importId: 'imp1',
          caseId: 'case1',
          date: new Date('2024-01-01T10:02:00Z'),
          description: 'payment received from customer',
          amount: 1000,
          type: 'CREDIT',
          balance: null,
          counterparty: 'ABC Corp',
          mode: 'NEFT',
          referenceNumber: null,
          rowNumber: null,
          rawData: null,
          riskScore: 0,
          riskFactors: [],
          createdAt: new Date(),
        },
      ];

      const result = (service as any).findTransactionLinks(transactions);

      expect(result.length).toBe(1);
      expect(result[0].sourceTransactionId).toBe('1');
      expect(result[0].targetTransactionId).toBe('2');
      expect(result[0].confidenceScore).toBeGreaterThanOrEqual(0.5);
    });
  });
});
