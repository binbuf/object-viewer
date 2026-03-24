import { useState, useCallback, useMemo } from 'react'
import { autoDetect, decodeAs } from '../decoders/index.ts'
import type { DecodeResult, FormatId, DecoderInput } from '../decoders/types.ts'
import { textToBinary } from '../utils/binaryInput.ts'

interface DecoderState {
  input: string
  result: DecodeResult | null
  error: string | null
  overrideFormat: FormatId | null
}

export function useDecoder() {
  const [state, setState] = useState<DecoderState>({
    input: '',
    result: null,
    error: null,
    overrideFormat: null,
  })

  const processInput = useCallback((text: string, format: FormatId | null = null) => {
    if (!text.trim()) {
      setState({ input: text, result: null, error: null, overrideFormat: format })
      return
    }

    try {
      const decoderInput: DecoderInput = {
        text,
        source: 'paste',
      }

      // Also try binary interpretation
      const binary = textToBinary(text)
      if (binary) {
        decoderInput.binary = binary
      }

      let result: DecodeResult | null

      if (format) {
        try {
          result = decodeAs(format, decoderInput)
        } catch {
          result = autoDetect(decoderInput)
        }
      } else {
        result = autoDetect(decoderInput)
      }

      if (result) {
        setState({ input: text, result, error: null, overrideFormat: format })
      } else {
        setState({
          input: text,
          result: null,
          error: 'Could not detect or decode the input format. Supported formats: JSON, JWT, XML, YAML, MessagePack, CBOR, Protobuf.',
          overrideFormat: format,
        })
      }
    } catch (err) {
      setState({
        input: text,
        result: null,
        error: err instanceof Error ? err.message : 'Failed to decode input',
        overrideFormat: format,
      })
    }
  }, [])

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer
      const decoderInput: DecoderInput = {
        binary: buffer,
        source: 'file',
        fileName: file.name,
      }

      // Also try as text
      const textReader = new FileReader()
      textReader.onload = () => {
        decoderInput.text = textReader.result as string
        const result = autoDetect(decoderInput)
        if (result) {
          setState({ input: decoderInput.text || `[File: ${file.name}]`, result, error: null, overrideFormat: null })
        } else {
          setState({
            input: `[File: ${file.name}]`,
            result: null,
            error: `Could not decode file: ${file.name}`,
            overrideFormat: null,
          })
        }
      }
      textReader.onerror = () => {
        // Binary-only file
        const result = autoDetect(decoderInput)
        if (result) {
          setState({ input: `[File: ${file.name}]`, result, error: null, overrideFormat: null })
        } else {
          setState({
            input: `[File: ${file.name}]`,
            result: null,
            error: `Could not decode file: ${file.name}`,
            overrideFormat: null,
          })
        }
      }
      textReader.readAsText(file)
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const setInput = useCallback((text: string) => {
    processInput(text, state.overrideFormat)
  }, [processInput, state.overrideFormat])

  const setFormat = useCallback((format: FormatId | null) => {
    processInput(state.input, format)
  }, [processInput, state.input])

  const clear = useCallback(() => {
    setState({ input: '', result: null, error: null, overrideFormat: null })
  }, [])

  return useMemo(() => ({
    input: state.input,
    result: state.result,
    error: state.error,
    overrideFormat: state.overrideFormat,
    setInput,
    setFormat,
    processFile,
    clear,
  }), [state, setInput, setFormat, processFile, clear])
}
