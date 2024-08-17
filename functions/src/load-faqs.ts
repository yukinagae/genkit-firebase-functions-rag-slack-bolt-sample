import * as path from 'node:path'
import { embed } from '@genkit-ai/ai/embedder'
import { defineFlow, run } from '@genkit-ai/flow'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { textEmbedding3Small } from 'genkitx-openai'
import { z } from 'zod'
import { loadCsvToRecords, recordToMarkdown } from './utils'

const csvKeys = ['question', 'answer']

type CsvRecord = Record<(typeof csvKeys)[number], string>

type CsvDocument = {
  text: string
  embeddingContent: string
}

// Define the indexing configuration
const indexConfig = {
  collection: 'faqs',
  contenField: 'content',
  vectorField: 'embedding',
  embedder: textEmbedding3Small,
}

const firestore = getFirestore()

// Index the CSV data to Firestore
async function indexToFirestore(data: CsvDocument[]) {
  for (const doc of data) {
    const embedding = await embed({
      embedder: indexConfig.embedder,
      content: doc.embeddingContent,
    })

    await firestore.collection(indexConfig.collection).add({
      [indexConfig.vectorField]: FieldValue.vector(embedding),
      [indexConfig.contenField]: doc.text,
    })
  }
}

// Extract the CSV file and convert it to a format suitable for indexing
async function extractCsv(filePath: string) {
  const jsonArray = loadCsvToRecords(filePath) as CsvRecord[]

  return jsonArray.map((record) => ({
    text: recordToMarkdown(record, csvKeys),
    embeddingContent: recordToMarkdown(record, csvKeys),
  })) as CsvDocument[]
}

// Define the indexing flow
export const indexingFlow = defineFlow(
  {
    name: 'indexingFlow',
    inputSchema: z.void(),
    outputSchema: z.void(),
  },
  async () => {
    const filePath = path.resolve('./data/faqs.csv')
    const docs = await run('extract-csv', () => extractCsv(filePath))
    await run('index-to-firestore', async () => indexToFirestore(docs))
  },
)
