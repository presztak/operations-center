// Code generated by mockery; DO NOT EDIT.
// github.com/vektra/mockery
// template: matryer

package mock

import (
	"context"
	"sync"

	"github.com/FuturFusion/operations-center/internal/provisioning"
)

// Ensure that ClusterRepoMock does implement provisioning.ClusterRepo.
// If this is not the case, regenerate this file with mockery.
var _ provisioning.ClusterRepo = &ClusterRepoMock{}

// ClusterRepoMock is a mock implementation of provisioning.ClusterRepo.
//
//	func TestSomethingThatUsesClusterRepo(t *testing.T) {
//
//		// make and configure a mocked provisioning.ClusterRepo
//		mockedClusterRepo := &ClusterRepoMock{
//			CreateFunc: func(ctx context.Context, cluster provisioning.Cluster) (int64, error) {
//				panic("mock out the Create method")
//			},
//			DeleteByNameFunc: func(ctx context.Context, name string) error {
//				panic("mock out the DeleteByName method")
//			},
//			ExistsByNameFunc: func(ctx context.Context, name string) (bool, error) {
//				panic("mock out the ExistsByName method")
//			},
//			GetAllFunc: func(ctx context.Context) (provisioning.Clusters, error) {
//				panic("mock out the GetAll method")
//			},
//			GetAllNamesFunc: func(ctx context.Context) ([]string, error) {
//				panic("mock out the GetAllNames method")
//			},
//			GetByNameFunc: func(ctx context.Context, name string) (*provisioning.Cluster, error) {
//				panic("mock out the GetByName method")
//			},
//			RenameFunc: func(ctx context.Context, oldName string, newName string) error {
//				panic("mock out the Rename method")
//			},
//			UpdateFunc: func(ctx context.Context, cluster provisioning.Cluster) error {
//				panic("mock out the Update method")
//			},
//		}
//
//		// use mockedClusterRepo in code that requires provisioning.ClusterRepo
//		// and then make assertions.
//
//	}
type ClusterRepoMock struct {
	// CreateFunc mocks the Create method.
	CreateFunc func(ctx context.Context, cluster provisioning.Cluster) (int64, error)

	// DeleteByNameFunc mocks the DeleteByName method.
	DeleteByNameFunc func(ctx context.Context, name string) error

	// ExistsByNameFunc mocks the ExistsByName method.
	ExistsByNameFunc func(ctx context.Context, name string) (bool, error)

	// GetAllFunc mocks the GetAll method.
	GetAllFunc func(ctx context.Context) (provisioning.Clusters, error)

	// GetAllNamesFunc mocks the GetAllNames method.
	GetAllNamesFunc func(ctx context.Context) ([]string, error)

	// GetByNameFunc mocks the GetByName method.
	GetByNameFunc func(ctx context.Context, name string) (*provisioning.Cluster, error)

	// RenameFunc mocks the Rename method.
	RenameFunc func(ctx context.Context, oldName string, newName string) error

	// UpdateFunc mocks the Update method.
	UpdateFunc func(ctx context.Context, cluster provisioning.Cluster) error

	// calls tracks calls to the methods.
	calls struct {
		// Create holds details about calls to the Create method.
		Create []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
		}
		// DeleteByName holds details about calls to the DeleteByName method.
		DeleteByName []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Name is the name argument value.
			Name string
		}
		// ExistsByName holds details about calls to the ExistsByName method.
		ExistsByName []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Name is the name argument value.
			Name string
		}
		// GetAll holds details about calls to the GetAll method.
		GetAll []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
		}
		// GetAllNames holds details about calls to the GetAllNames method.
		GetAllNames []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
		}
		// GetByName holds details about calls to the GetByName method.
		GetByName []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Name is the name argument value.
			Name string
		}
		// Rename holds details about calls to the Rename method.
		Rename []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// OldName is the oldName argument value.
			OldName string
			// NewName is the newName argument value.
			NewName string
		}
		// Update holds details about calls to the Update method.
		Update []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Cluster is the cluster argument value.
			Cluster provisioning.Cluster
		}
	}
	lockCreate       sync.RWMutex
	lockDeleteByName sync.RWMutex
	lockExistsByName sync.RWMutex
	lockGetAll       sync.RWMutex
	lockGetAllNames  sync.RWMutex
	lockGetByName    sync.RWMutex
	lockRename       sync.RWMutex
	lockUpdate       sync.RWMutex
}

// Create calls CreateFunc.
func (mock *ClusterRepoMock) Create(ctx context.Context, cluster provisioning.Cluster) (int64, error) {
	if mock.CreateFunc == nil {
		panic("ClusterRepoMock.CreateFunc: method is nil but ClusterRepo.Create was just called")
	}
	callInfo := struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}{
		Ctx:     ctx,
		Cluster: cluster,
	}
	mock.lockCreate.Lock()
	mock.calls.Create = append(mock.calls.Create, callInfo)
	mock.lockCreate.Unlock()
	return mock.CreateFunc(ctx, cluster)
}

// CreateCalls gets all the calls that were made to Create.
// Check the length with:
//
//	len(mockedClusterRepo.CreateCalls())
func (mock *ClusterRepoMock) CreateCalls() []struct {
	Ctx     context.Context
	Cluster provisioning.Cluster
} {
	var calls []struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}
	mock.lockCreate.RLock()
	calls = mock.calls.Create
	mock.lockCreate.RUnlock()
	return calls
}

// DeleteByName calls DeleteByNameFunc.
func (mock *ClusterRepoMock) DeleteByName(ctx context.Context, name string) error {
	if mock.DeleteByNameFunc == nil {
		panic("ClusterRepoMock.DeleteByNameFunc: method is nil but ClusterRepo.DeleteByName was just called")
	}
	callInfo := struct {
		Ctx  context.Context
		Name string
	}{
		Ctx:  ctx,
		Name: name,
	}
	mock.lockDeleteByName.Lock()
	mock.calls.DeleteByName = append(mock.calls.DeleteByName, callInfo)
	mock.lockDeleteByName.Unlock()
	return mock.DeleteByNameFunc(ctx, name)
}

// DeleteByNameCalls gets all the calls that were made to DeleteByName.
// Check the length with:
//
//	len(mockedClusterRepo.DeleteByNameCalls())
func (mock *ClusterRepoMock) DeleteByNameCalls() []struct {
	Ctx  context.Context
	Name string
} {
	var calls []struct {
		Ctx  context.Context
		Name string
	}
	mock.lockDeleteByName.RLock()
	calls = mock.calls.DeleteByName
	mock.lockDeleteByName.RUnlock()
	return calls
}

// ExistsByName calls ExistsByNameFunc.
func (mock *ClusterRepoMock) ExistsByName(ctx context.Context, name string) (bool, error) {
	if mock.ExistsByNameFunc == nil {
		panic("ClusterRepoMock.ExistsByNameFunc: method is nil but ClusterRepo.ExistsByName was just called")
	}
	callInfo := struct {
		Ctx  context.Context
		Name string
	}{
		Ctx:  ctx,
		Name: name,
	}
	mock.lockExistsByName.Lock()
	mock.calls.ExistsByName = append(mock.calls.ExistsByName, callInfo)
	mock.lockExistsByName.Unlock()
	return mock.ExistsByNameFunc(ctx, name)
}

// ExistsByNameCalls gets all the calls that were made to ExistsByName.
// Check the length with:
//
//	len(mockedClusterRepo.ExistsByNameCalls())
func (mock *ClusterRepoMock) ExistsByNameCalls() []struct {
	Ctx  context.Context
	Name string
} {
	var calls []struct {
		Ctx  context.Context
		Name string
	}
	mock.lockExistsByName.RLock()
	calls = mock.calls.ExistsByName
	mock.lockExistsByName.RUnlock()
	return calls
}

// GetAll calls GetAllFunc.
func (mock *ClusterRepoMock) GetAll(ctx context.Context) (provisioning.Clusters, error) {
	if mock.GetAllFunc == nil {
		panic("ClusterRepoMock.GetAllFunc: method is nil but ClusterRepo.GetAll was just called")
	}
	callInfo := struct {
		Ctx context.Context
	}{
		Ctx: ctx,
	}
	mock.lockGetAll.Lock()
	mock.calls.GetAll = append(mock.calls.GetAll, callInfo)
	mock.lockGetAll.Unlock()
	return mock.GetAllFunc(ctx)
}

// GetAllCalls gets all the calls that were made to GetAll.
// Check the length with:
//
//	len(mockedClusterRepo.GetAllCalls())
func (mock *ClusterRepoMock) GetAllCalls() []struct {
	Ctx context.Context
} {
	var calls []struct {
		Ctx context.Context
	}
	mock.lockGetAll.RLock()
	calls = mock.calls.GetAll
	mock.lockGetAll.RUnlock()
	return calls
}

// GetAllNames calls GetAllNamesFunc.
func (mock *ClusterRepoMock) GetAllNames(ctx context.Context) ([]string, error) {
	if mock.GetAllNamesFunc == nil {
		panic("ClusterRepoMock.GetAllNamesFunc: method is nil but ClusterRepo.GetAllNames was just called")
	}
	callInfo := struct {
		Ctx context.Context
	}{
		Ctx: ctx,
	}
	mock.lockGetAllNames.Lock()
	mock.calls.GetAllNames = append(mock.calls.GetAllNames, callInfo)
	mock.lockGetAllNames.Unlock()
	return mock.GetAllNamesFunc(ctx)
}

// GetAllNamesCalls gets all the calls that were made to GetAllNames.
// Check the length with:
//
//	len(mockedClusterRepo.GetAllNamesCalls())
func (mock *ClusterRepoMock) GetAllNamesCalls() []struct {
	Ctx context.Context
} {
	var calls []struct {
		Ctx context.Context
	}
	mock.lockGetAllNames.RLock()
	calls = mock.calls.GetAllNames
	mock.lockGetAllNames.RUnlock()
	return calls
}

// GetByName calls GetByNameFunc.
func (mock *ClusterRepoMock) GetByName(ctx context.Context, name string) (*provisioning.Cluster, error) {
	if mock.GetByNameFunc == nil {
		panic("ClusterRepoMock.GetByNameFunc: method is nil but ClusterRepo.GetByName was just called")
	}
	callInfo := struct {
		Ctx  context.Context
		Name string
	}{
		Ctx:  ctx,
		Name: name,
	}
	mock.lockGetByName.Lock()
	mock.calls.GetByName = append(mock.calls.GetByName, callInfo)
	mock.lockGetByName.Unlock()
	return mock.GetByNameFunc(ctx, name)
}

// GetByNameCalls gets all the calls that were made to GetByName.
// Check the length with:
//
//	len(mockedClusterRepo.GetByNameCalls())
func (mock *ClusterRepoMock) GetByNameCalls() []struct {
	Ctx  context.Context
	Name string
} {
	var calls []struct {
		Ctx  context.Context
		Name string
	}
	mock.lockGetByName.RLock()
	calls = mock.calls.GetByName
	mock.lockGetByName.RUnlock()
	return calls
}

// Rename calls RenameFunc.
func (mock *ClusterRepoMock) Rename(ctx context.Context, oldName string, newName string) error {
	if mock.RenameFunc == nil {
		panic("ClusterRepoMock.RenameFunc: method is nil but ClusterRepo.Rename was just called")
	}
	callInfo := struct {
		Ctx     context.Context
		OldName string
		NewName string
	}{
		Ctx:     ctx,
		OldName: oldName,
		NewName: newName,
	}
	mock.lockRename.Lock()
	mock.calls.Rename = append(mock.calls.Rename, callInfo)
	mock.lockRename.Unlock()
	return mock.RenameFunc(ctx, oldName, newName)
}

// RenameCalls gets all the calls that were made to Rename.
// Check the length with:
//
//	len(mockedClusterRepo.RenameCalls())
func (mock *ClusterRepoMock) RenameCalls() []struct {
	Ctx     context.Context
	OldName string
	NewName string
} {
	var calls []struct {
		Ctx     context.Context
		OldName string
		NewName string
	}
	mock.lockRename.RLock()
	calls = mock.calls.Rename
	mock.lockRename.RUnlock()
	return calls
}

// Update calls UpdateFunc.
func (mock *ClusterRepoMock) Update(ctx context.Context, cluster provisioning.Cluster) error {
	if mock.UpdateFunc == nil {
		panic("ClusterRepoMock.UpdateFunc: method is nil but ClusterRepo.Update was just called")
	}
	callInfo := struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}{
		Ctx:     ctx,
		Cluster: cluster,
	}
	mock.lockUpdate.Lock()
	mock.calls.Update = append(mock.calls.Update, callInfo)
	mock.lockUpdate.Unlock()
	return mock.UpdateFunc(ctx, cluster)
}

// UpdateCalls gets all the calls that were made to Update.
// Check the length with:
//
//	len(mockedClusterRepo.UpdateCalls())
func (mock *ClusterRepoMock) UpdateCalls() []struct {
	Ctx     context.Context
	Cluster provisioning.Cluster
} {
	var calls []struct {
		Ctx     context.Context
		Cluster provisioning.Cluster
	}
	mock.lockUpdate.RLock()
	calls = mock.calls.Update
	mock.lockUpdate.RUnlock()
	return calls
}
