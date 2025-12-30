# N8N Task Response Integration

## How to send task responses from N8N

After your N8N workflow finishes processing a task, send the response back using the follow-up API.

### Endpoint
```
POST https://my-memory.kureckamichal.workers.dev/api/tasks/{task_id}/follow-up
```

### Headers
```json
{
  "Content-Type": "application/json"
}
```

### Body
```json
{
  "type": "system",
  "message": "Your generated response text here"
}
```

### Example: Using HTTP Request Node in N8N

1. **Add HTTP Request node** after your processing logic
2. **Configure the node:**
   - **Method**: POST
   - **URL**: `https://my-memory.kureckamichal.workers.dev/api/tasks/{{$json.task_id}}/follow-up`
   - **Authentication**: None
   - **Body**: JSON
   - **JSON Body**:
     ```json
     {
       "type": "system",
       "message": "{{$json.output}}"
     }
     ```

### Example: cURL Command

```bash
curl -X POST \
  "https://my-memory.kureckamichal.workers.dev/api/tasks/f7efca87-1a64-4e01-af58-21fd8e3f1ba2/follow-up" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system",
    "message": "Here are 5 ideas for similar automation:\n\n1. Smart thermostat control\n2. Automated plant watering\n3. Security camera integration\n4. Voice-controlled blinds\n5. Energy monitoring dashboard"
  }'
```

### N8N Workflow Pattern

```
Webhook Trigger
    ↓
Extract task_id from webhook data
    ↓
Process task (Claude API, etc.)
    ↓
HTTP Request: Send response to /follow-up endpoint
    ↓
Return acknowledgment to webhook caller
```

### Important Notes

1. **task_id** is passed in the webhook data as `data.task_id`
2. **type** should be `"system"` for automated responses
3. **message** can be plain text or formatted (markdown, HTML, etc.)
4. You can call this endpoint multiple times to add more messages to the thread
5. Each call adds a new message with a timestamp

### Response Format

The API returns:
```json
{
  "success": true,
  "message": "Follow-up added"
}
```

### Error Handling

If the task doesn't exist:
```json
{
  "success": false,
  "error": "Task not found"
}
```

### Best Practice: Two-Step Response

For long-running tasks:

1. **Immediate acknowledgment** (in webhook response):
   ```json
   {
     "message": "Processing your request...",
     "status": "in_progress"
   }
   ```

2. **Final response** (via follow-up endpoint after processing):
   ```bash
   POST /api/tasks/{task_id}/follow-up
   {
     "type": "system",
     "message": "✅ Task completed! Here are the results..."
   }
   ```

This way the browser gets an immediate response (avoiding timeout), and the full result is added to the conversation thread when ready.
