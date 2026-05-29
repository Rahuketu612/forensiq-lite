import { PrismaClient, UserRole, CaseStatus, RiskLevel, TransactionMode, TransactionType, RedFlagSeverity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@forensiq.io' },
    update: {},
    create: {
      email: 'demo@forensiq.io',
      name: 'Demo User',
      password: '$2b$12$wunJ3n31kGW81ur0/o551uwDPI1JqWu7rv3N4ObfA.Nrd/TcIyiGW', // demo123456
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('Created demo user:', demoUser.email);

  // Create demo case
  const demoCase = await prisma.case.upsert({
    where: { caseNumber: 'CASE-2024-001' },
    update: {},
    create: {
      caseNumber: 'CASE-2024-001',
      title: 'Sample Investigation Case',
      description: 'A demo case for testing ForensiQ Lite features including transaction analysis, red flags, and fund trail analysis.',
      status: CaseStatus.ACTIVE,
      riskLevel: RiskLevel.HIGH,
      clientName: 'Demo Client',
      clientEmail: 'client@demo.com',
      createdById: demoUser.id,
    },
  });
  console.log('Created demo case:', demoCase.caseNumber);

  // Create transaction import first (required for transactions)
  const txImport = await prisma.transactionImport.create({
    data: {
      caseId: demoCase.id,
      fileName: 'demo-transactions.csv',
      originalName: 'demo-transactions.csv',
      mimeType: 'text/csv',
      importedById: demoUser.id,
      status: 'COMPLETED',
      totalRows: 20,
      successRows: 20,
    },
  });
  console.log('Created transaction import:', txImport.id);

  // Create sample transactions
  const transactions = [
    { date: new Date('2024-01-15'), amount: 50000, type: TransactionType.CREDIT, mode: TransactionMode.UPI, counterparty: 'Vendor A', description: 'Payment received from client' },
    { date: new Date('2024-01-16'), amount: 25000, type: TransactionType.DEBIT, mode: TransactionMode.UPI, counterparty: 'Vendor B', description: 'Payment to vendor' },
    { date: new Date('2024-01-17'), amount: 25000, type: TransactionType.DEBIT, mode: TransactionMode.NEFT, counterparty: 'Vendor C', description: 'Payment to vendor' },
    { date: new Date('2024-01-18'), amount: 100000, type: TransactionType.CREDIT, mode: TransactionMode.IMPS, counterparty: 'Customer A', description: 'Sale proceeds' },
    { date: new Date('2024-01-19'), amount: 30000, type: TransactionType.DEBIT, mode: TransactionMode.UPI, counterparty: 'Vendor A', description: 'Payment to vendor - related to first transaction' },
    { date: new Date('2024-01-20'), amount: 40000, type: TransactionType.DEBIT, mode: TransactionMode.RTGS, counterparty: 'Vendor D', description: 'Large payment' },
    { date: new Date('2024-01-21'), amount: 15000, type: TransactionType.CREDIT, mode: TransactionMode.UPI, counterparty: 'Customer B', description: 'Refund' },
    { date: new Date('2024-01-22'), amount: 15000, type: TransactionType.DEBIT, mode: TransactionMode.UPI, counterparty: 'Vendor E', description: 'Payment - almost same amount as previous credit' },
    { date: new Date('2024-01-23'), amount: 80000, type: TransactionType.CREDIT, mode: TransactionMode.IMPS, counterparty: 'Unknown Source', description: 'Large inflow' },
    { date: new Date('2024-01-24'), amount: 30000, type: TransactionType.DEBIT, mode: TransactionMode.NEFT, counterparty: 'Vendor B', description: 'Payment to vendor - same as earlier' },
    { date: new Date('2024-01-25'), amount: 30000, type: TransactionType.DEBIT, mode: TransactionMode.NEFT, counterparty: 'Vendor B', description: 'Payment to vendor - same counterparty' },
    { date: new Date('2024-01-26'), amount: 20000, type: TransactionType.DEBIT, mode: TransactionMode.UPI, counterparty: 'Vendor F', description: 'Round amount payment' },
    { date: new Date('2024-01-27'), amount: 20000, type: TransactionType.CREDIT, mode: TransactionMode.UPI, counterparty: 'Vendor F', description: 'Round amount credit - same counterparty' },
    { date: new Date('2024-01-28'), amount: 75000, type: TransactionType.CREDIT, mode: TransactionMode.IMPS, counterparty: 'New Customer', description: 'Large inflow from new source' },
    { date: new Date('2024-01-29'), amount: 25000, type: TransactionType.DEBIT, mode: TransactionMode.UPI, counterparty: 'Vendor A', description: 'Payment to vendor' },
    { date: new Date('2024-01-30'), amount: 25000, type: TransactionType.DEBIT, mode: TransactionMode.NEFT, counterparty: 'Vendor C', description: 'Payment to vendor' },
    { date: new Date('2024-01-31'), amount: 25000, type: TransactionType.DEBIT, mode: TransactionMode.RTGS, counterparty: 'Vendor G', description: 'Payment to vendor' },
    { date: new Date('2024-02-01'), amount: 100000, type: TransactionType.CREDIT, mode: TransactionMode.IMPS, counterparty: 'Suspicious Source', description: 'Large inflow - requires investigation' },
    { date: new Date('2024-02-02'), amount: 50000, type: TransactionType.DEBIT, mode: TransactionMode.RTGS, counterparty: 'Vendor H', description: 'Large payment' },
    { date: new Date('2024-02-03'), amount: 50000, type: TransactionType.DEBIT, mode: TransactionMode.RTGS, counterparty: 'Vendor I', description: 'Large payment' },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        ...tx,
        caseId: demoCase.id,
        importId: txImport.id,
        referenceNumber: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
    });
  }
  console.log(`Created ${transactions.length} sample transactions`);

  // Create red flag rules
  const redFlagRules = [
    {
      name: 'Large Cash Deposits',
      description: 'Flags transactions with cash deposits above threshold',
      parameters: JSON.stringify({ field: 'amount', operator: 'gt', value: 100000, type: 'CREDIT' }),
      severity: RedFlagSeverity.HIGH,
      isActive: true,
    },
    {
      name: 'Round Amount Transactions',
      description: 'Flags transactions with round amounts that may indicate structuring',
      parameters: JSON.stringify({ field: 'amount', operator: 'in', value: [10000, 20000, 50000, 100000] }),
      severity: RedFlagSeverity.MEDIUM,
      isActive: true,
    },
    {
      name: 'Rapid Transactions',
      description: 'Flags multiple transactions within short time window',
      parameters: JSON.stringify({ field: 'amount', operator: 'gt', value: 50000 }),
      severity: RedFlagSeverity.LOW,
      isActive: true,
    },
  ];

  for (const rule of redFlagRules) {
    const created = await prisma.redFlagRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        parameters: rule.parameters,
        isActive: rule.isActive,
        caseId: demoCase.id,
      },
    });
    
    // Generate red flags for the rule
    if (created.name === 'Large Cash Deposits') {
      const largeTx = await prisma.transaction.findFirst({ where: { amount: 100000, caseId: demoCase.id } });
      if (largeTx) {
        await prisma.redFlag.create({
          data: {
            caseId: demoCase.id,
            transactionId: largeTx.id,
            ruleId: created.id,
            ruleName: created.name,
            title: 'Large Cash Deposit Detected',
            explanation: 'A large cash deposit of ₹1,00,000 was detected which exceeds the normal threshold.',
            severity: RedFlagSeverity.HIGH,
          },
        });
      }
    }
  }
  console.log('Created red flag rules and flags');

  // Create investigation timeline entries
  await prisma.investigationTimeline.create({
    data: {
      caseId: demoCase.id,
      eventType: 'NOTE_ADDED',
      title: 'Investigation Started',
      description: 'Initial investigation notes added to the case',
      userId: demoUser.id,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });