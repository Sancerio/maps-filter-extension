# Publishing from CI

This document outlines how to automatically publish the extension to the Chrome Web Store and Firefox Add-ons store using GitHub Actions.

## Chrome Web Store

1. Create a developer account and set up OAuth credentials from the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Obtain the **client ID**, **client secret**, and an OAuth **refresh token** for your publishing account.
3. Note your extension ID from the dashboard.
4. Add the following secrets in the GitHub repository settings:
   - `CHROME_CLIENT_ID`
   - `CHROME_CLIENT_SECRET`
   - `CHROME_REFRESH_TOKEN`
   - `CHROME_EXTENSION_ID`
5. The workflow uses these credentials to upload and publish the ZIP created by `scripts/pack.sh`.

## Firefox Add-ons

1. Register for a Firefox Add-ons developer account.
2. Generate JWT credentials from <https://addons.mozilla.org/developers/addon/api/key/>.
3. Add the following secrets to the repository:
   - `FIREFOX_JWT_ISSUER`
   - `FIREFOX_JWT_SECRET`
4. `web-ext sign` is used to sign and upload the build to AMO.

## GitHub Actions workflow

The file `.github/workflows/publish.yml` provides a reference workflow. It is triggered when a Git tag beginning with `v` is pushed. The workflow:

1. Checks out the repository and installs dependencies.
2. Runs the test suite.
3. Packages the extension into `google-maps-list-filter-v<version>.zip`.
4. Uploads the package to the Chrome Web Store.
5. Signs and uploads the package to Firefox Add-ons.

The job runs inside the lightweight `node:18-bullseye-slim` container to speed
up setup and keep resource usage low.

Customize the workflow if additional steps are required for your project.
