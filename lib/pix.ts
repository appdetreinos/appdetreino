/**
 * Monta BR Code Pix (copia-e-cola) 100% offline, spec EMV/Bacen.
 * Usado pra gerar o QR de cada cobrança no app do aluno,
 * direto da chave Pix do trainer — sem API externa.
 */

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(str: string, max: number): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .padEnd(1, " ");
}

export function buildPixPayload({
  key,
  name,
  city = "Brasil",
  amount,
  txid = "VIVAFIT",
}: {
  key: string;
  name: string;
  city?: string;
  amount: number;
  txid?: string;
}): string {
  const gui = tlv("00", "br.gov.bcb.pix") + tlv("01", key.trim());
  const amountStr = amount > 0 ? amount.toFixed(2) : "";
  const cleanTx = txid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "VIVAFIT";
  const base =
    tlv("00", "01") +
    tlv("26", gui) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amountStr ? tlv("54", amountStr) : "") +
    tlv("58", "BR") +
    tlv("59", sanitize(name || "Recebedor", 25)) +
    tlv("60", sanitize(city, 15)) +
    tlv("62", tlv("05", cleanTx)) +
    "6304";
  return base + crc16(base);
}
