// Code generated by mockery; DO NOT EDIT.
// github.com/vektra/mockery
// template: matryer

package mock

import (
	"archive/tar"
	"context"
	"io"
	"sync"

	"github.com/FuturFusion/operations-center/internal/provisioning"
)

// Ensure that UpdateFilesRepoMock does implement provisioning.UpdateFilesRepo.
// If this is not the case, regenerate this file with mockery.
var _ provisioning.UpdateFilesRepo = &UpdateFilesRepoMock{}

// UpdateFilesRepoMock is a mock implementation of provisioning.UpdateFilesRepo.
//
//	func TestSomethingThatUsesUpdateFilesRepo(t *testing.T) {
//
//		// make and configure a mocked provisioning.UpdateFilesRepo
//		mockedUpdateFilesRepo := &UpdateFilesRepoMock{
//			CreateFromArchiveFunc: func(ctx context.Context, tarReader *tar.Reader) (*provisioning.Update, error) {
//				panic("mock out the CreateFromArchive method")
//			},
//			DeleteFunc: func(ctx context.Context, update provisioning.Update) error {
//				panic("mock out the Delete method")
//			},
//			GetFunc: func(ctx context.Context, update provisioning.Update, filename string) (io.ReadCloser, int, error) {
//				panic("mock out the Get method")
//			},
//			PutFunc: func(ctx context.Context, update provisioning.Update, filename string, content io.ReadCloser) (provisioning.CommitFunc, provisioning.CancelFunc, error) {
//				panic("mock out the Put method")
//			},
//		}
//
//		// use mockedUpdateFilesRepo in code that requires provisioning.UpdateFilesRepo
//		// and then make assertions.
//
//	}
type UpdateFilesRepoMock struct {
	// CreateFromArchiveFunc mocks the CreateFromArchive method.
	CreateFromArchiveFunc func(ctx context.Context, tarReader *tar.Reader) (*provisioning.Update, error)

	// DeleteFunc mocks the Delete method.
	DeleteFunc func(ctx context.Context, update provisioning.Update) error

	// GetFunc mocks the Get method.
	GetFunc func(ctx context.Context, update provisioning.Update, filename string) (io.ReadCloser, int, error)

	// PutFunc mocks the Put method.
	PutFunc func(ctx context.Context, update provisioning.Update, filename string, content io.ReadCloser) (provisioning.CommitFunc, provisioning.CancelFunc, error)

	// calls tracks calls to the methods.
	calls struct {
		// CreateFromArchive holds details about calls to the CreateFromArchive method.
		CreateFromArchive []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// TarReader is the tarReader argument value.
			TarReader *tar.Reader
		}
		// Delete holds details about calls to the Delete method.
		Delete []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Update is the update argument value.
			Update provisioning.Update
		}
		// Get holds details about calls to the Get method.
		Get []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Update is the update argument value.
			Update provisioning.Update
			// Filename is the filename argument value.
			Filename string
		}
		// Put holds details about calls to the Put method.
		Put []struct {
			// Ctx is the ctx argument value.
			Ctx context.Context
			// Update is the update argument value.
			Update provisioning.Update
			// Filename is the filename argument value.
			Filename string
			// Content is the content argument value.
			Content io.ReadCloser
		}
	}
	lockCreateFromArchive sync.RWMutex
	lockDelete            sync.RWMutex
	lockGet               sync.RWMutex
	lockPut               sync.RWMutex
}

// CreateFromArchive calls CreateFromArchiveFunc.
func (mock *UpdateFilesRepoMock) CreateFromArchive(ctx context.Context, tarReader *tar.Reader) (*provisioning.Update, error) {
	if mock.CreateFromArchiveFunc == nil {
		panic("UpdateFilesRepoMock.CreateFromArchiveFunc: method is nil but UpdateFilesRepo.CreateFromArchive was just called")
	}
	callInfo := struct {
		Ctx       context.Context
		TarReader *tar.Reader
	}{
		Ctx:       ctx,
		TarReader: tarReader,
	}
	mock.lockCreateFromArchive.Lock()
	mock.calls.CreateFromArchive = append(mock.calls.CreateFromArchive, callInfo)
	mock.lockCreateFromArchive.Unlock()
	return mock.CreateFromArchiveFunc(ctx, tarReader)
}

// CreateFromArchiveCalls gets all the calls that were made to CreateFromArchive.
// Check the length with:
//
//	len(mockedUpdateFilesRepo.CreateFromArchiveCalls())
func (mock *UpdateFilesRepoMock) CreateFromArchiveCalls() []struct {
	Ctx       context.Context
	TarReader *tar.Reader
} {
	var calls []struct {
		Ctx       context.Context
		TarReader *tar.Reader
	}
	mock.lockCreateFromArchive.RLock()
	calls = mock.calls.CreateFromArchive
	mock.lockCreateFromArchive.RUnlock()
	return calls
}

// Delete calls DeleteFunc.
func (mock *UpdateFilesRepoMock) Delete(ctx context.Context, update provisioning.Update) error {
	if mock.DeleteFunc == nil {
		panic("UpdateFilesRepoMock.DeleteFunc: method is nil but UpdateFilesRepo.Delete was just called")
	}
	callInfo := struct {
		Ctx    context.Context
		Update provisioning.Update
	}{
		Ctx:    ctx,
		Update: update,
	}
	mock.lockDelete.Lock()
	mock.calls.Delete = append(mock.calls.Delete, callInfo)
	mock.lockDelete.Unlock()
	return mock.DeleteFunc(ctx, update)
}

// DeleteCalls gets all the calls that were made to Delete.
// Check the length with:
//
//	len(mockedUpdateFilesRepo.DeleteCalls())
func (mock *UpdateFilesRepoMock) DeleteCalls() []struct {
	Ctx    context.Context
	Update provisioning.Update
} {
	var calls []struct {
		Ctx    context.Context
		Update provisioning.Update
	}
	mock.lockDelete.RLock()
	calls = mock.calls.Delete
	mock.lockDelete.RUnlock()
	return calls
}

// Get calls GetFunc.
func (mock *UpdateFilesRepoMock) Get(ctx context.Context, update provisioning.Update, filename string) (io.ReadCloser, int, error) {
	if mock.GetFunc == nil {
		panic("UpdateFilesRepoMock.GetFunc: method is nil but UpdateFilesRepo.Get was just called")
	}
	callInfo := struct {
		Ctx      context.Context
		Update   provisioning.Update
		Filename string
	}{
		Ctx:      ctx,
		Update:   update,
		Filename: filename,
	}
	mock.lockGet.Lock()
	mock.calls.Get = append(mock.calls.Get, callInfo)
	mock.lockGet.Unlock()
	return mock.GetFunc(ctx, update, filename)
}

// GetCalls gets all the calls that were made to Get.
// Check the length with:
//
//	len(mockedUpdateFilesRepo.GetCalls())
func (mock *UpdateFilesRepoMock) GetCalls() []struct {
	Ctx      context.Context
	Update   provisioning.Update
	Filename string
} {
	var calls []struct {
		Ctx      context.Context
		Update   provisioning.Update
		Filename string
	}
	mock.lockGet.RLock()
	calls = mock.calls.Get
	mock.lockGet.RUnlock()
	return calls
}

// Put calls PutFunc.
func (mock *UpdateFilesRepoMock) Put(ctx context.Context, update provisioning.Update, filename string, content io.ReadCloser) (provisioning.CommitFunc, provisioning.CancelFunc, error) {
	if mock.PutFunc == nil {
		panic("UpdateFilesRepoMock.PutFunc: method is nil but UpdateFilesRepo.Put was just called")
	}
	callInfo := struct {
		Ctx      context.Context
		Update   provisioning.Update
		Filename string
		Content  io.ReadCloser
	}{
		Ctx:      ctx,
		Update:   update,
		Filename: filename,
		Content:  content,
	}
	mock.lockPut.Lock()
	mock.calls.Put = append(mock.calls.Put, callInfo)
	mock.lockPut.Unlock()
	return mock.PutFunc(ctx, update, filename, content)
}

// PutCalls gets all the calls that were made to Put.
// Check the length with:
//
//	len(mockedUpdateFilesRepo.PutCalls())
func (mock *UpdateFilesRepoMock) PutCalls() []struct {
	Ctx      context.Context
	Update   provisioning.Update
	Filename string
	Content  io.ReadCloser
} {
	var calls []struct {
		Ctx      context.Context
		Update   provisioning.Update
		Filename string
		Content  io.ReadCloser
	}
	mock.lockPut.RLock()
	calls = mock.calls.Put
	mock.lockPut.RUnlock()
	return calls
}
