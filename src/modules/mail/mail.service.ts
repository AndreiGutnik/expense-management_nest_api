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
}
