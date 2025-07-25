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

// Ensure that ProfileServerClientMock does implement inventory.ProfileServerClient.
// If this is not the case, regenerate this file with mockery.
var _ inventory.ProfileServerClient = &ProfileServerClientMock{}

// ProfileServerClientMock is a mock implementation of inventory.ProfileServerClient.
//
//	func TestSomethingThatUsesProfileServerClient(t *testing.T) {
//
//		// make and configure a mocked inventory.ProfileServerClient
//		mockedProfileServerClient := &ProfileServerClientMock{
//			GetProfileByNameFunc: func(ctx context.Context, cluster provisioning.Cluster, profileName string) (api.Profile, error) {
//				panic("mock out the GetProfileByName method")
//			},
//			GetProfilesFunc: func(ctx context.Context, cluster provisioning.Cluster) ([]api.Profile, error) {
//				panic("mock out the GetProfiles method")
//			},
//		}
//
//		// use mockedProfileServerClient in code that requires inventory.ProfileServerClient
//		// and then make assertions.
//
//	}
type ProfileServerClientMock struct {
	// GetProfileByNameFunc mocks the GetProfileByName method.
	GetProfileByNameFunc func(ctx context.Context, cluster provisioning.Cluster, profileName string) (api.Profile, error)

	// GetProfilesFunc mocks the GetProfiles method.
	GetProfilesFunc func(ctx context.Context, cluster provisioning.Cluster) ([]api.Profile, error)

	// calls tracks calls to the methods.
	calls struct {
		// GetProfileByName holds details about calls to the GetProfileByName method.
		GetProfileByName []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
			// ProfileName is the profileName argument value.
			ProfileName string
		}
		// GetProfiles holds details about calls to the GetProfiles method.
		GetProfiles []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
		}
	}
	lockGetProfileByName sync.RWMutex
	lockGetProfiles      sync.RWMutex
}

// GetProfileByName calls GetProfileByNameFunc.
func (mock *ProfileServerClientMock) GetProfileByName(ctx context.Context, cluster provisioning.Cluster, profileName string) (api.Profile, error) {
	if mock.GetProfileByNameFunc == nil {
		panic("ProfileServerClientMock.GetProfileByNameFunc: method is nil but ProfileServerClient.GetProfileByName was just called")
	}
	callInfo := struct {
		Ctx         context.Context
		Cluster     provisioning.Cluster
		ProfileName string
	}{
		Ctx:         ctx,
		Cluster:     cluster,
		ProfileName: profileName,
	}
	mock.lockGetProfileByName.Lock()
	mock.calls.GetProfileByName = append(mock.calls.GetProfileByName, callInfo)
	mock.lockGetProfileByName.Unlock()
	return mock.GetProfileByNameFunc(ctx, cluster, profileName)
}

// GetProfileByNameCalls gets all the calls that were made to GetProfileByName.
// Check the length with:
//
//	len(mockedProfileServerClient.GetProfileByNameCalls())
func (mock *ProfileServerClientMock) GetProfileByNameCalls() []struct {
	Ctx         context.Context
	Cluster     provisioning.Cluster
	ProfileName string
} {
	var calls []struct {
		Ctx         context.Context
		Cluster     provisioning.Cluster
		ProfileName string
	}
	mock.lockGetProfileByName.RLock()
	calls = mock.calls.GetProfileByName
	mock.lockGetProfileByName.RUnlock()
	return calls
}

// GetProfiles calls GetProfilesFunc.
func (mock *ProfileServerClientMock) GetProfiles(ctx context.Context, cluster provisioning.Cluster) ([]api.Profile, error) {
	if mock.GetProfilesFunc == nil {
		panic("ProfileServerClientMock.GetProfilesFunc: method is nil but ProfileServerClient.GetProfiles was just called")
	}
	callInfo := struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}{
		Ctx:     ctx,
		Cluster: cluster,
	}
	mock.lockGetProfiles.Lock()
	mock.calls.GetProfiles = append(mock.calls.GetProfiles, callInfo)
	mock.lockGetProfiles.Unlock()
	return mock.GetProfilesFunc(ctx, cluster)
}

// GetProfilesCalls gets all the calls that were made to GetProfiles.
// Check the length with:
//
//	len(mockedProfileServerClient.GetProfilesCalls())
func (mock *ProfileServerClientMock) GetProfilesCalls() []struct {
	Ctx     context.Context
	Cluster provisioning.Cluster
} {
	var calls []struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}
	mock.lockGetProfiles.RLock()
	calls = mock.calls.GetProfiles
	mock.lockGetProfiles.RUnlock()
	return calls
}
