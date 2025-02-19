import { DocumentLoader } from "@langchain/core/document_loaders/base";
import { Document } from "@langchain/core/documents";
import pdf from "pdf-parse";
import PDFParser from "pdf2json";
import * as pdfjsLib from "pdfjs-dist";
import { documentProcessor } from "./document-processor";

interface PDFPage {
  Texts: Array<{
    R: Array<{ T: string }>;
  }>;
}

interface PDFData {
  formImage: {
    Pages: PDFPage[];
  };
}

export class CustomPDFLoader implements DocumentLoader {
  file: File | Buffer;

  constructor(file: File | Buffer) {
    console.log("CustomPDFLoader instantiated with file:", file);
    console.log("File type:", typeof file);
    if (file instanceof File) {
      console.log("File name:", file.name);
      console.log("File size:", file.size);
    }
    this.file = file;
  }

  private async getFileBuffer(): Promise<Buffer> {
    if (
      "arrayBuffer" in this.file &&
      typeof this.file.arrayBuffer === "function"
    ) {
      const arrayBuffer = await this.file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(this.file)) {
      return this.file;
    } else {
      throw new Error("Unsupported file type");
    }
  }

  async extractText(): Promise<string> {
    const fileBuffer = await this.getFileBuffer();
    const data = await pdf(fileBuffer);
    return data.text;
  }

  async extractLinks(): Promise<string[]> {
    const fileBuffer = await this.getFileBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
    });
    const pdfDocument = await loadingTask.promise;
    const links: string[] = [];

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const annotations = await page.getAnnotations();

      annotations.forEach((annotation) => {
        if (annotation.url) {
          links.push(annotation.url);
        }
      });
    }

    return links;
  }

  async extractTables(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);
      const tables: string[] = [];

      pdfParser.on("pdfParser_dataReady", (pdfData: unknown) => {
        const data = pdfData as PDFData;
        data.formImage.Pages.forEach((page) => {
          page.Texts.forEach((text) => {
            if (text.R[0]?.T?.match(/\d{2,}/)) {
              tables.push(decodeURIComponent(text.R[0].T));
            }
          });
        });
        resolve(tables);
      });

      pdfParser.on("pdfParser_dataError", (errData) => reject(errData));

      this.getFileBuffer()
        .then((fileBuffer) => {
          pdfParser.parseBuffer(fileBuffer);
        })
        .catch(reject);
    });
  }

  async load(): Promise<Document[]> {
    const text = await this.extractText();
    const links = await this.extractLinks();
    const tables = await this.extractTables();

    const docs: Document[] = [];

    docs.push(
      new Document({
        pageContent: text,
        metadata: {
          source: this.file instanceof File ? this.file.name : "Uploaded File",
          type: "text",
        },
      })
    );

    links.forEach((link) =>
      docs.push(
        new Document({
          pageContent: `Link: ${link}`,
          metadata: {
            source:
              this.file instanceof File ? this.file.name : "Uploaded File",
            type: "link",
          },
        })
      )
    );

    tables.forEach((table) =>
      docs.push(
        new Document({
          pageContent: `Table Data: ${table}`,
          metadata: {
            source:
              this.file instanceof File ? this.file.name : "Uploaded File",
            type: "table",
          },
        })
      )
    );

    return docs;
  }

  async loadAndSplit(): Promise<Document[]> {
    const docs = await this.load();
    const processedDocs = docs.map((doc) => ({
      content: doc.pageContent,
      metadata: {
        source: this.file instanceof File ? this.file.name : "Uploaded File",
        type: doc.metadata.type as string,
        size: this.file instanceof File ? this.file.size : 0,
      },
    }));

    return documentProcessor.splitDocuments(processedDocs);
  }
}

export default CustomPDFLoader;
