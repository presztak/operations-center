package system

import (
	"fmt"
	"os"

	"github.com/lxc/incus/v7/shared/units"
	"github.com/spf13/cobra"

	"github.com/FuturFusion/operations-center/internal/cli/validate"
	"github.com/FuturFusion/operations-center/internal/client"
	"github.com/FuturFusion/operations-center/internal/util/file"
	"github.com/FuturFusion/operations-center/internal/util/render"
)

type CmdBackup struct {
	OCClient *client.OperationsCenterClient

	flagComplete bool
}

func (c *CmdBackup) Command() *cobra.Command {
	cmd := &cobra.Command{}
	cmd.Use = "backup <target-file.tar.gz>"
	cmd.Short = "Create a backup of operations-center"
	cmd.Long = `Description:
  Create a backup of operations-center

  The backup holds the configuration, the certificates and keys and the
  database of operations-center. The inventory is not part of the backup,
  it is synced again from the clusters after a restore.

  The backup contains secrets, it has to be stored safely.
`

	cmd.Flags().BoolVar(&c.flagComplete, "complete", false, "Include the cached update files in the backup")

	cmd.PreRunE = c.validateArgsAndFlags
	cmd.RunE = c.run

	return cmd
}

func (c *CmdBackup) validateArgsAndFlags(cmd *cobra.Command, args []string) error {
	// Quick checks.
	exit, err := validate.Args(cmd, args, 1, 1)
	if exit {
		return err
	}

	return nil
}

func (c *CmdBackup) run(cmd *cobra.Command, args []string) error {
	targetFilename := args[0]

	if file.PathExists(targetFilename) {
		return fmt.Errorf("target file %q already exists", targetFilename)
	}

	backupReader, err := c.OCClient.GetSystemBackup(cmd.Context(), c.flagComplete)
	if err != nil {
		return err
	}

	defer backupReader.Close()

	targetFile, err := os.OpenFile(targetFilename, os.O_RDWR|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return err
	}

	defer targetFile.Close()

	quiet, _ := cmd.Flags().GetBool("quiet")
	progress, writer := render.ProgressWriter(targetFile, "Fetching backup: %s", quiet)

	size, err := file.SafeCopy(writer, backupReader)
	if err != nil {
		_ = os.Remove(targetFilename)
		return err
	}

	progress.Done(fmt.Sprintf("Successfully written %s to %q", units.GetByteSizeString(size, 2), targetFilename))

	return nil
}

type CmdRestore struct {
	OCClient *client.OperationsCenterClient
}

func (c *CmdRestore) Command() *cobra.Command {
	cmd := &cobra.Command{}
	cmd.Use = "restore <backup-file.tar.gz>"
	cmd.Short = "Restore a backup of operations-center"
	cmd.Long = `Description:
  Restore a backup of operations-center

  The backup is validated, before operations-center restarts to apply it. It
  replaces the complete state of operations-center. Operations, which have
  been in progress, when the backup has been created, are aborted.

  A restore is refused, while servers are being deployed, updated, evacuated
  or restored or while cluster updates are in progress.
`

	cmd.PreRunE = c.validateArgsAndFlags
	cmd.RunE = c.run

	return cmd
}

func (c *CmdRestore) validateArgsAndFlags(cmd *cobra.Command, args []string) error {
	// Quick checks.
	exit, err := validate.Args(cmd, args, 1, 1)
	if exit {
		return err
	}

	return nil
}

func (c *CmdRestore) run(cmd *cobra.Command, args []string) error {
	backupFile, err := os.Open(args[0])
	if err != nil {
		return err
	}

	defer backupFile.Close()

	err = c.OCClient.RestoreSystemBackup(cmd.Context(), backupFile)
	if err != nil {
		return err
	}

	fmt.Println("Backup restored, operations-center is restarting")

	return nil
}
