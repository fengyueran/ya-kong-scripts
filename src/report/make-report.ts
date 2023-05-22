import path from 'path';
import fs from 'fs-extra';
import React from 'react';
import PdfRender from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';

import { makeReportByTemplate, ReportInfo } from './make-report-by-template';

interface PatientInfo {
  patientName?: string;
  patientId?: string;
  ctNumber?: string;
}

const isPDF = (path: string) => path.endsWith('.pdf');
const isLingXiPDF = (path: string) => path.endsWith('_combine.pdf');
const isReportInfo = (path: string) => path.endsWith('_pdf_data.json');

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
  const STANDARD = '>0.8';
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

  const { findings, RADS, ...lingxiReportInfo } = await readReportInfo(
    lingxiDir
  );
  Object.keys(lingxiReportInfo).forEach((key) => {
    const ffr = getFFRValue(key);

    lingxiReportInfo[key].dvffr = {
      value: ffr,
      standard: STANDARD,
    };
  });
  ffrReportInfo.assessmentInfos = lingxiReportInfo;
  ffrReportInfo.sphereImg = 'sphere.png';

  return ffrReportInfo;
};

const makeTemplate = (templateStr: string) => {
  try {
    // eslint-disable-next-line
    const exports = {};
    // eslint-disable-next-line
    const require = (file: string) => {
      if (file === 'react') return React;
      if (file === '@react-pdf/renderer') return PdfRender;
      return null;
    };
    // eslint-disable-next-line
    const pdfTemplate = eval(templateStr);

    return pdfTemplate.document || pdfTemplate;
  } catch (error) {
    throw new Error(`makeTemplate error:${(error as Error).message}`);
  }
};

const makeFFRReport = async (
  ffrDir: string,
  lingxiDir: string,
  lingxiReportPageCount: number,
  patientInfo: PatientInfo
) => {
  const reportInfo = await makeReportInfo(ffrDir, lingxiDir);
  const mergedInfo: ReportInfo = {
    ...reportInfo,
    ...patientInfo,
    startPage: lingxiReportPageCount,
  };

  const templateFile = path.join(lingxiDir, '__template.js');
  const templateStr = await fs.readFile(templateFile, 'utf-8');
  const template = makeTemplate(templateStr);

  const report = await makeReportByTemplate(
    mergedInfo,
    async (key) => {
      const data = await fs.readFile(path.join(ffrDir, key));
      return new Uint8Array(data);
    },
    template
  );
  return report;
};

const readLingXiReport = async (lingxiDir: string) => {
  const files = await fs.readdir(lingxiDir);
  let pdfFileName = files.find((f) => isLingXiPDF(f));
  if (!pdfFileName) {
    pdfFileName = files.find((f) => isPDF(f));
  }
  const pdfFile = path.join(lingxiDir, pdfFileName);
  const pdfBuffer = await fs.readFile(pdfFile);
  return pdfBuffer;
};

export const makeReport = async (
  ffrDir: string,
  lingxiDir: string,
  outputPDFPath: string,
  patientInfo: PatientInfo
) => {
  const basePDFBuffer = await readLingXiReport(lingxiDir);
  const basePDFDoc = await PDFDocument.load(basePDFBuffer);
  const pageCount = basePDFDoc.getPageCount();

  const ffrPDFBuffer = await makeFFRReport(
    ffrDir,
    lingxiDir,
    pageCount,
    patientInfo
  );

  const jointed = await mergePDF(basePDFBuffer, ffrPDFBuffer);
  await fs.writeFile(outputPDFPath, jointed);
};
