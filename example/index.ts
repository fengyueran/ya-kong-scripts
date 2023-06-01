import { makeReport } from '../src';

// tagInput:'patientName=123'
const formatTag = (tagInput: string) => {
  const matched = tagInput.match(/(\w+)=(\w+)/);
  if (matched?.length >= 3) {
    return { [matched[1]]: matched[2] };
  }
  return {};
};

const formatTags = (tagInputs: string[]) => {
  return tagInputs.reduce(
    (accumulator, current) => ({
      ...accumulator,
      ...formatTag(current),
    }),
    {}
  );
};

const test = async () => {
  console.time('Make Report');
  const [, , ffrDir, lingxiDir, outputPDFPath, ...tags] = process.argv;
  if (ffrDir && lingxiDir) {
    const patientInfo = formatTags(tags);
    await makeReport(ffrDir, lingxiDir, outputPDFPath, patientInfo);
    console.timeEnd('Make Report');
  } else {
    console.log(`
      usage: xx ffrDataDir lingxiDataDir outputPDFPath [...tag]
      `);
  }
};

test();
