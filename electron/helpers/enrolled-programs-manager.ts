import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { getWakatimeAppDataFolderPath } from '../utils';
import { Logging, LogLevel } from '../utils/logging';

export interface EnrolledProgram {
  id: string;
  name: string;
  path: string;
  enrolledAt: string;
  lastSeen?: string;
}

const enrolledProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  enrolledAt: z.string(),
  lastSeen: z.string().optional(),
});

const enrolledProgramsSchema = z.object({
  programs: z.array(enrolledProgramSchema),
});

export class EnrolledProgramsManager {
  private static instance: EnrolledProgramsManager;
  private dataFilePath: string;
  private programs: EnrolledProgram[] = [];

  constructor() {
    this.dataFilePath = path.join(
      getWakatimeAppDataFolderPath(),
      'enrolled-programs.json'
    );
    this.loadPrograms();
  }

  static getInstance(): EnrolledProgramsManager {
    if (!EnrolledProgramsManager.instance) {
      EnrolledProgramsManager.instance = new EnrolledProgramsManager();
    }
    return EnrolledProgramsManager.instance;
  }

  /**
   * Load enrolled programs from persistent storage
   */
  private loadPrograms(): void {
    try {
      if (!fs.existsSync(this.dataFilePath)) {
        // Create the directory if it doesn't exist
        const dir = path.dirname(this.dataFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.savePrograms();
        return;
      }

      const data = fs.readFileSync(this.dataFilePath, { encoding: 'utf-8' });
      const parsed = enrolledProgramsSchema.parse(JSON.parse(data));
      this.programs = parsed.programs;
      
      // Validate that all program paths still exist
      this.programs = this.programs.filter(program => {
        if (fs.existsSync(program.path)) {
          return true;
        } else {
          Logging.instance().log(
            `Removing enrolled program ${program.name} because path no longer exists: ${program.path}`,
            LogLevel.INFO
          );
          return false;
        }
      });
      
      // Save the cleaned up list
      this.savePrograms();
    } catch (error) {
      Logging.instance().log(
        `Failed to load enrolled programs: ${error}`,
        LogLevel.ERROR,
        true
      );
      this.programs = [];
    }
  }

  /**
   * Save enrolled programs to persistent storage
   */
  private savePrograms(): void {
    try {
      const data = { programs: this.programs };
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      Logging.instance().log(
        `Failed to save enrolled programs: ${error}`,
        LogLevel.ERROR,
        true
      );
    }
  }

  /**
   * Generate a unique ID for a program
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Enroll a new program
   */
  enrollProgram(programPath: string): EnrolledProgram | null {
    try {
      // Check if path exists
      if (!fs.existsSync(programPath)) {
        throw new Error(`Program path does not exist: ${programPath}`);
      }

      // Check if already enrolled
      if (this.isProgramEnrolled(programPath)) {
        throw new Error(`Program is already enrolled: ${programPath}`);
      }

      // Get program name from path
      const programName = path.basename(programPath);

      const newProgram: EnrolledProgram = {
        id: this.generateId(),
        name: programName,
        path: programPath,
        enrolledAt: new Date().toISOString(),
      };

      this.programs.push(newProgram);
      this.savePrograms();

      Logging.instance().log(
        `Enrolled program: ${programName} at ${programPath}`,
        LogLevel.INFO
      );

      return newProgram;
    } catch (error) {
      Logging.instance().log(
        `Failed to enroll program: ${error}`,
        LogLevel.ERROR,
        true
      );
      return null;
    }
  }

  /**
   * Remove an enrolled program
   */
  removeProgram(programId: string): boolean {
    try {
      const index = this.programs.findIndex(p => p.id === programId);
      if (index === -1) {
        return false;
      }

      const removedProgram = this.programs[index];
      this.programs.splice(index, 1);
      this.savePrograms();

      Logging.instance().log(
        `Removed enrolled program: ${removedProgram.name}`,
        LogLevel.INFO
      );

      return true;
    } catch (error) {
      Logging.instance().log(
        `Failed to remove program: ${error}`,
        LogLevel.ERROR,
        true
      );
      return false;
    }
  }

  /**
   * Check if a program is enrolled by path
   */
  isProgramEnrolled(programPath: string): boolean {
    return this.programs.some(p => p.path === programPath);
  }

  /**
   * Get all enrolled programs
   */
  getAllPrograms(): EnrolledProgram[] {
    return [...this.programs];
  }

  /**
   * Get enrolled program by ID
   */
  getProgramById(id: string): EnrolledProgram | null {
    return this.programs.find(p => p.id === id) || null;
  }

  /**
   * Get enrolled program by path
   */
  getProgramByPath(path: string): EnrolledProgram | null {
    return this.programs.find(p => p.path === path) || null;
  }

  /**
   * Update last seen timestamp for a program
   */
  updateLastSeen(programPath: string): void {
    const program = this.getProgramByPath(programPath);
    if (program) {
      program.lastSeen = new Date().toISOString();
      this.savePrograms();
    }
  }

  /**
   * Get paths of all enrolled programs
   */
  getEnrolledPaths(): string[] {
    return this.programs.map(p => p.path);
  }
} 