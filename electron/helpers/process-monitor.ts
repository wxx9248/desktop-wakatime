import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { Logging, LogLevel } from "../utils/logging";

const execAsync = promisify(exec);

export interface RunningProcess {
  pid: number;
  name: string;
  command: string;
}

export class ProcessMonitor {
  private static instance: ProcessMonitor;

  static getInstance(): ProcessMonitor {
    if (!ProcessMonitor.instance) {
      ProcessMonitor.instance = new ProcessMonitor();
    }
    return ProcessMonitor.instance;
  }

  /**
   * Get list of running processes for the current user
   */
  async getRunningProcesses(): Promise<RunningProcess[]> {
    try {
      const platform = process.platform;
      
      if (platform === 'linux') {
        return await this.getLinuxProcesses();
      } else if (platform === 'darwin') {
        return await this.getMacProcesses();
      } else if (platform === 'win32') {
        return await this.getWindowsProcesses();
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      Logging.instance().log(
        `Failed to get running processes: ${error}`,
        LogLevel.ERROR,
        true
      );
      return [];
    }
  }

  /**
   * Get running processes on Linux using ps command
   */
  private async getLinuxProcesses(): Promise<RunningProcess[]> {
    try {
      // Use ps to get processes for current user with full command path
      const { stdout } = await execAsync('ps -eo pid,comm,cmd --no-headers');
      
      return stdout
        .trim()
        .split('\n')
        .map(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 3) return null;
          
          const pid = parseInt(parts[0]);
          const name = parts[1];
          const command = parts.slice(2).join(' ');
          
          return { pid, name, command };
        })
        .filter((proc): proc is RunningProcess => proc !== null);
    } catch (error) {
      Logging.instance().log(
        `Failed to get Linux processes: ${error}`,
        LogLevel.ERROR,
        true
      );
      return [];
    }
  }

  /**
   * Get running processes on macOS using ps command
   */
  private async getMacProcesses(): Promise<RunningProcess[]> {
    try {
      const { stdout } = await execAsync('ps -eo pid,comm,command');
      
      return stdout
        .trim()
        .split('\n')
        .slice(1) // Skip header
        .map(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 3) return null;
          
          const pid = parseInt(parts[0]);
          const name = parts[1];
          const command = parts.slice(2).join(' ');
          
          return { pid, name, command };
        })
        .filter((proc): proc is RunningProcess => proc !== null);
    } catch (error) {
      Logging.instance().log(
        `Failed to get macOS processes: ${error}`,
        LogLevel.ERROR,
        true
      );
      return [];
    }
  }

  /**
   * Get running processes on Windows using tasklist
   */
  private async getWindowsProcesses(): Promise<RunningProcess[]> {
    try {
      const { stdout } = await execAsync('tasklist /fo csv /nh');
      
      return stdout
        .trim()
        .split('\n')
        .map(line => {
          const parts = line.split('","').map(part => part.replace(/"/g, ''));
          if (parts.length < 2) return null;
          
          const name = parts[0];
          const pid = parseInt(parts[1]);
          const command = name; // Windows tasklist doesn't provide full command path easily
          
          return { pid, name, command };
        })
        .filter((proc): proc is RunningProcess => proc !== null);
    } catch (error) {
      Logging.instance().log(
        `Failed to get Windows processes: ${error}`,
        LogLevel.ERROR,
        true
      );
      return [];
    }
  }

  /**
   * Check if a specific executable path is currently running
   */
  async isProcessRunning(executablePath: string): Promise<boolean> {
    const processes = await this.getRunningProcesses();
    const executableName = path.basename(executablePath);
    
    return processes.some(proc => {
      // Check if the process name matches the executable name
      if (proc.name === executableName) {
        return true;
      }
      
      // Also check if the full command path contains the executable path
      if (proc.command.includes(executablePath)) {
        return true;
      }
      
      // For cases where the executable name might have extensions removed/added
      const procNameWithoutExt = proc.name.replace(/\.[^/.]+$/, '');
      const execNameWithoutExt = executableName.replace(/\.[^/.]+$/, '');
      
      return procNameWithoutExt === execNameWithoutExt;
    });
  }

  /**
   * Get list of enrolled programs that are currently running
   */
  async getRunningEnrolledPrograms(enrolledPaths: string[]): Promise<string[]> {
    const runningPrograms: string[] = [];
    
    for (const programPath of enrolledPaths) {
      const isRunning = await this.isProcessRunning(programPath);
      if (isRunning) {
        runningPrograms.push(programPath);
      }
    }
    
    return runningPrograms;
  }
} 