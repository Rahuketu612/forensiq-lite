import { PrismaClient, TransactionType, TransactionMode, ImportStatus, RedFlagSeverity, CaseStatus, InvestigationStatus, TimelineEventType } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// Demo seed data for forensic investigation testing
async function main() {
  console.log('🌱 Seeding forensic demo data...');

  // Check if already seeded
  const caseCount = await prisma.case.count();
  if (caseCount > 0) {
    console.log('⚠️  Database already contains data. Skipping seed.');
    return;
  }

  // Create demo auditor user
  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@forensiq.local',
      name: 'Senior Auditor Mehta',
      password: 'demo123',
      role: 'AUDITOR',
    },
  });
  console.log(`✅ Created auditor: ${auditor.email}`);

  // Create demo admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@forensiq.local',
      name: 'System Administrator',
      password: 'admin123',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Created admin: ${admin.email}`);

  // Create sample forensic case
  const demoCase = await prisma.case.create({
    data: {
      title: 'Kumar Electronics - Vendor Payment Anomaly Investigation',
      description: 'Investigation into suspected fraudulent vendor payments at Kumar Electronics Pvt Ltd. Bank statements for Q1-Q2 2024 show unusual payment patterns to new vendors.',
      status: CaseStatus.ACTIVE,
      riskLevel: 'HIGH',
      createdById: auditor.id,
    },
  });
  console.log(`✅ Created case: ${demoCase.title}`);

  // Create transaction import record
  const importRecord = await prisma.transactionImport.create({
    data: {
      caseId: demoCase.id,
      originalName: 'Kumar_Electronics_Account_Statement_2024.xlsx',
      fileName: 'kumar_electronics_statement_2024.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: 245760,
      status: ImportStatus.COMPLETED,
      totalRows: 20,
      successRows: 20,
      failedRows: 0,
      importedById: auditor.id,
    },
  });
  console.log(`✅ Created transaction import`);

  // Base date for transactions
  const baseDate = new Date('2024-01-15');

  // Create 20 sample transactions with specific forensic scenarios
  const transactions = [
    // 1. Normal transaction (credit)
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-01-15'),
      description: 'RTGS from ABC Corp - Invoice Payment',
      amount: 150000,
      type: TransactionType.CREDIT,
      balance: 150000,
      counterparty: 'ABC Corporation',
      mode: TransactionMode.RTGS,
      referenceNumber: 'RTGS2024001001',
    },
    // 2. Normal transaction (debit)
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-01-18'),
      description: 'Vendor Payment - Tech Solutions Ltd',
      amount: 45000,
      type: TransactionType.DEBIT,
      balance: 105000,
      counterparty: 'Tech Solutions Limited',
      mode: TransactionMode.NEFT,
      referenceNumber: 'NEFT2024001020',
    },
    // 3. HIGH VALUE transaction (>1,00,000)
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-01-22'),
      description: 'Wire Transfer - New Vendor XYZ',
      amount: 2500000,
      type: TransactionType.DEBIT,
      balance: 2550000,
      counterparty: 'XYZ Supplies Private Limited',
      mode: TransactionMode.ONLINE,
      referenceNumber: 'WIRE2024001225',
    },
    // 4. Round amount transaction (suspicious)
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-01-25'),
      description: 'Payment Clearance',
      amount: 100000,
      type: TransactionType.DEBIT,
      balance: 2450000,
      counterparty: 'M/s Rahul Enterprises',
      mode: TransactionMode.CHEQUE,
      referenceNumber: 'CHQ2024012501',
    },
    // 5. Weekend transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-01-27'), // Saturday
      description: 'Emergency Transfer - Account Payable',
      amount: 75000,
      type: TransactionType.DEBIT,
      balance: 2375000,
      counterparty: 'Various Creditors',
      mode: TransactionMode.IMPS,
      referenceNumber: 'IMPS2024012701',
    },
    // 6. Suspicious narration transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-01'),
      description: 'Settlement as per our discussion - DO NOT RECONCILE',
      amount: 200000,
      type: TransactionType.DEBIT,
      balance: 2175000,
      counterparty: 'Confidential Account',
      mode: TransactionMode.ONLINE,
      referenceNumber: 'ONL2024020101',
    },
    // 7-8. Duplicate transactions (same amount, similar description)
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-05'),
      description: 'Annual Maintenance Contract Payment',
      amount: 180000,
      type: TransactionType.DEBIT,
      balance: 1995000,
      counterparty: 'ServicePro Consultants',
      mode: TransactionMode.NEFT,
      referenceNumber: 'NEFT2024020501',
    },
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-06'),
      description: 'AMC Payment - ServicePro Consultants',
      amount: 180000,
      type: TransactionType.DEBIT,
      balance: 1815000,
      counterparty: 'ServicePro Consultants',
      mode: TransactionMode.NEFT,
      referenceNumber: 'NEFT2024020601',
    },
    // 9. Normal transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-10'),
      description: 'Rent Deposit Refund',
      amount: 25000,
      type: TransactionType.CREDIT,
      balance: 1840000,
      counterparty: '_property_owner',
      mode: TransactionMode.BANK,
    },
    // 10. High value credit
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-15'),
      description: 'Customer Receipt - Mega Mart',
      amount: 890000,
      type: TransactionType.CREDIT,
      balance: 2730000,
      counterparty: 'Mega Mart Retail Chain',
      mode: TransactionMode.RTGS,
      referenceNumber: 'RTGS2024021501',
    },
    // 11. Suspicious pattern - multiple small payments
 {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-20'),
      description: 'Petty Cash Replenishment',
      amount: 49999,
      type: TransactionType.DEBIT,
      balance: 2680001,
      counterparty: 'Cash Management A/c',
      mode: TransactionMode.CASH,
      referenceNumber: 'CASH2024022001',
    },
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-21'),
      description: 'Petty Cash Top-up',
      amount: 49999,
      type: TransactionType.DEBIT,
      balance: 2630002,
      counterparty: 'Cash Management A/c',
      mode: TransactionMode.CASH,
      referenceNumber: 'CASH2024022101',
    },
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-02-22'),
      description: 'Cash Withdrawal Replenish',
      amount: 49999,
      type: TransactionType.DEBIT,
      balance: 2580003,
      counterparty: 'Cash Management A/c',
      mode: TransactionMode.CASH,
      referenceNumber: 'CASH2024022201',
    },
    // 14. Normal transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-01'),
      description: 'Electricity Bill Payment - State Discom',
      amount: 125000,
      type: TransactionType.DEBIT,
      balance: 2455003,
      counterparty: 'MSEDCL',
      mode: TransactionMode.ONLINE,
      referenceNumber: 'UTI2024030101',
    },
    // 15. High value debit to new vendor
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-05'),
      description: 'New Vendor Payment - First Transaction',
      amount: 1500000,
      type: TransactionType.DEBIT,
      balance: 955003,
      counterparty: 'FastTrack Logistics Pvt Ltd',
      mode: TransactionMode.RTGS,
      referenceNumber: 'RTGS2024030501',
    },
    // 16. Reversal/refund
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-08'),
      description: 'REVERSAL: Wrong Beneficiary Account',
      amount: 45000,
      type: TransactionType.REFUND,
      balance: 1000003,
      counterparty: 'Tech Solutions Limited',
      mode: TransactionMode.NEFT,
      referenceNumber: 'NEFT2024030801R',
    },
    // 17. Fee transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-10'),
      description: 'Account Maintenance Fee',
      amount: 5000,
      type: TransactionType.FEE,
      balance: 995003,
      mode: TransactionMode.BANK,
    },
    // 18. Normal transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-15'),
      description: 'Customer Advance - Raj Industries',
      amount: 350000,
      type: TransactionType.CREDIT,
      balance: 1345003,
      counterparty: 'Raj Industries Limited',
      mode: TransactionMode.RTGS,
      referenceNumber: 'RTGS2024031501',
    },
    // 19. Suspicious round amount
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-20'),
      description: 'Settlement Payment',
      amount: 500000,
      type: TransactionType.DEBIT,
      balance: 845003,
      counterparty: 'Account Settlement Trust',
      mode: TransactionMode.ONLINE,
      referenceNumber: 'ONL2024032001',
    },
    // 20. Final transaction
    {
      caseId: demoCase.id,
      importId: importRecord.id,
      date: new Date('2024-03-25'),
      description: 'Quarterly Interest Credit',
      amount: 15200,
      type: TransactionType.CREDIT,
      balance: 860203,
      mode: TransactionMode.BANK,
    },
  ];

  for (const txn of transactions) {
    await prisma.transaction.create({ data: txn });
  }
  console.log(`✅ Created 20 sample transactions`);

  // Create evidence file metadata records
  await prisma.evidence.createMany({
    data: [
      {
        caseId: demoCase.id,
        fileName: 'Kumar_Electronics_Bank_Statement_Jan_Mar_2024.pdf',
        mimeType: 'application/pdf',
        fileSize: 524288,
        sha256Hash: 'a3f5e8b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
        uploadedById: auditor.id,
        description: 'Primary bank statement for Kumar Electronics account - January to March 2024',
      },
      {
        caseId: demoCase.id,
        fileName: 'Vendor_Registration_Certificates.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024000,
        sha256Hash: 'b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
        uploadedById: auditor.id,
        description: 'Copies of vendor registration certificates for XYZ Supplies and FastTrack Logistics',
      },
    ],
  });
  console.log(`✅ Created 2 evidence file records`);

  // Create investigation notes
  await prisma.investigationNote.createMany({
    data: [
      {
        caseId: demoCase.id,
        content: 'Initial review of bank statements reveals three major concerns: (1) High-value payment of ₹25,00,000 to XYZ Supplies on Jan 22 without standard vendor verification, (2) Duplicate payments to ServicePro Consultants totaling ₹3,60,000, (3) Pattern of round-number transactions that may indicate fictitious payments.',
        authorId: auditor.id,
        createdAt: new Date('2024-03-26'),
      },
      {
        caseId: demoCase.id,
        content: 'Follow-up investigation shows XYZ Supplies is a newly registered entity (incorporated Dec 2023) with no prior business relationship. Company secretary is same person who authorized payment. Flagging for enhanced due diligence.',
        authorId: auditor.id,
        createdAt: new Date('2024-03-27'),
      },
    ],
  });
  console.log(`✅ Created 2 investigation notes`);

  // Create timeline events
  const timeline1 = await prisma.caseTimeline.create({
    data: {
      caseId: demoCase.id,
      eventType: TimelineEventType.CASE_CREATED,
      description: 'Investigation case created by Senior Auditor Mehta',
      entityType: 'case',
      createdById: auditor.id,
    },
  });

  await prisma.caseTimeline.createMany({
    data: [
      {
        caseId: demoCase.id,
        eventType: TimelineEventType.TRANSACTION_IMPORTED,
        description: 'Bank statement imported - 20 transactions loaded',
        entityType: 'import',
        entityId: importRecord.id,
        createdById: auditor.id,
      },
      {
        caseId: demoCase.id,
        eventType: TimelineEventType.EVIDENCE_UPLOADED,
        description: 'Primary bank statement uploaded',
        entityType: 'evidence',
        createdById: auditor.id,
      },
      {
        caseId: demoCase.id,
        eventType: TimelineEventType.NOTE_ADDED,
        description: 'Initial findings documented',
        entityType: 'note',
        createdById: auditor.id,
      },
    ],
  });
  console.log(`✅ Created timeline events`);

  // Wait for transactions to be created, then run red flag detection
  await new Promise(resolve => setTimeout(resolve, 500));

  // Get the transactions we just created
  const allTransactions = await prisma.transaction.findMany({
    where: { caseId: demoCase.id },
  });

  // Manual red flag creation since red flag rules may not exist yet
  const flags = [
    {
      description: 'High-value transaction exceeding₹10,00,000 detected',
      flaggedAmount: 2500000,
      flaggedAccount: 'XYZ Supplies Private Limited',
      flaggedNarration: 'Wire Transfer - New Vendor XYZ',
      severity: RedFlagSeverity.HIGH,
      ruleName: 'HIGH_VALUE_TRANSACTION',
      transactionId: allTransactions[2].id,
    },
    {
      description: 'Duplicate transaction detected: Similar amount (₹1,80,000) to same vendor within 24 hours',
      flaggedAmount: 180000,
      flaggedAccount: 'ServicePro Consultants',
      flaggedNarration: 'AMC Payment - ServicePro Consultants',
      severity: RedFlagSeverity.CRITICAL,
      ruleName: 'DUPLICATE_TRANSACTION',
      transactionId: allTransactions[7].id,
    },
    {
      description: 'Round amount transaction (₹1,00,000) - often associated with fictitious transactions',
      flaggedAmount: 100000,
      flaggedAccount: 'M/s Rahul Enterprises',
      flaggedNarration: 'Payment Clearance',
      severity: RedFlagSeverity.HIGH,
      ruleName: 'ROUND_AMOUNT',
      transactionId: allTransactions[3].id,
    },
    {
      description: 'Weekend transaction detected - transactions on non-business days may indicate urgency unusual for legitimate business',
      flaggedAmount: 75000,
      flaggedAccount: 'Various Creditors',
      flaggedNarration: 'Emergency Transfer - Account Payable',
      severity: RedFlagSeverity.MEDIUM,
      ruleName: 'WEEKEND_TRANSACTION',
      transactionId: allTransactions[4].id,
    },
    {
      description: 'Suspicious narration: "DO NOT RECONCILE" - may indicate intent to hide fraudulent transaction',
      flaggedAmount: 200000,
      flaggedAccount: 'Confidential Account',
      flaggedNarration: 'Settlement as per our discussion - DO NOT RECONCILE',
      severity: RedFlagSeverity.CRITICAL,
      ruleName: 'SUSPICIOUS_NARRATION',
      transactionId: allTransactions[5].id,
    },
    {
      description: 'Pattern: Multiple round amounts just below₹50,000 may indicate structuring to avoid reporting threshold',
      flaggedAmount: 49999,
      flaggedAccount: 'Cash Management A/c',
      flaggedNarration: 'Petty Cash Replenishment',
      severity: RedFlagSeverity.HIGH,
      ruleName: 'STRUCTURING_PATTERN',
      transactionId: allTransactions[10].id,
    },
    {
      description: 'First transaction to new vendor exceeding₹10,00,000 without vendor verification',
      flaggedAmount: 1500000,
      flaggedAccount: 'FastTrack Logistics Pvt Ltd',
      flaggedNarration: 'New Vendor Payment - First Transaction',
      severity: RedFlagSeverity.HIGH,
      ruleName: 'NEW_VENDOR_HIGH_VALUE',
      transactionId: allTransactions[14].id,
    },
  ];

  for (const flag of flags) {
    const createdFlag = await prisma.redFlag.create({
      data: {
        caseId: demoCase.id,
        ...flag,
        createdById: auditor.id,
      },
    });
    console.log(`✅ Created red flag: ${flag.ruleName}`);
  }

  console.log('\n🎉 Forensic demo data seeded successfully!');
  console.log(`   Case ID: ${demoCase.id}`);
  console.log(`   Transactions: 20`);
  console.log(`   Red Flags: ${flags.length}`);
  console.log(`\n🔐 Demo Credentials:`);
  console.log(`   Auditor: auditor@forensiq.local / demo123`);
  console.log(`   Admin: admin@forensiq.local / admin123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });