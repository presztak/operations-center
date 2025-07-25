// Code generated by generate-inventory; DO NOT EDIT.

package sqlite_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	incusapi "github.com/lxc/incus/v6/shared/api"
	"github.com/stretchr/testify/require"

	"github.com/FuturFusion/operations-center/internal/dbschema"
	"github.com/FuturFusion/operations-center/internal/dbschema/seed"
	"github.com/FuturFusion/operations-center/internal/domain"
	"github.com/FuturFusion/operations-center/internal/inventory"
	inventorySqlite "github.com/FuturFusion/operations-center/internal/inventory/repo/sqlite"
	"github.com/FuturFusion/operations-center/internal/provisioning"
	"github.com/FuturFusion/operations-center/internal/provisioning/repo/sqlite/entities"
	"github.com/FuturFusion/operations-center/internal/ptr"
	dbdriver "github.com/FuturFusion/operations-center/internal/sqlite"
	"github.com/FuturFusion/operations-center/internal/transaction"
	"github.com/FuturFusion/operations-center/shared/api"
)

func TestNetworkIntegrationDatabaseActions(t *testing.T) {
	testClusterA := provisioning.Cluster{
		Name:          "one",
		ConnectionURL: "https://cluster-one/",
		Certificate: `-----BEGIN CERTIFICATE-----
cluster A
-----END CERTIFICATE-----
`,
		ServerNames: []string{"one"},
		LastUpdated: time.Now().UTC().Truncate(0), // Truncate to remove the monotonic clock.
	}

	testClusterB := provisioning.Cluster{
		Name:          "two",
		ConnectionURL: "https://cluster-two/",
		Certificate: `-----BEGIN CERTIFICATE-----
cluster B
-----END CERTIFICATE-----
`,
		ServerNames: []string{"two"},
		LastUpdated: time.Now().UTC().Truncate(0), // Truncate to remove the monotonic clock.
	}

	testClusters := []provisioning.Cluster{testClusterA, testClusterB}

	testServerA := provisioning.Server{
		Name:          "one",
		Cluster:       ptr.To("one"),
		ConnectionURL: "https://server-one/",
		Certificate: `-----BEGIN CERTIFICATE-----
server-one
-----END CERTIFICATE-----
`,
		Type:        api.ServerTypeIncus,
		Status:      api.ServerStatusReady,
		LastUpdated: time.Now().UTC().Truncate(0), // Truncate to remove the monotonic clock.
	}

	testServerB := provisioning.Server{
		Name:          "two",
		Cluster:       ptr.To("two"),
		ConnectionURL: "https://server-two/",
		Certificate: `-----BEGIN CERTIFICATE-----
server-two
-----END CERTIFICATE-----
`,
		Type:        api.ServerTypeIncus,
		Status:      api.ServerStatusReady,
		LastUpdated: time.Now().UTC().Truncate(0), // Truncate to remove the monotonic clock.
	}

	testServers := []provisioning.Server{testServerA, testServerB}

	networkIntegrationA := inventory.NetworkIntegration{
		Cluster:     "one",
		Name:        "one",
		Object:      incusapi.NetworkIntegration{},
		LastUpdated: time.Now(),
	}

	networkIntegrationA.DeriveUUID()

	networkIntegrationB := inventory.NetworkIntegration{
		Cluster:     "two",
		Name:        "two",
		Object:      incusapi.NetworkIntegration{},
		LastUpdated: time.Now(),
	}

	networkIntegrationB.DeriveUUID()

	ctx := context.Background()

	// Create a new temporary database.
	tmpDir := t.TempDir()
	db, err := dbdriver.Open(tmpDir)
	require.NoError(t, err)

	t.Cleanup(func() {
		err = db.Close()
		require.NoError(t, err)
	})

	_, err = dbschema.Ensure(ctx, db, tmpDir)
	require.NoError(t, err)

	tx := transaction.Enable(db)
	entities.PreparedStmts, err = entities.PrepareStmts(tx, false)
	require.NoError(t, err)

	networkIntegration := inventorySqlite.NewNetworkIntegration(tx)

	// Cannot add an networkIntegration with an invalid server.
	_, err = networkIntegration.Create(ctx, networkIntegrationA)
	require.ErrorIs(t, err, domain.ErrConstraintViolation)

	// Seed provisioning
	err = seed.Provisioning(ctx, db, testClusters, testServers)
	require.NoError(t, err)

	// Add network_integrations
	networkIntegrationA, err = networkIntegration.Create(ctx, networkIntegrationA)
	require.NoError(t, err)
	require.Equal(t, "one", networkIntegrationA.Cluster)

	networkIntegrationB, err = networkIntegration.Create(ctx, networkIntegrationB)
	require.NoError(t, err)
	require.Equal(t, "two", networkIntegrationB.Cluster)

	// Ensure we have two entries without filter
	networkIntegrationUUIDs, err := networkIntegration.GetAllUUIDsWithFilter(ctx, inventory.NetworkIntegrationFilter{})
	require.NoError(t, err)
	require.Len(t, networkIntegrationUUIDs, 2)
	require.ElementsMatch(t, []uuid.UUID{networkIntegrationA.UUID, networkIntegrationB.UUID}, networkIntegrationUUIDs)

	// Ensure we have two entries without filter
	dbNetworkIntegration, err := networkIntegration.GetAllWithFilter(ctx, inventory.NetworkIntegrationFilter{})
	require.NoError(t, err)
	require.Len(t, dbNetworkIntegration, 2)
	require.Equal(t, networkIntegrationA.Name, dbNetworkIntegration[0].Name)
	require.Equal(t, networkIntegrationB.Name, dbNetworkIntegration[1].Name)

	// Ensure we have one entry with filter for cluster, server and project
	networkIntegrationUUIDs, err = networkIntegration.GetAllUUIDsWithFilter(ctx, inventory.NetworkIntegrationFilter{
		Cluster: ptr.To("one"),
	})
	require.NoError(t, err)
	require.Len(t, networkIntegrationUUIDs, 1)
	require.ElementsMatch(t, []uuid.UUID{networkIntegrationA.UUID}, networkIntegrationUUIDs)

	// Ensure we have one entry with filter for cluster, server and project
	dbNetworkIntegration, err = networkIntegration.GetAllWithFilter(ctx, inventory.NetworkIntegrationFilter{
		Cluster: ptr.To("one"),
	})
	require.NoError(t, err)
	require.Len(t, dbNetworkIntegration, 1)
	require.Equal(t, "one", dbNetworkIntegration[0].Name)

	// Should get back networkIntegrationA unchanged.
	networkIntegrationA.Cluster = "one"
	dbNetworkIntegrationA, err := networkIntegration.GetByUUID(ctx, networkIntegrationA.UUID)
	require.NoError(t, err)
	require.Equal(t, networkIntegrationA, dbNetworkIntegrationA)

	networkIntegrationB.LastUpdated = time.Now().UTC().Truncate(0)
	dbNetworkIntegrationB, err := networkIntegration.UpdateByUUID(ctx, networkIntegrationB)
	require.NoError(t, err)
	require.Equal(t, networkIntegrationB, dbNetworkIntegrationB)

	// Delete network_integrations by ID.
	err = networkIntegration.DeleteByUUID(ctx, networkIntegrationA.UUID)
	require.NoError(t, err)

	// Delete network_integrations by cluster Name.
	err = networkIntegration.DeleteByClusterName(ctx, "two")
	require.NoError(t, err)

	_, err = networkIntegration.GetByUUID(ctx, networkIntegrationA.UUID)
	require.ErrorIs(t, err, domain.ErrNotFound)

	// Should have no network_integrations remaining.
	networkIntegrationUUIDs, err = networkIntegration.GetAllUUIDsWithFilter(ctx, inventory.NetworkIntegrationFilter{})
	require.NoError(t, err)
	require.Zero(t, networkIntegrationUUIDs)
}
