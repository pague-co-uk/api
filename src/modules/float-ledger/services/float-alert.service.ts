import { Injectable } from "@nestjs/common";
import { getComponentLogger } from "@pague-co-uk/sms-gateway-telemetry";

import { AppConfigService } from "../../../config/config.service.js";
import { ClientRepository } from "../../../repositories/ClientRepository.js";
import { EmailService } from "../../email/email.service.js";

type FloatAlertLevel = "LOW" | "CRITICAL_LOW" | "OUT";

@Injectable()
export class FloatAlertService {
  private readonly logger = getComponentLogger("FloatAlertService");
  private readonly recipients: readonly string[];
  private readonly lowLimit?: number;
  private readonly criticalLowLimit?: number;

  constructor(
    private readonly email: EmailService,
    private readonly clients: ClientRepository,
    private readonly config: AppConfigService,
  ) {
    this.recipients = this.config.getOptional<string[]>("floatAlerts.recipients") ?? [];
    this.lowLimit = this.config.getOptional<number>("floatAlerts.lowLimit");
    this.criticalLowLimit = this.config.getOptional<number>("floatAlerts.criticalLowLimit");
  }

  async checkBalanceChange(clientId: string, before: number, after: number): Promise<void> {
    if (before <= after || this.recipients.length === 0) return;

    const alerts: { level: FloatAlertLevel; threshold: number }[] = [];
    if (this.lowLimit !== undefined && before > this.lowLimit && after <= this.lowLimit) {
      alerts.push({ level: "LOW", threshold: this.lowLimit });
    }
    if (this.criticalLowLimit !== undefined && before > this.criticalLowLimit && after <= this.criticalLowLimit) {
      alerts.push({ level: "CRITICAL_LOW", threshold: this.criticalLowLimit });
    }
    if (before > 0 && after <= 0) {
      alerts.push({ level: "OUT", threshold: 0 });
    }
    if (alerts.length === 0) return;

    let clientDisplayName = "Unknown client";
    try {
      clientDisplayName =
        (await this.clients.findById(clientId))?.displayName ?? clientDisplayName;
    } catch (error) {
      this.logger.error({ err: error, clientId }, "Failed to load client name for float alert.");
      return;
    }

    for (const alert of alerts) {
      const description = this.getDescription(alert.level);
      const subject = `${this.getSubject(alert.level)}: ${clientDisplayName}`;
      const text = [
        `${clientDisplayName}'s float ${description}.`,
        `Previous balance: ${before}`,
        `Current balance: ${after}`,
        `Alert threshold: ${alert.threshold}`,
      ].join("\n");

      try {
        await this.email.send({
          to: this.recipients,
          subject,
          text,
          html: this.buildHtml(alert.level, clientDisplayName, subject, before, after, alert.threshold),
        });
        this.logger.info({ clientId, level: alert.level, before, after, threshold: alert.threshold }, "Float threshold alert sent.");
      } catch (error) {
        // Alert delivery must not roll back or fail an already-recorded ledger entry.
        this.logger.error({ err: error, clientId, level: alert.level, before, after }, "Failed to send float threshold alert.");
      }
    }
  }

  private getDescription(level: FloatAlertLevel): string {
    switch (level) {
      case "LOW":
        return "is running low";
      case "CRITICAL_LOW":
        return "is critically low";
      case "OUT":
        return "has run out";
    }
  }

  private getSubject(level: FloatAlertLevel): string {
    switch (level) {
      case "LOW":
        return "Pague float running low";
      case "CRITICAL_LOW":
        return "Pague float critically low";
      case "OUT":
        return "Pague float has run out";
    }
  }

  private buildHtml(
    level: FloatAlertLevel,
    clientDisplayName: string,
    subject: string,
    before: number,
    after: number,
    threshold: number,
  ): string {
    const colors = this.getColors(level);
    const logoUrl = this.config.app.logoUrl;
    const logoMarkup = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="Pague" width="132" style="display:block;width:132px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />`
      : `<span style="display:inline-block;color:#F8FAFC;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;line-height:1;letter-spacing:-0.03em;">Pague</span>`;
    const description = this.getDescription(level);
    const preheader = `${clientDisplayName}'s float ${description}.`;

    return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .email-content { padding: 28px 22px !important; }
        .email-header { padding: 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;width:100%;background:#F1F5F9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F1F5F9;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-container" width="520" cellpadding="0" cellspacing="0" border="0" style="width:520px;max-width:520px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;">
          <tr><td class="email-header" style="padding:26px 32px;background:#0B1F3A;">${logoMarkup}</td></tr>
          <tr><td style="height:3px;background:${colors.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td class="email-content" style="padding:36px 32px;">
            <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${colors.label};font-weight:700;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(this.getSubject(level))}</p>
            <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:400;letter-spacing:-.02em;color:#0B1F3A;">${escapeHtml(subject)}</h1>
            <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#475569;">${escapeHtml(clientDisplayName)}'s float ${escapeHtml(description)}.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 24px;background:${colors.background};border:1px solid ${colors.border};border-radius:10px;">
              <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:${colors.label};font-weight:700;">${escapeHtml(this.getSubject(level))}</td></tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
              ${this.buildBalanceRow("Previous balance", before)}
              ${this.buildBalanceRow("Current balance", after)}
              ${this.buildBalanceRow("Alert threshold", threshold)}
            </table>
          </td></tr>
          <tr><td style="padding:20px 32px;border-top:1px solid #E2E8F0;background:#FAFBFC;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#94A3B8;">This is an automated message from Pague. Please do not reply to this email.</p>
          </td></tr>
        </table>
        <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;color:#94A3B8;">© ${new Date().getFullYear()} Pague. All rights reserved.</p>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  private buildBalanceRow(label: string, value: number): string {
    return `<tr><td style="padding:9px 0;border-bottom:1px solid #E2E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#64748B;">${escapeHtml(label)}</td><td align="right" style="padding:9px 0;border-bottom:1px solid #E2E8F0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:19px;color:#0B1F3A;font-weight:700;">${value.toLocaleString("en-US")} credits</td></tr>`;
  }

  private getColors(level: FloatAlertLevel): { accent: string; background: string; border: string; label: string } {
    switch (level) {
      case "LOW":
        return { accent: "#D97706", background: "#FFFBEB", border: "#FDE68A", label: "#92400E" };
      case "CRITICAL_LOW":
        return { accent: "#DC2626", background: "#FEF2F2", border: "#FECACA", label: "#991B1B" };
      case "OUT":
        return { accent: "#7F1D1D", background: "#FEF2F2", border: "#FCA5A5", label: "#7F1D1D" };
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
