import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import { Transporter } from 'nodemailer'

@Injectable()
export class MailService {
  private readonly transporter: Transporter

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: this.configService.getOrThrow<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASSWORD'),
      },
    })
  }

  async sendVerifyMail(to: string, link: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('SMTP_USER'),
      to,
      subject: `Account verification`,
      html: `
        <div>
          <h1>Go to link for verification your e-mail</h1>
          <a href="${link}">${link}</a>
        </div>
      `,
    })

    console.log(`Activation email sent to ${to}`)
  }

  async sendAdminApprovalMail(
    to: string,
    userEmail: string,
    link: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('SMTP_USER'),
      to,
      subject: `Approve new user registration`,
      html: `
        <div>
          <h1>Admin Approval</h1>
          <h2>New user registration requires your approval</h2>
          <p>User <strong>${userEmail}</strong> has requested to register.</p>
          <a href="${link}">${link}</a>
        </div>
      `,
    })

    console.log(`Admin approval email sent to ${to}`)
  }

  async sendRegistrationApprovedMail(to: string): Promise<void> {
    const url = this.configService.getOrThrow<string>('CLIENT_URL')
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('SMTP_USER'),
      to,
      subject: `Registration Approved`,
      html: `
        <div>
          <h1>Your Registration has Been Approved</h1>
          <p>You can now log in to your account.</p>
          <a href="${url}">${url}</a>
        </div>
      `,
    })

    console.log(`Registration approved email sent to ${to}`)
  }
}
