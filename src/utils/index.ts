export const string2base64 = (string) => {
  const uintArray = new Uint8Array(
    string.split('').map(function (char) {
      return char.charCodeAt(0);
    })
  );

  const buff = Buffer.from(uintArray);
  return buff.toString('base64');
};

export const streamToBuffer = (
  stream: NodeJS.ReadableStream
): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream.on('error', reject);
    stream.on('data', (data) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
};
