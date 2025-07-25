// Code generated by generate-inventory; DO NOT EDIT.

package inventory_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	incusapi "github.com/lxc/incus/v6/shared/api"
	"github.com/stretchr/testify/require"

	"github.com/FuturFusion/operations-center/internal/domain"
	"github.com/FuturFusion/operations-center/internal/inventory"
	serviceMock "github.com/FuturFusion/operations-center/internal/inventory/mock"
	repoMock "github.com/FuturFusion/operations-center/internal/inventory/repo/mock"
	serverMock "github.com/FuturFusion/operations-center/internal/inventory/server/mock"
	"github.com/FuturFusion/operations-center/internal/provisioning"
	"github.com/FuturFusion/operations-center/internal/ptr"
	"github.com/FuturFusion/operations-center/internal/testing/boom"
)

func TestNetworkService_GetAllWithFilter(t *testing.T) {
	tests := []struct {
		name                    string
		filterExpression        *string
		repoGetAllWithFilter    inventory.Networks
		repoGetAllWithFilterErr error

		assertErr require.ErrorAssertionFunc
		count     int
	}{
		{
			name: "success - no filter expression",
			repoGetAllWithFilter: inventory.Networks{
				inventory.Network{
					Name: "one",
				},
				inventory.Network{
					Name: "two",
				},
			},

			assertErr: require.NoError,
			count:     2,
		},
		{
			name:             "success - with filter expression",
			filterExpression: ptr.To(`Name == "one"`),
			repoGetAllWithFilter: inventory.Networks{
				inventory.Network{
					Name: "one",
				},
				inventory.Network{
					Name: "two",
				},
			},

			assertErr: require.NoError,
			count:     1,
		},
		{
			name:             "error - invalid filter expression",
			filterExpression: ptr.To(``), // the empty expression is an invalid expression.
			repoGetAllWithFilter: inventory.Networks{
				inventory.Network{
					Name: "one",
				},
			},

			assertErr: require.Error,
			count:     0,
		},
		{
			name:             "error - filter expression run",
			filterExpression: ptr.To(`fromBase64("~invalid")`), // invalid, returns runtime error during evauluation of the expression.
			repoGetAllWithFilter: inventory.Networks{
				inventory.Network{
					Name: "one",
				},
			},

			assertErr: require.Error,
			count:     0,
		},
		{
			name:             "error - non bool expression",
			filterExpression: ptr.To(`"string"`), // invalid, does evaluate to string instead of boolean.
			repoGetAllWithFilter: inventory.Networks{
				inventory.Network{
					Name: "one",
				},
			},

			assertErr: func(tt require.TestingT, err error, i ...any) {
				require.ErrorContains(tt, err, "does not evaluate to boolean result")
			},
			count: 0,
		},
		{
			name:                    "error - repo",
			repoGetAllWithFilterErr: boom.Error,

			assertErr: boom.ErrorIs,
			count:     0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			repo := &repoMock.NetworkRepoMock{
				GetAllWithFilterFunc: func(ctx context.Context, filter inventory.NetworkFilter) (inventory.Networks, error) {
					return tc.repoGetAllWithFilter, tc.repoGetAllWithFilterErr
				},
			}

			networkSvc := inventory.NewNetworkService(repo, nil, nil, inventory.NetworkWithNow(func() time.Time {
				return time.Date(2025, 2, 26, 8, 54, 35, 123, time.UTC)
			}))

			// Run test
			network, err := networkSvc.GetAllWithFilter(context.Background(), inventory.NetworkFilter{
				Expression: tc.filterExpression,
			})

			// Assert
			tc.assertErr(t, err)
			require.Len(t, network, tc.count)
		})
	}
}

func TestNetworkService_GetAllUUIDsWithFilter(t *testing.T) {
	tests := []struct {
		name                         string
		filterExpression             *string
		repoGetAllUUIDsWithFilter    []uuid.UUID
		repoGetAllUUIDsWithFilterErr error

		assertErr require.ErrorAssertionFunc
		count     int
	}{
		{
			name: "success - no filter expression",
			repoGetAllUUIDsWithFilter: []uuid.UUID{
				uuid.MustParse(`6c652183-8d93-4c7d-9510-cd2ae54f31fd`),
				uuid.MustParse(`56d0823e-5c6d-45ff-ac6d-a9ae61026a4e`),
			},

			assertErr: require.NoError,
			count:     2,
		},
		{
			name:             "success - with filter expression",
			filterExpression: ptr.To(`UUID == "6c652183-8d93-4c7d-9510-cd2ae54f31fd"`),
			repoGetAllUUIDsWithFilter: []uuid.UUID{
				uuid.MustParse(`6c652183-8d93-4c7d-9510-cd2ae54f31fd`),
				uuid.MustParse(`56d0823e-5c6d-45ff-ac6d-a9ae61026a4e`),
			},

			assertErr: require.NoError,
			count:     1,
		},
		{
			name:             "error - invalid filter expression",
			filterExpression: ptr.To(``), // the empty expression is an invalid expression.
			repoGetAllUUIDsWithFilter: []uuid.UUID{
				uuid.MustParse(`6c652183-8d93-4c7d-9510-cd2ae54f31fd`),
			},

			assertErr: require.Error,
			count:     0,
		},
		{
			name:             "error - filter expression run",
			filterExpression: ptr.To(`fromBase64("~invalid")`), // invalid, returns runtime error during evauluation of the expression.
			repoGetAllUUIDsWithFilter: []uuid.UUID{
				uuid.MustParse(`6c652183-8d93-4c7d-9510-cd2ae54f31fd`),
			},

			assertErr: require.Error,
			count:     0,
		},
		{
			name:             "error - non bool expression",
			filterExpression: ptr.To(`"string"`), // invalid, does evaluate to string instead of boolean.
			repoGetAllUUIDsWithFilter: []uuid.UUID{
				uuid.MustParse(`6c652183-8d93-4c7d-9510-cd2ae54f31fd`),
			},

			assertErr: func(tt require.TestingT, err error, i ...any) {
				require.ErrorContains(tt, err, "does not evaluate to boolean result")
			},
			count: 0,
		},
		{
			name:                         "error - repo",
			repoGetAllUUIDsWithFilterErr: boom.Error,

			assertErr: boom.ErrorIs,
			count:     0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			repo := &repoMock.NetworkRepoMock{
				GetAllUUIDsWithFilterFunc: func(ctx context.Context, filter inventory.NetworkFilter) ([]uuid.UUID, error) {
					return tc.repoGetAllUUIDsWithFilter, tc.repoGetAllUUIDsWithFilterErr
				},
			}

			networkSvc := inventory.NewNetworkService(repo, nil, nil, inventory.NetworkWithNow(func() time.Time {
				return time.Date(2025, 2, 26, 8, 54, 35, 123, time.UTC)
			}))

			// Run test
			networkUUIDs, err := networkSvc.GetAllUUIDsWithFilter(context.Background(), inventory.NetworkFilter{
				Expression: tc.filterExpression,
			})

			// Assert
			tc.assertErr(t, err)
			require.Len(t, networkUUIDs, tc.count)
		})
	}
}

func TestNetworkService_GetByUUID(t *testing.T) {
	tests := []struct {
		name                 string
		idArg                uuid.UUID
		repoGetByUUIDNetwork inventory.Network
		repoGetByUUIDErr     error

		assertErr require.ErrorAssertionFunc
	}{
		{
			name:  "success",
			idArg: uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
			repoGetByUUIDNetwork: inventory.Network{
				UUID:        uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster:     "one",
				ProjectName: "one",
				Name:        "one",
				Object:      incusapi.Network{},
				LastUpdated: time.Now(),
			},

			assertErr: require.NoError,
		},
		{
			name:             "error - repo",
			idArg:            uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
			repoGetByUUIDErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			repo := &repoMock.NetworkRepoMock{
				GetByUUIDFunc: func(ctx context.Context, id uuid.UUID) (inventory.Network, error) {
					return tc.repoGetByUUIDNetwork, tc.repoGetByUUIDErr
				},
			}

			networkSvc := inventory.NewNetworkService(repo, nil, nil, inventory.NetworkWithNow(func() time.Time {
				return time.Date(2025, 2, 26, 8, 54, 35, 123, time.UTC)
			}))

			// Run test
			network, err := networkSvc.GetByUUID(context.Background(), tc.idArg)

			// Assert
			tc.assertErr(t, err)
			require.Equal(t, tc.repoGetByUUIDNetwork, network)
		})
	}
}

func TestNetworkService_ResyncByUUID(t *testing.T) {
	tests := []struct {
		name                             string
		clusterSvcGetByIDCluster         provisioning.Cluster
		clusterSvcGetByIDErr             error
		networkClientGetNetworkByName    incusapi.Network
		networkClientGetNetworkByNameErr error
		repoGetByUUIDNetwork             inventory.Network
		repoGetByUUIDErr                 error
		repoUpdateByUUIDErr              error
		repoDeleteByUUIDErr              error

		assertErr require.ErrorAssertionFunc
	}{
		{
			name: "success",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "one",
			},
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworkByName: incusapi.Network{
				Name:    "network one",
				Project: "project one",
			},

			assertErr: require.NoError,
		},
		{
			name: "success - network get by name - not found",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "one",
			},
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworkByNameErr: domain.ErrNotFound,

			assertErr: require.NoError,
		},
		{
			name:             "error - network get by UUID",
			repoGetByUUIDErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - cluster get by ID",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "one",
			},
			clusterSvcGetByIDErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - network get by name",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "one",
			},
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworkByNameErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - network get by name - not found - delete by uuid",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "one",
			},
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworkByNameErr: domain.ErrNotFound,
			repoDeleteByUUIDErr:              boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - validate",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "", // invalid
			},
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworkByName: incusapi.Network{
				Name:    "network one",
				Project: "project one",
			},

			assertErr: func(tt require.TestingT, err error, a ...any) {
				var verr domain.ErrValidation
				require.ErrorAs(tt, err, &verr, a...)
			},
		},
		{
			name: "error - update by UUID",
			repoGetByUUIDNetwork: inventory.Network{
				UUID:    uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`),
				Cluster: "one",
				Name:    "one",
			},
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworkByName: incusapi.Network{
				Name:    "network one",
				Project: "project one",
			},
			repoUpdateByUUIDErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			repo := &repoMock.NetworkRepoMock{
				GetByUUIDFunc: func(ctx context.Context, id uuid.UUID) (inventory.Network, error) {
					return tc.repoGetByUUIDNetwork, tc.repoGetByUUIDErr
				},
				UpdateByUUIDFunc: func(ctx context.Context, network inventory.Network) (inventory.Network, error) {
					require.Equal(t, time.Date(2025, 2, 26, 8, 54, 35, 123, time.UTC), network.LastUpdated)
					return inventory.Network{}, tc.repoUpdateByUUIDErr
				},
				DeleteByUUIDFunc: func(ctx context.Context, id uuid.UUID) error {
					return tc.repoDeleteByUUIDErr
				},
			}

			clusterSvc := &serviceMock.ProvisioningClusterServiceMock{
				GetByNameFunc: func(ctx context.Context, name string) (*provisioning.Cluster, error) {
					require.Equal(t, "one", name)
					return &tc.clusterSvcGetByIDCluster, tc.clusterSvcGetByIDErr
				},
			}

			networkClient := &serverMock.NetworkServerClientMock{
				GetNetworkByNameFunc: func(ctx context.Context, cluster provisioning.Cluster, networkName string) (incusapi.Network, error) {
					require.Equal(t, tc.repoGetByUUIDNetwork.Name, networkName)
					return tc.networkClientGetNetworkByName, tc.networkClientGetNetworkByNameErr
				},
			}

			networkSvc := inventory.NewNetworkService(repo, clusterSvc, networkClient, inventory.NetworkWithNow(func() time.Time {
				return time.Date(2025, 2, 26, 8, 54, 35, 123, time.UTC)
			}))

			// Run test
			err := networkSvc.ResyncByUUID(context.Background(), uuid.MustParse(`8df91697-be30-464a-bd26-55d1bbe4b07f`))

			// Assert
			tc.assertErr(t, err)
		})
	}
}

func TestNetworkService_SyncAll(t *testing.T) {
	// Includes also SyncCluster
	tests := []struct {
		name                        string
		clusterSvcGetByIDCluster    provisioning.Cluster
		clusterSvcGetByIDErr        error
		networkClientGetNetworks    []incusapi.Network
		networkClientGetNetworksErr error
		repoDeleteByClusterNameErr  error
		repoCreateErr               error
		serviceOptions              []inventory.NetworkServiceOption

		assertErr require.ErrorAssertionFunc
	}{
		{
			name: "success",
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworks: []incusapi.Network{
				{
					Name:    "network one",
					Project: "project one",
				},
			},

			assertErr: require.NoError,
		},
		{
			name: "success - with sync filter",
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworks: []incusapi.Network{
				{
					Name:    "network one",
					Project: "project one",
				},
				{
					Name:    "network filtered",
					Project: "project one",
				},
			},
			serviceOptions: []inventory.NetworkServiceOption{
				inventory.NetworkWithSyncFilter(func(network inventory.Network) bool {
					return network.Name == "network filtered"
				}),
			},

			assertErr: require.NoError,
		},
		{
			name:                 "error - cluster service get by ID",
			clusterSvcGetByIDErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - network client get Networks",
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworksErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - networks delete by cluster ID",
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworks: []incusapi.Network{
				{
					Name:    "network one",
					Project: "project one",
				},
			},
			repoDeleteByClusterNameErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
		{
			name: "error - validate",
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworks: []incusapi.Network{
				{
					Name:    "", // invalid
					Project: "project one",
				},
			},

			assertErr: func(tt require.TestingT, err error, a ...any) {
				var verr domain.ErrValidation
				require.ErrorAs(tt, err, &verr, a...)
			},
		},
		{
			name: "error - network create",
			clusterSvcGetByIDCluster: provisioning.Cluster{
				Name: "cluster-one",
			},
			networkClientGetNetworks: []incusapi.Network{
				{
					Name:    "network one",
					Project: "project one",
				},
			},
			repoCreateErr: boom.Error,

			assertErr: boom.ErrorIs,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			repo := &repoMock.NetworkRepoMock{
				DeleteByClusterNameFunc: func(ctx context.Context, clusterName string) error {
					return tc.repoDeleteByClusterNameErr
				},
				CreateFunc: func(ctx context.Context, network inventory.Network) (inventory.Network, error) {
					return inventory.Network{}, tc.repoCreateErr
				},
			}

			clusterSvc := &serviceMock.ProvisioningClusterServiceMock{
				GetByNameFunc: func(ctx context.Context, name string) (*provisioning.Cluster, error) {
					return &tc.clusterSvcGetByIDCluster, tc.clusterSvcGetByIDErr
				},
			}

			networkClient := &serverMock.NetworkServerClientMock{
				GetNetworksFunc: func(ctx context.Context, cluster provisioning.Cluster) ([]incusapi.Network, error) {
					return tc.networkClientGetNetworks, tc.networkClientGetNetworksErr
				},
			}

			networkSvc := inventory.NewNetworkService(repo, clusterSvc, networkClient,
				append(
					tc.serviceOptions,
					inventory.NetworkWithNow(func() time.Time {
						return time.Date(2025, 2, 26, 8, 54, 35, 123, time.UTC)
					}),
				)...,
			)

			// Run test
			err := networkSvc.SyncCluster(context.Background(), "one")

			// Assert
			tc.assertErr(t, err)
		})
	}
}
