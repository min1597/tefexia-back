import axios from 'axios'
import * as CryptoJS from 'crypto-js'
import libphonenumber from 'libphonenumber-js'
import * as nodemailer from 'nodemailer'

export default {
    pluginName: 'notificationPlugin',

    Notification: {
        SMTP: {
            send: async (_target: string, _title: string, _content: string): Promise<
                { success: true, processedDate: Date }
                | { success: false, error?: Error }
            > => {
                try {
                    const _mailer = nodemailer.createTransport({
                        host: process.env.NOTIFICATION_SMTP_HOSTNAME,
                        port: Number(process.env.NOTIFICATION_SMTP_PORT),
                        requireTLS: true,
                        auth: {
                            user: process.env.NOTIFICATION_SMTP_USERNAME,
                            pass: process.env.NOTIFICATION_SMTP_PASSWORD
                        }
                    })
                    try {
                        await _mailer.sendMail({ from: process.env.NOTIFICATION_SMTP_OUTBOUND, to: _target, subject: _title, html: _content })
                    } catch(_error) { return { success: false, error: new Error('Failed to send SMTP1.') } }
                    return { success: true, processedDate: new Date() }
                } catch(_error) { return _error instanceof Error ? { success: false, error: new Error('An unknown error has occured', { cause: _error }) } : (typeof _error == 'string' ? { success: false, error: new Error(_error) } : { success: false, error: new Error('An unknown error has occured.') }) }
            }
        }
    }
}