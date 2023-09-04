import fs from "fs/promises";
import fse from "fs-extra";
import { v4 } from "uuid";
import XLSX from "js-xlsx";
import * as _ from "lodash";

const readExcel = (xlsxFile, sheetName) => {
  const targetColumnNameItems = [
    { colName: "英文名称", key: "name" },
    { colName: "数据类型", key: "dataType" },
    { colName: "功能码", key: "functionCode" },
    { colName: "寄存器号", key: "registerNum" },
    { colName: "位偏移", key: "offset" },
  ];

  const workbook = XLSX.readFile(xlsxFile, {});
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);
  const newRows = rows.map((row) => {
    const newRows = {};
    targetColumnNameItems.forEach(({ colName, key }) => {
      newRows[key] = row[colName];
    });
    return newRows;
  });
  return newRows;
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
};

const functionCodeMap = {
  6: "300000",
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
        v.name !== arr[i].name &&
        getBaseTagName(v.name) === getBaseTagName(arr[i].name) &&
        v[key] === arr[i][key]
    );
    if (found) {
      removed.push(arr[i]);
    } else {
      uniqueArr.push(arr[i]);
    }
  }
  return [uniqueArr, removed];
};

const start = async () => {
  const [, , xlsxFile, sheetName, prefix, deviceConfigFile] = process.argv;
  const rows = readExcel(xlsxFile, sheetName);
  const [newRows, removed] = uniqBy(rows, "registerNum");
  const fuxaDeviceConfig: any = await fse.readJson(deviceConfigFile);

  newRows.forEach((row) => {
    const key = `t_${v4().slice(0, 8)}-${v4().slice(0, 8)}`;

    fuxaDeviceConfig[1].tags[key] = {
      id: key,
      daq: {
        enabled: false,
        changed: true,
        interval: 60,
      },
      name: `${prefix}_${row.name}`,
      type: dataTypeMap[row.dataType],
      address: row.offset,
      memaddress: functionCodeMap[row.functionCode],
      timestamp: 1693466381950,
      value: null,
    };
  });

  await fs.writeFile("output.json", JSON.stringify(fuxaDeviceConfig, null, 2));
  console.log("----------------removed", removed);
};

start();
