# Deployment

The app runs in a sub-folder (for example `https://example.com/apps/handsum/`), needs PHP with Apache and no database. The result on the host looks like this:

```text
handsum/                  contents of client/dist/ (index.html, assets/)
  .htaccess               optional password protection, see below
  api/                    only the files below, not vendor/, tests/ or Composer files
    index.php
    .htaccess
    src/
    config.local.php      optional, see below
    data/                 created and filled by the server
```

## Automatic deployment

The workflow `ci.yml` runs all checks and then deploys the built site via SFTP with the shared workflow from `Friedinger/configs` (environment `prod`). It runs only when started by hand from the `main` branch (Actions → CI → Run workflow).

The site is mirrored into the root of the SFTP user. Everything else there is deleted, except `api/data/`, `api/config.local.php`, `.htaccess` and `.htpasswd` in the site root, which belong to the host.

## First deployment on a new host

Check in the browser after the first deploy:

1. The app loads at `https://example.com/apps/handsum/` and a game can be created and joined.
2. `https://example.com/apps/handsum/api/src/Config.php` and `https://example.com/apps/handsum/api/data/` answer `403`.
3. The data folder is writable by PHP and `flock` works on its file system. Both are needed for the server to accept moves; if creating a game fails, look at `error.log` in the data folder.

Optional: to keep the data outside the web root, create `api/config.local.php` on the host returning `['dataDir' => '/absolute/path/to/data'];`. The folder must be writable by PHP. Otherwise the server uses `api/data/`, which `api/.htaccess` blocks. Unexpected server errors never appear in responses; they are logged to `error.log` in the data folder.

## Manual deployment

Without the workflow, build the site, which already contains the server as `api/`, and upload it with SFTP:

```bash
npm run client:build
```

Upload the contents of `client/dist/` to the sub-folder on the host.

## Optional password protection

To restrict the whole app, including the API, add a `.htaccess` to the sub-folder (the browser sends the credentials with every request automatically):

```apache
AuthType Basic
AuthName "Handsum"
AuthUserFile /absolute/path/to/.htpasswd
Require valid-user
```

Create the password file with `htpasswd -c .htpasswd name` and keep it outside the web root if possible.
