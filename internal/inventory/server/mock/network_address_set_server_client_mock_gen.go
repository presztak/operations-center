// Code generated by mockery; DO NOT EDIT.
// github.com/vektra/mockery
// template: matryer

package mock

import (
	"context"
	"sync"

	"github.com/FuturFusion/operations-center/internal/inventory"
	"github.com/FuturFusion/operations-center/internal/provisioning"
	"github.com/lxc/incus/v6/shared/api"
)

// Ensure that NetworkAddressSetServerClientMock does implement inventory.NetworkAddressSetServerClient.
// If this is not the case, regenerate this file with mockery.
var _ inventory.NetworkAddressSetServerClient = &NetworkAddressSetServerClientMock{}

// NetworkAddressSetServerClientMock is a mock implementation of inventory.NetworkAddressSetServerClient.
//
//	func TestSomethingThatUsesNetworkAddressSetServerClient(t *testing.T) {
//
//		// make and configure a mocked inventory.NetworkAddressSetServerClient
//		mockedNetworkAddressSetServerClient := &NetworkAddressSetServerClientMock{
//			GetNetworkAddressSetByNameFunc: func(ctx context.Context, cluster provisioning.Cluster, networkAddressSetName string) (api.NetworkAddressSet, error) {
//				panic("mock out the GetNetworkAddressSetByName method")
//			},
//			GetNetworkAddressSetsFunc: func(ctx context.Context, cluster provisioning.Cluster) ([]api.NetworkAddressSet, error) {
//				panic("mock out the GetNetworkAddressSets method")
//			},
//			HasExtensionFunc: func(ctx context.Context, cluster provisioning.Cluster, extension string) bool {
//				panic("mock out the HasExtension method")
//			},
//		}
//
//		// use mockedNetworkAddressSetServerClient in code that requires inventory.NetworkAddressSetServerClient
//		// and then make assertions.
//
//	}
type NetworkAddressSetServerClientMock struct {
	// GetNetworkAddressSetByNameFunc mocks the GetNetworkAddressSetByName method.
	GetNetworkAddressSetByNameFunc func(ctx context.Context, cluster provisioning.Cluster, networkAddressSetName string) (api.NetworkAddressSet, error)

	// GetNetworkAddressSetsFunc mocks the GetNetworkAddressSets method.
	GetNetworkAddressSetsFunc func(ctx context.Context, cluster provisioning.Cluster) ([]api.NetworkAddressSet, error)

	// HasExtensionFunc mocks the HasExtension method.
	HasExtensionFunc func(ctx context.Context, cluster provisioning.Cluster, extension string) bool

	// calls tracks calls to the methods.
	calls struct {
		// GetNetworkAddressSetByName holds details about calls to the GetNetworkAddressSetByName method.
		GetNetworkAddressSetByName []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
			// NetworkAddressSetName is the networkAddressSetName argument value.
			NetworkAddressSetName string
		}
		// GetNetworkAddressSets holds details about calls to the GetNetworkAddressSets method.
		GetNetworkAddressSets []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
		}
		// HasExtension holds details about calls to the HasExtension method.
		HasExtension []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
			// Extension is the extension argument value.
			Extension string
		}
	}
	lockGetNetworkAddressSetByName sync.RWMutex
	lockGetNetworkAddressSets      sync.RWMutex
	lockHasExtension               sync.RWMutex
}

// GetNetworkAddressSetByName calls GetNetworkAddressSetByNameFunc.
func (mock *NetworkAddressSetServerClientMock) GetNetworkAddressSetByName(ctx context.Context, cluster provisioning.Cluster, networkAddressSetName string) (api.NetworkAddressSet, error) {
	if mock.GetNetworkAddressSetByNameFunc == nil {
		panic("NetworkAddressSetServerClientMock.GetNetworkAddressSetByNameFunc: method is nil but NetworkAddressSetServerClient.GetNetworkAddressSetByName was just called")
	}
	callInfo := struct {
		Ctx                   context.Context
		Cluster               provisioning.Cluster
		NetworkAddressSetName string
	}{
		Ctx:                   ctx,
		Cluster:               cluster,
		NetworkAddressSetName: networkAddressSetName,
	}
	mock.lockGetNetworkAddressSetByName.Lock()
	mock.calls.GetNetworkAddressSetByName = append(mock.calls.GetNetworkAddressSetByName, callInfo)
	mock.lockGetNetworkAddressSetByName.Unlock()
	return mock.GetNetworkAddressSetByNameFunc(ctx, cluster, networkAddressSetName)
}

// GetNetworkAddressSetByNameCalls gets all the calls that were made to GetNetworkAddressSetByName.
// Check the length with:
//
//	len(mockedNetworkAddressSetServerClient.GetNetworkAddressSetByNameCalls())
func (mock *NetworkAddressSetServerClientMock) GetNetworkAddressSetByNameCalls() []struct {
	Ctx                   context.Context
	Cluster               provisioning.Cluster
	NetworkAddressSetName string
} {
	var calls []struct {
		Ctx                   context.Context
		Cluster               provisioning.Cluster
		NetworkAddressSetName string
	}
	mock.lockGetNetworkAddressSetByName.RLock()
	calls = mock.calls.GetNetworkAddressSetByName
	mock.lockGetNetworkAddressSetByName.RUnlock()
	return calls
}

// GetNetworkAddressSets calls GetNetworkAddressSetsFunc.
func (mock *NetworkAddressSetServerClientMock) GetNetworkAddressSets(ctx context.Context, cluster provisioning.Cluster) ([]api.NetworkAddressSet, error) {
	if mock.GetNetworkAddressSetsFunc == nil {
		panic("NetworkAddressSetServerClientMock.GetNetworkAddressSetsFunc: method is nil but NetworkAddressSetServerClient.GetNetworkAddressSets was just called")
	}
	callInfo := struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}{
		Ctx:     ctx,
		Cluster: cluster,
	}
	mock.lockGetNetworkAddressSets.Lock()
	mock.calls.GetNetworkAddressSets = append(mock.calls.GetNetworkAddressSets, callInfo)
	mock.lockGetNetworkAddressSets.Unlock()
	return mock.GetNetworkAddressSetsFunc(ctx, cluster)
}

// GetNetworkAddressSetsCalls gets all the calls that were made to GetNetworkAddressSets.
// Check the length with:
//
//	len(mockedNetworkAddressSetServerClient.GetNetworkAddressSetsCalls())
func (mock *NetworkAddressSetServerClientMock) GetNetworkAddressSetsCalls() []struct {
	Ctx     context.Context
	Cluster provisioning.Cluster
} {
	var calls []struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}
	mock.lockGetNetworkAddressSets.RLock()
	calls = mock.calls.GetNetworkAddressSets
	mock.lockGetNetworkAddressSets.RUnlock()
	return calls
}

// HasExtension calls HasExtensionFunc.
func (mock *NetworkAddressSetServerClientMock) HasExtension(ctx context.Context, cluster provisioning.Cluster, extension string) bool {
	if mock.HasExtensionFunc == nil {
		panic("NetworkAddressSetServerClientMock.HasExtensionFunc: method is nil but NetworkAddressSetServerClient.HasExtension was just called")
	}
	callInfo := struct {
		Ctx       context.Context
		Cluster   provisioning.Cluster
		Extension string
	}{
		Ctx:       ctx,
		Cluster:   cluster,
		Extension: extension,
	}
	mock.lockHasExtension.Lock()
	mock.calls.HasExtension = append(mock.calls.HasExtension, callInfo)
	mock.lockHasExtension.Unlock()
	return mock.HasExtensionFunc(ctx, cluster, extension)
}

// HasExtensionCalls gets all the calls that were made to HasExtension.
// Check the length with:
//
//	len(mockedNetworkAddressSetServerClient.HasExtensionCalls())
func (mock *NetworkAddressSetServerClientMock) HasExtensionCalls() []struct {
	Ctx       context.Context
	Cluster   provisioning.Cluster
	Extension string
} {
	var calls []struct {
		Ctx       context.Context
		Cluster   provisioning.Cluster
		Extension string
	}
	mock.lockHasExtension.RLock()
	calls = mock.calls.HasExtension
	mock.lockHasExtension.RUnlock()
	return calls
}
