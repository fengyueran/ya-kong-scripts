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
  0: "bool",
  1: "ushort",
  2: "short",
  3: "ushort",
  4: "short",
  5: "ulong",
  6: "long",
  7: "ulong",
  8: "long",
  9: "ulong",
  10: "long",
  11: "ulong",
  12: "long",
  13: "float",
  14: "float",
  15: "float",
  16: "float",
  17: "double",
  18: "double",
};

const functionCodeMap = {
  4: "300000",
  3: "400000",
  2: "100000",
  1: "000000",
};

const start = async () => {
  const [, , xlsxFile, sheetName, prefix, deviceConfigFile] = process.argv;
  const rows = readExcel(xlsxFile, sheetName);
  const newRows = _.uniqBy(rows, "registerNum");
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
};

start();
