// Type declaration for pdf-parse deep import (ESM workaround for test-file interference)
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: any;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer, options?: Record<string, any>): Promise<PDFData>;
  export default pdfParse;
}
