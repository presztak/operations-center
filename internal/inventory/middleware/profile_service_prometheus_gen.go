// Code generated by mockery. DO NOT EDIT.
// template: github.com/FuturFusion/operations-center/internal/metrics/prometheus.gotmpl

package middleware

import (
	"context"
	"time"

	"github.com/FuturFusion/operations-center/internal/inventory"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// ProfileServiceWithPrometheus implements inventory.ProfileService interface with all methods wrapped
// with Prometheus metrics.
type ProfileServiceWithPrometheus struct {
	base         inventory.ProfileService
	instanceName string
}

var profileServiceDurationSummaryVec = promauto.NewSummaryVec(
	prometheus.SummaryOpts{
		Name:       "profile_service_duration_seconds",
		Help:       "profileService runtime duration and result",
		MaxAge:     time.Minute,
		Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
	},
	[]string{"instance_name", "method", "result"},
)

// NewProfileServiceWithPrometheus returns an instance of the inventory.ProfileService decorated with prometheus summary metric.
func NewProfileServiceWithPrometheus(base inventory.ProfileService, instanceName string) ProfileServiceWithPrometheus {
	return ProfileServiceWithPrometheus{
		base:         base,
		instanceName: instanceName,
	}
}

// GetAllUUIDsWithFilter implements inventory.ProfileService.
func (_d ProfileServiceWithPrometheus) GetAllUUIDsWithFilter(ctx context.Context, filter inventory.ProfileFilter) (uUIDs []uuid.UUID, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		profileServiceDurationSummaryVec.WithLabelValues(_d.instanceName, "GetAllUUIDsWithFilter", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetAllUUIDsWithFilter(ctx, filter)
}

// GetAllWithFilter implements inventory.ProfileService.
func (_d ProfileServiceWithPrometheus) GetAllWithFilter(ctx context.Context, filter inventory.ProfileFilter) (profiles inventory.Profiles, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		profileServiceDurationSummaryVec.WithLabelValues(_d.instanceName, "GetAllWithFilter", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetAllWithFilter(ctx, filter)
}

// GetByUUID implements inventory.ProfileService.
func (_d ProfileServiceWithPrometheus) GetByUUID(ctx context.Context, id uuid.UUID) (profile inventory.Profile, err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		profileServiceDurationSummaryVec.WithLabelValues(_d.instanceName, "GetByUUID", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.GetByUUID(ctx, id)
}

// ResyncByUUID implements inventory.ProfileService.
func (_d ProfileServiceWithPrometheus) ResyncByUUID(ctx context.Context, id uuid.UUID) (err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		profileServiceDurationSummaryVec.WithLabelValues(_d.instanceName, "ResyncByUUID", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.ResyncByUUID(ctx, id)
}

// SyncCluster implements inventory.ProfileService.
func (_d ProfileServiceWithPrometheus) SyncCluster(ctx context.Context, cluster string) (err error) {
	_since := time.Now()
	defer func() {
		result := "ok"
		if err != nil {
			result = "error"
		}

		profileServiceDurationSummaryVec.WithLabelValues(_d.instanceName, "SyncCluster", result).Observe(time.Since(_since).Seconds())
	}()
	return _d.base.SyncCluster(ctx, cluster)
}
