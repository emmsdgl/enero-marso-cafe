import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

/**
 * Reads the QR code in an uploaded photo or screenshot. ZXing (compiled to WebAssembly) reads
 * glossy, angled phone photos of printed QRs that lighter readers miss. Its engine is loaded
 * from our own install, never from a CDN; next.config.ts ships the file with the server.
 */
let ready: Promise<unknown> | null = null;
function prepare() {
  ready ??= readFile(path.join(process.cwd(), "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm")).then((wasm) =>
    prepareZXingModule({ overrides: { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer }, fireImmediately: true }),
  );
  return ready;
}

export async function readQrText(image: Blob): Promise<string | null> {
  await prepare();
  const found = await readBarcodes(image, { formats: ["QRCode"], tryHarder: true, tryRotate: true, tryInvert: true, tryDownscale: true, maxNumberOfSymbols: 1 });
  return found.find((r) => r.isValid)?.text ?? null;
}
