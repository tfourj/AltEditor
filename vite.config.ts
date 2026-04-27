import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from "vite";

const freeimageUploadPlugin = (): Plugin => {
  const attachMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use("/api/freeimage-upload", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ status_txt: "Method not allowed" }));
        return;
      }

      const apiKey = process.env.VITE_FREEIMAGE_HOST_API_KEY;
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ status_txt: "Freeimage.host API key is not configured" }));
        return;
      }

      try {
        const incomingForm = await new Request("http://localhost/api/freeimage-upload", {
          method: "POST",
          headers: req.headers as HeadersInit,
          body: req,
          duplex: "half",
        } as RequestInit & { duplex: "half" }).formData();
        const source = incomingForm.get("source");
        if (!source) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ status_txt: "Missing image source" }));
          return;
        }

        const outgoingForm = new FormData();
        outgoingForm.append("key", apiKey);
        outgoingForm.append("action", "upload");
        outgoingForm.append("format", "json");
        outgoingForm.append("source", source);

        const uploadResponse = await fetch("https://freeimage.host/api/1/upload", {
          method: "POST",
          body: outgoingForm,
        });
        const text = await uploadResponse.text();
        res.statusCode = uploadResponse.status;
        res.setHeader("content-type", uploadResponse.headers.get("content-type") ?? "application/json");
        res.end(text);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ status_txt: error instanceof Error ? error.message : "Image upload failed" }));
      }
    });
  };

  return {
    name: "freeimage-upload-proxy",
    configureServer: attachMiddleware,
    configurePreviewServer: attachMiddleware,
  };
};

export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  return {
    plugins: [react(), freeimageUploadPlugin()],
  };
});
