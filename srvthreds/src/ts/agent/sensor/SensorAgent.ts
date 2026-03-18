import { Logger, Message } from '../../thredlib/index.js';
import { EventPublisher, MessageHandler, MessageHandlerParams } from '../AgentService.js';
import { AgentConfig } from '../../config/AgentConfig.js';
import { SensorAdapter } from './SensorAdapter.js';

export interface SensorAgentConfig {
  sensorId: string;
  intervalMs: number;
  baseLatitude: number;
  baseLongitude: number;
}

/**
 * SensorAgent is a producer agent that generates mock detection events at a fixed interval.
 * It does not consume messages from the engine; it publishes unbound events to trigger pattern matching.
 */
export class SensorAgent implements MessageHandler {
  private intervalHandle?: ReturnType<typeof setInterval>;
  private readonly adapter: SensorAdapter;
  private readonly agentConfig: AgentConfig;
  private readonly eventPublisher: EventPublisher;

  constructor({ config, eventPublisher }: MessageHandlerParams) {
    this.agentConfig = config;
    this.eventPublisher = eventPublisher;
    const { sensorId, baseLatitude, baseLongitude } = config.customConfig as SensorAgentConfig;
    this.adapter = new SensorAdapter({ sensorId, baseLatitude, baseLongitude });
  }

  async initialize(): Promise<void> {
    await this.adapter.initialize();
    const { intervalMs } = this.agentConfig.customConfig as SensorAgentConfig;
    this.intervalHandle = setInterval(() => {
      this.publishDetectionEvent().catch(Logger.error);
    }, intervalMs);
    Logger.info(`SensorAgent: initialized, publishing detection events every ${intervalMs}ms`);
  }

  // Sensor agent is purely a producer; inbound messages from engine are not expected
  async processMessage(_message: Message): Promise<void> {}

  async shutdown(): Promise<void> {
    clearInterval(this.intervalHandle);
    Logger.info('SensorAgent: shutdown');
  }

  private async publishDetectionEvent(): Promise<void> {
    const values = this.adapter.generateDetectionData();
    const event = this.eventPublisher.createOutboundEvent({
      type: 'org.wt.sensor.detectionEvent',
      content: { values },
    });
    await this.eventPublisher.publishEvent(event);
  }
}

export default SensorAgent;
