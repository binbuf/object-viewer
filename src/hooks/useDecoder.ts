import { useState, useCallback, useMemo } from 'react'
import { autoDetect, decodeAs } from '../decoders/index.ts'
import type { DecodeResult, DecodeError, FormatId, DecoderInput } from '../decoders/types.ts'
import { textToBinary } from '../utils/binaryInput.ts'

interface DecoderState {
  input: string
  result: DecodeResult | null
  error: DecodeError | null
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

      const binary = textToBinary(text)
      if (binary) {
        decoderInput.binary = binary
      }

      if (format) {
        try {
          const result = decodeAs(format, decoderInput)
          setState({ input: text, result, error: null, overrideFormat: format })
          return
        } catch (err) {
          // Fall through to auto-detect, but capture the error
          const message = err instanceof Error ? err.message : String(err)
          const { result, errors } = autoDetect(decoderInput)
          if (result) {
            setState({ input: text, result, error: null, overrideFormat: format })
          } else {
            setState({
              input: text,
              result: null,
              error: { message: `${format.toUpperCase()}: ${message}`, format, detail: message },
              overrideFormat: format,
            })
            // If auto-detect also had errors, prefer the most specific one
            if (errors.length > 0) {
              setState(prev => ({ ...prev, error: errors[0] }))
            }
          }
          return
        }
      }

      const { result, errors } = autoDetect(decoderInput)

      if (result) {
        setState({ input: text, result, error: null, overrideFormat: format })
      } else {
        const bestError = errors.length > 0
          ? errors[0]
          : { message: 'Could not detect or decode the input format. Supported formats: JSON, JWT, XML, YAML, MessagePack, CBOR, Protobuf.' }
        setState({ input: text, result: null, error: bestError, overrideFormat: format })
      }
    } catch (err) {
      setState({
        input: text,
        result: null,
        error: {
          message: err instanceof Error ? err.message : 'Failed to decode input',
          detail: err instanceof Error ? err.stack : undefined,
        },
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

      const textReader = new FileReader()
      textReader.onload = () => {
        decoderInput.text = textReader.result as string
        const { result, errors } = autoDetect(decoderInput)
        if (result) {
          setState({ input: decoderInput.text || `[File: ${file.name}]`, result, error: null, overrideFormat: null })
        } else {
          setState({
            input: `[File: ${file.name}]`,
            result: null,
            error: errors[0] || { message: `Could not decode file: ${file.name}` },
            overrideFormat: null,
          })
        }
      }
      textReader.onerror = () => {
        const { result, errors } = autoDetect(decoderInput)
        if (result) {
          setState({ input: `[File: ${file.name}]`, result, error: null, overrideFormat: null })
        } else {
          setState({
            input: `[File: ${file.name}]`,
            result: null,
            error: errors[0] || { message: `Could not decode file: ${file.name}` },
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

  const refresh = useCallback(() => {
    processInput(state.input, state.overrideFormat)
  }, [processInput, state.input, state.overrideFormat])

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
    refresh,
    clear,
  }), [state, setInput, setFormat, processFile, refresh, clear])
}
