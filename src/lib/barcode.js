// Walmart-GC Checkout Code 128 Barcode Renderer logic
// Ports stable phase-12 checksum and SVG rect module calculations.

const code128Patterns = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

export function getCode128CValues(payload) {
  if (!/^\d+$/.test(payload) || payload.length % 2 !== 0) {
    return [];
  }

  const values = [105];
  for (let index = 0; index < payload.length; index += 2) {
    values.push(Number(payload.slice(index, index + 2)));
  }

  const checksum = values.reduce((sum, value, index) => {
    return index === 0 ? value : sum + value * index;
  }, 0) % 103;

  values.push(checksum, 106);
  return values;
}

export function getCode128BarcodeBars(payload, options = {}) {
  const values = getCode128CValues(payload);
  if (!values.length) {
    return null;
  }

  const moduleWidth = options.moduleWidth || 2;
  const height = options.height || 88;
  const quietZone = options.quietZone || moduleWidth * 10;
  
  const totalModules = values
    .map((value) => code128Patterns[value])
    .reduce((sum, pattern) => sum + pattern.split("").reduce((width, digit) => width + Number(digit), 0), 0);
  const width = totalModules * moduleWidth + quietZone * 2;

  const rects = [];
  let cursor = quietZone;

  values.forEach((value) => {
    const pattern = code128Patterns[value];
    pattern.split("").forEach((digit, index) => {
      const barWidth = Number(digit) * moduleWidth;
      if (index % 2 === 0) {
        rects.push({
          x: cursor,
          y: 0,
          width: barWidth,
          height: height,
        });
      }
      cursor += barWidth;
    });
  });

  return {
    width,
    height,
    rects,
  };
}
