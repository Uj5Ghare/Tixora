import { EventEmitter } from 'events';
import { InterServiceEvent } from '../types';

class MicroserviceEventBus extends EventEmitter {
  private eventHistory: InterServiceEvent[] = [];
  private maxHistory = 100;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  public publish(eventType: string, sourceService: string, payload: Record<string, any>, targetService?: string) {
    const event: InterServiceEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventType,
      sourceService,
      targetService,
      payload,
      timestamp: new Date().toISOString()
    };

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    // Emit event for subscribers
    this.emit(eventType, event);
    this.emit('*', event); // Wildcard listener for telemetry
    return event;
  }

  public getRecentEvents(limit: number = 30): InterServiceEvent[] {
    return this.eventHistory.slice(0, limit);
  }

  public clearHistory() {
    this.eventHistory = [];
  }
}

export const eventBus = new MicroserviceEventBus();
