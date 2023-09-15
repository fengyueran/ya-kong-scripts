import fs from "fs-extra";

export const makeCode = (tagMap) => {
  const code = `
  const tagMap = ${JSON.stringify(tagMap)};
  Object.entries(tagMap).forEach(([groupName, tags]) => {
      const tag = $getTagFromName(groupName);
      if (tag) {
        const bitString = tag.toString(2).padStart(tags.length, "0");
        for (let i = 0; i < tags.length; i++) {
          $setTagFromName(tags[i], bitString[i]);
        }
      }
    });
`;
  return code;
};

// const run = (tagMap) => {
//   const code = makeCode(JSON.stringify(tagMap));
//   fs.writeFileSync("output/code.js", code);
// };

// run();
