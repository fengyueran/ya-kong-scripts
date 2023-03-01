import path from 'path';
import fs from 'fs-extra';
import { PDFDocument } from 'pdf-lib';

import { makeReportByTemplate } from './make-report-by-template';

export const isPDF = (path: string) => path.endsWith('.pdf');
export const isReportInfo = (path: string) => path.endsWith('_pdf_data.json');

const mergePDF = async (basePDF: ArrayBuffer, ffrPDF: ArrayBuffer) => {
  const ffrPDFDoc = await PDFDocument.load(ffrPDF);

  const basePDFDoc = await PDFDocument.load(basePDF);

  const copiedPages = await basePDFDoc.copyPages(
    ffrPDFDoc,
    ffrPDFDoc.getPageIndices()
  );
  copiedPages.forEach((page) => basePDFDoc.addPage(page));

  const bytes = await basePDFDoc.save();

  return bytes;
};

const readReportInfo = async (dir: string) => {
  const files = await fs.readdir(dir);
  const jsonFileName = files.find((f) => isReportInfo(f));
  const jsonFile = path.join(dir, jsonFileName);
  const reportInfo = await fs.readJSON(jsonFile);
  return reportInfo;
};

const makeReportInfo = async (ffrDir: string, lingxiDir: string) => {
  const STANDARD = '>0.7';
  const ffrReportInfo = await readReportInfo(ffrDir);

  const getFFRValue = (branchName: string) => {
    const { attentions } = ffrReportInfo;
    for (let i = 0; i < attentions.length; i += 1) {
      const { details } = attentions[i];
      const found = details.find((d) => d.branchName === branchName);
      if (found) {
        return found.degree.join(',');
      }
    }
  };

  const lingxiReportInfo = await readReportInfo(lingxiDir);
  Object.keys(lingxiReportInfo).forEach((key) => {
    lingxiReportInfo[key].dvffr = {
      value: getFFRValue(key),
      standard: STANDARD,
    };
  });
  ffrReportInfo.assessmentInfos = lingxiReportInfo;
  return ffrReportInfo;
};

const makeFFRReport = async (ffrDir: string, lingxiDir: string) => {
  const reportInfo = await makeReportInfo(ffrDir, lingxiDir);
  const report = await makeReportByTemplate(reportInfo, async (key) => {
    const data = await fs.readFile(path.join(ffrDir, key));
    return new Uint8Array(data);
  });
  return report;
};

const readLingxiReport = async (lingxiDir: string) => {
  const files = await fs.readdir(lingxiDir);
  const pdfFileName = files.find((f) => isPDF(f));
  const pdfFile = path.join(lingxiDir, pdfFileName);
  const pdfBuffer = await fs.readFile(pdfFile);
  return pdfBuffer;
};

export const makeReport = async (
  ffrDir: string,
  lingxiDir: string,
  outputPDFPath: string
) => {
  const ffrPDFBuffer = await makeFFRReport(ffrDir, lingxiDir);
  const basePDFBuffer = await readLingxiReport(lingxiDir);
  const jointed = await mergePDF(basePDFBuffer, ffrPDFBuffer);
  await fs.writeFile(outputPDFPath, jointed);
};