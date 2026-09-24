package system

import (
	"archive/tar"
	"compress/gzip"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"

	"github.com/lxc/incus/v7/shared/revert"

	config "github.com/FuturFusion/operations-center/internal/config/daemon"
	"github.com/FuturFusion/operations-center/internal/domain"
	"github.com/FuturFusion/operations-center/internal/util/file"
)

// databaseFilename is the name of the database file in the var dir.
const databaseFilename = "local.db"

// backupDirName holds the database snapshots of backups in progress.
const backupDirName = ".backup"

// restoreDirName holds a staged restore, it must be on the var dir file system.
const restoreDirName = ".restore"

// restoreAppliedMarker marks a restore, which is in place but not yet completed.
const restoreAppliedMarker = "applied"

// ErrRestoreRolledBack reports a failed restore, which has been rolled back.
var ErrRestoreRolledBack = errors.New("Restore did not complete, the state before the restore has been put back")

type backupEntry struct {
	name         string
	required     bool
	completeOnly bool
}

// backupEntries holds the var dir entries making up the state of Operations Center.
var backupEntries = []backupEntry{
	{name: config.ConfigFilename, required: true},
	{name: config.ServerCertificateFilename, required: true},
	{name: config.ServerKeyFilename, required: true},
	{name: "server.ca"},
	{name: config.ClientCertificateFilename, required: true},
	{name: config.ClientKeyFilename, required: true},
	{name: databaseFilename, required: true},
	{name: "artifacts"},
	{name: "images"},
	{name: "updates", completeOnly: true},
}

// replacedEntries holds the backup entries plus the leftover database files.
var replacedEntries = append(
	backupEntryNames(),
	databaseFilename+"-journal",
	databaseFilename+"-wal",
	databaseFilename+"-shm",
)

func backupEntryNames() []string {
	names := make([]string, 0, len(backupEntries))
	for _, entry := range backupEntries {
		names = append(names, entry.name)
	}

	return names
}

// writeBackup writes the backup as gzip compressed tar archive to w.
func writeBackup(w io.Writer, varDir string, snapshotDir string, complete bool) (err error) {
	gzw := gzip.NewWriter(w)
	tw := tar.NewWriter(gzw)

	for _, entry := range backupEntries {
		if entry.completeOnly && !complete {
			continue
		}

		root := varDir
		if entry.name == databaseFilename {
			root = snapshotDir
		}

		err = addToArchive(tw, root, entry.name)
		if err != nil {
			return err
		}
	}

	err = tw.Close()
	if err != nil {
		return fmt.Errorf("Failed to finish backup archive: %w", err)
	}

	err = gzw.Close()
	if err != nil {
		return fmt.Errorf("Failed to finish backup compression: %w", err)
	}

	return nil
}

func addToArchive(tw *tar.Writer, root string, name string) error {
	return filepath.WalkDir(filepath.Join(root, name), func(filename string, dirEntry fs.DirEntry, err error) error {
		if err != nil {
			// Optional entries, which do not exist, are skipped.
			if errors.Is(err, fs.ErrNotExist) && filename == filepath.Join(root, name) {
				return nil
			}

			return err
		}

		info, err := dirEntry.Info()
		if err != nil {
			return err
		}

		if !info.Mode().IsDir() && !info.Mode().IsRegular() {
			//domain-errors:internal Only Operations Center writes to its var dir.
			return fmt.Errorf("Unsupported file type of %q in backup", filename)
		}

		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return fmt.Errorf("Failed to create archive header for %q: %w", filename, err)
		}

		relName, err := filepath.Rel(root, filename)
		if err != nil {
			return err
		}

		header.Name = filepath.ToSlash(relName)
		if info.IsDir() {
			header.Name += "/"
		}

		err = tw.WriteHeader(header)
		if err != nil {
			return fmt.Errorf("Failed to write archive header for %q: %w", filename, err)
		}

		if info.IsDir() {
			return nil
		}

		f, err := os.Open(filename)
		if err != nil {
			return err
		}

		defer f.Close()

		_, err = io.Copy(tw, f)
		if err != nil {
			return fmt.Errorf("Failed to add %q to archive: %w", filename, err)
		}

		return nil
	})
}

// extractBackup extracts the known backup entries from r to dir.
func extractBackup(r io.Reader, dir string) error {
	gzr, err := gzip.NewReader(r)
	if err != nil {
		return invalidBackupErr(err, "Backup is not a gzip compressed archive")
	}

	defer func() {
		_ = gzr.Close()
	}()

	knownEntries := backupEntryNames()

	tr := tar.NewReader(gzr)
	for {
		header, err := tr.Next()
		if errors.Is(err, io.EOF) {
			return nil
		}

		if err != nil {
			return invalidBackupErr(err, "Failed to read backup archive")
		}

		name := path.Clean(header.Name)
		if !filepath.IsLocal(name) {
			return invalidBackupErr(nil, "Backup contains invalid path %q", header.Name)
		}

		topLevel, _, _ := strings.Cut(name, "/")
		if !slices.Contains(knownEntries, topLevel) {
			return invalidBackupErr(nil, "Backup contains unexpected entry %q", header.Name)
		}

		filename := filepath.Join(dir, filepath.FromSlash(name))
		mode := header.FileInfo().Mode().Perm()

		switch header.Typeflag {
		case tar.TypeDir:
			err = os.MkdirAll(filename, mode|0o700)
			if err != nil {
				return err
			}

		case tar.TypeReg:
			err = os.MkdirAll(filepath.Dir(filename), 0o700)
			if err != nil {
				return err
			}

			err = extractFile(tr, filename, mode)
			if err != nil {
				return err
			}

		default:
			return invalidBackupErr(nil, "Backup entry %q has an unsupported type", header.Name)
		}
	}
}

// invalidBackupErr reports a backup, which can not be restored.
func invalidBackupErr(cause error, format string, a ...any) error {
	return domain.NewErrorf(domain.ErrInvalidArgument, "", format, a...).
		WithCause(cause).
		WithHintf("Provide a backup created by Operations Center.")
}

func extractFile(r io.Reader, filename string, mode fs.FileMode) error {
	f, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_EXCL, mode)
	if err != nil {
		return err
	}

	defer f.Close()

	_, err = file.SafeCopy(f, r)
	if err != nil {
		return invalidBackupErr(err, "Failed to extract %q from backup", filepath.Base(filename))
	}

	return f.Close()
}

// PrepareVarDir applies or rolls back a staged restore, it must run before varDir is read.
func PrepareVarDir(varDir string) (err error) {
	err = os.RemoveAll(filepath.Join(varDir, backupDirName))
	if err != nil {
		return err
	}

	restoreDir := filepath.Join(varDir, restoreDirName)
	stagedDir := filepath.Join(restoreDir, "staged")
	previousDir := filepath.Join(restoreDir, "previous")
	markerFile := filepath.Join(restoreDir, restoreAppliedMarker)

	if file.PathExists(markerFile) {
		err = rollbackRestore(varDir, previousDir)
		if err != nil {
			return fmt.Errorf("Failed to roll back restore, which did not complete: %w", err)
		}

		err = os.RemoveAll(restoreDir)
		if err != nil {
			return err
		}

		return ErrRestoreRolledBack
	}

	if !file.PathExists(stagedDir) {
		// Clean up leftovers of an interrupted upload.
		return os.RemoveAll(restoreDir)
	}

	err = os.MkdirAll(previousDir, 0o700)
	if err != nil {
		return err
	}

	// Move the current state out of the way, this is safe to repeat.
	for _, name := range replacedEntries {
		if !file.PathExists(filepath.Join(varDir, name)) {
			continue
		}

		err = os.Rename(filepath.Join(varDir, name), filepath.Join(previousDir, name))
		if err != nil {
			return err
		}
	}

	// From here on, previousDir holds the complete state before the restore.
	err = os.WriteFile(markerFile, nil, 0o600)
	if err != nil {
		return err
	}

	reverter := revert.New()
	defer reverter.Fail()

	reverter.Add(func() {
		revertErr := rollbackRestore(varDir, previousDir)
		if revertErr == nil {
			revertErr = os.RemoveAll(restoreDir)
		}

		if revertErr != nil {
			err = errors.Join(err, fmt.Errorf("Failed to roll back restore: %w", revertErr))
		}
	})

	for _, name := range backupEntryNames() {
		if !file.PathExists(filepath.Join(stagedDir, name)) {
			continue
		}

		err = os.Rename(filepath.Join(stagedDir, name), filepath.Join(varDir, name))
		if err != nil {
			return err
		}
	}

	err = os.RemoveAll(stagedDir)
	if err != nil {
		return err
	}

	reverter.Success()

	return nil
}

// rollbackRestore replaces the entries in varDir with the ones in previousDir.
func rollbackRestore(varDir string, previousDir string) error {
	for _, name := range replacedEntries {
		err := os.RemoveAll(filepath.Join(varDir, name))
		if err != nil {
			return err
		}

		if !file.PathExists(filepath.Join(previousDir, name)) {
			continue
		}

		err = os.Rename(filepath.Join(previousDir, name), filepath.Join(varDir, name))
		if err != nil {
			return err
		}
	}

	return nil
}

// IsRestoreApplied reports, if a restore is in place but not yet completed.
func IsRestoreApplied(varDir string) bool {
	return file.PathExists(filepath.Join(varDir, restoreDirName, restoreAppliedMarker))
}

// CompleteRestore removes the state replaced by a successful restore.
func CompleteRestore(varDir string) error {
	return os.RemoveAll(filepath.Join(varDir, restoreDirName))
}
