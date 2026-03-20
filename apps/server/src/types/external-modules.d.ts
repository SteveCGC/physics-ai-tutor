declare module "aws4fetch" {
  export type AwsClientOptions = {
    accessKeyId: string;
    secretAccessKey: string;
    service?: string;
    region?: string;
  };

  export type AwsSignOptions = {
    aws?: {
      signQuery?: boolean;
    };
    expires?: number;
  };

  export class AwsClient {
    constructor(options: AwsClientOptions);
    sign(request: Request, options?: AwsSignOptions): Promise<Request>;
  }
}

declare module "pdf-parse" {
  const pdfParse: (input: Uint8Array) => Promise<{ text?: string }>;
  export default pdfParse;
}

declare module "mammoth" {
  export function extractRawText(input: {
    arrayBuffer?: ArrayBuffer;
    buffer?: Uint8Array;
  }): Promise<{ value?: string }>;

  const mammoth: {
    extractRawText: typeof extractRawText;
  };

  export default mammoth;
}

declare module "fflate" {
  export function unzipSync(
    data: Uint8Array
  ): Record<string, Uint8Array>;
}

declare module "@ai-sdk/openai" {
  export type OpenAICompatibleProvider = {
    textEmbeddingModel(modelId: string): unknown;
  };

  export function createOpenAI(config: {
    baseURL: string;
    apiKey: string;
  }): OpenAICompatibleProvider;
}

declare module "@mastra/core" {
  export class Mastra {
    constructor(config: {
      agents?: Record<string, unknown>;
      workflows?: Record<string, unknown>;
      server?: {
        middleware?: Array<unknown>;
      };
    });

    getAgent<T = any>(name: string): T;
  }
}

declare module "@mastra/core/agent" {
  export type AgentTool = {
    id?: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
    execute?: (...args: any[]) => Promise<any>;
  };

  export class Agent {
    constructor(config: {
      name: string;
      description?: string;
      model: string;
      instructions: string;
      tools?: Record<string, AgentTool>;
    });

    generate(
      input:
        | string
        | {
            messages: Array<{
              role: "user" | "assistant" | "system";
              content: string;
            }>;
          },
      options?: {
        structuredOutput?: {
          schema: unknown;
        };
        maxSteps?: number;
      }
    ): Promise<{
      object?: Promise<any> | string;
      text?: string;
      content?: string;
      output?: string;
      response?: string;
    }>;
  }
}

declare module "@mastra/core/tools" {
  export type ToolExecutionContext<TContext = unknown> = {
    context: TContext;
  };

  export type ToolConfig<TContext = unknown, TOutput = unknown> = {
    id: string;
    description: string;
    inputSchema: unknown;
    outputSchema: unknown;
    execute(
      context: ToolExecutionContext<TContext>,
      options?: {
        abortSignal?: AbortSignal;
      }
    ): Promise<TOutput>;
  };

  export function createTool<TContext = unknown, TOutput = unknown>(
    config: ToolConfig<TContext, TOutput>
  ): ToolConfig<TContext, TOutput>;
}

declare module "@mastra/core/workflows" {
  export type StepExecutionContext<TInput = unknown> = {
    inputData: TInput;
    mastra: {
      getAgent<T = any>(name: string): T;
    };
  };

  export type StepConfig<TInput = unknown, TOutput = unknown> = {
    id: string;
    description?: string;
    inputSchema: unknown;
    outputSchema: unknown;
    execute(context: StepExecutionContext<TInput>): Promise<TOutput>;
  };

  export function createStep<TInput = unknown, TOutput = unknown>(
    config: StepConfig<TInput, TOutput>
  ): unknown;

  export type WorkflowBuilder = {
    step(step: unknown): WorkflowBuilder;
    then(step: unknown): WorkflowBuilder;
    commit(): unknown;
  };

  export function createWorkflow(config: {
    id: string;
    inputSchema: unknown;
    outputSchema: unknown;
  }): WorkflowBuilder;
}

declare module "@mastra/hono" {
  export class MastraServer {
    constructor(config: {
      mastra: unknown;
      app: unknown;
    });

    init(): Promise<void>;
  }
}
