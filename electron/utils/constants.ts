export const IpcKeys = {
  getAllApps: "get_all_apps",
  getAllAvailableApps: "get_all_available_apps",
  getAppVersion: "get_app_version",
  getPlatform: "get_platform",
  getSetting: "get_setting",
  setSetting: "set_setting",
  isMonitored: "is_monitored",
  setMonitored: "set_monitored",
  autoUpdateEnabled: "auto_update_enabled",
  setAutoUpdateEnabled: "set_auto_update_enabled",
  codeTimeInStatusBar: "code_time_in_status_bar",
  setCodeTimeInStatusBar: "set_code_time_in_status_bar",
  shouldLogToFile: "should_log_to_file",
  setShouldLogToFile: "set_should_log_to_file",
  setDebugMode: "set_debug_mode",
  shouldLaunchOnLogin: "should_launch_on_login",
  setShouldLaunchOnLogin: "set_should_launch_on_login",
  logFilePath: "log_file_path",
  isBrowserMonitored: "is_browser_monitored",
  getDomainPreference: "get_domain_preference",
  setDomainPreference: "set_domain_preference",
  getFilterType: "get_filter_type",
  setFilterType: "set_filter_type",
  getDenylist: "get_denylist",
  setDenylist: "set_denylist",
  getAllowlist: "get_allowlist",
  setAllowlist: "set_allowlist",
  getOpenApps: "get_opened_apps",
  shellOpenExternal: "shell_open_external",
  // Enrolled programs management
  getEnrolledPrograms: "get_enrolled_programs",
  enrollProgram: "enroll_program",
  removeEnrolledProgram: "remove_enrolled_program",
  showFileDialog: "show_file_dialog",
};

export type FilterType = "denylist" | "allowlist";

export type DomainPreferenceType = "domain" | "url";

export const DeepLink = {
  settings: "settings",
  monitoredApps: "monitoredApps",
};

export const WAKATIME_PROTOCALL = "wakatime";
