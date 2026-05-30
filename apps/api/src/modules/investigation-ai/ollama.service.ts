import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly availableModels = ['phi4', 'llama3:8b', 'qwen3:14b'];

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('OLLAMA_DEFAULT_MODEL', 'phi4');
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getAvailableModels(): string[] {
    return this.availableModels;
  }

  async isModelAvailable(model: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return false;
      
      const data = await response.json() as { models?: { name: string }[] };
      const models = data.models || [];
      return models.some(m => m.name.startsWith(model.split(':')[0]));
    } catch {
      this.logger.warn(`Could not check model availability for ${model}`);
      return false;
    }
  }

  async generate(prompt: string, model?: string): Promise<OllamaResponse> {
    const selectedModel = model || this.defaultModel;
    
    this.logger.log(`Generating response with model: ${selectedModel}`);
    this.logger.debug(`Prompt length: ${prompt.length} chars`);

    const request: OllamaRequest = {
      model: selectedModel,
      prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for consistent analysis
        top_p: 0.9,
        num_predict: 2048, // Limit response length
      },
    };

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Ollama API error: ${response.status} - ${errorText}`);
        throw new HttpException(
          `Ollama API error: ${response.status}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const data = await response.json() as OllamaResponse;
      const duration = Date.now() - startTime;

      this.logger.log(
        `Generated response in ${duration}ms using ${selectedModel} ` +
        `(eval_count: ${data.eval_count || 'N/A'})`,
      );

      return {
        ...data,
        total_duration: duration,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      this.logger.error(`Failed to connect to Ollama: ${error}`);
      throw new HttpException(
        'Failed to connect to Ollama. Please ensure Ollama is running.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
