import { useState } from "react";
import { Form } from "react-bootstrap";
import { createSystemBackup, restoreSystemBackup } from "api/settings";
import FileUploader from "components/FileUploader";
import LoadingButton from "components/LoadingButton";
import { useNotification } from "context/notificationContext";
import { errorMessage } from "util/response";
import { downloadFile } from "util/util";

const SystemBackupConfiguration = () => {
  const { notify } = useNotification();
  const [complete, setComplete] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);

  const onBackup = async () => {
    setBackupInProgress(true);
    try {
      const url = await createSystemBackup(complete);
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .slice(0, 15);
      downloadFile(url, `operations-center-backup-${timestamp}.tar.gz`);
      notify.success("Backup created");
    } catch (e) {
      notify.error(`Error during backup creation: ${e}`);
    }
    setBackupInProgress(false);
  };

  const onRestore = async (file: File | null): Promise<boolean> => {
    if (!file) {
      return false;
    }

    try {
      const response = await restoreSystemBackup(file);
      if (response.error_code != 0) {
        notify.error(errorMessage(response));
        return false;
      }

      notify.success(
        "Backup restored, Operations Center is restarting. Reload the page in a moment.",
      );
      return true;
    } catch (e) {
      notify.error(`Error during backup restore: ${e}`);
      return false;
    }
  };

  return (
    <div className="p-3">
      <h5>Backup</h5>
      <p>
        The backup holds the configuration, the certificates and keys and the
        database of Operations Center. It contains secrets and has to be stored
        safely.
      </p>
      <Form.Check
        type="checkbox"
        className="mb-3"
        label="Include cached update files"
        checked={complete}
        onChange={(e) => setComplete(e.target.checked)}
      />
      <LoadingButton
        isLoading={backupInProgress}
        variant="success"
        size="sm"
        onClick={onBackup}
      >
        Download backup
      </LoadingButton>
      <h5 className="mt-5">Restore</h5>
      <p className="text-danger">
        Restoring a backup replaces the complete state of Operations Center.
        Operations, which have been in progress, when the backup has been
        created, are aborted.
      </p>
      <FileUploader onUpload={onRestore} />
    </div>
  );
};

export default SystemBackupConfiguration;
