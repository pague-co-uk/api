import { Injectable, OnModuleInit } from "@nestjs/common";
import { getComponentLogger } from "@pague-co-uk/sms-gateway-telemetry";
import nodemailer, { Transporter } from "nodemailer";

import { AppConfigService } from "../../config/config.service.js";

export interface EmailMessage {
  readonly to: string | readonly string[];
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = getComponentLogger("EmailService");
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfigService) {
    const { smtp } = config.email;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      pool: true,
      maxConnections: 5,
      connectionTimeout: 10_000,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.info({ host: this.config.email.smtp.host, port: this.config.email.smtp.port }, "SMTP transport verified.");
    } catch (error) {
      this.logger.error({ host: this.config.email.smtp.host, port: this.config.email.smtp.port, err: error }, "SMTP transport failed verification.");
    }
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: { address: this.config.email.fromAddress, name: this.config.email.fromName },
      to: typeof message.to === "string" ? message.to : [...message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
