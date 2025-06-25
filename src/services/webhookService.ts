import { CallManagerService } from './callManagerService';
import { logger } from '../utils/logger';
import twilio from 'twilio';
import { getConfig } from '../config';
import { UltravoxService } from './ultravoxService';

interface UltravoxWebhookData {
  event_type: string;
  call_id: string;
  transcript?: string;
  end_reason?: string;
  // Add other webhook fields as needed
}

interface TwilioWebhookData {
  CallSid: string;
  CallStatus: string;
  From?: string;
  To?: string;
  Direction?: string;
  ForwardedFrom?: string;
  AccountSid?: string;
  // Add other webhook fields as needed
}

export class WebhookService {
  private callManager: CallManagerService;
  private config = getConfig();
  private ultravoxService: UltravoxService;

  constructor() {
    this.callManager = new CallManagerService();
    this.ultravoxService = new UltravoxService();
  }

  async handleUltravoxWebhook(data: UltravoxWebhookData): Promise<any> {
    const startTime = Date.now();
    const { event_type, call_id } = data;

    logger.info('Ultravox webhook received', {
      eventType: event_type,
      callId: call_id,
      timestamp: new Date().toISOString(),
      payload: data
    });

    try {
      let result;
      
      switch (event_type) {
        case 'call_started':
          result = await this.handleCallStarted(data);
          break;
        case 'call_ended':
          result = await this.handleCallEnded(data);
          break;
        case 'transcript':
          result = await this.handleTranscript(data);
          break;
        default:
          logger.warn('Unknown Ultravox webhook event type', {
            eventType: event_type,
            callId: call_id,
            availableEventTypes: ['call_started', 'call_ended', 'transcript'],
            fullPayload: data
          });
          result = { status: 'unknown_event', event_type };
      }
      
      const duration = Date.now() - startTime;
      logger.debug('Ultravox webhook processed successfully', {
        eventType: event_type,
        callId: call_id,
        duration,
        result
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error processing Ultravox webhook', {
        eventType: event_type,
        callId: call_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        payload: data
      });
      throw error;
    }
  }

  async handleTwilioWebhook(data: TwilioWebhookData): Promise<any> {
    const startTime = Date.now();
    const { CallSid, CallStatus } = data;

    logger.info('Twilio webhook received', {
      callSid: CallSid,
      callStatus: CallStatus,
      from: data.From,
      to: data.To,
      direction: data.Direction,
      timestamp: new Date().toISOString(),
      payload: data
    });

    try {
      let result;
      
      switch (CallStatus) {
        case 'ringing':
          result = await this.handleTwilioRinging(data);
          break;
        case 'in-progress':
          result = await this.handleTwilioInProgress(data);
          break;
        case 'completed':
          result = await this.handleTwilioCompleted(data);
          break;
        case 'failed':
          result = await this.handleTwilioFailed(data);
          break;
        default:
          logger.warn('Unknown Twilio call status', {
            callSid: CallSid,
            callStatus: CallStatus,
            validStatuses: ['ringing', 'in-progress', 'completed', 'failed'],
            fullPayload: data
          });
          result = { status: 'unknown_status', call_status: CallStatus };
      }
      
      const duration = Date.now() - startTime;
      logger.debug('Twilio webhook processed successfully', {
        callSid: CallSid,
        callStatus: CallStatus,
        duration,
        result
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Error processing Twilio webhook', {
        callSid: CallSid,
        callStatus: CallStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        payload: data
      });
      throw error;
    }
  }

  private async handleCallStarted(data: UltravoxWebhookData): Promise<any> {
    logger.info('Ultravox call started', {
      callId: data.call_id
    });

    // Register the call in our call manager
    this.callManager.registerCall(data.call_id, data.call_id);

    return { status: 'call_started', call_id: data.call_id };
  }

  private async handleCallEnded(data: UltravoxWebhookData): Promise<any> {
    logger.info('Ultravox call ended', {
      callId: data.call_id,
      endReason: data.end_reason
    });

    // End the call in our call manager
    this.callManager.endCall(data.call_id, data.end_reason || 'webhook_ended');

    return { 
      status: 'call_ended', 
      call_id: data.call_id, 
      end_reason: data.end_reason 
    };
  }

  private async handleTranscript(data: UltravoxWebhookData): Promise<any> {
    logger.debug('Received transcript', {
      callId: data.call_id,
      transcript: data.transcript
    });

    // Here you could store the transcript in the database or process it
    
    return { 
      status: 'transcript_received', 
      call_id: data.call_id 
    };
  }

  private async handleTwilioRinging(data: TwilioWebhookData): Promise<any> {
    logger.info('Twilio call ringing', {
      callSid: data.CallSid,
      from: data.From,
      to: data.To
    });

    return { status: 'ringing', call_sid: data.CallSid };
  }

  private async handleTwilioInProgress(data: TwilioWebhookData): Promise<any> {
    logger.info('Twilio call in progress', {
      callSid: data.CallSid
    });

    return { status: 'in_progress', call_sid: data.CallSid };
  }

  private async handleTwilioCompleted(data: TwilioWebhookData): Promise<any> {
    logger.info('Twilio call completed', {
      callSid: data.CallSid
    });

    return { status: 'completed', call_sid: data.CallSid };
  }

  private async handleTwilioFailed(data: TwilioWebhookData): Promise<any> {
    logger.error('Twilio call failed', {
      callSid: data.CallSid
    });

    return { status: 'failed', call_sid: data.CallSid };
  }

  async handleTwilioVoiceWebhook(data: any): Promise<string> {
    const startTime = Date.now();
    const twilioCallSid = data.CallSid;
    const from = data.From;
    const to = data.To;
    
    try {
      logger.info('Twilio voice webhook received', {
        callSid: twilioCallSid,
        from,
        to,
        callStatus: data.CallStatus,
        direction: data.Direction,
        forwardedFrom: data.ForwardedFrom,
        timestamp: new Date().toISOString(),
        fullPayload: data
      });

      // Check capacity status
      const capacityInfo = {
        activeCount: this.callManager.getActiveCallCount(),
        maxConcurrent: this.config.MAX_CONCURRENT_CALLS,
        canAccept: this.callManager.canAcceptCall()
      };
      
      logger.debug('Call capacity check', {
        callSid: twilioCallSid,
        ...capacityInfo,
        utilizationPercentage: Math.round((capacityInfo.activeCount / capacityInfo.maxConcurrent) * 100)
      });

      // Check if we can accept the call
      if (!capacityInfo.canAccept) {
        logger.warn('Call rejected - at capacity limit', {
          callSid: twilioCallSid,
          from,
          to,
          ...capacityInfo,
          rejectionReason: 'capacity_limit_reached'
        });

        const twiml = new twilio.twiml.VoiceResponse();
        const busyMessage = `Thank you for calling Bella Vista Italian Restaurant. We're currently experiencing high call volume and all our lines are busy. Please try calling back in a few minutes, or visit our website to make a reservation online. We apologize for the inconvenience and look forward to serving you soon.`;
        
        twiml.say({ 
          voice: this.config.TWILIO_VOICE as any 
        }, busyMessage);
        
        logger.debug('TwiML response generated for capacity rejection', {
          callSid: twilioCallSid,
          response: 'busy_message',
          messageLength: busyMessage.length,
          voice: this.config.TWILIO_VOICE
        });
        
        return twiml.toString();
      }

      // Attempt to reserve call slot
      const slotReserved = this.callManager.reserveCallSlot();
      
      if (!slotReserved) {
        logger.error('Critical: Call slot reservation failed despite capacity check', {
          callSid: twilioCallSid,
          from,
          to,
          capacityInfo,
          reason: 'race_condition_possible'
        });
        
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say({ voice: this.config.TWILIO_VOICE as any }, 'All our lines are currently busy. Please try again later.');
        return twiml.toString();
      }
      
      logger.debug('Call slot reserved successfully', {
        callSid: twilioCallSid,
        activeCount: this.callManager.getActiveCallCount(),
        reservationTime: Date.now() - startTime
      });

      // Create Ultravox call with full configuration
      const callConfig = {
        systemPrompt: `You are ${this.config.AGENT_NAME}, a friendly and professional AI host for Bella Vista Italian Restaurant. You help customers make reservations and answer questions about our menu.

IMPORTANT GUIDELINES:
- Always greet customers warmly and introduce yourself as ${this.config.AGENT_NAME}, the AI Voice Agent for Bella Vista
- Explain that we use AI agents because our lines get very busy during serving hours while our staff focuses on providing excellent service to dining guests
- Mention that calls are recorded to help improve our service quality
- Get the customer's name early and use it throughout the conversation
- Use natural speech forms (say "seven thirty PM" not "7:30 PM", "March fifteenth" not "3/15")
- Stay focused on booking reservations and answering menu questions
- Be warm, professional, and helpful like a great restaurant host

CRITICAL: ALWAYS RESPOND AFTER USING TOOLS
- After checking availability, IMMEDIATELY tell the customer what you found
- After making a reservation, IMMEDIATELY confirm the details
- After looking up specials or hours, IMMEDIATELY share the information
- After using queryCorpus for menu questions, IMMEDIATELY share what you discovered
- After checking a booking, IMMEDIATELY tell them what you found
- Never wait for the customer to ask what happened - always speak first after tool use

CONVERSATION FLOW:
1. Warm greeting and AI agent introduction with explanation
2. Mention call recording for service improvement
3. Get customer's name and greet them personally
4. Ask how you can help them today
5. For bookings: gather date, time preference, party size
6. Check availability and IMMEDIATELY respond with results
7. Confirm all details before making reservation
8. Ask about special requirements (dietary, accessibility, celebrations)
9. IMMEDIATELY provide confirmation number and restaurant details after booking
10. Offer human transfer if needed or if customer seems frustrated

TOOL USAGE RESPONSES:
- checkAvailability: Always immediately tell them what times are available or suggest alternatives
- makeReservation: Always immediately confirm the booking with confirmation number
- checkBooking: Always immediately tell them the booking details or if not found
- getDailySpecials: Always immediately tell them the specials
- checkOpeningHours: Always immediately tell them if you're open and what the hours are
- queryCorpus: Always immediately share the menu/policy information you found

BOOKING CONFIRMATION CODES:
- All confirmation codes are three letters (e.g., ABC, XYZ)
- When giving confirmation codes, spell them out phonetically: "Alpha Bravo Charlie" for ABC
- When customers provide codes, accept either format: "ABC" or "Alpha Bravo Charlie"

HUMAN TRANSFER:
If customers request to speak with a human or if you encounter complex requests:
- Use the transferCall tool with the automatic callId parameter
- Explain that during serving hours, staff may be busy with dining guests
- Set appropriate expectations about response times
- Always offer transfer if the customer seems frustrated or has special needs

TOOLS AVAILABLE:
- checkOpeningHours: Check if we're currently open and get hours
- checkAvailability: Check reservation times for specific dates
- makeReservation: Create confirmed reservations
- checkBooking: Look up existing reservations by confirmation code
- getDailySpecials: Get soup and meal of the day
- queryCorpus: Answer menu questions and dietary information
- transferCall: Connect to human booking agent (uses automatic callId)
- hangUp: End call when customer is finished

Always speak naturally and conversationally, use the customer's name, confirm all booking details clearly, and provide excellent hospitality that reflects our restaurant's values.`,
        model: 'fixie-ai/ultravox',
        voice: this.config.ULTRAVOX_VOICE,
        temperature: 0.3,
        firstSpeaker: 'FIRST_SPEAKER_AGENT',
        selectedTools: [
          {
            toolName: "queryCorpus",
            authTokens: {},
            parameterOverrides: {
              corpus_id: this.config.ULTRAVOX_CORPUS_ID,
              max_results: 8
            }
          },
          { toolName: "hangUp" },
          {
            temporaryTool: {
              modelToolName: "checkAvailability",
              description: "Check available reservation times for a specific date and party size",
              defaultReaction: "AGENT_REACTION_SPEAKS",
              dynamicParameters: [
                {
                  name: "date",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Date in YYYY-MM-DD format or natural language like 'tomorrow', 'next Friday'"
                  },
                  required: true
                },
                {
                  name: "partySize",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "number",
                    description: "Number of people in the party",
                    minimum: 1,
                    maximum: 12
                  },
                  required: true
                }
              ],
              http: {
                baseUrlPattern: `${this.config.BASE_URL}/api/v1/tools/check-availability`,
                httpMethod: "POST"
              }
            }
          },
          {
            temporaryTool: {
              modelToolName: "makeReservation",
              description: "Create a restaurant reservation with all required details",
              defaultReaction: "AGENT_REACTION_SPEAKS",
              dynamicParameters: [
                {
                  name: "customerName",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Full name of the customer making the reservation"
                  },
                  required: true
                },
                {
                  name: "date",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Date for the reservation in YYYY-MM-DD format"
                  },
                  required: true
                },
                {
                  name: "time",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Time for the reservation (e.g., '7:30 PM')"
                  },
                  required: true
                },
                {
                  name: "partySize",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "number",
                    description: "Number of people in the party",
                    minimum: 1,
                    maximum: 12
                  },
                  required: true
                },
                {
                  name: "specialRequirements",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Any special requirements or requests"
                  },
                  required: false
                }
              ],
              http: {
                baseUrlPattern: `${this.config.BASE_URL}/api/v1/tools/make-reservation`,
                httpMethod: "POST"
              }
            }
          },
          {
            temporaryTool: {
              modelToolName: "checkBooking",
              description: "Look up an existing reservation by confirmation code",
              defaultReaction: "AGENT_REACTION_SPEAKS",
              dynamicParameters: [
                {
                  name: "confirmationCode",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Three-letter confirmation code (e.g., ABC, XYZ)"
                  },
                  required: true
                }
              ],
              http: {
                baseUrlPattern: `${this.config.BASE_URL}/api/v1/tools/check-booking`,
                httpMethod: "POST"
              }
            }
          },
          {
            temporaryTool: {
              modelToolName: "getDailySpecials",
              description: "Get today's soup and meal specials",
              defaultReaction: "AGENT_REACTION_SPEAKS",
              dynamicParameters: [],
              http: {
                baseUrlPattern: `${this.config.BASE_URL}/api/v1/tools/daily-specials`,
                httpMethod: "GET"
              }
            }
          },
          {
            temporaryTool: {
              modelToolName: "checkOpeningHours",
              description: "Check if the restaurant is currently open and get opening hours information",
              defaultReaction: "AGENT_REACTION_SPEAKS",
              dynamicParameters: [],
              http: {
                baseUrlPattern: `${this.config.BASE_URL}/api/v1/tools/opening-hours`,
                httpMethod: "GET"
              }
            }
          },
          {
            temporaryTool: {
              modelToolName: "transferCall",
              description: "Transfer the call to a human booking agent when requested by the customer",
              defaultReaction: "AGENT_REACTION_SPEAKS",
              automaticParameters: [
                {
                  name: "callId",
                  location: "PARAMETER_LOCATION_BODY",
                  knownValue: "KNOWN_PARAM_CALL_ID"
                }
              ],
              dynamicParameters: [
                {
                  name: "reason",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Reason for the transfer"
                  },
                  required: true
                },
                {
                  name: "customerName",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Customer's name for the transfer"
                  },
                  required: false
                },
                {
                  name: "summary",
                  location: "PARAMETER_LOCATION_BODY",
                  schema: {
                    type: "string",
                    description: "Brief summary of the conversation so far"
                  },
                  required: false
                }
              ],
              http: {
                baseUrlPattern: `${this.config.BASE_URL}/api/v1/tools/transfer-call`,
                httpMethod: "POST"
              }
            }
          }
        ],
        medium: { "twilio": {} },
        inactivityMessages: [
          {
            duration: "30s",
            message: "Are you still there? I'm here to help with your reservation."
          },
          {
            duration: "15s",
            message: "If there's nothing else I can help you with, I'll end our call."
          },
          {
            duration: "10s",
            message: "Thank you for calling Bella Vista Italian Restaurant. Have a wonderful day! Goodbye.",
            endBehavior: "END_BEHAVIOR_HANG_UP_SOFT"
          }
        ]
      };

      const ultravoxCall = await this.ultravoxService.createCall(callConfig);

      // Register the call
      this.callManager.registerCall(ultravoxCall.callId, twilioCallSid);

      // Generate TwiML to connect to Ultravox
      const twiml = new twilio.twiml.VoiceResponse();
      const connect = twiml.connect();
      connect.stream({
        url: ultravoxCall.joinUrl,
        name: 'bella-vista-agent'
      });

      logger.info('Generated TwiML for Ultravox connection', {
        callSid: twilioCallSid,
        ultravoxCallId: ultravoxCall.callId,
        joinUrl: ultravoxCall.joinUrl
      });

      return twiml.toString();

    } catch (error) {
      logger.error('Error in voice webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        callSid: data.CallSid
      });

      // Release reserved slot if call creation failed
      this.callManager.releaseCallSlot();

      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: this.config.TWILIO_VOICE as any }, 'Sorry, there was an error connecting your call. Please try again.');
      return twiml.toString();
    }
  }
}