import { PrismaClient, UserRole, CaseStatus, RiskLevel, TransactionMode, TransactionType, RedFlagSeverity, InvestigationStatus, TimelineEventType, ImportStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Check if data already exists
  const existingCase = await prisma.case.findUnique({ where: { caseNumber: 'CASE-2024-001' } });
  if (existingCase) {
    console.log('Database already seeded. Skipping...');
    return;
  }

  // Generate password hash at runtime to ensure it works
  const demoPasswordHash = await bcrypt.hash('demo123', 12);

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@forensiq.io',
      name: 'Demo User',
      password: demoPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('Created demo user:', demoUser.email);

  // Create demo case
  const demoCase = await prisma.case.create({
    data: {
      caseNumber: 'CASE-2024-001',
      title: 'Kumar Electronics - Vendor Payment Anomaly Investigation',
      description: 'Investigation into suspected fraudulent vendor payments at Kumar Electronics Pvt Ltd. Bank statements for Q1-Q2 2024 show unusual payment patterns to new vendors.',
      status: CaseStatus.ACTIVE,
      riskLevel: RiskLevel.HIGH,
      clientName: 'Kumar Electronics Pvt Ltd',
      clientEmail: 'legal@kumarelectronics.com',
      clientPhone: '+91-9876543210',
      createdById: demoUser.id,
    },
  });
  console.log('Created demo case:', demoCase.caseNumber);

  // Create transaction import first (required for transactions)
  const txImport = await prisma.transactionImport.create({
    data: {
      caseId: demoCase.id,
      fileName: 'kumar_electronics_statement_2024.xlsx',
      originalName: 'Kumar_Electronics_Account_Statement_2024.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      importedById: demoUser.id,
      status: ImportStatus.COMPLETED,
      totalRows: 20,
      successRows: 20,
      failedRows: 0,
    },
  });
  console.log('Created transaction import:', txImport.id);

  // Create sample transactions with extractable identifiers
  const transactionData = [
    { date: '2024-01-15', desc: 'RTGS from ABC Corp GSTIN:27AABCA1234B1ZX Acct:9876543210123456 IFSC:SBIN0001234', amount: 150000, type: TransactionType.CREDIT, balance: 150000, counterparty: 'ABC Corporation', mode: TransactionMode.RTGS, ref: 'RTGS2024001001' },
    { date: '2024-01-18', desc: 'Vendor Payment Tech Solutions Ltd GSTIN:29AAACT1234A1ZY PAN:AAACT1234B UPI:techsol@oksbi Acct:456789012345', amount: 45000, type: TransactionType.DEBIT, balance: 105000, counterparty: 'Tech Solutions Limited', mode: TransactionMode.NEFT, ref: 'NEFT2024001020' },
    { date: '2024-01-22', desc: 'Wire Transfer to XYZ Supplies GSTIN:27AABCF5678C2ZA PAN:AABCF5678C Phone:9876543210', amount: 2500000, type: TransactionType.DEBIT, balance: 2550000, counterparty: 'XYZ Supplies Private Limited', mode: TransactionMode.ONLINE, ref: 'WIRE2024001225' },
    { date: '2024-01-25', desc: 'Payment to Rahul Enterprises Acct:123456789012 UPI:rahulent@okaxis Phone:9123456789', amount: 100000, type: TransactionType.DEBIT, balance: 2450000, counterparty: 'M/s Rahul Enterprises', mode: TransactionMode.CHEQUE, ref: 'CHQ2024012501' },
    { date: '2024-01-27', desc: 'IMPS Transfer Phone:9988776655 UPI:vendors@paytm Acct:789012345678', amount: 75000, type: TransactionType.DEBIT, balance: 2375000, counterparty: 'Various Creditors', mode: TransactionMode.IMPS, ref: 'IMPS2024012701' },
    { date: '2024-02-01', desc: 'Settlement Payment DO NOT RECONCILE Acct:456123789014', amount: 200000, type: TransactionType.DEBIT, balance: 2175000, counterparty: 'Confidential Account', mode: TransactionMode.ONLINE, ref: 'ONL2024020101' },
    { date: '2024-02-05', desc: 'AMC Payment ServicePro Consultants GSTIN:19AADCS5678A1ZB Acct:321654987012 IFSC:HDFC0001234', amount: 180000, type: TransactionType.DEBIT, balance: 1995000, counterparty: 'ServicePro Consultants', mode: TransactionMode.NEFT, ref: 'NEFT2024020501' },
    { date: '2024-02-06', desc: 'AMC Payment ServicePro Consultants GSTIN:19AADCS5678A1ZB Acct:321654987012 UPI:svcpro@hdfc', amount: 180000, type: TransactionType.DEBIT, balance: 1815000, counterparty: 'ServicePro Consultants', mode: TransactionMode.NEFT, ref: 'NEFT2024020601' },
    { date: '2024-02-10', desc: 'Rent Deposit Refund Owner PAN:AAAAX1234Y', amount: 25000, type: TransactionType.CREDIT, balance: 1840000, counterparty: 'Property Owner', mode: TransactionMode.BANK, ref: 'BANK2024021001' },
    { date: '2024-02-15', desc: 'Customer Receipt Mega Mart GSTIN:24AAACM1234A1ZC Acct:1472583690258369', amount: 890000, type: TransactionType.CREDIT, balance: 2730000, counterparty: 'Mega Mart Retail Chain', mode: TransactionMode.RTGS, ref: 'RTGS2024021501' },
    { date: '2024-02-20', desc: 'Petty Cash Replenishment CashAcct Acct:258147369012', amount: 49999, type: TransactionType.DEBIT, balance: 2680001, counterparty: 'Cash Management A/c', mode: TransactionMode.CASH, ref: 'CASH2024022001' },
    { date: '2024-02-21', desc: 'Petty Cash Top-up CashAcct Acct:258147369012', amount: 49999, type: TransactionType.DEBIT, balance: 2630002, counterparty: 'Cash Management A/c', mode: TransactionMode.CASH, ref: 'CASH2024022101' },
    { date: '2024-02-22', desc: 'Cash Withdrawal Replenish CashAcct Acct:258147369012', amount: 49999, type: TransactionType.DEBIT, balance: 2580003, counterparty: 'Cash Management A/c', mode: TransactionMode.CASH, ref: 'CASH2024022201' },
    { date: '2024-03-01', desc: 'Electricity Bill MSEDCL Acct:258741963025', amount: 125000, type: TransactionType.DEBIT, balance: 2455003, counterparty: 'MSEDCL', mode: TransactionMode.ONLINE, ref: 'UTI2024030101' },
    { date: '2024-03-05', desc: 'FastTrack Logistics Payment GSTIN:29AADCF7890A2ZB PAN:AADCF7890B Acct:963258741012', amount: 1500000, type: TransactionType.DEBIT, balance: 3955003, counterparty: 'FastTrack Logistics Pvt Ltd', mode: TransactionMode.RTGS, ref: 'RTGS2024030501' },
    { date: '2024-03-10', desc: 'Insurance Premium United India GSTIN:18AAADU5678A1ZD Acct:741369852014 IFSC:ICIC0001234', amount: 75000, type: TransactionType.DEBIT, balance: 3880003, counterparty: 'United India Insurance', mode: TransactionMode.ONLINE, ref: 'ONL2024031001' },
    { date: '2024-03-12', desc: 'Salary Disbursement Bank Acct:159753486211', amount: 2500000, type: TransactionType.DEBIT, balance: 1380003, counterparty: 'Employee Salary Account', mode: TransactionMode.ONLINE, ref: 'SAL2024031201' },
    { date: '2024-03-15', desc: 'Advance from Raj Industries GSTIN:27AABCR4567A3ZA PAN:AABCR4567B', amount: 750000, type: TransactionType.CREDIT, balance: 2130003, counterparty: 'Raj Industries Limited', mode: TransactionMode.RTGS, ref: 'RTGS2024031501' },
    { date: '2024-03-20', desc: 'Settlement Payment Trust Acct:852963741025', amount: 500000, type: TransactionType.DEBIT, balance: 1630003, counterparty: 'Account Settlement Trust', mode: TransactionMode.ONLINE, ref: 'ONL2024032001' },
    { date: '2024-03-25', desc: 'Quarterly Interest Credit Bank Interest Acct:135792468012', amount: 15200, type: TransactionType.CREDIT, balance: 1645203, counterparty: 'Bank Interest', mode: TransactionMode.BANK, ref: 'BANK2024032501' },
  ];

  const transactions = [];
  for (const txn of transactionData) {
    const created = await prisma.transaction.create({
      data: {
        caseId: demoCase.id,
        importId: txImport.id,
        date: new Date(txn.date),
        description: txn.desc,
        amount: txn.amount,
        type: txn.type,
        balance: txn.balance,
        counterparty: txn.counterparty,
        mode: txn.mode,
        referenceNumber: txn.ref,
      },
    });
    transactions.push(created);
  }
  console.log(`Created ${transactions.length} sample transactions`);

  // Create entities with identifiers for graph
  const entityData = [
    { name: 'ABC Corporation', riskScore: 10, totalAmount: 150000, aliases: [{ name: '27AABCA1234B1ZX', type: 'GSTIN' }, { name: '9876543210123456', type: 'BANK_ACCOUNT' }, { name: 'SBIN0001234', type: 'IFSC' }], txIndices: [0] },
    { name: 'Tech Solutions Limited', riskScore: 25, totalAmount: 45000, aliases: [{ name: '29AAACT1234A1ZY', type: 'GSTIN' }, { name: 'AAACT1234B', type: 'PAN' }, { name: 'techsol@oksbi', type: 'UPI_ID' }, { name: '456789012345', type: 'BANK_ACCOUNT' }], txIndices: [1] },
    { name: 'XYZ Supplies Private Limited', riskScore: 85, totalAmount: 2500000, aliases: [{ name: '27AABCF5678C2ZA', type: 'GSTIN' }, { name: 'AABCF5678C', type: 'PAN' }, { name: '9876543210', type: 'PHONE' }], txIndices: [2] },
    { name: 'M/s Rahul Enterprises', riskScore: 45, totalAmount: 100000, aliases: [{ name: '123456789012', type: 'BANK_ACCOUNT' }, { name: 'rahulent@okaxis', type: 'UPI_ID' }, { name: '9123456789', type: 'PHONE' }], txIndices: [3] },
    { name: 'ServicePro Consultants', riskScore: 70, totalAmount: 360000, aliases: [{ name: '19AADCS5678A1ZB', type: 'GSTIN' }, { name: '321654987012', type: 'BANK_ACCOUNT' }, { name: 'HDFC0001234', type: 'IFSC' }, { name: 'svcpro@hdfc', type: 'UPI_ID' }], txIndices: [6, 7] },
    { name: 'FastTrack Logistics Pvt Ltd', riskScore: 80, totalAmount: 1500000, aliases: [{ name: '29AADCF7890A2ZB', type: 'GSTIN' }, { name: 'AADCF7890B', type: 'PAN' }, { name: '963258741012', type: 'BANK_ACCOUNT' }], txIndices: [14] },
  ];

  for (const entityInfo of entityData) {
    const entity = await prisma.entity.create({
      data: {
        caseId: demoCase.id,
        canonicalName: entityInfo.name,
        riskScore: entityInfo.riskScore,
        totalAmount: entityInfo.totalAmount,
        transactionCount: entityInfo.txIndices.length,
        reviewed: false,
      },
    });

    for (const alias of entityInfo.aliases) {
      await prisma.entityAlias.create({
        data: {
          entityId: entity.id,
          aliasName: alias.name,
          matchType: alias.type as any,
          source: 'description',
          confidenceScore: 0.95,
          transactionId: transactions[entityInfo.txIndices[0]]?.id,
        },
      });
    }

    for (const txIndex of entityInfo.txIndices) {
      await prisma.transactionEntity.create({
        data: {
          transactionId: transactions[txIndex].id,
          entityId: entity.id,
          role: 'counterparty',
          matchScore: 0.95,
        },
      });
    }
    console.log(`Created entity: ${entityInfo.name}`);
  }

  // Create investigation notes
  await prisma.investigationNote.createMany({
    data: [
      {
        caseId: demoCase.id,
        title: 'Initial Findings - Major Concerns',
        content: 'Initial review reveals three major concerns: (1) High-value payment of ₹25,00,000 to XYZ Supplies without vendor verification, (2) Duplicate payments to ServicePro Consultants totaling ₹3,60,000, (3) Pattern of round-number transactions that may indicate fictitious payments.',
        authorId: demoUser.id,
      },
      {
        caseId: demoCase.id,
        title: 'XYZ Supplies Investigation Update',
        content: 'XYZ Supplies is a newly registered entity (incorporated Dec 2023) with no prior business relationship. Company secretary is same person who authorized payment. Flagging for enhanced due diligence.',
        authorId: demoUser.id,
      },
    ],
  });
  console.log('Created investigation notes');

  // Create investigation timeline entries
  await prisma.investigationTimeline.create({
    data: {
      caseId: demoCase.id,
      eventType: TimelineEventType.NOTE_ADDED,
      title: 'Case Created',
      description: 'Investigation case created',
      userId: demoUser.id,
    },
  });

  await prisma.investigationTimeline.createMany({
    data: [
      {
        caseId: demoCase.id,
        eventType: TimelineEventType.TRANSACTION_IMPORTED,
        title: 'Transactions Imported',
        description: 'Bank statement imported - 20 transactions loaded',
        userId: demoUser.id,
        metadata: { importId: txImport.id, transactionCount: 20 },
      },
      {
        caseId: demoCase.id,
        eventType: TimelineEventType.NOTE_ADDED,
        title: 'Investigation Note',
        description: 'Initial findings documented',
        userId: demoUser.id,
      },
    ],
  });
  console.log('Created timeline events');

  // Create red flags
  const flags = [
    { transactionIdx: 2, ruleName: 'HIGH_VALUE_TRANSACTION', title: 'High-value transaction exceeding ₹10,00,000', explanation: 'High-value transaction of ₹25,00,000 to XYZ Supplies detected. New vendor with no prior business relationship.', severity: RedFlagSeverity.HIGH },
    { transactionIdx: 7, ruleName: 'DUPLICATE_TRANSACTION', title: 'Duplicate transaction detected', explanation: 'Duplicate transaction: Similar amount (₹1,80,000) to same vendor (ServicePro Consultants) within 24 hours.', severity: RedFlagSeverity.CRITICAL },
    { transactionIdx: 3, ruleName: 'ROUND_AMOUNT', title: 'Round amount transaction', explanation: 'Round amount transaction of ₹1,00,000 detected. Round amounts often indicate fictitious transactions.', severity: RedFlagSeverity.HIGH },
    { transactionIdx: 4, ruleName: 'WEEKEND_TRANSACTION', title: 'Weekend transaction detected', explanation: 'Transaction on Saturday (Jan 27, 2024). Transactions on non-business days may indicate urgency.', severity: RedFlagSeverity.MEDIUM },
    { transactionIdx: 5, ruleName: 'SUSPICIOUS_NARRATION', title: 'Suspicious narration: DO NOT RECONCILE', explanation: 'Transaction narration contains "DO NOT RECONCILE" instruction. This may indicate intent to hide fraudulent transaction.', severity: RedFlagSeverity.CRITICAL },
    { transactionIdx: 10, ruleName: 'STRUCTURING_PATTERN', title: 'Potential structuring', explanation: 'Pattern: Multiple round amounts just below ₹50,000 detected (₹49,999). This pattern may indicate structuring.', severity: RedFlagSeverity.HIGH },
    { transactionIdx: 14, ruleName: 'NEW_VENDOR_HIGH_VALUE', title: 'First transaction to new vendor exceeding ₹10,00,000', explanation: 'First transaction to FastTrack Logistics exceeds ₹10,00,000 without vendor verification.', severity: RedFlagSeverity.HIGH },
  ];

  for (const flag of flags) {
    await prisma.redFlag.create({
      data: {
        caseId: demoCase.id,
        transactionId: transactions[flag.transactionIdx].id,
        ruleName: flag.ruleName,
        title: flag.title,
        explanation: flag.explanation,
        severity: flag.severity,
        status: InvestigationStatus.OPEN,
      },
    });
    console.log(`Created red flag: ${flag.ruleName}`);
  }

  // Create evidence files
  await prisma.evidenceFile.createMany({
    data: [
      {
        caseId: demoCase.id,
        fileName: 'kumar_bank_statement_q1_2024.pdf',
        originalName: 'Kumar_Electronics_Bank_Statement_Jan_Mar_2024.pdf',
        mimeType: 'application/pdf',
        size: 524288,
        path: '/uploads/evidence/kumar_bank_statement_q1_2024.pdf',
        hash: 'a3f5e8b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
        description: 'Primary bank statement for Kumar Electronics',
        category: 'Financial Document',
        uploadedById: demoUser.id,
      },
    ],
  });
  console.log('Created evidence files');

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: demoUser.id,
      action: 'CREATED',
      entityType: 'Case',
      entityId: demoCase.id,
      caseId: demoCase.id,
      metadata: { caseNumber: demoCase.caseNumber },
    },
  });

  console.log('Seed completed successfully!');
  console.log(`\n🔐 Demo Credentials: demo@forensiq.io / demo123`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
