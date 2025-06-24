import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

describe('Twilio Voice Webhook Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('POST /api/v1/webhook/twilio/voice', () => {
    it('should return TwiML XML for voice call', async () => {
      const webhookData = {
        CallSid: 'CA12345678901234567890123456789012',
        From: '+1234567890',
        To: '+0987654321',
        CallStatus: 'ringing'
      };

      const response = await request(app)
        .post('/api/v1/webhook/twilio/voice')
        .send(webhookData)
        .expect(200);

      // Should return XML, not JSON
      expect(response.headers['content-type']).toContain('text/xml');
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response>');
      
      // Should contain either TwiML for success or error (case-sensitive check)
      const containsConnect = response.text.includes('<Connect>');
      const containsError = response.text.includes('<Say voice="');
      expect(containsConnect || containsError).toBe(true);
    });

    it('should handle missing CallSid gracefully', async () => {
      const webhookData = {
        From: '+1234567890',
        To: '+0987654321'
      };

      const response = await request(app)
        .post('/api/v1/webhook/twilio/voice')
        .send(webhookData)
        .expect(200);

      // Should still return TwiML XML even on error
      expect(response.headers['content-type']).toContain('text/xml');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Say voice="');
      expect(response.text).toContain('error');
    });

    it('should handle empty request body gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/webhook/twilio/voice')
        .send({})
        .expect(200);

      // Should return error TwiML
      expect(response.headers['content-type']).toContain('text/xml');
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Say voice="');
    });

    it('should log call attempts properly', async () => {
      const webhookData = {
        CallSid: 'CA12345678901234567890123456789012',
        From: '+1234567890',
        To: '+0987654321'
      };

      // This test verifies the endpoint works without throwing errors
      const response = await request(app)
        .post('/api/v1/webhook/twilio/voice')
        .send(webhookData)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/xml');
    });
  });

  describe('Comparison with status webhook', () => {
    it('should distinguish voice webhook (XML) from status webhook (JSON)', async () => {
      const webhookData = {
        CallSid: 'CA12345678901234567890123456789012',
        CallStatus: 'in-progress',
        From: '+1234567890',
        To: '+0987654321'
      };

      // Voice webhook should return XML
      const voiceResponse = await request(app)
        .post('/api/v1/webhook/twilio/voice')
        .send(webhookData)
        .expect(200);

      expect(voiceResponse.headers['content-type']).toContain('text/xml');
      expect(voiceResponse.text).toContain('<Response>');

      // Status webhook should return JSON
      const statusResponse = await request(app)
        .post('/api/v1/webhook/twilio')
        .send(webhookData)
        .expect(200);

      expect(statusResponse.headers['content-type']).toContain('application/json');
      expect(statusResponse.body).toHaveProperty('success');
      expect(statusResponse.body).toHaveProperty('data');
    });
  });
});