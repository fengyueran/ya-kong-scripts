import fs from "fs/promises";
import fse from "fs-extra";
import path from "path";
import { v4 } from "uuid";
import XLSX from "js-xlsx";

interface ExcelRow {
  name: string;
  offset: string;
  dataType: string;
  registerNum: string;
  functionCode: string;
  equipment: string;
  sheetName: string;
  ratio: string;
}

const readExcel = (xlsxFile) => {
  const targetColumnNameItems = [
    { colName: "英文名称", key: "name" },
    { colName: "数据类型", key: "dataType" },
    { colName: "功能码", key: "functionCode" },
    { colName: "寄存器号", key: "registerNum" },
    { colName: "位偏移", key: "offset" },
    { colName: "系数", key: "ratio" },
  ];

  const workbook = XLSX.readFile(xlsxFile);

  let allRows = [];

  const fileName = path.basename(xlsxFile).split(".")[0];
  Object.entries(workbook.Sheets).forEach(([sheetName, worksheet]) => {
    if (sheetName === "AI" || sheetName === "DI") {
      const rows = XLSX.utils.sheet_to_json(worksheet);
      const newRows = rows.map((row) => {
        const newRow = {};
        targetColumnNameItems.forEach(({ colName, key }) => {
          newRow[key] = row[colName];
        });
        return { ...newRow, equipment: fileName, sheetName };
      });
      const validRows = newRows.filter((r) => r.name);

      allRows = allRows.concat(validRows);
    }
  });

  return allRows;
};

const DataTypeMap = {
  0: "Bool",
  1: "UInt16",
  2: "Int16",
  3: "UInt16LE",
  4: "Int16LE",
  5: "UInt32",
  6: "Int32",
  7: "UInt32MLE",
  8: "Int32MLE",
  9: "UInt32MLE",
  10: "Int32MLE",
  11: "UInt32LE",
  12: "Int32LE",
  13: "Float32",
  14: "Float32MLE",
  15: "Float32MLE",
  16: "Float32LE",
  17: "Float64",
  18: "Float64LE",
};

const FunctionCodeMap = {
  16: "300000",
  6: "300000",
  5: "000000",
  4: "300000",
  3: "400000",
  2: "100000",
  1: "000000",
};

const uniqBy = (arr: ExcelRow[], key: string) => {
  const unique = [];
  const repeated = [];
  for (let i = 0; i < arr.length; i++) {
    const found = unique.find(
      (v) =>
        v[key] === arr[i][key] &&
        v.functionCode === arr[i].functionCode &&
        v.sheetName === arr[i].sheetName
    );
    if (found) {
      found.dataType = "Bit"; //hack
      repeated.push(arr[i]);
    } else {
      unique.push(arr[i]);
    }
  }
  return [unique, repeated];
};

const getAllXlsxFiles = async (sourceDir: string) => {
  const files = await fse.readdir(sourceDir);
  const validFiles = files.filter(
    (f) => f.endsWith(".xlsx") && !f.startsWith(".")
  );
  return validFiles;
};

const getDataType = (customDataType: string, functionCode: string) => {
  if (customDataType === "0") {
    return functionCode === "1" || functionCode === "2"
      ? DataTypeMap[0]
      : DataTypeMap[2];
  }
  return DataTypeMap[customDataType];
};

const makeTagInfo = (
  tagBaseInfo: {
    id: string;
    slaveID: string;
    prefix: string;
  } & ExcelRow
) => {
  const {
    id,
    slaveID,
    equipment,
    name,
    dataType,
    registerNum,
    functionCode,
    prefix,
    ratio,
  } = tagBaseInfo;
  const tagInfo = {
    id,
    daq: {
      enabled: false,
      changed: true,
      interval: 60,
    },
    name: `${prefix}_${equipment}_${name}`,
    type: getDataType(dataType, functionCode),
    address: Number(registerNum) + 1,
    slaveID,
    memaddress: FunctionCodeMap[functionCode],
    timestamp: Date.now(),
    value: null,
  };
  if (ratio) {
    (tagInfo as any).divisor = (1 / Number(ratio)).toString();
  }
  return tagInfo;
};

const makeTags = (prefix: string, slaveID: string, excelRows: ExcelRow[]) => {
  const tags = {};
  excelRows.forEach((row) => {
    const tagID = `t_${v4().slice(0, 8)}-${v4().slice(0, 8)}`;
    tags[tagID] = makeTagInfo({ id: tagID, slaveID, prefix, ...row });
  });
  return tags;
};

const start = async () => {
  console.log("******************Start************************");
  const [, , ...parameters] = process.argv;
  if (parameters.length < 3) {
    console.log(
      "useage: yarn create:fuxaDevicesConfig <inputDir> <scabName> <fuxaDevicesJSONFile>"
    );
    return;
  }

  const [inputDir, prefix, deviceConfigFile] = parameters;

  const xlsxFiles = await getAllXlsxFiles(inputDir);

  const fuxaDeviceConfig = await fse.readJson(deviceConfigFile);

  const allRepeatedRows = xlsxFiles.reduce((pre, fileName) => {
    const rowInfos = readExcel(path.join(inputDir, fileName));
    const [uniqueRows, repeatedRows] = uniqBy(rowInfos, "registerNum");

    const deviceConfig = fuxaDeviceConfig.find(({ name }) =>
      fileName.startsWith(name)
    );
    deviceConfig.tags = makeTags(
      prefix,
      deviceConfig.property.slaveid,
      uniqueRows
    );

    return [...pre, ...repeatedRows];
  }, []);

  await fs.writeFile(
    "output/devices.json",
    JSON.stringify(fuxaDeviceConfig, null, 2)
  );
  await fs.writeFile(
    "output/tag-removed.json",
    JSON.stringify(allRepeatedRows, null, 2)
  );
  console.log(
    "******************congratulations, generate fuxa devices config success!!!************************"
  );
};

start();
