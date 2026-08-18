export type LanguageModelAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

export type LanguageModelMessageRole = 'system' | 'user' | 'assistant'

export interface LanguageModelMessage {
  role: LanguageModelMessageRole
  content: string
}

export interface LanguageModelPromptOptions {
  responseConstraint?: object
  signal?: AbortSignal
}

export interface LanguageModelSession {
  prompt(input: string, options?: LanguageModelPromptOptions): Promise<string>
  promptStreaming(input: string, options?: LanguageModelPromptOptions): ReadableStream<string>
  append(messages: LanguageModelMessage[]): Promise<void>
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>
  destroy(): void
}

export interface LanguageModelCreateOptions {
  initialPrompts?: LanguageModelMessage[]
  expectedInputs?: Array<{ type: 'text'; languages: string[] }>
  expectedOutputs?: Array<{ type: 'text'; languages: string[] }>
  signal?: AbortSignal
}

export interface LanguageModelAPI {
  availability(options?: unknown): Promise<LanguageModelAvailability>
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>
}

export function getLanguageModel(): LanguageModelAPI | undefined {
  return (globalThis as { LanguageModel?: LanguageModelAPI }).LanguageModel
}
