# report-maker

输入 ffr 文件夹和灵析文件夹并合并为一个 pdf。

### dev

根目录下执行:

```
//tag为可选，可以是多个
yarn dev ffrDataDir lingxiDataDir outputPDFPath [...tag]
$ yarn dev ./ffrData ./lingxiData ./merged.pdf patientName=123
```

### build

在根目录执行:

- yarn buildBundle

  会在根目录 dist 目录下生成合并 pdf 的脚本，该脚本最终在 server 端使用。

  ```
  node dist/script/make-report.js ffrDataDir lingxiDataDir outputPDFPath [...tag]
  ```

- yarn buildBundleAndUpload

  会在根目录 dist 目录下生成合并 pdf 的脚本并将其上传至对应的 server 文件夹下。
