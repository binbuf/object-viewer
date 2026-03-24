export type TokenType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'key'
  | 'punctuation'
  | 'comment'
  | 'tag'
  | 'attribute'
  | 'keyword'
  | 'whitespace'
  | 'plain'

export interface SourceToken {
  text: string
  type: TokenType
}

export const TOKEN_COLORS: Record<TokenType, string> = {
  string: 'text-green-700 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  null: 'text-gray-500 dark:text-gray-500',
  key: 'text-gray-800 dark:text-gray-200 font-semibold',
  punctuation: 'text-gray-400 dark:text-gray-500',
  comment: 'text-gray-400 dark:text-gray-600 italic',
  tag: 'text-cyan-700 dark:text-cyan-400',
  attribute: 'text-orange-600 dark:text-orange-400',
  keyword: 'text-pink-600 dark:text-pink-400',
  whitespace: '',
  plain: '',
}
