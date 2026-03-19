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
