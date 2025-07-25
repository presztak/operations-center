// Code generated by generate-inventory; DO NOT EDIT.

package inventory

import (
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	incusapi "github.com/lxc/incus/v6/shared/api"

	"github.com/FuturFusion/operations-center/internal/domain"
)

type Image struct {
	ID          int
	UUID        uuid.UUID
	Cluster     string
	ProjectName string
	Name        string
	Object      incusapi.Image
	LastUpdated time.Time
}

func (m *Image) DeriveUUID() *Image {
	identifier := strings.Join([]string{
		m.Cluster,
		m.ProjectName,
		m.Name,
	}, ":")

	m.UUID = uuid.NewSHA1(InventorySpaceUUID, []byte(identifier))

	return m
}

func (m Image) Validate() error {
	if m.Cluster == "" {
		return domain.NewValidationErrf("Invalid Image, cluster can not be empty")
	}

	if m.Name == "" {
		return domain.NewValidationErrf("Invalid Image, name can not be empty")
	}

	if m.ProjectName == "" {
		return domain.NewValidationErrf("Invalid Image, project name can not be empty")
	}

	clone := m
	clone.DeriveUUID()
	if clone.UUID != m.UUID {
		return domain.NewValidationErrf("Invalid UUID, does not match derived value")
	}

	return nil
}

type Images []Image

type ImageFilter struct {
	Cluster    *string
	Project    *string
	Expression *string
}

func (f ImageFilter) AppendToURLValues(query url.Values) url.Values {
	if f.Cluster != nil {
		query.Add("cluster", *f.Cluster)
	}

	if f.Project != nil {
		query.Add("project", *f.Project)
	}

	if f.Expression != nil {
		query.Add("filter", *f.Expression)
	}

	return query
}

func (f ImageFilter) String() string {
	return f.AppendToURLValues(url.Values{}).Encode()
}
