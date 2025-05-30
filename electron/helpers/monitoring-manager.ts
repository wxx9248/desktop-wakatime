import { EnrolledProgramsManager } from "./enrolled-programs-manager";
import { AppData } from "../utils/validators";

export abstract class MonitoringManager {
  static isBrowserMonitored() {
    // Since we're moving to enrolled programs, browsers would be enrolled manually
    // For now, return false to disable browser-specific functionality
    return false;
  }

  static isMonitored(path: string) {
    // Check if the program is enrolled instead of using the old config system
    const enrolledManager = EnrolledProgramsManager.getInstance();
    return enrolledManager.isProgramEnrolled(path);
  }

  static set(appData: AppData, monitor: boolean) {
    // This method is deprecated but kept for compatibility
    // In the new system, use EnrolledProgramsManager directly
    const enrolledManager = EnrolledProgramsManager.getInstance();
    
    if (monitor) {
      enrolledManager.enrollProgram(appData.path);
    } else {
      const program = enrolledManager.getProgramByPath(appData.path);
      if (program) {
        enrolledManager.removeProgram(program.id);
      }
    }
  }

  static monitoredKey(path: string) {
    // This method is kept for compatibility but not used in the new system
    return `is_${path}_monitored`;
  }
}
