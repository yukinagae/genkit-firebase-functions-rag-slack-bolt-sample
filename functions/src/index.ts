import { configureGenkit } from '@genkit-ai/core'
import { dotprompt, promptRef } from '@genkit-ai/dotprompt'
import { defineFlow, runFlow } from '@genkit-ai/flow'
import { App, ExpressReceiver } from '@slack/bolt'
import { onRequest } from 'firebase-functions/v2/https'
import { openAI } from 'genkitx-openai'
import * as z from 'zod'

// Configure Genkit with necessary plugins and settings
configureGenkit({
  plugins: [
    dotprompt(),
    openAI({ apiKey: process.env.OPENAI_API_KEY }), // Use the OpenAI plugin with the provided API key.
  ],
  logLevel: 'debug', // Log debug output to the console.
  enableTracingAndMetrics: true, // Perform OpenTelemetry instrumentation and enable trace collection.
})

const answerPrompt = promptRef('answer') // Reference to the answer prompt: `functions/prompts/answer.prompt`

// Flow definition for answering a question
const answerFlow = defineFlow(
  {
    name: 'answerFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (question: string) => {
    const llmResponse = await answerPrompt.generate({
      input: {
        question: question,
      },
    })
    return llmResponse.text()
  },
)

// Create a slack receiver
function createReceiver() {
  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    endpoints: '/events',
    processBeforeResponse: true,
  })

  const app = new App({
    receiver: receiver,
    token: process.env.SLACK_BOT_TOKEN,
    processBeforeResponse: true,
  })

  app.event('app_mention', async ({ event, context, client, say }) => {
    const { bot_id: botId, text: rawInput, channel } = event
    const { retryNum } = context
    const ts = event.thread_ts || event.ts

    if (retryNum) return // skip if retry
    if (botId) return // skip if bot mentions itself

    // thinking...
    const botMessage = await say({
      thread_ts: ts,
      text: 'typing...',
    })
    if (!botMessage.ts) return // skip if failed to send message

    const input = rawInput.replace(/<@.*?>/, '').trim() // delete mention
    const answer = await runFlow(answerFlow, input) // run the flow to generate an answer
    console.log('💖answer', answer)

    await client.chat.update({
      channel,
      ts: botMessage.ts as string,
      text: answer,
    })
  })
  return receiver
}

export const slack = onRequest(
  { secrets: ['OPENAI_API_KEY', 'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'] },
  async (req, res) => {
    return createReceiver().app(req, res)
  },
)
