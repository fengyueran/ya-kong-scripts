import fs from "fs/promises";
import XLSX from "js-xlsx";

const start = async () => {
  const [, , xlsxFile, sheetName, prefix, rowName] = process.argv;
  const workbook = XLSX.readFile(xlsxFile, {});
  console.log(workbook);
  const worksheet = workbook.Sheets[sheetName];
  const sheetJSONArray = XLSX.utils.sheet_to_json(worksheet);
  const names = sheetJSONArray.map((row) => {
    return `${prefix}${row[rowName]}`;
  });
  await fs.writeFile("output.json", JSON.stringify(names, null, 2));
};

start();
