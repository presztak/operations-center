package system

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func writeStateFiles(t *testing.T, dir string, content string) {
	t.Helper()

	for _, name := range []string{"config.yml", "server.crt", "server.key", "client.crt", "client.key", "local.db"} {
		err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600)
		require.NoError(t, err)
	}

	for _, name := range []string{"artifacts/a/file", "updates/u/file"} {
		err := os.MkdirAll(filepath.Join(dir, filepath.Dir(name)), 0o700)
		require.NoError(t, err)

		err = os.WriteFile(filepath.Join(dir, name), []byte(content), 0o600)
		require.NoError(t, err)
	}
}

func TestBackup_WriteAndExtract(t *testing.T) {
	varDir := t.TempDir()
	writeStateFiles(t, varDir, "state")

	snapshotDir := t.TempDir()
	err := os.WriteFile(filepath.Join(snapshotDir, "local.db"), []byte("snapshot"), 0o600)
	require.NoError(t, err)

	buf := &bytes.Buffer{}
	err = writeBackup(buf, varDir, snapshotDir, false)
	require.NoError(t, err)

	extractDir := t.TempDir()
	err = extractBackup(buf, extractDir)
	require.NoError(t, err)

	require.FileExists(t, filepath.Join(extractDir, "artifacts", "a", "file"))
	require.NoDirExists(t, filepath.Join(extractDir, "updates"))

	content, err := os.ReadFile(filepath.Join(extractDir, "local.db"))
	require.NoError(t, err)
	require.Equal(t, "snapshot", string(content))

	info, err := os.Stat(filepath.Join(extractDir, "server.key"))
	require.NoError(t, err)
	require.Equal(t, os.FileMode(0o600), info.Mode().Perm())
}

func TestBackup_ExtractRejectsForeignEntries(t *testing.T) {
	for _, name := range []string{"../escape", "unknown.txt", "artifacts/../../escape"} {
		t.Run(name, func(t *testing.T) {
			buf := &bytes.Buffer{}
			gzw := gzip.NewWriter(buf)
			tw := tar.NewWriter(gzw)

			err := tw.WriteHeader(&tar.Header{Name: name, Mode: 0o600, Size: 1, Typeflag: tar.TypeReg})
			require.NoError(t, err)

			_, err = tw.Write([]byte("x"))
			require.NoError(t, err)

			require.NoError(t, tw.Close())
			require.NoError(t, gzw.Close())

			err = extractBackup(buf, t.TempDir())
			require.Error(t, err)
		})
	}
}

func TestPrepareVarDir(t *testing.T) {
	varDir := t.TempDir()
	writeStateFiles(t, varDir, "old")

	err := os.WriteFile(filepath.Join(varDir, "local.db-journal"), []byte("old"), 0o600)
	require.NoError(t, err)

	stagedDir := filepath.Join(varDir, restoreDirName, "staged")
	err = os.MkdirAll(stagedDir, 0o700)
	require.NoError(t, err)

	writeStateFiles(t, stagedDir, "new")
	err = os.RemoveAll(filepath.Join(stagedDir, "updates"))
	require.NoError(t, err)

	// Apply the staged restore.
	err = PrepareVarDir(varDir)
	require.NoError(t, err)

	require.True(t, IsRestoreApplied(varDir))
	requireFileContent(t, filepath.Join(varDir, "config.yml"), "new")
	require.NoFileExists(t, filepath.Join(varDir, "local.db-journal"))
	require.NoDirExists(t, filepath.Join(varDir, "updates"))

	// The daemon did not start successfully, roll back.
	err = PrepareVarDir(varDir)
	require.ErrorIs(t, err, ErrRestoreRolledBack)

	require.False(t, IsRestoreApplied(varDir))
	requireFileContent(t, filepath.Join(varDir, "config.yml"), "old")
	requireFileContent(t, filepath.Join(varDir, "local.db-journal"), "old")
	requireFileContent(t, filepath.Join(varDir, "updates", "u", "file"), "old")
	require.NoDirExists(t, filepath.Join(varDir, restoreDirName))

	// Nothing staged, nothing to do.
	err = PrepareVarDir(varDir)
	require.NoError(t, err)
	requireFileContent(t, filepath.Join(varDir, "config.yml"), "old")
}

func TestCompleteRestore(t *testing.T) {
	varDir := t.TempDir()
	writeStateFiles(t, varDir, "old")

	stagedDir := filepath.Join(varDir, restoreDirName, "staged")
	err := os.MkdirAll(stagedDir, 0o700)
	require.NoError(t, err)

	writeStateFiles(t, stagedDir, "new")

	err = PrepareVarDir(varDir)
	require.NoError(t, err)

	err = CompleteRestore(varDir)
	require.NoError(t, err)

	require.False(t, IsRestoreApplied(varDir))
	require.NoDirExists(t, filepath.Join(varDir, restoreDirName))

	// A restart after the completed restore keeps the restored state.
	err = PrepareVarDir(varDir)
	require.NoError(t, err)
	requireFileContent(t, filepath.Join(varDir, "config.yml"), "new")
}

func requireFileContent(t *testing.T, filename string, want string) {
	t.Helper()

	content, err := os.ReadFile(filename)
	require.NoError(t, err)
	require.Equal(t, want, string(content))
}
