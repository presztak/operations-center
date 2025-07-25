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

// Ensure that NetworkZoneServerClientMock does implement inventory.NetworkZoneServerClient.
// If this is not the case, regenerate this file with mockery.
var _ inventory.NetworkZoneServerClient = &NetworkZoneServerClientMock{}

// NetworkZoneServerClientMock is a mock implementation of inventory.NetworkZoneServerClient.
//
//	func TestSomethingThatUsesNetworkZoneServerClient(t *testing.T) {
//
//		// make and configure a mocked inventory.NetworkZoneServerClient
//		mockedNetworkZoneServerClient := &NetworkZoneServerClientMock{
//			GetNetworkZoneByNameFunc: func(ctx context.Context, cluster provisioning.Cluster, networkZoneName string) (api.NetworkZone, error) {
//				panic("mock out the GetNetworkZoneByName method")
//			},
//			GetNetworkZonesFunc: func(ctx context.Context, cluster provisioning.Cluster) ([]api.NetworkZone, error) {
//				panic("mock out the GetNetworkZones method")
//			},
//		}
//
//		// use mockedNetworkZoneServerClient in code that requires inventory.NetworkZoneServerClient
//		// and then make assertions.
//
//	}
type NetworkZoneServerClientMock struct {
	// GetNetworkZoneByNameFunc mocks the GetNetworkZoneByName method.
	GetNetworkZoneByNameFunc func(ctx context.Context, cluster provisioning.Cluster, networkZoneName string) (api.NetworkZone, error)

	// GetNetworkZonesFunc mocks the GetNetworkZones method.
	GetNetworkZonesFunc func(ctx context.Context, cluster provisioning.Cluster) ([]api.NetworkZone, error)

	// calls tracks calls to the methods.
	calls struct {
		// GetNetworkZoneByName holds details about calls to the GetNetworkZoneByName method.
		GetNetworkZoneByName []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
			// NetworkZoneName is the networkZoneName argument value.
			NetworkZoneName string
		}
		// GetNetworkZones holds details about calls to the GetNetworkZones method.
		GetNetworkZones []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
		}
	}
	lockGetNetworkZoneByName sync.RWMutex
	lockGetNetworkZones      sync.RWMutex
}

// GetNetworkZoneByName calls GetNetworkZoneByNameFunc.
func (mock *NetworkZoneServerClientMock) GetNetworkZoneByName(ctx context.Context, cluster provisioning.Cluster, networkZoneName string) (api.NetworkZone, error) {
	if mock.GetNetworkZoneByNameFunc == nil {
		panic("NetworkZoneServerClientMock.GetNetworkZoneByNameFunc: method is nil but NetworkZoneServerClient.GetNetworkZoneByName was just called")
	}
	callInfo := struct {
		Ctx             context.Context
		Cluster         provisioning.Cluster
		NetworkZoneName string
	}{
		Ctx:             ctx,
		Cluster:         cluster,
		NetworkZoneName: networkZoneName,
	}
	mock.lockGetNetworkZoneByName.Lock()
	mock.calls.GetNetworkZoneByName = append(mock.calls.GetNetworkZoneByName, callInfo)
	mock.lockGetNetworkZoneByName.Unlock()
	return mock.GetNetworkZoneByNameFunc(ctx, cluster, networkZoneName)
}

// GetNetworkZoneByNameCalls gets all the calls that were made to GetNetworkZoneByName.
// Check the length with:
//
//	len(mockedNetworkZoneServerClient.GetNetworkZoneByNameCalls())
func (mock *NetworkZoneServerClientMock) GetNetworkZoneByNameCalls() []struct {
	Ctx             context.Context
	Cluster         provisioning.Cluster
	NetworkZoneName string
} {
	var calls []struct {
		Ctx             context.Context
		Cluster         provisioning.Cluster
		NetworkZoneName string
	}
	mock.lockGetNetworkZoneByName.RLock()
	calls = mock.calls.GetNetworkZoneByName
	mock.lockGetNetworkZoneByName.RUnlock()
	return calls
}

// GetNetworkZones calls GetNetworkZonesFunc.
func (mock *NetworkZoneServerClientMock) GetNetworkZones(ctx context.Context, cluster provisioning.Cluster) ([]api.NetworkZone, error) {
	if mock.GetNetworkZonesFunc == nil {
		panic("NetworkZoneServerClientMock.GetNetworkZonesFunc: method is nil but NetworkZoneServerClient.GetNetworkZones was just called")
	}
	callInfo := struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}{
		Ctx:     ctx,
		Cluster: cluster,
	}
	mock.lockGetNetworkZones.Lock()
	mock.calls.GetNetworkZones = append(mock.calls.GetNetworkZones, callInfo)
	mock.lockGetNetworkZones.Unlock()
	return mock.GetNetworkZonesFunc(ctx, cluster)
}

// GetNetworkZonesCalls gets all the calls that were made to GetNetworkZones.
// Check the length with:
//
//	len(mockedNetworkZoneServerClient.GetNetworkZonesCalls())
func (mock *NetworkZoneServerClientMock) GetNetworkZonesCalls() []struct {
	Ctx     context.Context
	Cluster provisioning.Cluster
} {
	var calls []struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}
	mock.lockGetNetworkZones.RLock()
	calls = mock.calls.GetNetworkZones
	mock.lockGetNetworkZones.RUnlock()
	return calls
}
