# Backup and restore

Operations Center can back up its state into a `gzip` compressed tar archive and
restore it again.

## Content of a backup

A backup holds:

* the configuration (`config.yml`)
* the server and client certificates and keys
* a consistent snapshot of the database
* the cluster artifacts
* the images served by Operations Center
* the cached update files, only if a complete backup is requested

The inventory is not part of a backup. It is synced again from the clusters
after a restore.

```{note}
A backup contains private keys and credentials. Store it safely.
```

## Create a backup

```
operations-center system backup operations-center-backup.tar.gz
```

With `--complete`, the cached update files are included as well. Without them,
the updates are fetched again from the update source after a restore.

## Restore a backup

```
operations-center system restore operations-center-backup.tar.gz
```

The backup is validated first. A backup, which has been created by a newer
version of Operations Center, is rejected. A backup of an older version is
upgraded on restore.

Operations Center then restarts and replaces its complete state with the one
from the backup. If Operations Center does not start successfully with the
restored state, it puts back the state from before the restore on the next
start.

A restore is refused, while a server is being deployed, updated, evacuated or
restored or while a cluster update is in progress. Operations, which have been
in progress, when the backup has been created, are aborted after the restore:

* Cluster updates are aborted.
* Server deployments are cancelled, the servers are left untouched.

Backup and restore require the `admin` role on the server object.
