import type { IGlobalKeyListener } from "node-global-key-listener";
import { GlobalKeyboardListener } from "node-global-key-listener";

// Local WindowInfo interface for compatibility (this file is deprecated)
interface WindowInfo {
  url?: string;
  title: string;
  info: {
    name: string;
    path: string;
    processId: number;
  };
}

// Deprecated functions for compatibility
function activeWindow(): WindowInfo {
  return {
    title: "",
    info: { name: "", path: "", processId: 0 }
  };
}

function subscribeActiveWindow(_callback: (info: WindowInfo) => void): number {
  return 0;
}

function unsubscribeActiveWindow(_id: number): void {
  // No-op
}

import { AppsManager } from "../helpers/apps-manager";
import { MonitoredApp } from "../helpers/monitored-app";
import { MonitoringManager } from "../helpers/monitoring-manager";
import { Logging, LogLevel } from "../utils/logging";
import { Wakatime } from "./wakatime";

export class Watcher {
  wakatime: Wakatime;
  activeWindow?: WindowInfo;
  private activeWindowSubscription: number | null;
  private gkl: GlobalKeyboardListener;
  private isWatchingForKeyboardEvents = false;

  constructor(wakatime: Wakatime) {
    this.wakatime = wakatime;
    this.activeWindowSubscription = null;
    this.gkl = new GlobalKeyboardListener();
  }

  private globalKeyListener: IGlobalKeyListener = (event) => {
    if (event.state !== "DOWN") {
      return;
    }

    try {
      // To ensure we always retrieve the most current window information, including the updated URL and title, we use the activeWindow function instead of relying on the previously stored this.activeApp. This approach addresses the issue where switching tabs in your browser does not trigger a window change event, leading to activeApp retaining outdated URL and title information.
      const window = activeWindow();
      const app = AppsManager.instance().getApp(window.info.path);
      const heartbeatData = MonitoredApp.heartbeatData(window, app);
      if (!heartbeatData) {
        return;
      }

      this.wakatime.sendHeartbeat({
        appData: app,
        windowInfo: window,
        project: heartbeatData.project,
        entity: heartbeatData.entity,
        entityType: "app",
        category: heartbeatData.category,
        language: heartbeatData.language,
        isWrite: false,
      });
    } catch (error) {
      Logging.instance().log((error as Error).message, LogLevel.ERROR, true);
    }
  };

  private watchKeyboardEvents() {
    this.isWatchingForKeyboardEvents = true;
    this.gkl.addListener(this.globalKeyListener);
  }

  private unwatchKeyboardEvents() {
    this.isWatchingForKeyboardEvents = false;
    this.gkl.removeListener(this.globalKeyListener);
  }

  start() {
    this.activeWindowSubscription = subscribeActiveWindow(
      (windowInfo: WindowInfo) => {
        if (!windowInfo.info.processId) return;
        if (this.activeWindow?.info.processId === windowInfo.info.processId) {
          return;
        }

        if (this.isWatchingForKeyboardEvents) {
          this.unwatchKeyboardEvents();
        }

        Logging.instance().log(
          `App changed from ${this.activeWindow?.info.name || "nil"} to ${windowInfo.info.name}`,
        );

        this.activeWindow = windowInfo;
        if (this.activeWindow.info.path) {
          const isMonitored = MonitoringManager.isMonitored(
            this.activeWindow.info.path,
          );

          if (isMonitored) {
            Logging.instance().log(
              `Monitoring ${windowInfo.info.name}: ${this.activeWindow.info.path}`,
            );
            this.watchKeyboardEvents();
          } else {
            Logging.instance().log(
              `Not monitoring ${windowInfo.info.name}: ${this.activeWindow.info.path}`,
            );
          }
        }
      },
    );
  }

  stop() {
    if (this.activeWindowSubscription !== null) {
      unsubscribeActiveWindow(this.activeWindowSubscription);
    }
  }
}
