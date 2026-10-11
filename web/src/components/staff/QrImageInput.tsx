"use client";

import { useState } from "react";

const MAX_SIDE = 1600;
const MAX_BYTES = 900_000; // the server takes about 1 MB per form

/** Shrinks a phone photo before upload. The QR stays sharp: 1600 px is plenty for the reader. */
async function shrink(file: File): Promise<File> {
  if (file.size <= MAX_BYTES && file.type !== "image/heic") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.9, 0.8, 0.65]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= MAX_BYTES) return new File([blob], "qr.jpg", { type: "image/jpeg" });
  }
  throw new Error("too big");
}

/** "Upload the QR": a photo or a screenshot. The server reads the code; the picture isn't kept. */
export default function QrImageInput({ hasQr }: { hasQr: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    setPreview(null);
    if (!file) return setStatus(null);
    setStatus("Preparing the picture…");
    try {
      const small = await shrink(file);
      const swap = new DataTransfer();
      swap.items.add(small);
      input.files = swap.files;
      setPreview(URL.createObjectURL(small));
      setStatus("Ready. Save to read the QR code.");
    } catch {
      input.value = "";
      setStatus("That picture couldn't be opened. Try a screenshot instead.");
    }
  };

  return (
    <div className="qr-upload">
      <label>
        {hasQr ? "Replace the QR code" : "QR code"} <small>photo or screenshot</small>
        <input type="file" name="qr" accept="image/*" onChange={onChange} />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen file */}
      {preview && <img src={preview} alt="The picture you chose" className="qr-upload-preview" />}
      {status && <small className="staff-help" role="status">{status}</small>}
    </div>
  );
}
