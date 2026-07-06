import { Injectable } from '@angular/core';

export interface MessagingApp {
  id: 'sms' | 'whatsapp' | 'viber' | 'wechat' | 'messenger';
  name: string;
  icon: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
  readonly supportedApps: MessagingApp[] = [
    { id: 'sms', name: 'SMS', icon: 'chatbubble-outline', description: 'Standard SMS messaging' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', description: 'Send via WhatsApp' },
    { id: 'viber', name: 'Viber', icon: 'call-outline', description: 'Send via Viber' },
    { id: 'wechat', name: 'WeChat', icon: 'logo-wechat', description: 'Send via WeChat' },
    { id: 'messenger', name: 'Messenger', icon: 'logo-facebook', description: 'Send via Messenger' },
  ];

  /**
   * Opens a messaging app with the provided message
   * @param appId The messaging app to use
   * @param phoneNumber Phone number (required for SMS, WhatsApp, Viber)
   * @param message The message to send
   */
  openMessagingApp(
    appId: MessagingApp['id'],
    phoneNumber: string,
    message: string
  ): void {
    switch (appId) {
      case 'sms':
        this.openSMS(phoneNumber, message);
        break;
      case 'whatsapp':
        this.openWhatsApp(phoneNumber, message);
        break;
      case 'viber':
        this.openViber(phoneNumber, message);
        break;
      case 'wechat':
        this.openWeChat(phoneNumber, message);
        break;
      case 'messenger':
        this.openMessenger(phoneNumber, message);
        break;
    }
  }

  private openSMS(phoneNumber: string, message: string): void {
    const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(url, '_system');
  }

  private openWhatsApp(phoneNumber: string, message: string): void {
    // Remove any non-digit characters from phone number
    const cleanNumber = phoneNumber.replace(/\D/g, '').replace(/^0/, '63');
    // WhatsApp expects country code. For now, we'll use the number as-is
    // In a real app, you might want to add logic to prepend country code
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_system');
  }

  private openViber(phoneNumber: string, message: string): void {
    // Viber deep link format: viber://contact?number=PHONE_NUMBER
    // Message parameter may not be supported in all Viber versions
    const cleanNumber = phoneNumber.replace(/\D/g, '').replace(/^0/, '63');
    const url = `viber://chat?number=${cleanNumber}&text=${encodeURIComponent(message)}`;
    window.open(url, '_system');
    // Show message in a note since Viber doesn't support message parameter
    this.showMessageCopyPrompt(message, 'Viber');
  }

  private openWeChat(phoneNumber: string, message: string): void {
    // WeChat doesn't have a reliable deep link API for sending messages
    // Display a modal with the message for the user to copy and paste
    this.showMessageCopyPrompt(message, 'WeChat');
  }

  private openMessenger(phoneNumber: string, message: string): void {
    // Messenger deep link: https://m.me/USERNAME
    // Since we have phone number, not username, we'll use the generic messenger URL
    const url = `https://m.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_system');
  }

  private showMessageCopyPrompt(message: string, appName: string): void {
    // Copy message to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message).then(() => {
        console.log(`Message copied to clipboard for ${appName}`);
      }).catch(err => {
        console.error('Failed to copy message:', err);
      });
    }

    // Show alert
    const alert = document.createElement('ion-alert');
    alert.header = `${appName} Message`;
    alert.message = `Open ${appName} and paste the message:<br><br><code>${this.escapeHtml(message)}</code>`;
    alert.buttons = [
      {
        text: 'Copy',
        handler: () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(message).then(() => {
              console.log(`Message copied to clipboard for ${appName}`);
            }).catch(err => {
              console.error('Failed to copy message:', err);
            });
          } else {
            // Fallback for browsers that don't support clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = message;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }
        },
      },
      {
        text: 'Close',
        role: 'cancel',
      },
    ];
    document.body.appendChild(alert);
    alert.present();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get app by ID
   */
  getApp(id: MessagingApp['id']): MessagingApp | undefined {
    return this.supportedApps.find(app => app.id === id);
  }
}
