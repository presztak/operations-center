// Code generated by mockery. DO NOT EDIT.
// template: github.com/FuturFusion/operations-center/internal/logger/slog.gotmpl

package middleware

import (
	"context"
	"log/slog"

	"github.com/FuturFusion/operations-center/internal/inventory"
	"github.com/FuturFusion/operations-center/internal/logger"
	"github.com/FuturFusion/operations-center/internal/provisioning"
)

// ProvisioningClusterServiceWithSlog implements inventory.ProvisioningClusterService that is instrumented with slog logger.
type ProvisioningClusterServiceWithSlog struct {
	_log                  *slog.Logger
	_base                 inventory.ProvisioningClusterService
	_isInformativeErrFunc func(error) bool
}

type ProvisioningClusterServiceWithSlogOption func(s *ProvisioningClusterServiceWithSlog)

func ProvisioningClusterServiceWithSlogWithInformativeErrFunc(isInformativeErrFunc func(error) bool) ProvisioningClusterServiceWithSlogOption {
	return func(_base *ProvisioningClusterServiceWithSlog) {
		_base._isInformativeErrFunc = isInformativeErrFunc
	}
}

// NewProvisioningClusterServiceWithSlog instruments an implementation of the inventory.ProvisioningClusterService with simple logging.
func NewProvisioningClusterServiceWithSlog(base inventory.ProvisioningClusterService, log *slog.Logger, opts ...ProvisioningClusterServiceWithSlogOption) ProvisioningClusterServiceWithSlog {
	this := ProvisioningClusterServiceWithSlog{
		_base:                 base,
		_log:                  log,
		_isInformativeErrFunc: func(error) bool { return false },
	}

	for _, opt := range opts {
		opt(&this)
	}

	return this
}

// GetAll implements inventory.ProvisioningClusterService.
func (_d ProvisioningClusterServiceWithSlog) GetAll(ctx context.Context) (clusters provisioning.Clusters, err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
		)
	}
	log.Debug("=> calling GetAll")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("clusters", clusters),
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method GetAll returned an informative error")
			} else {
				log.Error("<= method GetAll returned an error")
			}
		} else {
			log.Debug("<= method GetAll finished")
		}
	}()
	return _d._base.GetAll(ctx)
}

// GetByName implements inventory.ProvisioningClusterService.
func (_d ProvisioningClusterServiceWithSlog) GetByName(ctx context.Context, name string) (cluster *provisioning.Cluster, err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
			slog.String("name", name),
		)
	}
	log.Debug("=> calling GetByName")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("cluster", cluster),
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method GetByName returned an informative error")
			} else {
				log.Error("<= method GetByName returned an error")
			}
		} else {
			log.Debug("<= method GetByName finished")
		}
	}()
	return _d._base.GetByName(ctx, name)
}
