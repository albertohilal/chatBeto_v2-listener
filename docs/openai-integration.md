# Guía de Integración con ChatGPT/OpenAI

## 🎯 Métodos de Conexión Disponibles

### 1. **OpenAI API** (Recomendado) ✅
- Acceso directo a GPT-4 y otros modelos
- Control total sobre conversaciones
- Sincronización automática con BD
- Webhooks simulados

### 2. **Browser Automation** (Puppeteer)
- Extrae conversaciones existentes
- Automatiza ChatGPT web
- Para imports masivos

### 3. **Manual Import**
- Exportar desde ChatGPT web
- Importar JSON a ChatBETO

## 🤖 Configuración OpenAI API

### Paso 1: Obtener API Key

1. **Ir a OpenAI Platform**: https://platform.openai.com
2. **Crear cuenta** o **iniciar sesión**
3. **API Keys** → **Create new secret key**
4. **Copiar la key** (solo se muestra una vez)

### Paso 2: Configurar en ChatBETO-listener

```bash
# Editar .env
nano .env

# Agregar tu API key
OPENAI_API_KEY=sk-tu-clave-aqui
OPENAI_ORG_ID=org-tu-organizacion-aqui  # Opcional
```

### Paso 3: Probar Conexión

```bash
# Iniciar servidor
npm run dev

# En otra terminal, probar OpenAI
./scripts/utils/test-openai.sh
```

## 📡 Endpoints de OpenAI API

### 1. **Status Check**
```bash
GET /api/v1/openai/status
Headers: X-API-Key: tu-api-key

Response:
{
  "status": "success",
  "data": {
    "openai": {"status": "healthy"},
    "initialized": true
  }
}
```

### 2. **Crear Conversación**
```bash
POST /api/v1/openai/conversations
Headers: 
  X-API-Key: tu-api-key
  Content-Type: application/json

Body:
{
  "projectId": 1,
  "title": "Mi Nueva Conversación",
  "initialMessage": "Hola ChatGPT!"
}
```

### 3. **Enviar Mensaje**
```bash
POST /api/v1/openai/conversations/thread_123/messages
Headers: 
  X-API-Key: tu-api-key
  Content-Type: application/json

Body:
{
  "message": "¿Cómo estás?",
  "role": "user"
}
```

### 4. **Chat Completion Directo**
```bash
POST /api/v1/openai/chat/completions
Headers: 
  X-API-Key: tu-api-key
  Content-Type: application/json

Body:
{
  "messages": [
    {"role": "user", "content": "Explica qué es ChatBETO"}
  ],
  "model": "gpt-4",
  "projectId": 1
}
```

## 🔄 Flujo de Trabajo Completo

### Escenario 1: Nueva Conversación desde API

```javascript
// 1. Crear conversación
const conversation = await fetch('/api/v1/openai/conversations', {
  method: 'POST',
  headers: {
    'X-API-Key': 'tu-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    projectId: 1,
    title: 'Consulta sobre Python',
    initialMessage: 'Necesito ayuda con Python'
  })
});

// 2. Obtener respuesta automática de GPT
// 3. Continuar conversación
const response = await fetch(`/api/v1/openai/conversations/${threadId}/messages`, {
  method: 'POST',
  headers: {
    'X-API-Key': 'tu-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: '¿Cómo crear una función?',
    role: 'user'
  })
});
```

### Escenario 2: Sincronizar Conversaciones Existentes

```bash
# Sincronizar conversaciones de la BD con OpenAI
POST /api/v1/openai/sync
Headers: X-API-Key: tu-api-key

# Se ejecuta en background
# Crea threads de OpenAI para conversaciones existentes
```

## 🌐 Integraciones Posibles

### 1. **Frontend Web (ChatBETO)**
```javascript
// Desde tu interfaz web
const chatWithGPT = async (message, projectId) => {
  const response = await fetch('/api/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'X-API-Key': 'tu-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        {role: 'user', content: message}
      ],
      projectId: projectId
    })
  });
  
  return await response.json();
};
```

### 2. **Webhook Simulator**
```javascript
// Simular webhooks de ChatGPT
const simulateWebhook = async (conversationData) => {
  await fetch('/webhook/chatgpt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Type': 'conversation.created',
      'X-Webhook-Timestamp': Date.now().toString(),
      'X-Webhook-Signature': 'sha256=signature'
    },
    body: JSON.stringify(conversationData)
  });
};
```

### 3. **Bot de Telegram/Discord**
```javascript
// Conectar con bots
bot.on('message', async (ctx) => {
  const response = await fetch('/api/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{role: 'user', content: ctx.message.text}]
    })
  });
  
  const gptResponse = await response.json();
  ctx.reply(gptResponse.data.response.content);
});
```

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-tu-clave-aqui
OPENAI_ORG_ID=org-tu-org-aqui
OPENAI_MODEL=gpt-4                    # Modelo por defecto
OPENAI_MAX_TOKENS=2000               # Límite de tokens
OPENAI_TEMPERATURE=0.7               # Creatividad (0-1)
```

### Rate Limits
- **OpenAI API**: Según tu plan (free/paid)
- **ChatBETO-listener**: 50 requests/15min por defecto
- **Recomendación**: Plan paid de OpenAI para producción

### Costos Estimados (OpenAI)
- **GPT-3.5-turbo**: ~$0.002 per 1K tokens
- **GPT-4**: ~$0.03 per 1K tokens
- **1 conversación promedio**: ~500 tokens
- **Costo mensual estimado**: $5-50 según uso

## 🚀 Próximos Pasos

1. **Configurar API Key** en tu `.env`
2. **Probar endpoints** con el script de test
3. **Integrar en frontend** ChatBETO web
4. **Configurar projects** para organizar conversaciones
5. **Deploy en Contabo** con OpenAI habilitado

¿Necesitas ayuda configurando alguno de estos pasos?