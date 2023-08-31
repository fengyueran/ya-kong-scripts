import fs from "fs/promises";
import fse from "fs-extra";
import { v4 } from "uuid";

const start = async () => {
  const [, , deviceConfigFile] = process.argv;
  const fuxaDeviceConfig: any = await fse.readJson(deviceConfigFile);

  const pubs = [];
  for (let i = 0; i < 1000; i += 1) {
    const key = `t_${v4().slice(0, 8)}-${v4().slice(0, 8)}`;

    fuxaDeviceConfig[1].tags[key] = {
      id: key,
      daq: {
        enabled: false,
        changed: true,
        interval: 60,
      },
      name: `test${i + 1}`,
      type: "Int16",
      address: `${i + 1}`,
      memaddress: "400000",
      timestamp: 1693466381950,
      value: null,
    };
    pubs.push({
      type: "tag",
      key: `test${i + 1}`,
      value: key,
      name: `${i + 1}`,
    });
  }
  fuxaDeviceConfig[2].tags["t_8593cc00-924e4309"].options.pubs = pubs;
  await fs.writeFile("output.json", JSON.stringify(fuxaDeviceConfig, null, 2));
};

start();
