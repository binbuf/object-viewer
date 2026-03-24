import { forwardRef } from 'react'
import type { SourceToken } from '../../utils/tokenizers/types.ts'
import { TOKEN_COLORS } from '../../utils/tokenizers/types.ts'

interface HighlightedSourceProps {
  tokens: SourceToken[]
}

const HighlightedSource = forwardRef<HTMLPreElement, HighlightedSourceProps>(
  function HighlightedSource({ tokens }, ref) {
    return (
      <pre
        ref={ref}
        aria-hidden="true"
        className="absolute inset-0 p-3 font-mono text-sm overflow-hidden pointer-events-none m-0"
        style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}
      >
        {tokens.map((token, i) => {
          const colorClass = TOKEN_COLORS[token.type]
          if (!colorClass) return <span key={i}>{token.text}</span>
          return (
            <span key={i} className={colorClass}>
              {token.text}
            </span>
          )
        })}
      </pre>
    )
  }
)

export default HighlightedSource
