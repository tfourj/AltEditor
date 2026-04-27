# AltEditor

AltStore PAL repository editor. Create, import, and manage AltStore source JSON files in the browser. Inspired by [altstudio.app](https://altstudio.app).

## Features

- Create and edit AltStore PAL source repositories
- Import source JSON from a local file
- Manage apps with multiple versions, permissions, and screenshots
- Scan IPA and ADP archives to extract app metadata
- News and announcement management
- Source validation with inline issue reporting
- Export formatted JSON for distribution
- All data persists locally in the browser (localStorage)

## Image uploads

Image uploads can use the Imgur API directly from the browser. Set these Vite environment variables before building:

```sh
VITE_ENABLE_IMAGE_UPLOAD=true
VITE_IMGUR_CLIENT_ID=your_imgur_client_id
```

When `VITE_ENABLE_IMAGE_UPLOAD` is not `true`, the app shows an Open Imgur button instead.
