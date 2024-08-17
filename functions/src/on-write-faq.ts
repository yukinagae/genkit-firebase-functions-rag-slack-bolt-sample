import { embed } from '@genkit-ai/ai/embedder'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { textEmbedding3Small } from 'genkitx-openai'

export const onwritefaq = onDocumentWritten({ document: 'faqs/{id}' }, async (event) => {
  console.log(`💖onDocumentWritten: faqs/${event.params.id}`) // TODO: debug
  const before = event.data?.before.data()
  const after = event.data?.after.data()

  if (!after) return // Skip if the document has been deleted
  if (before?.content === after.content) return // Skip if the content has not changed

  const embedding = await embed({
    embedder: textEmbedding3Small,
    content: after.content,
  })

  return event.data?.after.ref.update({
    embedding: FieldValue.vector(embedding),
    updatedAt: Timestamp.now(),
  })
})
