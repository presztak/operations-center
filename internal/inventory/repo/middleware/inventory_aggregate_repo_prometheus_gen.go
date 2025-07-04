// Code generated by mockery. DO NOT EDIT.
// template: github.com/FuturFusion/operations-center/internal/metrics/prometheus.gotmpl

package middleware

import (
	"context"
	"time"

	"github.com/FuturFusion/operations-center/internal/inventory"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// InventoryAggregateRepoWithPrometheus implements inventory.InventoryAggregateRepo interface with all methods wrapped
// with Prometheus metrics.
type InventoryAggregateRepoWithPrometheus struct {
	base         inventory.InventoryAggregateRepo
	instanceName string
}

var inventoryAggregateRepoDurationSummaryVec = promauto.NewSummaryVec(
	prometheus.SummaryOpts{
		Name:       "inventory_aggregate_repo_duration_seconds",
		Help:       "inventoryAggregateRepo runtime duration and result",
		MaxAge:     time.Minute,
		Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
	},
	[]string{"instance_name", "method", "result"},
)

// NewInventoryAggregateRepoWithPrometheus returns an instance of the inventory.InventoryAggregateRepo decorated with prometheus summary metric.
func NewInventoryAggregateRepoWithPrometheus(base inventory.InventoryAggregateRepo, instanceName string) InventoryAggregateRepoWithPrometheus {
	return InventoryAggregateRepoWithPrometheus{
		base:         base,
		instanceName: instanceName,
	}
}

// GetAllWithFilter implements inventory.InventoryAggregateRepo.
func (_d InventoryAggregateRepoWithPrometheus) GetAllWithFilter(ctx context.Context, filter inventory.InventoryAggregateFilter) (inventoryAggregates inventory.InventoryAggregates, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		inventoryAggregateRepoDurationSummaryVec.WithLabelValues(_d.instanceName, "GetAllWithFilter", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetAllWithFilter(ctx, filter)
}
