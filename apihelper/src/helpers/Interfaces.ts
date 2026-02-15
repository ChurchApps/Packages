export interface IPermission { contentType: string; action: string; apiName?: string }
export interface IEmailPayload { from: string, to: string, subject: string, body: string, replyTo?: string }
