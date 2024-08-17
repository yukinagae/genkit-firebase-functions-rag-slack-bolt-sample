import { initializeApp } from 'firebase-admin/app'

// Firebase initialization
initializeApp({
  projectId: 'genkit-rag-slack-bolt-sample',
})

export * from './llm' // Load LLM function
export * from './load-faqs' // Load CSV and embed function
export * from './on-write-faq' // On write embedder function
