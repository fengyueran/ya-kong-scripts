import fs from "fs/promises";
import fse from "fs-extra";
import path from "path";
import { v4 } from "uuid";
import XLSX from "js-xlsx";

const readExcel = (xlsxFile) => {
  const targetColumnNameItems = [
    { colName: "英文名称", key: "name" },
    { colName: "数据类型", key: "dataType" },
    { colName: "功能码", key: "functionCode" },
    { colName: "寄存器号", key: "registerNum" },
    { colName: "位偏移", key: "offset" },
  ];

  const workbook = XLSX.readFile(xlsxFile);

  let allRows = [];

  const fileName = path.basename(xlsxFile).split(".")[0];
  Object.entries(workbook.Sheets).forEach(([sheetName, worksheet]) => {
    const rows = XLSX.utils.sheet_to_json(worksheet);
    const newRows = rows.map((row) => {
      const newRow = {};
      targetColumnNameItems.forEach(({ colName, key }) => {
        newRow[key] = row[colName];
      });
      return { ...newRow, type: fileName, sheetName };
    });
    const validRows = newRows.filter((r) => r.name);

    allRows = allRows.concat(validRows);
  });

  return allRows;
};

const dataTypeMap = {
  0: "Bool",
  1: "UInt16LE",
  2: "Int16LE",
  3: "UInt16",
  4: "Int16",
  5: "UInt32LE",
  6: "Int32LE",
  7: "UInt32MLE", //BADC?
  8: "Int32MLE", //BADC?
  9: "UInt32MLE", //CDAB?
  10: "Int32MLE", //CDAB?
  11: "UInt32",
  12: "Int32",
  13: "Float32LE",
  14: "Float32MLE", //BADC
  15: "Float32MLE", //CDAB
  16: "Float32",
  17: "Float32LE",
  18: "Float64LE", //GHEFCDAB
  Bit: "Bit",
};

const functionCodeMap = {
  16: "300000",
  6: "300000",
  5: "000000",
  4: "300000",
  3: "400000",
  2: "100000",
  1: "000000",
};

const getBaseTagName = (tagName: string) => {
  const res = tagName.match(/\D+/);
  return res[0];
};

const uniqBy = (arr: any[], key: string) => {
  const uniqueArr = [];
  const removed = [];
  for (let i = 0; i < arr.length; i++) {
    const found = uniqueArr.find(
      (v) =>
        v[key] === arr[i][key] &&
        v.functionCode === arr[i].functionCode &&
        v.sheetName === arr[i].sheetName
    );
    if (found) {
      found.dataType = "Bit"; //hack
      removed.push(arr[i]);
    } else {
      uniqueArr.push(arr[i]);
    }
  }
  return [uniqueArr, removed];
};

const getAllExcels = async (sourceDir: string) => {
  const files = await fse.readdir(sourceDir);
  const validFiles = files.filter(
    (f) => f.endsWith(".xlsx") && !f.startsWith(".")
  );

  return validFiles;
};

const start = async () => {
  const [, , inputDir, prefix, deviceConfigFile] = process.argv;
  const validXlsxFiles = await getAllExcels(inputDir);

  const fuxaDeviceConfig: any = await fse.readJson(deviceConfigFile);

  let removedRows = [];
  for (let i = 0; i < validXlsxFiles.length; i += 1) {
    const currentName = validXlsxFiles[i];
    const rows = readExcel(path.join(inputDir, currentName));
    const [newRows, removed] = uniqBy(rows, "registerNum");
    removedRows = [...removedRows, ...removed];
    const deviceConfig = fuxaDeviceConfig.find(({ name }) =>
      currentName.startsWith(name)
    );

    newRows.forEach((row) => {
      const key = `t_${v4().slice(0, 8)}-${v4().slice(0, 8)}`;

      deviceConfig.tags[key] = {
        id: key,
        daq: {
          enabled: false,
          changed: true,
          interval: 60,
        },
        name: `${prefix}_${row.type}_${row.name}`,
        type: dataTypeMap[row.dataType],
        address: Number(row.registerNum) + 1,
        memaddress: functionCodeMap[row.functionCode],
        timestamp: 1693466381950,
        value: null,
      };
    });
  }

  await fs.writeFile("output.json", JSON.stringify(fuxaDeviceConfig, null, 2));
  await fs.writeFile("removed.json", JSON.stringify(removedRows, null, 2));
};

start();
