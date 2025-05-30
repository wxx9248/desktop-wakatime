import { ProcessMonitor } from '../helpers/process-monitor';
import { EnrolledProgramsManager } from '../helpers/enrolled-programs-manager';
import { Logging, LogLevel } from '../utils/logging';
import { Wakatime } from './wakatime';
import path from 'node:path';

export class ProcessWatcher {
  private wakatime: Wakatime;
  private intervalId: NodeJS.Timeout | null = null;
  private monitoringInterval: number = 60000; // 1 minute
  private processMonitor: ProcessMonitor;
  private enrolledManager: EnrolledProgramsManager;
  private lastReportedPrograms: Set<string> = new Set();

  constructor(wakatime: Wakatime) {
    this.wakatime = wakatime;
    this.processMonitor = ProcessMonitor.getInstance();
    this.enrolledManager = EnrolledProgramsManager.getInstance();
  }

  /**
   * Start process monitoring
   */
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    Logging.instance().log(
      `Starting process monitoring with ${this.monitoringInterval}ms interval`,
      LogLevel.INFO
    );

    // Run immediately on start
    this.checkEnrolledPrograms();

    // Set up recurring check
    this.intervalId = setInterval(() => {
      this.checkEnrolledPrograms();
    }, this.monitoringInterval);
  }

  /**
   * Stop process monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logging.instance().log('Stopped process monitoring', LogLevel.INFO);
    }
  }

  /**
   * Set monitoring interval in milliseconds
   */
  setMonitoringInterval(intervalMs: number): void {
    this.monitoringInterval = intervalMs;
    if (this.intervalId) {
      // Restart with new interval
      this.stop();
      this.start();
    }
  }

  /**
   * Check for running enrolled programs and send heartbeats
   */
  private async checkEnrolledPrograms(): Promise<void> {
    try {
      const enrolledPaths = this.enrolledManager.getEnrolledPaths();
      
      if (enrolledPaths.length === 0) {
        return;
      }

      const runningPrograms = await this.processMonitor.getRunningEnrolledPrograms(enrolledPaths);
      const currentRunningSet = new Set(runningPrograms);

      // Log newly detected programs
      for (const programPath of runningPrograms) {
        if (!this.lastReportedPrograms.has(programPath)) {
          const program = this.enrolledManager.getProgramByPath(programPath);
          if (program) {
            Logging.instance().log(
              `Detected enrolled program running: ${program.name}`,
              LogLevel.INFO
            );
          }
        }
      }

      // Log programs that stopped running
      for (const programPath of this.lastReportedPrograms) {
        if (!currentRunningSet.has(programPath)) {
          const program = this.enrolledManager.getProgramByPath(programPath);
          if (program) {
            Logging.instance().log(
              `Enrolled program stopped: ${program.name}`,
              LogLevel.INFO
            );
          }
        }
      }

      // Send heartbeats for all running programs
      for (const programPath of runningPrograms) {
        await this.sendProgramHeartbeat(programPath);
        // Update last seen timestamp
        this.enrolledManager.updateLastSeen(programPath);
      }

      // Update the tracking set
      this.lastReportedPrograms = currentRunningSet;

    } catch (error) {
      Logging.instance().log(
        `Error checking enrolled programs: ${error}`,
        LogLevel.ERROR,
        true
      );
    }
  }

  /**
   * Send heartbeat for a running program
   */
  private async sendProgramHeartbeat(programPath: string): Promise<void> {
    try {
      const program = this.enrolledManager.getProgramByPath(programPath);
      if (!program) {
        return;
      }

      // Create proper app data for the enrolled program matching AppData type
      const appData = {
        id: program.id,
        name: program.name,
        path: programPath,
        icon: null,
        version: null,
        bundleId: null,
        isBrowser: false,
        isDefaultEnabled: true,
        isElectronApp: false,
        execName: program.name,
      };

      // Create proper window info for the enrolled program matching WindowInfo type
      const windowInfo = {
        id: 0,
        os: process.platform,
        title: program.name,
        position: {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          isFullScreen: false,
        },
        usage: {
          memory: 0,
          cpu: 0,
        },
        url: '',
        info: {
          name: program.name,
          path: programPath,
          processId: 0,
        },
        getIcon: () => Promise.resolve({ data: null }),
        getIconAsync: () => Promise.resolve({ data: null }),
      } as any; // Type assertion to bypass complex WindowInfo interface

      // Send heartbeat to WakaTime
      this.wakatime.sendHeartbeat({
        appData: appData,
        windowInfo: windowInfo,
        project: program.name,
        entity: programPath,
        entityType: 'app' as const,
        category: 'coding', // Default category
        language: this.determineLanguageFromPath(programPath),
        isWrite: false, // We can't detect write activity from process monitoring
      });

      Logging.instance().log(
        `Sent heartbeat for ${program.name}`,
        LogLevel.DEBUG
      );

    } catch (error) {
      Logging.instance().log(
        `Error sending heartbeat for ${programPath}: ${error}`,
        LogLevel.ERROR,
        true
      );
    }
  }

  /**
   * Determine programming language from executable path
   */
  private determineLanguageFromPath(programPath: string): string {
    const programName = path.basename(programPath).toLowerCase();
    
    // Map common IDE/editor names to languages
    const languageMap: { [key: string]: string } = {
      'code': 'TypeScript', // VS Code
      'code-oss': 'TypeScript',
      'codium': 'TypeScript',
      'vim': 'Vim Script',
      'nvim': 'Vim Script',
      'neovim': 'Vim Script',
      'emacs': 'Emacs Lisp',
      'nano': 'Text',
      'gedit': 'Text',
      'kate': 'Text',
      'atom': 'Text',
      'sublime_text': 'Text',
      'webstorm': 'JavaScript',
      'phpstorm': 'PHP',
      'pycharm': 'Python',
      'intellij': 'Java',
      'eclipse': 'Java',
      'netbeans': 'Java',
      'rider': 'C#',
      'clion': 'C++',
      'goland': 'Go',
      'rubymine': 'Ruby',
    };

    // Check for exact matches
    for (const [key, language] of Object.entries(languageMap)) {
      if (programName.includes(key)) {
        return language;
      }
    }

    // Default to generic programming language
    return 'Other';
  }

  /**
   * Get current monitoring status
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get current monitoring interval
   */
  getMonitoringInterval(): number {
    return this.monitoringInterval;
  }

  /**
   * Get list of currently detected running programs
   */
  getCurrentlyRunningPrograms(): string[] {
    return Array.from(this.lastReportedPrograms);
  }
} 