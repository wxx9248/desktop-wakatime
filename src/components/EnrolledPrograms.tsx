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

export function EnrolledPrograms() {
  const [enrolledPrograms, setEnrolledPrograms] = useState<EnrolledProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEnrolledPrograms = useCallback(() => {
    const programs = window.ipcRenderer?.sendSync(IpcKeys.getEnrolledPrograms) as EnrolledProgram[];
    setEnrolledPrograms(programs || []);
  }, []);

  useEffect(() => {
    loadEnrolledPrograms();
  }, [loadEnrolledPrograms]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Enrolled Programs</h3>
        <Button onClick={handleAddProgram} disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add Program'}
        </Button>
      </div>
      
      <p className="text-sm text-gray-600">
        Enrolled programs are monitored for activity when they are running. 
        The system checks every minute if these programs are active and logs usage time.
      </p>

      {enrolledPrograms.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No programs enrolled yet.</p>
          <p className="text-sm">Click "Add Program" to start monitoring a program.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {enrolledPrograms.map((program) => (
            <div
              key={program.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="font-medium">{program.name}</div>
                <div className="text-sm text-gray-600">{program.path}</div>
                <div className="text-xs text-gray-500">
                  Enrolled: {formatDate(program.enrolledAt)}
                  {program.lastSeen && (
                    <span className="ml-2">
                      Last seen: {formatDate(program.lastSeen)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveProgram(program.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 