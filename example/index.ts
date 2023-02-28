import {
  CaseMaker,
  parseDicom,
  QCInfoMaker,
  Anonymous,
  SeriesDirConstructor,
  ThumbnailMaker,
} from '../src';

const startAnonymous = (dicomDir: string) => {
  const anonymous = new Anonymous();
  anonymous.process({ dicomDir }, (message) => {
    console.log('Anonymous onMessage', message);
  });
};

const startMakeCase = (dicomDir: string) =>
  new Promise((resolve, reject) => {
    const Conifg = {
      procedureStepLabel: 'DVFFR Analysis',
      contributingEquipment: 'oommgg.onprem.deepvessel.net',
      dicomWithStudyLevel: true,
    };

    const caseMaker = CaseMaker(Conifg, {
      onCompleted: (message) => {
        console.log('Make case completed', message);
        resolve(message);
      },
      onProgress: (message) => {
        console.log('Make case onProgress', message);
      },
      onError: (message) => {
        console.log('Make case error', message);
        reject(message);
      },
    });

    caseMaker.start({ dicomDir });
  });

const startParseDicom = async (dicomDir: string) => {
  const parseResult = await parseDicom(dicomDir);
  console.log('parseResult', parseResult);
};

const test = async () => {
  console.time('Make Case');
  const dicomDir = process.argv[2];
  if (dicomDir) {
    // await startAnonymous(dicomDir);
    // await startParseDicom(dicomDir);
    await startMakeCase(dicomDir);
    console.timeEnd('Make Case');
  } else {
    console.log(`
      illegal: Please run with dicom dir path
      usage: yarn dev dicomDir
      `);
  }
};

test();
