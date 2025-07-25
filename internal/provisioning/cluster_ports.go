package provisioning

import (
	"context"

	"github.com/FuturFusion/operations-center/shared/api"
)

type ClusterService interface {
	Create(ctx context.Context, cluster Cluster) (Cluster, error)
	GetAll(ctx context.Context) (Clusters, error)
	GetAllWithFilter(ctx context.Context, filter ClusterFilter) (Clusters, error)
	GetAllNames(ctx context.Context) ([]string, error)
	GetAllNamesWithFilter(ctx context.Context, filter ClusterFilter) ([]string, error)
	GetByName(ctx context.Context, name string) (*Cluster, error)
	Update(ctx context.Context, cluster Cluster) error
	Rename(ctx context.Context, oldName string, newName string) error
	DeleteByName(ctx context.Context, name string) error
	ResyncInventory(ctx context.Context) error
	ResyncInventoryByName(ctx context.Context, name string) error
}

type ClusterRepo interface {
	Create(ctx context.Context, cluster Cluster) (int64, error)
	GetAll(ctx context.Context) (Clusters, error)
	GetAllNames(ctx context.Context) ([]string, error)
	GetByName(ctx context.Context, name string) (*Cluster, error)
	ExistsByName(ctx context.Context, name string) (bool, error)
	Update(ctx context.Context, cluster Cluster) error
	Rename(ctx context.Context, oldName string, newName string) error
	DeleteByName(ctx context.Context, name string) error
}

type InventorySyncer interface {
	SyncCluster(ctx context.Context, cluster string) error
}

type ClusterClientPort interface {
	Ping(ctx context.Context, server Server) error
	EnableOSServiceLVM(ctx context.Context, server Server) error
	SetServerConfig(ctx context.Context, server Server, config map[string]string) error
	EnableCluster(ctx context.Context, server Server) (clusterCertificate string, _ error)
	GetClusterNodeNames(ctx context.Context, server Server) (nodeNames []string, _ error)
	GetClusterJoinToken(ctx context.Context, server Server, memberName string) (joinToken string, _ error)
	JoinCluster(ctx context.Context, server Server, joinToken string, cluster Server) error
	CreateProject(ctx context.Context, server Server, name string) error
	InitializeDefaultStorage(ctx context.Context, servers []Server) error
	GetOSData(ctx context.Context, server Server) (api.OSData, error)
	InitializeDefaultNetworking(ctx context.Context, servers []Server) error
}
