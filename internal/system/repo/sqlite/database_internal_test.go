package sqlite

import (
	"os"
	"regexp"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/FuturFusion/operations-center/internal/sql/dbschema"
	dbdriver "github.com/FuturFusion/operations-center/internal/sql/sqlite"
)

func TestInventoryTables(t *testing.T) {
	content, err := os.ReadFile("../../../../generate-inventory.yaml")
	require.NoError(t, err)

	matches := regexp.MustCompile(`(?m)^([a-z_]+):`).FindAllStringSubmatch(string(content), -1)
	tables := make([]string, 0, len(matches))
	for _, match := range matches {
		tables = append(tables, match[1]+"s")
	}

	require.ElementsMatch(t, tables, inventoryTables)
}

func TestDatabase_SnapshotAndSchemaVersion(t *testing.T) {
	dir := t.TempDir()

	db, err := dbdriver.Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = db.Close()
	})

	_, err = dbschema.Ensure(t.Context(), db, dir)
	require.NoError(t, err)

	snapshotDir := t.TempDir()
	repo := NewDatabase(db)

	err = repo.Snapshot(t.Context(), snapshotDir)
	require.NoError(t, err)

	current, latest, err := repo.SchemaVersion(t.Context(), snapshotDir)
	require.NoError(t, err)
	require.Positive(t, current)
	require.Equal(t, latest, current)

	// A directory without database reports schema version 0.
	current, _, err = repo.SchemaVersion(t.Context(), t.TempDir())
	require.NoError(t, err)
	require.Zero(t, current)
}
