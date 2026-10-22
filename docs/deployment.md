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

### Legal links

The footer links to an imprint and a privacy policy only if the repository variables `IMPRINT_URL` and `PRIVACY_URL` (Settings → Secrets and variables → Actions → Variables) are set. They are baked into the build as `VITE_IMPRINT_URL` and `VITE_PRIVACY_URL`; a value is either a full `https://` address or a path on the same host such as `/imprint`. For a local build, put the same names into `client/.env.local`.

## First deployment on a new host

Check in the browser after the first deploy:

1. The app loads at `https://example.com/apps/handsum/` and a game can be created and joined.
2. `https://example.com/apps/handsum/api/src/Config.php` and `https://example.com/apps/handsum/api/data/` answer `403`.
3. The data folder is writable by PHP and `flock` works on its file system. Both are needed for every request, not only for moves, because counters and room files are updated under a lock. If creating a game fails, look at `error.log` in the data folder. If the folder itself is not writable, nothing can be logged there and the API answers `storageNotWritable`.
4. Behind a reverse proxy or CDN of the host, `REMOTE_ADDR` can be the proxy's address, which would make all players share one rate limit. Check it once, for example with a temporary `var_dump($_SERVER['REMOTE_ADDR']);` in `api/index.php`.

The server also writes its own `data/.htaccess` (`Require all denied`), and requests through `api/index.php` create files with `umask(0077)`. Treat that only as a second line of defence: the data folder holds all room IDs, so keeping it outside the web root is the safer setup.

To keep the data outside the web root, create `api/config.local.php` on the host returning `['dataDir' => '/absolute/path/to/data'];`. The folder must be writable by PHP. Otherwise the server uses `api/data/`, which `api/.htaccess` and its own `data/.htaccess` block. Unexpected server errors never appear in responses; they are logged to `error.log` in the data folder.

## Manual deployment

Without the workflow, build the site, which already contains the server as `api/`, and upload it with SFTP:

```bash
npm run client:build
```

Upload the contents of `client/dist/` to the sub-folder on the host. If the server sources were reorganized since the last upload, delete the old `api/src/` folder on the host first, otherwise the previous files stay there unused.

## Optional password protection

To restrict the whole app, including the API, add a `.htaccess` to the sub-folder (the browser sends the credentials with every request automatically):

```apache
AuthType Basic
AuthName "Handsum"
AuthUserFile /absolute/path/to/.htpasswd
Require valid-user
```

Create the password file with `htpasswd -c .htpasswd name` and keep it outside the web root if possible.
