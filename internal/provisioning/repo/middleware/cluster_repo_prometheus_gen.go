// Code generated by mockery. DO NOT EDIT.
// template: github.com/FuturFusion/operations-center/internal/metrics/prometheus.gotmpl

package middleware

import (
	"context"
	"time"

	"github.com/FuturFusion/operations-center/internal/provisioning"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// ClusterRepoWithPrometheus implements provisioning.ClusterRepo interface with all methods wrapped
// with Prometheus metrics.
type ClusterRepoWithPrometheus struct {
	base         provisioning.ClusterRepo
	instanceName string
}

var clusterRepoDurationSummaryVec = promauto.NewSummaryVec(
	prometheus.SummaryOpts{
		Name:       "cluster_repo_duration_seconds",
		Help:       "clusterRepo runtime duration and result",
		MaxAge:     time.Minute,
		Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
	},
	[]string{"instance_name", "method", "result"},
)

// NewClusterRepoWithPrometheus returns an instance of the provisioning.ClusterRepo decorated with prometheus summary metric.
func NewClusterRepoWithPrometheus(base provisioning.ClusterRepo, instanceName string) ClusterRepoWithPrometheus {
	return ClusterRepoWithPrometheus{
		base:         base,
		instanceName: instanceName,
	}
}

// Create implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) Create(ctx context.Context, cluster provisioning.Cluster) (n int64, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "Create", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.Create(ctx, cluster)
}

// DeleteByName implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) DeleteByName(ctx context.Context, name string) (err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "DeleteByName", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.DeleteByName(ctx, name)
}

// ExistsByName implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) ExistsByName(ctx context.Context, name string) (b bool, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "ExistsByName", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.ExistsByName(ctx, name)
}

// GetAll implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) GetAll(ctx context.Context) (clusters provisioning.Clusters, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "GetAll", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetAll(ctx)
}

// GetAllNames implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) GetAllNames(ctx context.Context) (strings []string, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "GetAllNames", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetAllNames(ctx)
}

// GetByName implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) GetByName(ctx context.Context, name string) (cluster *provisioning.Cluster, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "GetByName", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetByName(ctx, name)
}

// Rename implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) Rename(ctx context.Context, oldName string, newName string) (err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "Rename", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.Rename(ctx, oldName, newName)
}

// Update implements provisioning.ClusterRepo.
func (_d ClusterRepoWithPrometheus) Update(ctx context.Context, cluster provisioning.Cluster) (err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		clusterRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "Update", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.Update(ctx, cluster)
}
