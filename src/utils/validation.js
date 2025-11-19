const Joi = require('joi');

// Schema for conversation data
const conversationSchema = Joi.object({
  id: Joi.string().required(),
  title: Joi.string().allow(''),
  model: Joi.string().default('gpt-4'),
  create_time: Joi.number().required(),
  update_time: Joi.number().required(),
  project_id: Joi.string().allow(null),
  openai_thread_id: Joi.string().allow(null)
});

// Schema for message data
const messageSchema = Joi.object({
  id: Joi.string().required(),
  conversation_id: Joi.string().required(),
  role: Joi.string().valid('user', 'assistant', 'system').required(),
  content: Joi.alternatives().try(
    Joi.string(),
    Joi.object(),
    Joi.array()
  ).allow(null),
  parts: Joi.alternatives().try(
    Joi.string(),
    Joi.object(),
    Joi.array()
  ).allow(null),
  create_time: Joi.number().required(),
  parent: Joi.string().allow(null),
  children: Joi.array().items(Joi.string()).allow(null),
  author: Joi.object({
    name: Joi.string().allow(null),
    role: Joi.string().allow(null)
  }).allow(null)
});

// Schema for project data
const projectSchema = Joi.object({
  id: Joi.string().allow(null),
  name: Joi.string().required(),
  description: Joi.string().allow(''),
  is_starred: Joi.boolean().default(false),
  chatgpt_project_id: Joi.string().allow(null)
});

// Schema for webhook payload
const webhookPayloadSchema = Joi.object({
  conversation: conversationSchema.when('message', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  message: messageSchema.optional(),
  project: projectSchema.optional(),
  event_type: Joi.string().optional(),
  timestamp: Joi.number().optional()
});

// Schema for manual sync payload
const manualSyncSchema = Joi.object({
  type: Joi.string().valid('conversation', 'message').required(),
  data: Joi.object().required()
});

// Validate webhook payload
const validateWebhookPayload = (payload) => {
  const { error, value } = webhookPayloadSchema.validate(payload, {
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    };
  }

  return {
    isValid: true,
    data: value
  };
};

// Validate conversation data
const validateConversation = (data) => {
  const { error, value } = conversationSchema.validate(data);
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
};

// Validate message data
const validateMessage = (data) => {
  const { error, value } = messageSchema.validate(data);
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
};

// Validate project data
const validateProject = (data) => {
  const { error, value } = projectSchema.validate(data);
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
};

// Validate manual sync payload
const validateManualSync = (data) => {
  const { error, value } = manualSyncSchema.validate(data);
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value
  };
};

// Sanitize string data
const sanitizeString = (str, maxLength = 65535) => {
  if (!str) return null;
  
  if (typeof str !== 'string') {
    str = String(str);
  }
  
  // Remove potential XSS characters
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/javascript:/gi, '');
  str = str.replace(/on\w+\s*=/gi, '');
  
  // Trim and limit length
  str = str.trim();
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  
  return str;
};

// Sanitize JSON data
const sanitizeJSON = (data) => {
  if (!data) return null;
  
  try {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return data;
  } catch (error) {
    return null;
  }
};

// Validate timestamp
const validateTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  const date = new Date(timestamp * 1000);
  
  // Check if date is valid and reasonable (not too far in past/future)
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  if (date < oneYearAgo || date > oneYearFromNow) {
    return null;
  }
  
  return date;
};

// Validate UUID format
const validateUUID = (uuid) => {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Generate validation summary
const getValidationSummary = (validations) => {
  const failed = validations.filter(v => !v.isValid);
  
  return {
    isValid: failed.length === 0,
    totalValidations: validations.length,
    failedValidations: failed.length,
    errors: failed.flatMap(v => v.errors || [])
  };
};

module.exports = {
  validateWebhookPayload,
  validateConversation,
  validateMessage,
  validateProject,
  validateManualSync,
  sanitizeString,
  sanitizeJSON,
  validateTimestamp,
  validateUUID,
  getValidationSummary
};