import PDFGenerator from '@cc/pdf-generator';
import path from 'path';

import { string2base64, streamToBuffer } from '../utils';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
global.window = { btoa: string2base64 };

export interface ImageSource {
  type: 'image';
  name: string;
  data: Uint8Array;
}

interface AttentionDetail {
  position: string;
  branchName: string;
  degree: string[];
}

export interface Attention {
  branch: string;
  details: AttentionDetail[];
}

export interface Branch {
  name: string;
  imageLeft: string;
  imageRight: string;
}

export interface RemarkProps {
  remark: string;
  length: number;
}

interface AssessmentType {
  vessel: string;
  stenosisDegree: string;
  calcificationDegree: string;
  fai: string;
  dvffr: string;
  characteristics: string;
}

export interface ReportInfo {
  age: number | string;
  attentions: Attention[];
  branches: Branch[];
  checkDate: string;
  opinion: string;
  gender: string;
  hospital: string;
  patientId: string;
  isShowDisclaimer: boolean;
  patientName: string;
  reportDate: string;
  reportId: string;
  remark: string;
  Reporter: string;
  Reviewer: string;
  ctNumber?: string;
  qrCode?: string;
  assessmentInfos: AssessmentType[];
  sphereImg: string;
  startPage: number;
}

const SourceHanSansSCNormal = path.resolve(
  __filename,
  '../../assets/fonts/SourceHanSansSC-Normal.ttf'
);
const SourceHanSansSCMedium = path.resolve(
  __filename,
  '../../assets/fonts/SourceHanSansSC-Medium.ttf'
);

export const makeReportByTemplate = async (
  reportInfo: ReportInfo,
  getImageData: (name: string) => Promise<Uint8Array>,
  template: any,
  language = 'zh'
) => {
  const report = new PDFGenerator(template, { language });
  report.setData(reportInfo);
  report.addFont('SourceHanSansSCNormal', SourceHanSansSCNormal);
  report.addFont('SourceHanSansSCMedium', SourceHanSansSCMedium);

  const promises = reportInfo.branches
    .flatMap((branch) => [branch.imageLeft, branch.imageRight])
    .filter((filename) => !!filename)
    .map(async (filename) => {
      const imageData = await getImageData(filename);
      report.addImage(filename, imageData);
    });

  await Promise.all(promises);

  try {
    const sphereImg = await getImageData(reportInfo.sphereImg);
    report.addImage(reportInfo.sphereImg, sphereImg);
  } catch (error) {
    console.warn('There is no sphere');
  }

  const pdf = await report.toPDF();
  const pdfStream = await pdf.toBuffer();
  const buffer = await streamToBuffer(pdfStream);

  return buffer;
};
