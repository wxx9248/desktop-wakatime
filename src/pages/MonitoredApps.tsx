import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { IpcKeys } from "../../electron/utils/constants";

interface EnrolledProgram {
  id: string;
  name: string;
  path: string;
  enrolledAt: string;
  lastSeen?: string;
}

export function MonitoredAppsPage() {
  const [enrolledPrograms, setEnrolledPrograms] = useState<EnrolledProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runningPrograms, setRunningPrograms] = useState<string[]>([]);

  const loadEnrolledPrograms = useCallback(() => {
    const programs = window.ipcRenderer?.sendSync(IpcKeys.getEnrolledPrograms) as EnrolledProgram[];
    setEnrolledPrograms(programs || []);
  }, []);

  const loadRunningPrograms = useCallback(() => {
    const running = window.ipcRenderer?.sendSync(IpcKeys.getOpenApps) as Array<{path: string}>;
    setRunningPrograms(running?.map(app => app.path) || []);
  }, []);

  useEffect(() => {
    window.document.title = "Enrolled Programs";
    loadEnrolledPrograms();
    loadRunningPrograms();

    // Refresh running programs every 30 seconds
    const interval = setInterval(loadRunningPrograms, 30000);
    return () => clearInterval(interval);
  }, [loadEnrolledPrograms, loadRunningPrograms]);

  const handleAddProgram = async () => {
    setIsLoading(true);
    try {
      const filePath = await window.ipcRenderer?.invoke(IpcKeys.showFileDialog);
      if (filePath) {
        const result = window.ipcRenderer?.sendSync(IpcKeys.enrollProgram, filePath);
        if (result) {
          loadEnrolledPrograms();
        } else {
          alert('Failed to enroll program. It may already be enrolled or the path is invalid.');
        }
      }
    } catch (error) {
      console.error('Error adding program:', error);
      alert('Failed to add program');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProgram = (programId: string) => {
    const confirmed = confirm('Are you sure you want to remove this program from monitoring?');
    if (confirmed) {
      const result = window.ipcRenderer?.sendSync(IpcKeys.removeEnrolledProgram, programId);
      if (result) {
        loadEnrolledPrograms();
      } else {
        alert('Failed to remove program');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isRunning = (programPath: string) => {
    return runningPrograms.includes(programPath);
  };

  return (
    <div className="flex min-h-screen flex-col p-6 bg-background text-foreground">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Enrolled Programs</h1>
            <p className="text-muted-foreground mt-1">
              Manage programs that are monitored
            </p>
          </div>
          <Button onClick={handleAddProgram} disabled={isLoading} className="cursor-pointer" variant="outline">
            {isLoading ? 'Adding...' : 'Add Program'}
          </Button>
        </div>
        
        <div className="bg-muted/50 border rounded-lg p-4 mb-6">
          <h3 className="font-medium text-foreground mb-2">How it works:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Enroll any executable program you want to monitor</li>
            <li>• The system checks every minute if enrolled programs are running</li>
            <li>• When a program is detected running, usage time is logged to WakaTime</li>
          </ul>
        </div>
      </div>

      {enrolledPrograms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No programs enrolled yet</h3>
            <p className="text-muted-foreground mb-6">
              Get started by enrolling a program you want to monitor.<br />
              This could be your code editor, terminal, or any development tool.
            </p>
            <Button onClick={handleAddProgram} disabled={isLoading} className="cursor-pointer" variant="outline">
              {isLoading ? 'Adding...' : 'Enroll Your First Program'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <div className="space-y-3">
            {enrolledPrograms.map((program) => (
              <div
                key={program.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  isRunning(program.path) 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/50' 
                    : 'bg-card border'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-3 h-3 rounded-full ${
                    isRunning(program.path) ? 'bg-green-500' : 'bg-muted-foreground/30'
                  }`} title={isRunning(program.path) ? 'Running' : 'Not running'} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-foreground truncate">{program.name}</h3>
                      {isRunning(program.path) && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded">
                          Running
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{program.path}</p>
                    <div className="text-xs text-muted-foreground/70 mt-1">
                      Enrolled: {formatDate(program.enrolledAt)}
                      {program.lastSeen && (
                        <span className="ml-4">
                          Last seen: {formatDate(program.lastSeen)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveProgram(program.id)}
                  className="cursor-pointer text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">
                  {enrolledPrograms.length} program{enrolledPrograms.length !== 1 ? 's' : ''} enrolled
                </h4>
                <p className="text-sm text-muted-foreground">
                  {runningPrograms.length} currently running
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadEnrolledPrograms();
                  loadRunningPrograms();
                }}
                className="cursor-pointer"
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
