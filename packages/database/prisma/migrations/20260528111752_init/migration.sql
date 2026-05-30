-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AUDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER', 'REFUND', 'FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionMode" AS ENUM ('CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'IMPS', 'ONLINE', 'CARD', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_MANUAL_MAPPING', 'MAPPING_CONFIRMED', 'EXTRACTED_TEXT', 'OCR_PENDING', 'OCR_PROCESSING', 'OCR_COMPLETED', 'OCR_FAILED');

-- CreateEnum
CREATE TYPE "RedFlagSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('IMPORTANT', 'FALSE_POSITIVE', 'NEEDS_EVIDENCE', 'IGNORE');

-- CreateEnum
CREATE TYPE "InvestigationStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('FLAG_CREATED', 'FLAG_REVIEWED', 'FLAG_STATUS_CHANGED', 'FLAG_FEEDBACK_ADDED', 'NOTE_ADDED', 'EVIDENCE_UPLOADED', 'EVIDENCE_LINKED', 'EVIDENCE_DELETED', 'TRANSACTION_IMPORTED', 'TRANSACTION_EXAMINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AUDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'DRAFT',
    "riskLevel" "RiskLevel",
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "assignedToId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionImport" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "hasText" BOOLEAN NOT NULL DEFAULT false,
    "extractedText" TEXT,
    "isScanned" BOOLEAN NOT NULL DEFAULT false,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "ocrCompletedAt" TIMESTAMP(3),
    "mappingConfig" JSONB,
    "mappedBy" TEXT,
    "mappedAt" TIMESTAMP(3),

    CONSTRAINT "TransactionImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "balance" DOUBLE PRECISION,
    "counterparty" TEXT,
    "mode" "TransactionMode" NOT NULL DEFAULT 'OTHER',
    "referenceNumber" TEXT,
    "rowNumber" INTEGER,
    "rawData" JSONB,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlagRule" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "parameters" JSONB,
    "conditionType" TEXT,
    "conditionValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedFlagRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlag" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleName" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "severity" "RedFlagSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "InvestigationStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "feedbackType" "FeedbackType",
    "feedbackNote" TEXT,
    "feedbackById" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlagFeedback" (
    "id" TEXT NOT NULL,
    "redFlagId" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "note" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedFlagFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationNote" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "transactionId" TEXT,
    "redFlagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceFile" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "transactionId" TEXT,
    "redFlagId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationTimeline" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "redFlagId" TEXT,
    "transactionId" TEXT,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_caseNumber_idx" ON "Case"("caseNumber");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_createdById_idx" ON "Case"("createdById");

-- CreateIndex
CREATE INDEX "TransactionImport_caseId_idx" ON "TransactionImport"("caseId");

-- CreateIndex
CREATE INDEX "TransactionImport_status_idx" ON "TransactionImport"("status");

-- CreateIndex
CREATE INDEX "Transaction_caseId_idx" ON "Transaction"("caseId");

-- CreateIndex
CREATE INDEX "Transaction_importId_idx" ON "Transaction"("importId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "RedFlagRule_caseId_idx" ON "RedFlagRule"("caseId");

-- CreateIndex
CREATE INDEX "RedFlag_caseId_idx" ON "RedFlag"("caseId");

-- CreateIndex
CREATE INDEX "RedFlag_transactionId_idx" ON "RedFlag"("transactionId");

-- CreateIndex
CREATE INDEX "RedFlag_severity_idx" ON "RedFlag"("severity");

-- CreateIndex
CREATE INDEX "RedFlag_status_idx" ON "RedFlag"("status");

-- CreateIndex
CREATE INDEX "RedFlagFeedback_redFlagId_idx" ON "RedFlagFeedback"("redFlagId");

-- CreateIndex
CREATE INDEX "RedFlagFeedback_userId_idx" ON "RedFlagFeedback"("userId");

-- CreateIndex
CREATE INDEX "InvestigationNote_caseId_idx" ON "InvestigationNote"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationNote_authorId_idx" ON "InvestigationNote"("authorId");

-- CreateIndex
CREATE INDEX "InvestigationNote_transactionId_idx" ON "InvestigationNote"("transactionId");

-- CreateIndex
CREATE INDEX "InvestigationNote_redFlagId_idx" ON "InvestigationNote"("redFlagId");

-- CreateIndex
CREATE INDEX "EvidenceFile_caseId_idx" ON "EvidenceFile"("caseId");

-- CreateIndex
CREATE INDEX "EvidenceFile_transactionId_idx" ON "EvidenceFile"("transactionId");

-- CreateIndex
CREATE INDEX "EvidenceFile_redFlagId_idx" ON "EvidenceFile"("redFlagId");

-- CreateIndex
CREATE INDEX "InvestigationTimeline_caseId_idx" ON "InvestigationTimeline"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationTimeline_redFlagId_idx" ON "InvestigationTimeline"("redFlagId");

-- CreateIndex
CREATE INDEX "InvestigationTimeline_transactionId_idx" ON "InvestigationTimeline"("transactionId");

-- CreateIndex
CREATE INDEX "InvestigationTimeline_userId_idx" ON "InvestigationTimeline"("userId");

-- CreateIndex
CREATE INDEX "InvestigationTimeline_eventType_idx" ON "InvestigationTimeline"("eventType");

-- CreateIndex
CREATE INDEX "InvestigationTimeline_createdAt_idx" ON "InvestigationTimeline"("createdAt");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionImport" ADD CONSTRAINT "TransactionImport_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionImport" ADD CONSTRAINT "TransactionImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "TransactionImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlagRule" ADD CONSTRAINT "RedFlagRule_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlag" ADD CONSTRAINT "RedFlag_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlag" ADD CONSTRAINT "RedFlag_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RedFlagRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlag" ADD CONSTRAINT "RedFlag_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlag" ADD CONSTRAINT "RedFlag_feedbackById_fkey" FOREIGN KEY ("feedbackById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlagFeedback" ADD CONSTRAINT "RedFlagFeedback_redFlagId_fkey" FOREIGN KEY ("redFlagId") REFERENCES "RedFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlagFeedback" ADD CONSTRAINT "RedFlagFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationNote" ADD CONSTRAINT "InvestigationNote_redFlagId_fkey" FOREIGN KEY ("redFlagId") REFERENCES "RedFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_redFlagId_fkey" FOREIGN KEY ("redFlagId") REFERENCES "RedFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationTimeline" ADD CONSTRAINT "InvestigationTimeline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationTimeline" ADD CONSTRAINT "InvestigationTimeline_redFlagId_fkey" FOREIGN KEY ("redFlagId") REFERENCES "RedFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationTimeline" ADD CONSTRAINT "InvestigationTimeline_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationTimeline" ADD CONSTRAINT "InvestigationTimeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
