import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadedFile {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  hash: string;
}

/**
 * File Storage Service
 * 
 * Handles file uploads with SHA256 hash generation for integrity.
 * All uploaded files are stored in /uploads/evidence/{caseId}/
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    // Base upload directory
    this.uploadDir = path.join(process.cwd(), 'uploads', 'evidence');
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Ensure case-specific directory exists
   */
  private ensureCaseDir(caseId: string): string {
    const caseDir = path.join(this.uploadDir, caseId);
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true });
    }
    return caseDir;
  }

  /**
   * Generate SHA256 hash of file buffer
   */
  generateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generate unique filename while preserving extension
   */
  generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const sanitized = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}_${timestamp}_${random}${ext}`;
  }

  /**
   * Save uploaded file and return metadata
   */
  async saveFile(
    caseId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<UploadedFile> {
    // Validate mime type
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    // Also check by extension
    const ext = originalName.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'csv', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];

    if (!allowedTypes.includes(mimeType) && !allowedExtensions.includes(ext || '')) {
      throw new Error(`File type not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }

    // Generate file details
    const hash = this.generateHash(buffer);
    const fileName = this.generateFileName(originalName);
    const caseDir = this.ensureCaseDir(caseId);
    const filePath = path.join(caseDir, fileName);

    // Save file
    await fs.promises.writeFile(filePath, buffer);

    this.logger.log(`File saved: ${filePath} (hash: ${hash.slice(0, 16)}...)`);

    return {
      fileName,
      originalName,
      mimeType,
      size: buffer.length,
      path: filePath,
      hash,
    };
  }

  /**
   * Get file buffer by path
   */
  async getFile(filePath: string): Promise<Buffer | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return await fs.promises.readFile(filePath);
    } catch (error) {
      this.logger.error(`Error reading file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Delete file by path
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`File deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Error deleting file: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Verify file hash
   */
  async verifyHash(filePath: string, expectedHash: string): Promise<boolean> {
    try {
      const buffer = await fs.promises.readFile(filePath);
      const actualHash = this.generateHash(buffer);
      return actualHash === expectedHash;
    } catch (error) {
      this.logger.error(`Error verifying hash for: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Get relative path from uploads directory
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(process.cwd(), absolutePath);
  }

  /**
   * Get absolute path from relative
   */
  getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(process.cwd(), relativePath);
  }
}