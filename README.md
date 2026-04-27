# AltEditor
AltStore PAL Repository Editor

## Image uploads

Image uploads can use the Imgur API directly from the browser. Set these Vite environment variables before building:

```sh
VITE_ENABLE_IMAGE_UPLOAD=true
VITE_IMGUR_CLIENT_ID=your_imgur_client_id
```

When `VITE_ENABLE_IMAGE_UPLOAD` is not `true`, the app shows an Open Imgur button instead.
