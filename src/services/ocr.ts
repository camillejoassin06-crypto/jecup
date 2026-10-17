// JecUp Scan : abstraction OCR (PDF texte, PDF scanné, photos) + contrôles qualité.

export interface PageQuality {
  name: string;
  blurry: boolean;
  sharpness: number;
  duplicateOf?: string;
  previewUrl: string;
}

export interface OcrResult {
  text: string;
  pages: number;
  quality: PageQuality[];
  engine: "texte" | "pdf" | "tesseract";
}

export interface OcrEngine {
  recognize(images: Blob[], onProgress?: (p: number) => void): Promise<string[]>;
}

/** Moteur par défaut : Tesseract.js côté navigateur (français). Remplaçable par un OCR serveur. */
export const tesseractEngine: OcrEngine = {
  async recognize(images, onProgress) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("fra");
    const out: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        const { data } = await worker.recognize(images[i]);
        out.push(data.text);
        onProgress?.((i + 1) / images.length);
      }
    } finally {
      await worker.terminate();
    }
    return out;
  },
};

let engine: OcrEngine = tesseractEngine;
export const setOcrEngine = (e: OcrEngine) => (engine = e);

const pageMark = (n: number) => `--- page ${n} ---`;

export async function extractFromFiles(files: File[], onProgress?: (p: number, label: string) => void): Promise<OcrResult> {
  const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
  const images = files.filter((f) => f.type.startsWith("image/"));
  const texts = files.filter((f) => /\.(txt|md|markdown)$/i.test(f.name) || f.type.startsWith("text/"));

  if (texts.length && !pdfs.length && !images.length) {
    const parts = await Promise.all(texts.map((f) => f.text()));
    return { text: parts.join("\n\n"), pages: texts.length, quality: [], engine: "texte" };
  }
  if (pdfs.length) {
    return extractPdf(pdfs[0], onProgress);
  }
  // photos : ordre probable (nom de fichier puis date), contrôle du flou et des doublons
  const ordered = [...images].sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }) || a.lastModified - b.lastModified);
  onProgress?.(0.05, "Contrôle de la qualité des pages…");
  const quality = await analyzeImages(ordered);
  const usable = ordered.filter((_, i) => !quality[i].duplicateOf);
  onProgress?.(0.1, "Lecture du texte (OCR)…");
  const pagesText = await engine.recognize(usable, (p) => onProgress?.(0.1 + p * 0.9, "Lecture du texte (OCR)…"));
  return {
    text: pagesText.map((t, i) => `${pageMark(i + 1)}\n${cleanOcr(t)}`).join("\n\n"),
    pages: usable.length,
    quality,
    engine: "tesseract",
  };
}

async function extractPdf(file: File, onProgress?: (p: number, label: string) => void): Promise<OcrResult> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  const scanned: number[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // reconstruit les lignes à partir de la position verticale des fragments
    let lastY: number | null = null;
    let text = "";
    for (const item of content.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 4) text += "\n";
      text += item.str;
      if (item.hasEOL) text += "\n";
      lastY = y ?? lastY;
    }
    if (text.replace(/\s/g, "").length < 30) scanned.push(i);
    pages.push(text);
    onProgress?.((i / pdf.numPages) * 0.5, "Lecture du PDF…");
  }
  let usedOcr = false;
  if (scanned.length) {
    // PDF scanné : rendu des pages en image puis OCR
    const blobs: Blob[] = [];
    for (const n of scanned) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      blobs.push(await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png")));
    }
    const texts = await engine.recognize(blobs, (p) => onProgress?.(0.5 + p * 0.5, "OCR des pages scannées…"));
    scanned.forEach((n, i) => (pages[n - 1] = cleanOcr(texts[i])));
    usedOcr = true;
  }
  return {
    text: pages.map((t, i) => `${pageMark(i + 1)}\n${t.trim()}`).join("\n\n"),
    pages: pdf.numPages,
    quality: [],
    engine: usedOcr ? "tesseract" : "pdf",
  };
}

function cleanOcr(t: string) {
  return t
    .replace(/[|]{2,}/g, "")
    .replace(/-\n(?=[a-zà-ÿ])/g, "") // césures
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Netteté (variance du laplacien) et empreinte moyenne (aHash) pour détecter flou et doublons. */
async function analyzeImages(files: File[]): Promise<PageQuality[]> {
  const res: PageQuality[] = [];
  const hashes: { name: string; hash: string }[] = [];
  for (const f of files) {
    const previewUrl = URL.createObjectURL(f);
    const bmp = await createImageBitmap(f);
    const w = 256, h = Math.max(1, Math.round((bmp.height / bmp.width) * 256));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    let sum = 0, sum2 = 0, n = 0;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const lap = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
        sum += lap;
        sum2 += lap * lap;
        n++;
      }
    const variance = sum2 / n - (sum / n) ** 2;
    // aHash 8x8
    const small = document.createElement("canvas");
    small.width = 8;
    small.height = 8;
    const sctx = small.getContext("2d")!;
    sctx.drawImage(bmp, 0, 0, 8, 8);
    const px = sctx.getImageData(0, 0, 8, 8).data;
    const g = Array.from({ length: 64 }, (_, i) => (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3);
    const avg = g.reduce((a, b) => a + b, 0) / 64;
    const hash = g.map((v) => (v > avg ? "1" : "0")).join("");
    const dup = hashes.find((x) => hamming(x.hash, hash) <= 3);
    hashes.push({ name: f.name, hash });
    res.push({ name: f.name, sharpness: Math.round(variance), blurry: variance < 60, duplicateOf: dup?.name, previewUrl });
  }
  return res;
}

const hamming = (a: string, b: string) => [...a].reduce((t, c, i) => t + (c !== b[i] ? 1 : 0), 0);
