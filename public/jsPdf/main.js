import { jsPDF } from "jspdf";
import * as pdfjsLib from './node_modules/pdfjs-dist/build/pdf.mjs';
import * as pdfjsWorker from "./node_modules/pdfjs-dist/build/pdf.worker.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs-dist/build/pdf.worker.mjs";

export { jsPDF, pdfjsLib };
