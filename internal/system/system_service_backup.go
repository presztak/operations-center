package system

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/lxc/incus/v7/shared/revert"

	config "github.com/FuturFusion/operations-center/internal/config/daemon"
	"github.com/FuturFusion/operations-center/internal/domain"
	"github.com/FuturFusion/operations-center/shared/api"
)

func (s *systemService) Backup(ctx context.Context, complete bool) (io.ReadCloser, error) {
	varDir := s.env.VarDir()

	// Check upfront, errors can not be reported once the archive is streamed.
	for _, entry := range backupEntries {
		if !entry.required || entry.name == databaseFilename {
			continue
		}

		_, err := os.Stat(filepath.Join(varDir, entry.name))
		if err != nil {
			return nil, fmt.Errorf("Failed to access %q for backup: %w", entry.name, err)
		}
	}

	err := os.MkdirAll(filepath.Join(varDir, backupDirName), 0o700)
	if err != nil {
		return nil, err
	}

	snapshotDir, err := os.MkdirTemp(filepath.Join(varDir, backupDirName), "")
	if err != nil {
		return nil, err
	}

	reverter := revert.New()
	defer reverter.Fail()

	reverter.Add(func() {
		_ = os.RemoveAll(snapshotDir)
	})

	err = s.databaseRepo.Snapshot(ctx, snapshotDir)
	if err != nil {
		return nil, err
	}

	pr, pw := io.Pipe()
	done := make(chan struct{})

	go func() {
		defer close(done)

		_ = pw.CloseWithError(writeBackup(pw, varDir, snapshotDir, complete))
	}()

	reverter.Success()

	return &backupReader{
		PipeReader:  pr,
		done:        done,
		snapshotDir: snapshotDir,
	}, nil
}

// backupReader streams a backup and removes the database snapshot on Close.
type backupReader struct {
	*io.PipeReader

	done        chan struct{}
	snapshotDir string
}

func (b *backupReader) Close() error {
	_ = b.PipeReader.Close()
	<-b.done

	return os.RemoveAll(b.snapshotDir)
}

func (s *systemService) Restore(ctx context.Context, archive io.Reader) error {
	if !s.restoreMu.TryLock() {
		return domain.NewErrorf(domain.ErrOperationNotPermitted, "", "A restore is already in progress")
	}

	reverter := revert.New()
	defer reverter.Fail()

	reverter.Add(s.restoreMu.Unlock)

	err := s.checkNoOperationInProgress(ctx)
	if err != nil {
		return err
	}

	restoreDir := filepath.Join(s.env.VarDir(), restoreDirName)
	pendingDir := filepath.Join(restoreDir, "pending")

	// Leftovers of a previous upload, which has been interrupted.
	err = os.RemoveAll(restoreDir)
	if err != nil {
		return err
	}

	err = os.MkdirAll(pendingDir, 0o700)
	if err != nil {
		return err
	}

	reverter.Add(func() {
		_ = os.RemoveAll(restoreDir)
	})

	err = extractBackup(archive, pendingDir)
	if err != nil {
		return err
	}

	err = s.validateBackup(ctx, pendingDir)
	if err != nil {
		return err
	}

	err = os.Rename(pendingDir, filepath.Join(restoreDir, "staged"))
	if err != nil {
		return err
	}

	reverter.Success()

	// The staged restore is moved in place by the restarted daemon.
	s.requestRestart()

	return nil
}

// checkNoOperationInProgress prevents a restore, while an operation is in progress.
func (s *systemService) checkNoOperationInProgress(ctx context.Context) error {
	servers, err := s.serverSvc.GetAll(ctx)
	if err != nil {
		return fmt.Errorf("Failed to get servers: %w", err)
	}

	for _, server := range servers {
		if server.StatusInternal.Deployment.IsActive() {
			return serverOperationInProgressErr(server.Name, "being deployed")
		}

		switch server.StatusDetail {
		case api.ServerStatusDetailReadyUpdatingOS,
			api.ServerStatusDetailReadyUpdatingApplication,
			api.ServerStatusDetailReadyEvacuating,
			api.ServerStatusDetailReadyRestoring:
			return serverOperationInProgressErr(server.Name, string(server.StatusDetail))
		}
	}

	clusters, err := s.clusterSvc.GetAll(ctx)
	if err != nil {
		return fmt.Errorf("Failed to get clusters: %w", err)
	}

	for _, cluster := range clusters {
		inProgress := cluster.UpdateStatus.InProgressStatus.InProgress
		if inProgress != api.ClusterUpdateInProgressInactive && inProgress != api.ClusterUpdateInProgressError {
			return clusterOperationInProgressErr(cluster.Name, string(inProgress))
		}
	}

	return nil
}

func serverOperationInProgressErr(name string, operation string) error {
	return domain.NewErrorf(domain.ErrOperationNotPermitted, "", "Backup can not be restored while server %q is %s", name, operation).
		WithHintf("Wait for the operation to complete or abort it first.").
		WithDetail("server", name)
}

func clusterOperationInProgressErr(name string, operation string) error {
	return domain.NewErrorf(domain.ErrOperationNotPermitted, "", "Backup can not be restored while cluster %q is %s", name, operation).
		WithHintf("Wait for the operation to complete or abort it first.").
		WithDetail("cluster", name)
}

// validateBackup verifies, that Operations Center can start with the backup in dir.
func (s *systemService) validateBackup(ctx context.Context, dir string) error {
	for _, entry := range backupEntries {
		if !entry.required {
			continue
		}

		_, err := os.Stat(filepath.Join(dir, entry.name))
		if err != nil {
			return invalidBackupErr(err, "Backup is missing %q", entry.name)
		}
	}

	_, err := tls.LoadX509KeyPair(filepath.Join(dir, config.ServerCertificateFilename), filepath.Join(dir, config.ServerKeyFilename))
	if err != nil {
		return invalidBackupErr(err, "Backup contains an invalid server certificate")
	}

	_, err = tls.LoadX509KeyPair(filepath.Join(dir, config.ClientCertificateFilename), filepath.Join(dir, config.ClientKeyFilename))
	if err != nil {
		return invalidBackupErr(err, "Backup contains an invalid client certificate")
	}

	err = config.ValidateFile(backupEnv{varDir: dir, isIncusOS: s.env.IsIncusOS()})
	if err != nil {
		return invalidBackupErr(err, "Backup contains an invalid configuration")
	}

	current, latest, err := s.databaseRepo.SchemaVersion(ctx, dir)
	if err != nil || current == 0 {
		return invalidBackupErr(err, "Backup contains an invalid database")
	}

	if current > latest {
		return domain.NewErrorf(domain.ErrInvalidArgument, "", "Backup has been created by a newer version of Operations Center").
			WithHintf("Update Operations Center before restoring this backup.")
	}

	return nil
}

// backupEnv presents an extracted backup as var dir for the config validation.
type backupEnv struct {
	varDir    string
	isIncusOS bool
}

func (e backupEnv) VarDir() string {
	return e.varDir
}

func (e backupEnv) IsIncusOS() bool {
	return e.isIncusOS
}
