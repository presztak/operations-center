// Code generated by generate-inventory; DO NOT EDIT.

package inventory

import (
	"time"
)

func StorageVolumeWithNow(now func() time.Time) StorageVolumeServiceOption {
	return func(s *storageVolumeService) {
		s.now = now
	}
}
