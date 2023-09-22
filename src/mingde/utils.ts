function gen_random(bytes_num: number) {
  let uint8 = new Uint8Array(bytes_num);
  (crypto || window.crypto).getRandomValues(uint8);
  return uint8;
}

function uint8_to_hex(uint8: Uint8Array) {
  const hex_chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
  let hex = "";
  for (let i = 0; i < uint8.length; i++) {
    hex += hex_chars[Math.floor(uint8[i] / 16)];
    hex += hex_chars[uint8[i] % 16];
  }
  return hex;
}

export function gen_secret() {
  return uint8_to_hex(gen_random(16));
}

