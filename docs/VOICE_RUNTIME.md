# Voice Runtime

Service: `apps/voice-runtime` (default port `4100`)

## Responsibilities

- Accept Exotel bidirectional media WebSocket
- Normalize audio and stream to Gemini Live
- Stream native audio back to Exotel
- Handle barge-in / interruptions
- Track multilingual conversation state
- Execute tools via internal API
- Persist session/transcript events through API

## Endpoints

- `GET /health`
- `GET /ready`
- `WS /ws/exotel` — telephony media
- `WS /ws/session` — internal/test sessions
- `POST /sessions` — create runtime session for a call

## Audio formats

| Hop | Format |
|-----|--------|
| Exotel media | Typically 8 kHz mulaw/PCM (account-dependent) |
| Internal pipeline | PCM16 mono |
| Gemini Live | Native audio per model config |

Conversion helpers live in `audio/formats.ts`. Chunk sizes stay small; no multi-second buffering.

## Interruptions

When customer speech is detected during AI playback:

1. Mark interruption
2. Clear outbound audio queue
3. Notify Gemini to stop generation
4. Continue listening

## Prompt layers

Runtime builds context via `@sonrat/shared` prompt builder:

1. Immutable platform policy
2. Organization / agent / version config
3. Campaign + customer context
4. Tools
5. Live conversation state

## Providers

```
AI_PROVIDER=gemini|mock
TELEPHONY_PROVIDER=exotel|mock
MOCK_AI=true|false
MOCK_TELEPHONY=true|false
```

Production refuses mock modes.

## Gemini setup

1. Create Google AI / Vertex credentials
2. Set `GEMINI_API_KEY`
3. Set `GEMINI_LIVE_MODEL`
4. Set `AI_PROVIDER=gemini` and `MOCK_AI=false`

## Exotel setup

1. Create Exotel account + virtual number
2. Set API key, token, account SID, subdomain, phone number
3. Point voice URL / streaming websocket to voice-runtime
4. Point status callbacks to API `/webhooks/exotel/*`
5. Set `TELEPHONY_PROVIDER=exotel` and `MOCK_TELEPHONY=false`
