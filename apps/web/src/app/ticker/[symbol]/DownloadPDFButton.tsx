"use client";

import { RefObject, useState } from "react";

export default function DownloadPDFButton({
  targetRef,
  filename,
}: {
  targetRef: RefObject<HTMLDivElement | null>;
  filename: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (!targetRef.current) return;
    setLoading(true);

    try {
      // Dynamic imports: these libraries are ~1.5 MB combined.
      // Importing them here (instead of at the top of the file) means they are
      // only downloaded when the user actually clicks the button, keeping the
      // initial page load fast.
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Screenshot the DOM node at 2× resolution for a crisp PDF.
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,  // allows cross-origin images (chart assets, etc.)
        logging: false,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // Scale the canvas to fit the page width exactly.
      const ratio = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;
      const imgData = canvas.toDataURL("image/png");

      // Multi-page: add the full image offset by one page height per page.
      // Each page "window" slides down the image.
      let yOffset = 0;
      let remaining = scaledH;

      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, yOffset, pdfW, scaledH);
        remaining -= pdfH;
        if (remaining > 0) {
          pdf.addPage();
          yOffset -= pdfH;
        }
      }

      pdf.save(filename);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5
                 text-sm font-medium text-slate-700 transition-colors
                 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50
                 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {loading ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          Generating…
        </>
      ) : (
        <>↓ Download PDF</>
      )}
    </button>
  );
}
