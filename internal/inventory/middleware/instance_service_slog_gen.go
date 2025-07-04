// Code generated by mockery. DO NOT EDIT.
// template: github.com/FuturFusion/operations-center/internal/logger/slog.gotmpl

package middleware

import (
	"context"
	"log/slog"

	"github.com/FuturFusion/operations-center/internal/inventory"
	"github.com/FuturFusion/operations-center/internal/logger"
	"github.com/google/uuid"
)

// InstanceServiceWithSlog implements inventory.InstanceService that is instrumented with slog logger.
type InstanceServiceWithSlog struct {
	_log                  *slog.Logger
	_base                 inventory.InstanceService
	_isInformativeErrFunc func(error) bool
}

type InstanceServiceWithSlogOption func(s *InstanceServiceWithSlog)

func InstanceServiceWithSlogWithInformativeErrFunc(isInformativeErrFunc func(error) bool) InstanceServiceWithSlogOption {
	return func(_base *InstanceServiceWithSlog) {
		_base._isInformativeErrFunc = isInformativeErrFunc
	}
}

// NewInstanceServiceWithSlog instruments an implementation of the inventory.InstanceService with simple logging.
func NewInstanceServiceWithSlog(base inventory.InstanceService, log *slog.Logger, opts ...InstanceServiceWithSlogOption) InstanceServiceWithSlog {
	this := InstanceServiceWithSlog{
		_base:                 base,
		_log:                  log,
		_isInformativeErrFunc: func(error) bool { return false },
	}

	for _, opt := range opts {
		opt(&this)
	}

	return this
}

// GetAllUUIDsWithFilter implements inventory.InstanceService.
func (_d InstanceServiceWithSlog) GetAllUUIDsWithFilter(ctx context.Context, filter inventory.InstanceFilter) (uUIDs []uuid.UUID, err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
			slog.Any("filter", filter),
		)
	}
	log.Debug("=> calling GetAllUUIDsWithFilter")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("uUIDs", uUIDs),
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method GetAllUUIDsWithFilter returned an informative error")
			} else {
				log.Error("<= method GetAllUUIDsWithFilter returned an error")
			}
		} else {
			log.Debug("<= method GetAllUUIDsWithFilter finished")
		}
	}()
	return _d._base.GetAllUUIDsWithFilter(ctx, filter)
}

// GetAllWithFilter implements inventory.InstanceService.
func (_d InstanceServiceWithSlog) GetAllWithFilter(ctx context.Context, filter inventory.InstanceFilter) (instances inventory.Instances, err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
			slog.Any("filter", filter),
		)
	}
	log.Debug("=> calling GetAllWithFilter")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("instances", instances),
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method GetAllWithFilter returned an informative error")
			} else {
				log.Error("<= method GetAllWithFilter returned an error")
			}
		} else {
			log.Debug("<= method GetAllWithFilter finished")
		}
	}()
	return _d._base.GetAllWithFilter(ctx, filter)
}

// GetByUUID implements inventory.InstanceService.
func (_d InstanceServiceWithSlog) GetByUUID(ctx context.Context, id uuid.UUID) (instance inventory.Instance, err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
			slog.Any("id", id),
		)
	}
	log.Debug("=> calling GetByUUID")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("instance", instance),
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method GetByUUID returned an informative error")
			} else {
				log.Error("<= method GetByUUID returned an error")
			}
		} else {
			log.Debug("<= method GetByUUID finished")
		}
	}()
	return _d._base.GetByUUID(ctx, id)
}

// ResyncByUUID implements inventory.InstanceService.
func (_d InstanceServiceWithSlog) ResyncByUUID(ctx context.Context, id uuid.UUID) (err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
			slog.Any("id", id),
		)
	}
	log.Debug("=> calling ResyncByUUID")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method ResyncByUUID returned an informative error")
			} else {
				log.Error("<= method ResyncByUUID returned an error")
			}
		} else {
			log.Debug("<= method ResyncByUUID finished")
		}
	}()
	return _d._base.ResyncByUUID(ctx, id)
}

// SyncCluster implements inventory.InstanceService.
func (_d InstanceServiceWithSlog) SyncCluster(ctx context.Context, cluster string) (err error) {
	log := _d._log.With()
	if _d._log.Enabled(ctx, logger.LevelTrace) {
		log = log.With(
			slog.Any("ctx", ctx),
			slog.String("cluster", cluster),
		)
	}
	log.Debug("=> calling SyncCluster")
	defer func() {
		log := _d._log.With()
		if _d._log.Enabled(ctx, logger.LevelTrace) {
			log = _d._log.With(
				slog.Any("err", err),
			)
		} else {
			if err != nil {
				log = _d._log.With("err", err)
			}
		}
		if err != nil {
			if _d._isInformativeErrFunc(err) {
				log.Debug("<= method SyncCluster returned an informative error")
			} else {
				log.Error("<= method SyncCluster returned an error")
			}
		} else {
			log.Debug("<= method SyncCluster finished")
		}
	}()
	return _d._base.SyncCluster(ctx, cluster)
}
