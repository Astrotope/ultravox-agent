import fetch from 'node-fetch';
import { getConfig } from '../config';
import { CallConfig } from '../types';
import { logger } from '../utils/logger';

export class UltravoxService {
  private config = getConfig();

  /**
   * Create a new Ultravox call
   */
  async createCall(callConfig: CallConfig): Promise<any> {
    const startTime = Date.now();
    const endpoint = 'https://api.ultravox.ai/api/calls';
    
    // Sanitize config for logging (remove sensitive data)
    const sanitizedConfig = {
      systemPrompt: callConfig.systemPrompt ? `${callConfig.systemPrompt.substring(0, 100)}...` : undefined,
      model: callConfig.model,
      voice: callConfig.voice,
      temperature: callConfig.temperature,
      maxDuration: (callConfig as any).maxDuration,
      timeExceededMessage: (callConfig as any).timeExceededMessage,
      medium: callConfig.medium,
      firstSpeaker: callConfig.firstSpeaker,
      joinTimeout: (callConfig as any).joinTimeout,
      corpusId: callConfig.selectedTools?.[0]?.corpusId,
      toolCount: callConfig.selectedTools?.length || 0
    };
    
    logger.debug('Ultravox API request initiated', {
      endpoint,
      method: 'POST',
      configSummary: sanitizedConfig,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.ULTRAVOX_API_KEY
        },
        body: JSON.stringify(callConfig)
      });
      
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Ultravox API call creation failed', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          errorResponse: errorText,
          duration,
          configSummary: sanitizedConfig
        });
        throw new Error(`Ultravox API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      logger.info('Ultravox call created successfully', {
        endpoint,
        status: response.status,
        callId: result.callId,
        joinUrl: result.joinUrl ? 'present' : 'missing',
        duration,
        configSummary: sanitizedConfig
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Ultravox API call creation error', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        configSummary: sanitizedConfig
      });
      throw error;
    }
  }

  /**
   * Get call status from Ultravox
   */
  async getCallStatus(callId: string): Promise<any> {
    const startTime = Date.now();
    const endpoint = `https://api.ultravox.ai/api/calls/${callId}`;
    
    logger.debug('Ultravox call status request', {
      endpoint,
      callId,
      method: 'GET'
    });
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-API-Key': this.config.ULTRAVOX_API_KEY
        }
      });
      
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Ultravox call status request failed', {
          endpoint,
          callId,
          status: response.status,
          statusText: response.statusText,
          errorResponse: errorText,
          duration
        });
        throw new Error(`Ultravox API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      logger.debug('Ultravox call status retrieved', {
        endpoint,
        callId,
        status: response.status,
        callStatus: result.status,
        duration
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Ultravox call status error', {
        endpoint,
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      throw error;
    }
  }

  /**
   * End an Ultravox call
   */
  async endCall(callId: string): Promise<any> {
    const startTime = Date.now();
    const endpoint = `https://api.ultravox.ai/api/calls/${callId}/end`;
    
    logger.info('Ultravox call end request', {
      endpoint,
      callId,
      method: 'POST',
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-API-Key': this.config.ULTRAVOX_API_KEY
        }
      });
      
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Ultravox call end request failed', {
          endpoint,
          callId,
          status: response.status,
          statusText: response.statusText,
          errorResponse: errorText,
          duration
        });
        throw new Error(`Ultravox API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      logger.info('Ultravox call ended successfully', {
        endpoint,
        callId,
        status: response.status,
        duration
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Ultravox call end error', {
        endpoint,
        callId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      throw error;
    }
  }
}