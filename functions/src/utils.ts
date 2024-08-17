import * as fs from 'node:fs'
import { parse } from 'csv-parse/sync'

/**
 * Read a CSV file and convert it to a Record array
 * @param {string} path - file path
 * @returns {Record<string, string>[]} csv
 */
function loadCsvToRecords(path: string): Record<string, string>[] {
  const buffer = fs.readFileSync(path)
  const csv = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  return csv
}

/**
 * Convert the contents of a Record to a Markdown string
 * Only the keys specified in the keys parameter are converted
 * i.e. recordToMarkdown({ a: "A", b: "B" }, ["a"]) => "## a\n\nA"
 * @param {Record<string, string>} record - The Record to convert
 * @param {string[]} keys - Array of keys to convert
 * @returns {string} Markdown string
 */
function recordToMarkdown(record: Record<string, string>, keys: string[]): string {
  return keys.map((key) => (record[key] ? `## ${key}\n\n${record[key]}` : '')).join('\n\n')
}

export { loadCsvToRecords, recordToMarkdown }
