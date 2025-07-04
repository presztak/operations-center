// Code generated by generate-inventory; DO NOT EDIT.

package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/FuturFusion/operations-center/internal/domain"
	"github.com/FuturFusion/operations-center/internal/inventory"
	"github.com/FuturFusion/operations-center/internal/sqlite"
)

type profile struct {
	db sqlite.DBTX
}

var _ inventory.ProfileRepo = &profile{}

func NewProfile(db sqlite.DBTX) *profile {
	return &profile{
		db: db,
	}
}

func (r profile) Create(ctx context.Context, in inventory.Profile) (inventory.Profile, error) {
	const sqlStmt = `
WITH _lookup AS (
  SELECT id AS cluster_id FROM clusters WHERE clusters.name = :cluster_name
)
INSERT INTO profiles (uuid, cluster_id, project_name, name, object, last_updated)
VALUES (:uuid, (SELECT cluster_id FROM _lookup), :project_name, :name, :object, :last_updated)
RETURNING id, :uuid, :cluster_name, project_name, name, object, last_updated;
`

	marshaledObject, err := json.Marshal(in.Object)
	if err != nil {
		return inventory.Profile{}, err
	}

	row := r.db.QueryRowContext(ctx, sqlStmt,
		sql.Named("uuid", in.UUID),
		sql.Named("cluster_name", in.Cluster),
		sql.Named("project_name", in.ProjectName),
		sql.Named("name", in.Name),
		sql.Named("object", marshaledObject),
		sql.Named("last_updated", in.LastUpdated),
	)
	if row.Err() != nil {
		return inventory.Profile{}, sqlite.MapErr(row.Err())
	}

	return scanProfile(row)
}

func (r profile) GetAllWithFilter(ctx context.Context, filter inventory.ProfileFilter) (inventory.Profiles, error) {
	const sqlStmt = `
SELECT
  profiles.id, profiles.uuid, clusters.name, profiles.project_name, profiles.name, profiles.object, profiles.last_updated
FROM profiles
  INNER JOIN clusters ON profiles.cluster_id = clusters.id
WHERE true
%s
ORDER BY clusters.name, profiles.name
`

	var whereClause []string
	var args []any

	if filter.Cluster != nil {
		whereClause = append(whereClause, ` AND clusters.name = :cluster_name`)
		args = append(args, sql.Named("cluster_name", filter.Cluster))
	}

	if filter.Project != nil {
		whereClause = append(whereClause, ` AND profiles.project_name = :project`)
		args = append(args, sql.Named("project", filter.Project))
	}

	sqlStmtComplete := fmt.Sprintf(sqlStmt, strings.Join(whereClause, " "))

	rows, err := r.db.QueryContext(ctx, sqlStmtComplete, args...)
	if err != nil {
		return nil, sqlite.MapErr(err)
	}

	defer func() { _ = rows.Close() }()

	var profiles inventory.Profiles
	for rows.Next() {
		var profile inventory.Profile
		profile, err = scanProfile(rows)
		if err != nil {
			return nil, sqlite.MapErr(err)
		}

		profiles = append(profiles, profile)
	}

	if rows.Err() != nil {
		return nil, sqlite.MapErr(rows.Err())
	}

	return profiles, nil
}

func (r profile) GetAllUUIDsWithFilter(ctx context.Context, filter inventory.ProfileFilter) ([]uuid.UUID, error) {
	const sqlStmt = `
SELECT profiles.uuid
FROM profiles
  INNER JOIN clusters ON profiles.cluster_id = clusters.id
WHERE true
%s
ORDER BY profiles.id
`

	var whereClause []string
	var args []any

	if filter.Cluster != nil {
		whereClause = append(whereClause, ` AND clusters.name = :cluster_name`)
		args = append(args, sql.Named("cluster_name", filter.Cluster))
	}

	if filter.Project != nil {
		whereClause = append(whereClause, ` AND profiles.project_name = :project`)
		args = append(args, sql.Named("project", filter.Project))
	}

	sqlStmtComplete := fmt.Sprintf(sqlStmt, strings.Join(whereClause, " "))

	rows, err := r.db.QueryContext(ctx, sqlStmtComplete, args...)
	if err != nil {
		return nil, sqlite.MapErr(err)
	}

	defer func() { _ = rows.Close() }()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		err := rows.Scan(&id)
		if err != nil {
			return nil, sqlite.MapErr(err)
		}

		ids = append(ids, id)
	}

	if rows.Err() != nil {
		return nil, sqlite.MapErr(rows.Err())
	}

	return ids, nil
}

func (r profile) GetByUUID(ctx context.Context, id uuid.UUID) (inventory.Profile, error) {
	const sqlStmt = `
SELECT
  profiles.id, profiles.uuid, clusters.name, profiles.project_name, profiles.name, profiles.object, profiles.last_updated
FROM
  profiles
  INNER JOIN clusters ON profiles.cluster_id = clusters.id
WHERE profiles.uuid=:uuid;
`

	row := r.db.QueryRowContext(ctx, sqlStmt, sql.Named("uuid", id))
	if row.Err() != nil {
		return inventory.Profile{}, sqlite.MapErr(row.Err())
	}

	return scanProfile(row)
}

func (r profile) DeleteByUUID(ctx context.Context, id uuid.UUID) error {
	const sqlStmt = `DELETE FROM profiles WHERE uuid=:uuid;`

	result, err := r.db.ExecContext(ctx, sqlStmt, sql.Named("uuid", id))
	if err != nil {
		return sqlite.MapErr(err)
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return sqlite.MapErr(err)
	}

	if affectedRows == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r profile) DeleteByClusterName(ctx context.Context, cluster string) error {
	const sqlStmt = `
WITH _lookup AS (
  SELECT id as cluster_id from clusters where name = :cluster_name
)
DELETE FROM profiles WHERE cluster_id=(SELECT cluster_id FROM _lookup);`

	result, err := r.db.ExecContext(ctx, sqlStmt, sql.Named("cluster_name", cluster))
	if err != nil {
		return sqlite.MapErr(err)
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		return sqlite.MapErr(err)
	}

	if affectedRows == 0 {
		return domain.ErrNotFound
	}

	return nil
}

func (r profile) UpdateByUUID(ctx context.Context, in inventory.Profile) (inventory.Profile, error) {
	const sqlStmt = `
WITH _lookup AS (
  SELECT id AS cluster_id FROM clusters WHERE clusters.name = :cluster_name
)
UPDATE profiles SET uuid=:uuid, cluster_id=(SELECT cluster_id FROM _lookup), project_name=:project_name, name=:name, object=:object, last_updated=:last_updated
WHERE uuid=:uuid
RETURNING id, :uuid, :cluster_name, project_name, name, object, last_updated;
`

	marshaledObject, err := json.Marshal(in.Object)
	if err != nil {
		return inventory.Profile{}, err
	}

	row := r.db.QueryRowContext(ctx, sqlStmt,
		sql.Named("uuid", in.UUID),
		sql.Named("cluster_name", in.Cluster),
		sql.Named("project_name", in.ProjectName),
		sql.Named("name", in.Name),
		sql.Named("object", marshaledObject),
		sql.Named("last_updated", in.LastUpdated),
	)
	if row.Err() != nil {
		return inventory.Profile{}, sqlite.MapErr(row.Err())
	}

	return scanProfile(row)
}

func scanProfile(row interface{ Scan(dest ...any) error }) (inventory.Profile, error) {
	var object []byte
	var profile inventory.Profile

	err := row.Scan(
		&profile.ID,
		&profile.UUID,
		&profile.Cluster,
		&profile.ProjectName,
		&profile.Name,
		&object,
		&profile.LastUpdated,
	)
	if err != nil {
		return inventory.Profile{}, sqlite.MapErr(err)
	}

	err = json.Unmarshal(object, &profile.Object)
	if err != nil {
		return inventory.Profile{}, err
	}

	return profile, nil
}
