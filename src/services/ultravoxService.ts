import fetch from 'node-fetch';
import { getConfig } from '../config';
import { CallConfig } from '../types';

export class UltravoxService {
  private config = getConfig();

  /**
   * Create a new Ultravox call
   */
  async createCall(callConfig: CallConfig): Promise<any> {
    try {
      const response = await fetch('https://api.ultravox.ai/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.ULTRAVOX_API_KEY
        },
        body: JSON.stringify(callConfig)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ultravox API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Ultravox call:', error);
      throw error;
    }
  }

  /**
   * Get call status from Ultravox
   */
  async getCallStatus(callId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.ULTRAVOX_API_KEY
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ultravox API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Ultravox call status:', error);
      throw error;
    }
  }

  /**
   * End an Ultravox call
   */
  async endCall(callId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.ultravox.ai/api/calls/${callId}/end`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.ULTRAVOX_API_KEY
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ultravox API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error ending Ultravox call:', error);
      throw error;
    }
  }
}