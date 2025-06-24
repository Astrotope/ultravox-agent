// Call Management Types
export interface ActiveCall {
  twilioCallSid: string;
  timestamp: string;
  status: 'connecting' | 'active' | 'ending' | 'ended';
  lastActivity: Date;
}

export interface ServerMetrics {
  totalCalls: number;
  activeCalls: number;
  rejectedCalls: number;
  errors: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  uptime: number;
  toolCalls: {
    checkAvailability: number;
    makeReservation: number;
    dailySpecials: number;
    openingHours: number;
    transferCall: number;
    checkBooking: number;
  };
}

export interface CallConfig {
  systemPrompt: string;
  model: string;
  voice: string;
  temperature: number;
  firstSpeaker: string;
  selectedTools: any[];
  medium: any;
  inactivityMessages: any[];
}