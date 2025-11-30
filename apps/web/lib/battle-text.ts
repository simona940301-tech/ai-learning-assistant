/**
 * Battle text normalization utilities.
 * The raw questions/options coming from battle-ws often contain Markdown escape
 * sequences (e.g. `/_/`, `_\/`, `\_foo`) and inline assets that should never
 * reach the UI. This helper centralizes the cleanup logic so that we do not have
 * to reimplement fragile regex chains inside every component.
 */

/**
 * Normalize battle question text or option labels.
 * - Removes stray markdown tokens
 * - Unifies sloppy slash/underscore placeholders such as `/_/`
 * - Collapses whitespace so the renderer gets predictable plain text
 */
export function normalizeBattleText(input?: unknown): string {
  if (input === undefined || input === null) return ''
  let text = String(input)

  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '') // strip markdown images entirely
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1') // keep the visible label from links
  text = text.replace(/`+/g, '') // drop inline code markers
  text = text.replace(/\*{1,3}/g, '') // drop emphasis markers
  text = text.replace(/~{2,}/g, '') // drop strikethrough markers

  return text
    .replace(/\\n|\r|\n/g, ' ') // normalize line breaks
    .replace(/\\_/g, '_') // escaped underscores
    .replace(/\/+_+\/+/g, (match) => '_'.repeat(match.length - 2)) // /_/ 保留長度
    .replace(/\/+_+/g, (match) => '_'.repeat(match.length - 1)) // /__
    .replace(/_+\/+/g, (match) => '_'.repeat(match.length - 1)) // __/
    .replace(/_\\+/g, (match) => '_'.repeat(match.length - 1)) // _\_
    .replace(/\\+_/g, (match) => '_'.repeat(match.length - 1)) // \__
    // .replace(/_{2,}/g, '_') // 不再合併多個底線,保留原始長度
    .replace(/\s{2,}/g, ' ') // collapse whitespace
    .replace(/\s([?!.,])/g, '$1') // trim spaces before punctuation
    .trim()
}

export function normalizeBattleOptions(options: Array<unknown> | undefined | null): string[] {
  if (!options || options.length === 0) return []
  return options
    .map((opt) => normalizeBattleText(opt))
    .filter((opt) => opt.length > 0)
}
