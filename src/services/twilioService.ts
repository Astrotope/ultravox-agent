import twilio from 'twilio';
import { getConfig } from '../config';
import { CallManagerService } from './callManagerService';

export class TwilioService {
  private client: twilio.Twilio;
  private config = getConfig();

  constructor() {
    this.client = twilio(this.config.TWILIO_ACCOUNT_SID, this.config.TWILIO_AUTH_TOKEN);
  }

  /**
   * Get Twilio client instance
   */
  getClient(): twilio.Twilio {
    return this.client;
  }

  /**
   * Transfer an active call to human agent
   */
  async transferActiveCall(ultravoxCallId: string, callManager: CallManagerService): Promise<any> {
    try {
      const activeCalls = callManager.getActiveCalls();
      const callData = activeCalls.get(ultravoxCallId);
      
      if (!callData || !callData.twilioCallSid) {
        throw new Error('Call not found or invalid CallSid');
      }

      const openStatus = this.isRestaurantOpen();
      let message: string;

      if (openStatus.isOpen) {
        message = "I'm connecting you with our booking team. Please note that during busy serving hours, there may be a brief wait as our staff is focused on providing excellent service to our dining guests.";
      } else {
        message = "I'm attempting to connect you with our booking team. Since we're currently closed, there may be no immediate answer. Please try calling back during our regular hours if no one is available.";
      }

      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: this.config.TWILIO_VOICE as any }, message);
      const dial = twiml.dial({ timeout: 30 });
      dial.number(this.config.HUMAN_AGENT_PHONE);
      twiml.say({ voice: this.config.TWILIO_VOICE as any },
        "I'm sorry, but I wasn't able to connect you with our booking team right now. Please try calling back during our regular business hours. Thank you for calling Bella Vista!");

      const updatedCall = await this.client.calls(callData.twilioCallSid)
        .update({
          twiml: twiml.toString()
        });

      return {
        status: 'success',
        message: 'Call transfer initiated',
        callDetails: updatedCall
      };

    } catch (error) {
      console.error('Error transferring call:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw {
        status: 'error',
        message: 'Failed to transfer call',
        error: errorMessage
      };
    }
  }

  /**
   * Check if restaurant is currently open
   */
  private isRestaurantOpen(): { isOpen: boolean; nextOpenTime?: string; message: string } {
    try {
      const openingHours = {
        monday: { open: "17:00", close: "22:00", closed: false },
        tuesday: { open: "17:00", close: "22:00", closed: false },
        wednesday: { open: "17:00", close: "22:00", closed: false },
        thursday: { open: "17:00", close: "22:00", closed: false },
        friday: { open: "17:00", close: "23:00", closed: false },
        saturday: { open: "17:00", close: "23:00", closed: false },
        sunday: { open: "17:00", close: "22:00", closed: false }
      };

      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof openingHours;
      const currentTime = now.toTimeString().slice(0, 5);

      const todayHours = openingHours[currentDay];

      if (todayHours.closed) {
        return {
          isOpen: false,
          message: `We're closed today (${currentDay}). Our regular hours are Monday through Sunday, five PM to ten PM (eleven PM on weekends).`
        };
      }

      const isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;

      if (isOpen) {
        return {
          isOpen: true,
          message: `We're currently open until ${this.formatTime(todayHours.close)} today.`
        };
      } else if (currentTime < todayHours.open) {
        return {
          isOpen: false,
          nextOpenTime: todayHours.open,
          message: `We're currently closed but will open at ${this.formatTime(todayHours.open)} today.`
        };
      } else {
        return {
          isOpen: false,
          message: `We're closed for today. We'll reopen tomorrow at ${this.formatTime(todayHours.open)}.`
        };
      }
    } catch (error) {
      console.error('Error in isRestaurantOpen:', error);
      return {
        isOpen: false,
        message: "We're open Monday through Sunday from 5:00 PM to 10:00 PM (11:00 PM on weekends)."
      };
    }
  }

  /**
   * Format time for display
   */
  private formatTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    return minute === '00' ? `${displayHour} ${ampm}` : `${displayHour}:${minute} ${ampm}`;
  }
}