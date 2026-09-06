export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

export interface EmailConfig {
  smtp: SmtpConfig;
  fromAddress: string;
  fromName: string;
}