package updateserver_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/FuturFusion/operations-center/internal/provisioning"
	"github.com/FuturFusion/operations-center/internal/provisioning/adapter/updateserver"
	"github.com/FuturFusion/operations-center/internal/signature"
	"github.com/FuturFusion/operations-center/internal/signature/signaturetest"
	"github.com/FuturFusion/operations-center/shared/api"
)

func TestUpdateServer_GetLatest(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		updates    updateserver.UpdatesIndex

		assertErr   require.ErrorAssertionFunc
		wantUpdates provisioning.Updates
	}{
		{
			name:       "success - one update",
			statusCode: http.StatusOK,
			updates: updateserver.UpdatesIndex{
				Format: "1.0",
				Updates: []provisioning.Update{
					{
						Version:     "1",
						Severity:    api.UpdateSeverityNone,
						PublishedAt: time.Date(2025, 5, 22, 15, 21, 0, 0, time.UTC),
					},
				},
			},

			assertErr: require.NoError,
			wantUpdates: provisioning.Updates{
				{
					UUID:        uuid.MustParse(`87bbde05-2a3c-5508-9d31-4fe7c8cf596a`),
					ExternalID:  "1",
					Version:     "1",
					Severity:    api.UpdateSeverityNone,
					PublishedAt: time.Date(2025, 5, 22, 15, 21, 0, 0, time.UTC),
				},
			},
		},
		{
			name:       "success - two updates",
			statusCode: http.StatusOK,
			updates: updateserver.UpdatesIndex{
				Format: "1.0",
				Updates: []provisioning.Update{
					{
						Version:     "1",
						Severity:    api.UpdateSeverityNone,
						PublishedAt: time.Date(2024, 5, 22, 15, 21, 0, 0, time.UTC), // older update, will be filtered out
					},
					{
						Version:     "2",
						Severity:    api.UpdateSeverityNone,
						PublishedAt: time.Date(2025, 5, 22, 15, 21, 0, 0, time.UTC),
					},
				},
			},

			assertErr: require.NoError,
			wantUpdates: provisioning.Updates{
				{
					UUID:        uuid.MustParse(`25eacea3-d627-5c40-bfe5-52a9ea85e0ea`),
					ExternalID:  "2",
					Version:     "2",
					Severity:    api.UpdateSeverityNone,
					PublishedAt: time.Date(2025, 5, 22, 15, 21, 0, 0, time.UTC),
				},
			},
		},
		{
			name:       "error - wrong status code",
			statusCode: http.StatusInternalServerError,
			updates:    updateserver.UpdatesIndex{},

			assertErr: require.Error,
		},
		{
			name:       "error - invalid format",
			statusCode: http.StatusOK,
			updates: updateserver.UpdatesIndex{
				Format: "invalid", // invalid format
			},

			assertErr: require.Error,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			caCert, cert, key := signaturetest.GenerateCertChain(t)

			body, err := json.Marshal(tc.updates)
			require.NoError(t, err)

			signedBody := signaturetest.SignContent(t, cert, key, body)

			svr := httptest.NewServer(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/index.sjson") {
						http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
						return
					}

					w.WriteHeader(tc.statusCode)
					_, _ = w.Write(signedBody)
				}),
			)
			defer svr.Close()

			s := updateserver.New(svr.URL, signature.NewVerifier(caCert))
			updates, err := s.GetLatest(context.Background(), 1)
			tc.assertErr(t, err)

			require.Len(t, updates, len(tc.wantUpdates))
			require.Equal(t, tc.wantUpdates, updates)
		})
	}
}

func TestUpdateServer_GetUpdateAllFiles(t *testing.T) {
	tests := []struct {
		name       string
		statusCode int
		update     provisioning.Update

		assertErr require.ErrorAssertionFunc
		wantFiles provisioning.UpdateFiles
	}{
		{
			name:       "success - no files",
			statusCode: http.StatusOK,
			update: provisioning.Update{
				Severity: api.UpdateSeverityNone,
				Files:    nil,
			},

			assertErr: require.NoError,
			wantFiles: nil,
		},
		{
			name:       "success - some files",
			statusCode: http.StatusOK,
			update: provisioning.Update{
				Severity: api.UpdateSeverityNone,
				Files: provisioning.UpdateFiles{
					provisioning.UpdateFile{
						Filename:  "one",
						Component: api.UpdateFileComponentDebug,
					},
					provisioning.UpdateFile{
						Filename:  "two",
						Component: api.UpdateFileComponentDebug,
					},
					provisioning.UpdateFile{
						Filename:  "three",
						Component: api.UpdateFileComponentDebug,
					},
				},
			},

			assertErr: require.NoError,
			wantFiles: provisioning.UpdateFiles{
				provisioning.UpdateFile{
					Filename:     "one",
					Component:    api.UpdateFileComponentDebug,
					Architecture: api.Architecture64BitIntelX86,
				},
				provisioning.UpdateFile{
					Filename:     "two",
					Component:    api.UpdateFileComponentDebug,
					Architecture: api.Architecture64BitIntelX86,
				},
				provisioning.UpdateFile{
					Filename:     "three",
					Component:    api.UpdateFileComponentDebug,
					Architecture: api.Architecture64BitIntelX86,
				},
			},
		},
		{
			name:       "error - wrong status code",
			statusCode: http.StatusInternalServerError,
			update:     provisioning.Update{},

			assertErr: require.Error,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			caCert, cert, key := signaturetest.GenerateCertChain(t)

			body, err := json.Marshal(tc.update)
			require.NoError(t, err)

			signedBody := signaturetest.SignContent(t, cert, key, body)

			svr := httptest.NewServer(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.Contains(r.URL.Path, "/1/update.sjson") {
						http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
						return
					}

					w.WriteHeader(tc.statusCode)
					_, _ = w.Write(signedBody)
				}),
			)
			defer svr.Close()

			s := updateserver.New(svr.URL, signature.NewVerifier(caCert))
			files, err := s.GetUpdateAllFiles(context.Background(), provisioning.Update{
				ExternalID: "1",
				URL:        "1/",
			})
			tc.assertErr(t, err)

			require.Len(t, files, len(tc.wantFiles))
			require.Equal(t, tc.wantFiles, files)
		})
	}
}

func TestUpdateServer_GetUpdateFileByFilename(t *testing.T) {
	tests := []struct {
		name         string
		statusCode   int
		responseBody []byte

		assertErr          require.ErrorAssertionFunc
		wantResponseLength int
		wantResponseBody   []byte
	}{
		{
			name:         "success - no files",
			statusCode:   http.StatusOK,
			responseBody: []byte(`some text`),

			assertErr:          require.NoError,
			wantResponseLength: 9,
			wantResponseBody:   []byte(`some text`),
		},
		{
			name:       "error - wrong status code",
			statusCode: http.StatusInternalServerError,

			assertErr: require.Error,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			errChan := make(chan error, 1)

			svr := httptest.NewServer(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/1/one.txt") {
						http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
						return
					}

					w.WriteHeader(tc.statusCode)
					_, _ = w.Write(tc.responseBody)
				}),
			)
			defer svr.Close()

			s := updateserver.New(svr.URL, nil)
			stream, n, err := s.GetUpdateFileByFilenameUnverified(context.Background(), provisioning.Update{
				ExternalID: "1",
			}, "one.txt")
			tc.assertErr(t, err)

			var serverErr error
			select {
			case serverErr = <-errChan:
			default:
			}

			require.NoError(t, serverErr)

			responseBody := readAll(t, stream)

			require.Equal(t, tc.wantResponseLength, n)
			require.Equal(t, tc.wantResponseBody, responseBody)
		})
	}
}

func readAll(t *testing.T, r io.ReadCloser) []byte {
	t.Helper()

	if r == nil {
		return nil
	}

	body, err := io.ReadAll(r)
	require.NoError(t, err)

	return body
}
