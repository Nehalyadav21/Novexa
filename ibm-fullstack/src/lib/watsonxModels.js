// Available IBM WatsonX.ai models
export const WATSONX_MODELS = {
  // IBM Granite models
  "granite-13b-chat-v2": {
    name: "Granite 13B Chat v2",
    description: "IBM's 13B parameter chat model, optimized for conversational use",
    type: "chat",
    maxTokens: 8192,
    recommended: true
  },
  "granite-13b-instruct-v2": {
    name: "Granite 13B Instruct v2",
    description: "IBM's 13B parameter instruct model, optimized for following instructions",
    type: "instruct",
    maxTokens: 8192
  },
  "granite-8b-chat-v2": {
    name: "Granite 8B Chat v2",
    description: "IBM's smaller 8B parameter chat model, faster but less capable",
    type: "chat",
    maxTokens: 8192
  },
  "granite-8b-instruct-v2": {
    name: "Granite 8B Instruct v2",
    description: "IBM's smaller 8B parameter instruct model",
    type: "instruct",
    maxTokens: 8192
  },
  "granite-20b-code-instruct-v1": {
    name: "Granite 20B Code Instruct",
    description: "IBM's 20B parameter model specialized for code generation",
    type: "code",
    maxTokens: 8192
  },
  
  // Meta Llama models
  "meta-llama/llama-2-13b-chat": {
    name: "Llama 2 13B Chat",
    description: "Meta's 13B parameter open source chat model",
    type: "chat",
    maxTokens: 4096
  },
  "meta-llama/llama-2-70b-chat": {
    name: "Llama 2 70B Chat",
    description: "Meta's largest 70B parameter open source chat model",
    type: "chat",
    maxTokens: 4096
  },
  
  // Mistral models
  "mistralai/mistral-7b-instruct-v0.2": {
    name: "Mistral 7B Instruct",
    description: "Mistral AI's 7B parameter instruct model",
    type: "instruct",
    maxTokens: 4096
  },
  
  // Code models
  "bigcode/starcoder2-15b": {
    name: "StarCoder2 15B",
    description: "BigCode project's 15B parameter model specialized for code generation",
    type: "code",
    maxTokens: 8192
  },
  
  // Google models
  "google/gemma-7b-it": {
    name: "Gemma 7B Instruct",
    description: "Google's 7B parameter instruct model",
    type: "instruct",
    maxTokens: 8192
  }
};

// Get available models based on certain criteria
export function getAvailableModels(options = {}) {
  const {
    type = null, // 'chat', 'instruct', 'code', null for all
    minTokens = 0,
    recommended = false
  } = options;
  
  return Object.entries(WATSONX_MODELS)
    .filter(([id, model]) => {
      if (type && model.type !== type) return false;
      if (model.maxTokens < minTokens) return false;
      if (recommended && !model.recommended) return false;
      return true;
    })
    .map(([id, model]) => ({
      id,
      ...model
    }));
}

// Get the best model for a specific use case
export function getBestModel(useCase = 'chat') {
  switch (useCase) {
    case 'chat':
      return 'granite-13b-chat-v2';
    case 'instruct':
      return 'granite-13b-instruct-v2';
    case 'code':
      return 'granite-20b-code-instruct-v1';
    default:
      return 'granite-13b-chat-v2';
  }
}

// Test if a model ID is valid
export function isValidModel(modelId) {
  return !!WATSONX_MODELS[modelId];
}
