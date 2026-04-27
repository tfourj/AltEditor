import { ArrowDown, ArrowUp, Link, Smartphone, Tablet, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

import {
  getFileImageSize,
  getImageSize,
  getScreenshotLists,
  imageUploadEnabled,
  imgurClientId,
  imgurUploadUrl,
  type ScreenshotDevice,
  type ScreenshotObject,
  uploadToImgur,
} from "../lib/images";
import type { AltApp } from "../types";
import { Field, NumberField } from "./Fields";

function ScreenshotDeviceSection({
  device,
  items,
  addScreenshot,
  updateScreenshot,
  moveScreenshot,
  removeScreenshot,
  imageUploadEnabled,
}: {
  device: ScreenshotDevice;
  items: ScreenshotObject[];
  addScreenshot: (device: ScreenshotDevice, item: ScreenshotObject) => void;
  updateScreenshot: (device: ScreenshotDevice, index: number, item: ScreenshotObject) => void;
  moveScreenshot: (device: ScreenshotDevice, index: number, direction: -1 | 1) => void;
  removeScreenshot: (device: ScreenshotDevice, index: number) => void;
  imageUploadEnabled: boolean;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const label = device === "iphone" ? "iPhone" : "iPad";
  const Icon = device === "iphone" ? Smartphone : Tablet;
  const canUploadToImgur = imageUploadEnabled && Boolean(imgurClientId);

  const addURL = async () => {
    const imageURL = url.trim();
    if (!imageURL) return;
    setBusy(true);
    setStatus("");
    try {
      const size = await getImageSize(imageURL);
      addScreenshot(device, { imageURL, ...size });
      setStatus(`Added ${size.width}x${size.height}`);
    } catch {
      addScreenshot(device, { imageURL });
      setStatus("Added URL without size");
    } finally {
      setUrl("");
      setBusy(false);
    }
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!canUploadToImgur) {
      setStatus("Image uploads are disabled");
      return;
    }

    setBusy(true);
    setStatus(`Uploading ${file.name}`);
    try {
      const [localSize, uploaded] = await Promise.all([getFileImageSize(file), uploadToImgur(file)]);
      const width = uploaded.width ?? localSize.width;
      const height = uploaded.height ?? localSize.height;
      addScreenshot(device, { ...uploaded, width, height });
      setStatus(`Uploaded ${width}x${height}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screenshot-device">
      <div className="screenshot-device-header">
        <div>
          <h4>
            <Icon size={16} /> {label}
          </h4>
          <span>{items.length} screenshots</span>
        </div>
        <div className="button-row">
          {canUploadToImgur ? (
            <button className="secondary" disabled={busy} onClick={() => fileInput.current?.click()} type="button">
              <Upload size={15} /> Upload
            </button>
          ) : (
            <button className="secondary" onClick={() => window.open(imgurUploadUrl, "_blank", "noopener,noreferrer")} type="button">
              <Link size={15} /> Open Imgur
            </button>
          )}
          <input ref={fileInput} hidden type="file" accept="image/*" onChange={uploadFile} />
        </div>
      </div>

      <div className="screenshot-add-row">
        <input value={url} placeholder={`${label} screenshot URL`} onChange={(event) => setUrl(event.target.value)} />
        <button disabled={busy || !url.trim()} onClick={addURL} type="button">
          <Link size={15} /> Add link
        </button>
      </div>
      {status && <div className="screenshot-status">{status}</div>}

      {items.length ? (
        <div className="screenshot-grid">
          {items.map((item, index) => (
            <div className="screenshot-card" key={`${item.imageURL}-${index}`}>
              <div className="screenshot-frame">
                <img src={item.imageURL} alt={`${label} screenshot ${index + 1}`} />
              </div>
              <div className="screenshot-fields">
                <Field label="Image URL" value={item.imageURL} onChange={(imageURL) => updateScreenshot(device, index, { ...item, imageURL })} />
                <div className="grid two">
                  <NumberField label="Width" value={Number(item.width ?? 0)} onChange={(width) => updateScreenshot(device, index, { ...item, width })} />
                  <NumberField label="Height" value={Number(item.height ?? 0)} onChange={(height) => updateScreenshot(device, index, { ...item, height })} />
                </div>
                <button
                  className="secondary small-button"
                  onClick={() =>
                    void getImageSize(item.imageURL)
                      .then((size) => updateScreenshot(device, index, { ...item, ...size }))
                      .catch(() => setStatus("Could not read image size"))
                  }
                  type="button"
                >
                  Read size
                </button>
                <div className="screenshot-actions">
                  <button className="icon-button secondary" disabled={index === 0} onClick={() => moveScreenshot(device, index, -1)} type="button" aria-label={`Move ${label} screenshot up`}>
                    <ArrowUp size={16} />
                  </button>
                  <button className="icon-button secondary" disabled={index === items.length - 1} onClick={() => moveScreenshot(device, index, 1)} type="button" aria-label={`Move ${label} screenshot down`}>
                    <ArrowDown size={16} />
                  </button>
                  <button className="icon-button danger" onClick={() => removeScreenshot(device, index)} type="button" aria-label={`Remove ${label} screenshot`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty slim">No {label} screenshots</div>
      )}
    </div>
  );
}

export function ScreenshotEditor({ app, updateApp }: { app: AltApp; updateApp: (patch: Partial<AltApp>) => void }) {
  const lists = getScreenshotLists(app.screenshots);

  const setDeviceItems = (device: ScreenshotDevice, items: ScreenshotObject[]) => {
    const current = Array.isArray(app.screenshots) ? {} : app.screenshots ?? {};
    updateApp({
      screenshots: {
        ...current,
        iphone: device === "iphone" ? items : lists.iphone,
        ipad: device === "ipad" ? items : lists.ipad,
      },
    });
  };

  const moveDeviceItem = (device: ScreenshotDevice, index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= lists[device].length) return;
    const items = [...lists[device]];
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    setDeviceItems(device, items);
  };

  return (
    <section className="screenshot-manager">
      <div className="subsection-title">
        <h3>Screenshots</h3>
      </div>
      <div className="screenshot-devices">
        {(["iphone", "ipad"] as ScreenshotDevice[]).map((device) => (
          <ScreenshotDeviceSection
            key={device}
            device={device}
            items={lists[device]}
            imageUploadEnabled={imageUploadEnabled}
            addScreenshot={(target, item) => setDeviceItems(target, [...lists[target], item])}
            updateScreenshot={(target, index, item) => setDeviceItems(target, lists[target].map((current, itemIndex) => (itemIndex === index ? item : current)))}
            moveScreenshot={moveDeviceItem}
            removeScreenshot={(target, index) => setDeviceItems(target, lists[target].filter((_, itemIndex) => itemIndex !== index))}
          />
        ))}
      </div>
    </section>
  );
}
