import { makeReport } from '../src';

const test = async () => {
  console.time('Make Report');
  const [, , basePDF, ffrInfoJSON, outputPDFPath] = process.argv;

  if (basePDF && ffrInfoJSON) {
    await makeReport(basePDF, ffrInfoJSON, outputPDFPath);
    console.timeEnd('Make Report');
  } else {
    console.log(`
      usage: yarn dev ffrDir lingxiDir outputPDFPath
      `);
  }
};

test();
