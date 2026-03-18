export interface SensorAdapterConfig {
  sensorId: string;
  baseLatitude: number;
  baseLongitude: number;
}

export interface DetectedEntity {
  sensorId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  confidence: number;
}

export class SensorAdapter {
  constructor(private config: SensorAdapterConfig) {}

  async initialize(): Promise<void> {}

  generateDetectionData(): DetectedEntity {
    const { sensorId, baseLatitude, baseLongitude } = this.config;
    return {
      sensorId,
      timestamp: new Date(),
      latitude: baseLatitude + (Math.random() - 0.5) * 0.001,
      longitude: baseLongitude + (Math.random() - 0.5) * 0.001,
      confidence: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
    };
  }
}
