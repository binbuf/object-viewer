const BASE64_REGEX = /^[A-Za-z0-9+/\s]+=*\s*$/
const HEX_REGEX = /^(0x)?[0-9a-fA-F\s]+$/

export function detectBinaryEncoding(text: string): 'base64' | 'hex' | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) return null

  // Check hex first (more specific pattern)
  if (HEX_REGEX.test(trimmed)) {
    const hexOnly = trimmed.replace(/^0x/i, '').replace(/\s/g, '')
    if (hexOnly.length >= 2 && hexOnly.length % 2 === 0) {
      return 'hex'
    }
  }

  // Check base64
  const stripped = trimmed.replace(/\s/g, '')
  if (BASE64_REGEX.test(stripped) && stripped.length >= 4 && stripped.length % 4 === 0) {
    return 'base64'
  }

  return null
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleaned = base64.replace(/\s/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer as ArrayBuffer
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const cleaned = hex.replace(/^0x/i, '').replace(/\s/g, '')
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16)
  }
  return bytes.buffer as ArrayBuffer
}

export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ')
}

export function textToBinary(text: string): ArrayBuffer | null {
  const encoding = detectBinaryEncoding(text)
  if (!encoding) return null

  try {
    if (encoding === 'base64') return base64ToArrayBuffer(text)
    if (encoding === 'hex') return hexToArrayBuffer(text)
  } catch {
    return null
  }
  return null
}
