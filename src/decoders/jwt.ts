import { jwtDecode } from 'jwt-decode'
import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const final = pad ? padded + '='.repeat(4 - pad) : padded
  return atob(final)
}

export const jwtDecoder: Decoder = {
  id: 'jwt',
  label: 'JWT',
  priority: 100,
  supportsBinary: false,
  supportsText: true,

  detect(input: DecoderInput): DetectResult {
    if (!input.text) return { confident: false, confidence: 0 }

    const trimmed = input.text.trim()
    if (JWT_PATTERN.test(trimmed)) {
      return { confident: true, confidence: 0.99 }
    }

    return { confident: false, confidence: 0 }
  },

  decode(input: DecoderInput): DecodeResult {
    const text = input.text!.trim()
    const parts = text.split('.')

    const header = JSON.parse(base64UrlDecode(parts[0]))
    const payload = jwtDecode(text)
    const signature = parts[2] || ''

    const exp = typeof payload === 'object' && payload !== null && 'exp' in payload
      ? (payload as Record<string, unknown>).exp
      : undefined
    const iat = typeof payload === 'object' && payload !== null && 'iat' in payload
      ? (payload as Record<string, unknown>).iat
      : undefined

    const expiresAt = typeof exp === 'number' ? new Date(exp * 1000) : undefined
    const issuedAt = typeof iat === 'number' ? new Date(iat * 1000) : undefined
    const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false

    const data = { header, payload, signature }

    return {
      format: 'jwt',
      formatLabel: 'JWT (JSON Web Token)',
      data,
      metadata: {
        jwt: {
          header,
          payload: payload as Record<string, unknown>,
          signature,
          isExpired,
          expiresAt,
          issuedAt,
          algorithm: typeof header.alg === 'string' ? header.alg : undefined,
        },
      },
      raw: text,
    }
  },
}
