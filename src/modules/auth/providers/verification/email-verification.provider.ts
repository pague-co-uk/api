import { Injectable, OnModuleInit } from "@nestjs/common";

import {
  getComponentLogger,
} from "@pague-co-uk/sms-gateway-telemetry";

import nodemailer, {
  Transporter,
} from "nodemailer";

import { AppConfigService } from "../../../../config/config.service.js";
import {
  VerificationMessage,
  VerificationProvider,
} from "../../interfaces/verification-provider.interface.js";

@Injectable()
export class EmailVerificationProvider
  implements VerificationProvider, OnModuleInit {
  private readonly logger =
    getComponentLogger(
      "EmailVerificationProvider",
    );

  private readonly transporter: Transporter;

  constructor(
    private readonly configService: AppConfigService,
  ) {
    const {
      smtp,
    } = this.configService.email;

    this.transporter =
      nodemailer.createTransport({
        host:
          smtp.host,

        port:
          smtp.port,

        secure:
          smtp.secure,

        auth:
          smtp.user
            ? {
              user:
                smtp.user,

              pass:
                smtp.password,
            }
            : undefined,

        // A small pool avoids a fresh TCP/TLS handshake per email,
        // which matters under login/signup bursts.
        pool:
          true,

        maxConnections:
          5,

        connectionTimeout:
          10_000,
      });
  }

  // ==========================================================================
  // SMTP verification
  // ==========================================================================

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();

      this.logger.info(
        {
          host:
            this.configService.email.smtp.host,

          port:
            this.configService.email.smtp.port,
        },
        "SMTP transport verified.",
      );
    } catch (error) {
      this.logger.error(
        {
          host:
            this.configService.email.smtp.host,

          port:
            this.configService.email.smtp.port,

          err:
            error,
        },
        "SMTP transport failed verification. Verification emails will fail until this is resolved.",
      );
    }
  }

  // ==========================================================================
  // Send
  // ==========================================================================

  async send(
    message: VerificationMessage,
  ): Promise<void> {
    const subject =
      this.getSubject(
        message.purpose,
      );

    try {
      await this.transporter.sendMail({
        from: {
          address:
            this.configService.email.fromAddress,

          name:
            this.configService.email.fromName,
        },

        to:
          message.recipient,

        subject,

        text:
          this.buildTextBody(
            message,
          ),

        html:
          this.buildHtmlBody(
            message,
            subject,
          ),
      });

      this.logger.info(
        {
          recipient:
            message.recipient,

          purpose:
            message.purpose,

          subject,
        },
        "Email verification message sent.",
      );
    } catch (error) {
      this.logger.error(
        {
          recipient:
            message.recipient,

          purpose:
            message.purpose,

          err:
            error,
        },
        "Failed to send email verification message.",
      );

      throw error;
    }
  }

  // ==========================================================================
  // Subject
  // ==========================================================================

  private getSubject(
    purpose: VerificationMessage["purpose"],
  ): string {
    switch (purpose) {
      case "LOGIN":
        return "Your Pague login verification code";

      case "PASSWORD_RESET":
        return "Reset your Pague password";

      case "EMAIL_VERIFICATION":
        return "Verify your Pague email address";

      case "PHONE_VERIFICATION":
        return "Your Pague phone verification code";

      default:
        return "Pague verification code";
    }
  }

  // ==========================================================================
  // Plain-text email
  // ==========================================================================

  private buildTextBody(
    message: VerificationMessage,
  ): string {
    // ========================================================================
    // Password reset
    // ========================================================================

    if (
      message.purpose ===
      "PASSWORD_RESET"
    ) {
      const resetUrl =
        this.getPasswordResetUrl(
          message.verificationToken,
        );

      return [
        "Reset your Pague password",
        "",
        "We received a request to reset your Pague password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        `This link expires in ${message.expiry} minutes and can only be used once.`,
        "",
        "If you did not request a password reset, you can safely ignore this email.",
        "",
        "Pague",
      ].join("\n");
    }

    // ========================================================================
    // Verification code
    // ========================================================================

    return [
      this.getVerificationHeading(
        message.purpose,
      ),

      "",

      "Use the verification code below to continue.",

      "",

      `Verification code: ${message.code}`,

      "",

      `This code expires in ${message.expiry} minutes.`,

      "",

      "If you did not request this verification, you can safely ignore this email.",

      "",

      "Pague",
    ].join("\n");
  }

  // ==========================================================================
  // HTML email
  // ==========================================================================

  private buildHtmlBody(
    message: VerificationMessage,
    subject: string,
  ): string {
    const expiry =
      escapeHtml(
        message.expiry,
      );

    const logoUrl = this.configService.app.logoUrl;

    const logoMarkup =
      logoUrl
        ? `
          <img
            src="${escapeHtml(logoUrl)}"
            alt="Pague"
            width="132"
            style="
              display:block;
              width:132px;
              max-width:100%;
              height:auto;
              border:0;
              outline:none;
              text-decoration:none;
            "
          />
        `
        : `
          <span
            style="
              display:inline-block;
              color:#F8FAFC;
              font-family:Georgia,'Times New Roman',serif;
              font-size:28px;
              font-weight:500;
              line-height:1;
              letter-spacing:-0.03em;
            "
          >
            Pague
          </span>
        `;

    // ========================================================================
    // Password reset
    // ========================================================================

    if (
      message.purpose ===
      "PASSWORD_RESET"
    ) {
      return this.buildPasswordResetHtml(
        message,
        subject,
        expiry,
        logoMarkup,
      );
    }

    // ========================================================================
    // Verification code
    // ========================================================================

    return this.buildVerificationCodeHtml(
      message,
      subject,
      expiry,
      logoMarkup,
    );
  }

  // ==========================================================================
  // Verification code email
  // ==========================================================================

  private buildVerificationCodeHtml(
    message: VerificationMessage,
    subject: string,
    expiry: string,
    logoMarkup: string,
  ): string {
    const code =
      escapeHtml(
        message.code,
      );

    return this.buildEmailLayout({
      logoMarkup,

      subject,

      preheader:
        "Your Pague verification code.",

      content: `
        <p
          style="
            margin:0 0 10px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:13px;
            line-height:20px;
            color:#64748B;
          "
        >
          ${escapeHtml(
        this.getVerificationHeading(
          message.purpose,
        ),
      )}
        </p>

        <h1
          style="
            margin:0 0 14px;
            font-family:Georgia,'Times New Roman',serif;
            font-size:30px;
            line-height:38px;
            font-weight:400;
            letter-spacing:-0.02em;
            color:#0B1F3A;
          "
        >
          ${escapeHtml(subject)}
        </h1>

        <p
          style="
            margin:0 0 26px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            line-height:24px;
            color:#475569;
          "
        >
          Use the verification code below to continue.
          The code expires in
          <strong>${expiry} minutes</strong>.
        </p>

        <!--
          The user-select property makes the complete code easy to select
          in clients that support it. JavaScript clipboard access is not
          reliable or permitted in most email clients.
        -->

        <div
          style="
            margin:0 0 26px;
            text-align:center;
          "
        >
          <div
            style="
              display:inline-block;
              padding:18px 26px;
              border:1px solid #DBE5F0;
              border-radius:12px;
              background:#F8FAFC;
              font-family:'Courier New',Courier,monospace;
              font-size:32px;
              line-height:38px;
              font-weight:700;
              letter-spacing:0.20em;
              color:#0B1F3A;
              user-select:all;
              -webkit-user-select:all;
              cursor:text;
            "
            title="Select and copy this code"
          >
            ${code}
          </div>
        </div>

        <p
          style="
            margin:0 0 22px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
            line-height:19px;
            color:#94A3B8;
            text-align:center;
          "
        >
          Click or select the code to copy it where supported.
          Otherwise, highlight the code and copy it manually.
        </p>

        <div
          style="
            height:1px;
            background:#E2E8F0;
            margin:0 0 20px;
          "
        ></div>

        <p
          style="
            margin:0;
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
            line-height:20px;
            color:#94A3B8;
          "
        >
          If you did not request this verification, you can safely
          ignore this email.
        </p>
      `,
    });
  }

  // ==========================================================================
  // Password reset email
  // ==========================================================================

  private buildPasswordResetHtml(
    message: VerificationMessage,
    subject: string,
    expiry: string,
    logoMarkup: string,
  ): string {
    const resetUrl =
      escapeHtml(
        this.getPasswordResetUrl(
          message.verificationToken,
        ),
      );

    return this.buildEmailLayout({
      logoMarkup,

      subject,

      preheader:
        "Reset your Pague password.",

      content: `
        <p
          style="
            margin:0 0 10px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:13px;
            line-height:20px;
            color:#64748B;
          "
        >
          Password recovery
        </p>

        <h1
          style="
            margin:0 0 14px;
            font-family:Georgia,'Times New Roman',serif;
            font-size:30px;
            line-height:38px;
            font-weight:400;
            letter-spacing:-0.02em;
            color:#0B1F3A;
          "
        >
          Reset your password.
        </h1>

        <p
          style="
            margin:0 0 26px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            line-height:24px;
            color:#475569;
          "
        >
          We received a request to reset your Pague password.
          Click the button below to choose a new password.
        </p>

        <!-- Reset button -->

        <table
          role="presentation"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="margin:0 0 26px;"
        >
          <tr>
            <td
              align="center"
              style="
                border-radius:8px;
                background:#2563EB;
              "
            >
              <a
                href="${resetUrl}"
                style="
                  display:inline-block;
                  padding:13px 22px;
                  border-radius:8px;
                  background:#2563EB;
                  color:#FFFFFF;
                  font-family:Arial,Helvetica,sans-serif;
                  font-size:14px;
                  line-height:20px;
                  font-weight:600;
                  text-decoration:none;
                "
              >
                Reset your password
              </a>
            </td>
          </tr>
        </table>

        <p
          style="
            margin:0 0 20px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:13px;
            line-height:21px;
            color:#64748B;
          "
        >
          This password reset link expires in
          <strong>${expiry} minutes</strong>
          and can only be used once.
        </p>

        <div
          style="
            height:1px;
            background:#E2E8F0;
            margin:0 0 20px;
          "
        ></div>

        <p
          style="
            margin:0 0 12px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
            line-height:19px;
            color:#94A3B8;
          "
        >
          If the button above does not work, copy and paste the
          following address into your browser:
        </p>

        <p
          style="
            margin:0 0 22px;
            word-break:break-all;
            font-family:'Courier New',Courier,monospace;
            font-size:11px;
            line-height:18px;
            color:#64748B;
          "
        >
          ${resetUrl}
        </p>

        <p
          style="
            margin:0;
            font-family:Arial,Helvetica,sans-serif;
            font-size:12px;
            line-height:20px;
            color:#94A3B8;
          "
        >
          If you did not request a password reset, you can safely
          ignore this email. Your password will remain unchanged.
        </p>
      `,
    });
  }

  // ==========================================================================
  // Common email layout
  // ==========================================================================

  private buildEmailLayout({
    logoMarkup,
    subject,
    preheader,
    content,
  }: {
    logoMarkup: string;
    subject: string;
    preheader: string;
    content: string;
  }): string {
    return `<!doctype html>
<html
  lang="en"
  xmlns="http://www.w3.org/1999/xhtml"
>
  <head>
    <meta
      http-equiv="Content-Type"
      content="text/html; charset=UTF-8"
    />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>${escapeHtml(subject)}</title>

    <style>
      @media only screen and (max-width: 600px) {
        .email-container {
          width: 100% !important;
        }

        .email-content {
          padding: 28px 22px !important;
        }

        .email-header {
          padding: 22px !important;
        }

        .email-code {
          font-size: 28px !important;
          letter-spacing: 0.15em !important;
        }
      }
    </style>
  </head>

  <body
    style="
      margin:0;
      padding:0;
      width:100%;
      background:#F1F5F9;
    "
  >

    <!-- Preheader -->

    <div
      style="
        display:none;
        max-height:0;
        overflow:hidden;
        opacity:0;
        color:transparent;
      "
    >
      ${escapeHtml(preheader)}
    </div>

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        background:#F1F5F9;
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding:32px 16px;
          "
        >

          <!-- ============================================================
               Email container
          ============================================================= -->

          <table
            role="presentation"
            class="email-container"
            width="520"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:520px;
              max-width:520px;
              background:#FFFFFF;
              border:1px solid #E2E8F0;
              border-radius:14px;
              overflow:hidden;
            "
          >

            <!-- ==========================================================
                 Header
            =========================================================== -->

            <tr>
              <td
                class="email-header"
                style="
                  padding:26px 32px;
                  background:#0B1F3A;
                "
              >
                ${logoMarkup}
              </td>
            </tr>

            <!-- ==========================================================
                 Accent
            =========================================================== -->

            <tr>
              <td
                style="
                  height:3px;
                  background:#2563EB;
                  font-size:0;
                  line-height:0;
                "
              >
                &nbsp;
              </td>
            </tr>

            <!-- ==========================================================
                 Content
            =========================================================== -->

            <tr>
              <td
                class="email-content"
                style="
                  padding:36px 32px;
                "
              >
                ${content}
              </td>
            </tr>

            <!-- ==========================================================
                 Footer
            =========================================================== -->

            <tr>
              <td
                style="
                  padding:20px 32px;
                  border-top:1px solid #E2E8F0;
                  background:#FAFBFC;
                "
              >
                <p
                  style="
                    margin:0;
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:11px;
                    line-height:18px;
                    color:#94A3B8;
                  "
                >
                  This is an automated message from Pague.
                  Please do not reply to this email.
                </p>
              </td>
            </tr>

          </table>

          <!-- ============================================================
               Footer brand
          ============================================================= -->

          <p
            style="
              margin:18px 0 0;
              font-family:Arial,Helvetica,sans-serif;
              font-size:10px;
              line-height:16px;
              color:#94A3B8;
            "
          >
            © ${new Date().getFullYear()} Pague. All rights reserved.
          </p>

        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  // ==========================================================================
  // Verification heading
  // ==========================================================================

  private getVerificationHeading(
    purpose: VerificationMessage["purpose"],
  ): string {
    switch (purpose) {
      case "LOGIN":
        return "Login verification";

      case "EMAIL_VERIFICATION":
        return "Email verification";

      case "PHONE_VERIFICATION":
        return "Phone verification";

      default:
        return "Verification";
    }
  }

  // ==========================================================================
  // Password reset URL
  // ==========================================================================

  private getPasswordResetUrl(
    verificationToken: string,
  ): string {
    const baseUrl =
      process.env.PAGUE_WEB_URL?.trim();

    if (!baseUrl) {
      throw new Error(
        "PAGUE_WEB_URL is not configured.",
      );
    }

    const normalizedBaseUrl =
      baseUrl.replace(
        /\/+$/,
        "",
      );

    const params =
      new URLSearchParams({
        token:
          verificationToken,
      });

    return `${normalizedBaseUrl}/reset-password?${params.toString()}`;
  }
}

// ============================================================================
// HTML escaping
// ============================================================================

function escapeHtml(
  value: string,
): string {
  return value
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#39;",
    );
}