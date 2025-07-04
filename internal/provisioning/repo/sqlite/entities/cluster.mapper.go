// Code generated by generate-database from the incus project - DO NOT EDIT.

package entities

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/FuturFusion/operations-center/internal/provisioning"
	"github.com/mattn/go-sqlite3"
)

var clusterObjects = RegisterStmt(`
SELECT clusters.id, clusters.name, clusters.connection_url, clusters.certificate, clusters.status, clusters.last_updated
  FROM clusters
  ORDER BY clusters.name
`)

var clusterObjectsByName = RegisterStmt(`
SELECT clusters.id, clusters.name, clusters.connection_url, clusters.certificate, clusters.status, clusters.last_updated
  FROM clusters
  WHERE ( clusters.name = ? )
  ORDER BY clusters.name
`)

var clusterNames = RegisterStmt(`
SELECT clusters.name
  FROM clusters
  ORDER BY clusters.name
`)

var clusterID = RegisterStmt(`
SELECT clusters.id FROM clusters
  WHERE clusters.name = ?
`)

var clusterCreate = RegisterStmt(`
INSERT INTO clusters (name, connection_url, certificate, status, last_updated)
  VALUES (?, ?, ?, ?, ?)
`)

var clusterUpdate = RegisterStmt(`
UPDATE clusters
  SET name = ?, connection_url = ?, certificate = ?, status = ?, last_updated = ?
 WHERE id = ?
`)

var clusterRename = RegisterStmt(`
UPDATE clusters SET name = ?, last_updated = ? WHERE name = ?
`)

var clusterDeleteByName = RegisterStmt(`
DELETE FROM clusters WHERE name = ?
`)

// GetClusterID return the ID of the cluster with the given key.
// generator: cluster ID
func GetClusterID(ctx context.Context, db tx, name string) (_ int64, _err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	stmt, err := Stmt(db, clusterID)
	if err != nil {
		return -1, fmt.Errorf("Failed to get \"clusterID\" prepared statement: %w", err)
	}

	row := stmt.QueryRowContext(ctx, name)
	var id int64
	err = row.Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return -1, ErrNotFound
	}

	if err != nil {
		return -1, fmt.Errorf("Failed to get \"clusters\" ID: %w", err)
	}

	return id, nil
}

// ClusterExists checks if a cluster with the given key exists.
// generator: cluster Exists
func ClusterExists(ctx context.Context, db dbtx, name string) (_ bool, _err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	stmt, err := Stmt(db, clusterID)
	if err != nil {
		return false, fmt.Errorf("Failed to get \"clusterID\" prepared statement: %w", err)
	}

	row := stmt.QueryRowContext(ctx, name)
	var id int64
	err = row.Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}

	if err != nil {
		return false, fmt.Errorf("Failed to get \"clusters\" ID: %w", err)
	}

	return true, nil
}

// GetCluster returns the cluster with the given key.
// generator: cluster GetOne
func GetCluster(ctx context.Context, db dbtx, name string) (_ *provisioning.Cluster, _err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	filter := provisioning.ClusterFilter{}
	filter.Name = &name

	objects, err := GetClusters(ctx, db, filter)
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch from \"clusters\" table: %w", err)
	}

	switch len(objects) {
	case 0:
		return nil, ErrNotFound
	case 1:
		return &objects[0], nil
	default:
		return nil, fmt.Errorf("More than one \"clusters\" entry matches")
	}
}

// clusterColumns returns a string of column names to be used with a SELECT statement for the entity.
// Use this function when building statements to retrieve database entries matching the Cluster entity.
func clusterColumns() string {
	return "clusters.id, clusters.name, clusters.connection_url, clusters.certificate, clusters.status, clusters.last_updated"
}

// getClusters can be used to run handwritten sql.Stmts to return a slice of objects.
func getClusters(ctx context.Context, stmt *sql.Stmt, args ...any) ([]provisioning.Cluster, error) {
	objects := make([]provisioning.Cluster, 0)

	dest := func(scan func(dest ...any) error) error {
		c := provisioning.Cluster{}
		err := scan(&c.ID, &c.Name, &c.ConnectionURL, &c.Certificate, &c.Status, &c.LastUpdated)
		if err != nil {
			return err
		}

		objects = append(objects, c)

		return nil
	}

	err := selectObjects(ctx, stmt, dest, args...)
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch from \"clusters\" table: %w", err)
	}

	return objects, nil
}

// getClustersRaw can be used to run handwritten query strings to return a slice of objects.
func getClustersRaw(ctx context.Context, db dbtx, sql string, args ...any) ([]provisioning.Cluster, error) {
	objects := make([]provisioning.Cluster, 0)

	dest := func(scan func(dest ...any) error) error {
		c := provisioning.Cluster{}
		err := scan(&c.ID, &c.Name, &c.ConnectionURL, &c.Certificate, &c.Status, &c.LastUpdated)
		if err != nil {
			return err
		}

		objects = append(objects, c)

		return nil
	}

	err := scan(ctx, db, sql, dest, args...)
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch from \"clusters\" table: %w", err)
	}

	return objects, nil
}

// GetClusters returns all available clusters.
// generator: cluster GetMany
func GetClusters(ctx context.Context, db dbtx, filters ...provisioning.ClusterFilter) (_ []provisioning.Cluster, _err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	var err error

	// Result slice.
	objects := make([]provisioning.Cluster, 0)

	// Pick the prepared statement and arguments to use based on active criteria.
	var sqlStmt *sql.Stmt
	args := []any{}
	queryParts := [2]string{}

	if len(filters) == 0 {
		sqlStmt, err = Stmt(db, clusterObjects)
		if err != nil {
			return nil, fmt.Errorf("Failed to get \"clusterObjects\" prepared statement: %w", err)
		}
	}

	for i, filter := range filters {
		if filter.Name != nil {
			args = append(args, []any{filter.Name}...)
			if len(filters) == 1 {
				sqlStmt, err = Stmt(db, clusterObjectsByName)
				if err != nil {
					return nil, fmt.Errorf("Failed to get \"clusterObjectsByName\" prepared statement: %w", err)
				}

				break
			}

			query, err := StmtString(clusterObjectsByName)
			if err != nil {
				return nil, fmt.Errorf("Failed to get \"clusterObjects\" prepared statement: %w", err)
			}

			parts := strings.SplitN(query, "ORDER BY", 2)
			if i == 0 {
				copy(queryParts[:], parts)
				continue
			}

			_, where, _ := strings.Cut(parts[0], "WHERE")
			queryParts[0] += "OR" + where
		} else if filter.Name == nil {
			return nil, fmt.Errorf("Cannot filter on empty ClusterFilter")
		} else {
			return nil, errors.New("No statement exists for the given Filter")
		}
	}

	// Select.
	if sqlStmt != nil {
		objects, err = getClusters(ctx, sqlStmt, args...)
	} else {
		queryStr := strings.Join(queryParts[:], "ORDER BY")
		objects, err = getClustersRaw(ctx, db, queryStr, args...)
	}

	if err != nil {
		return nil, fmt.Errorf("Failed to fetch from \"clusters\" table: %w", err)
	}

	return objects, nil
}

// GetClusterNames returns the identifying field of cluster.
// generator: cluster GetNames
func GetClusterNames(ctx context.Context, db dbtx, filters ...provisioning.ClusterFilter) (_ []string, _err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	var err error

	// Result slice.
	names := make([]string, 0)

	// Pick the prepared statement and arguments to use based on active criteria.
	var sqlStmt *sql.Stmt
	args := []any{}
	queryParts := [2]string{}

	if len(filters) == 0 {
		sqlStmt, err = Stmt(db, clusterNames)
		if err != nil {
			return nil, fmt.Errorf("Failed to get \"clusterNames\" prepared statement: %w", err)
		}
	}

	for _, filter := range filters {
		if filter.Name == nil {
			return nil, fmt.Errorf("Cannot filter on empty ClusterFilter")
		} else {
			return nil, errors.New("No statement exists for the given Filter")
		}
	}

	// Select.
	var rows *sql.Rows
	if sqlStmt != nil {
		rows, err = sqlStmt.QueryContext(ctx, args...)
	} else {
		queryStr := strings.Join(queryParts[:], "ORDER BY")
		rows, err = db.QueryContext(ctx, queryStr, args...)
	}

	if err != nil {
		return nil, err
	}

	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var identifier string
		err := rows.Scan(&identifier)
		if err != nil {
			return nil, err
		}

		names = append(names, identifier)
	}

	err = rows.Err()
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch from \"clusters\" table: %w", err)
	}

	return names, nil
}

// CreateCluster adds a new cluster to the database.
// generator: cluster Create
func CreateCluster(ctx context.Context, db dbtx, object provisioning.Cluster) (_ int64, _err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	args := make([]any, 5)

	// Populate the statement arguments.
	args[0] = object.Name
	args[1] = object.ConnectionURL
	args[2] = object.Certificate
	args[3] = object.Status
	args[4] = time.Now().UTC().Format(time.RFC3339)

	// Prepared statement to use.
	stmt, err := Stmt(db, clusterCreate)
	if err != nil {
		return -1, fmt.Errorf("Failed to get \"clusterCreate\" prepared statement: %w", err)
	}

	// Execute the statement.
	result, err := stmt.Exec(args...)
	var sqliteErr sqlite3.Error
	if errors.As(err, &sqliteErr) {
		if sqliteErr.Code == sqlite3.ErrConstraint {
			return -1, ErrConflict
		}
	}

	if err != nil {
		return -1, fmt.Errorf("Failed to create \"clusters\" entry: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return -1, fmt.Errorf("Failed to fetch \"clusters\" entry ID: %w", err)
	}

	return id, nil
}

// UpdateCluster updates the cluster matching the given key parameters.
// generator: cluster Update
func UpdateCluster(ctx context.Context, db tx, name string, object provisioning.Cluster) (_err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	id, err := GetClusterID(ctx, db, name)
	if err != nil {
		return err
	}

	stmt, err := Stmt(db, clusterUpdate)
	if err != nil {
		return fmt.Errorf("Failed to get \"clusterUpdate\" prepared statement: %w", err)
	}

	result, err := stmt.Exec(object.Name, object.ConnectionURL, object.Certificate, object.Status, time.Now().UTC().Format(time.RFC3339), id)
	if err != nil {
		return fmt.Errorf("Update \"clusters\" entry failed: %w", err)
	}

	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Fetch affected rows: %w", err)
	}

	if n != 1 {
		return fmt.Errorf("Query updated %d rows instead of 1", n)
	}

	return nil
}

// RenameCluster renames the cluster matching the given key parameters.
// generator: cluster Rename
func RenameCluster(ctx context.Context, db dbtx, name string, to string) (_err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	stmt, err := Stmt(db, clusterRename)
	if err != nil {
		return fmt.Errorf("Failed to get \"clusterRename\" prepared statement: %w", err)
	}

	result, err := stmt.Exec(to, time.Now().UTC().Format(time.RFC3339), name)
	if err != nil {
		return fmt.Errorf("Rename Cluster failed: %w", err)
	}

	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Fetch affected rows failed: %w", err)
	}

	if n != 1 {
		return fmt.Errorf("Query affected %d rows instead of 1", n)
	}

	return nil
}

// DeleteCluster deletes the cluster matching the given key parameters.
// generator: cluster DeleteOne-by-Name
func DeleteCluster(ctx context.Context, db dbtx, name string) (_err error) {
	defer func() {
		_err = mapErr(_err, "Cluster")
	}()

	stmt, err := Stmt(db, clusterDeleteByName)
	if err != nil {
		return fmt.Errorf("Failed to get \"clusterDeleteByName\" prepared statement: %w", err)
	}

	result, err := stmt.Exec(name)
	if err != nil {
		return fmt.Errorf("Delete \"clusters\": %w", err)
	}

	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Fetch affected rows: %w", err)
	}

	if n == 0 {
		return ErrNotFound
	} else if n > 1 {
		return fmt.Errorf("Query deleted %d Cluster rows instead of 1", n)
	}

	return nil
}
