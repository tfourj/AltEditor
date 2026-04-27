import { Image } from "lucide-react";

export function ImagePreview({ url, label }: { url?: string; label: string }) {
  return <div className="image-preview">{url ? <img src={url} alt={label} /> : <Image size={22} />}</div>;
}
