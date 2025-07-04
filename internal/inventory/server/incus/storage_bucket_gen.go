// Code generated by generate-inventory; DO NOT EDIT.

package incus

import (
	"context"
	"net/http"

	incusapi "github.com/lxc/incus/v6/shared/api"

	"github.com/FuturFusion/operations-center/internal/domain"
)

func (s serverClient) GetStorageBuckets(ctx context.Context, connectionURL string, storageBucketName string) ([]incusapi.StorageBucket, error) {
	client, err := s.getClient(ctx, connectionURL)
	if err != nil {
		return nil, err
	}

	serverStorageBuckets, err := client.GetStoragePoolBucketsAllProjects(storageBucketName)
	if err != nil {
		return nil, err
	}

	return serverStorageBuckets, nil
}

func (s serverClient) GetStorageBucketByName(ctx context.Context, connectionURL string, storagePoolName string, storageBucketName string) (incusapi.StorageBucket, error) {
	client, err := s.getClient(ctx, connectionURL)
	if err != nil {
		return incusapi.StorageBucket{}, err
	}

	serverStorageBucket, _, err := client.GetStoragePoolBucket(storagePoolName, storageBucketName)
	if incusapi.StatusErrorCheck(err, http.StatusNotFound) {
		return incusapi.StorageBucket{}, domain.ErrNotFound
	}

	if err != nil {
		return incusapi.StorageBucket{}, err
	}

	return *serverStorageBucket, nil
}
