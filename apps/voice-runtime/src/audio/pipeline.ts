import {
  convertAudio,
  EXOTEL_DEFAULT_FORMAT,
  GEMINI_INPUT_FORMAT,
  GEMINI_OUTPUT_FORMAT,
  type AudioFormat,
} from "./formats.js";
import { InterruptionController } from "./interruption.js";

export interface AudioPipelineOptions {
  telephonyFormat?: AudioFormat;
  aiInputFormat?: AudioFormat;
  aiOutputFormat?: AudioFormat;
}

/**
 * Bidirectional audio adapter between telephony stream and AI provider.
 */
export class AudioPipeline {
  readonly interruption: InterruptionController;
  readonly telephonyFormat: AudioFormat;
  readonly aiInputFormat: AudioFormat;
  readonly aiOutputFormat: AudioFormat;

  constructor(options: AudioPipelineOptions = {}) {
    this.interruption = new InterruptionController();
    this.telephonyFormat = options.telephonyFormat ?? EXOTEL_DEFAULT_FORMAT;
    this.aiInputFormat = options.aiInputFormat ?? GEMINI_INPUT_FORMAT;
    this.aiOutputFormat = options.aiOutputFormat ?? GEMINI_OUTPUT_FORMAT;
  }

  /** Inbound caller audio → AI input format. */
  telephonyToAi(chunk: Buffer): Buffer {
    return convertAudio(chunk, this.telephonyFormat, this.aiInputFormat);
  }

  /** AI output audio → telephony format; respects interruption generation. */
  aiToTelephony(chunk: Buffer, generation?: number): Buffer | null {
    if (
      generation !== undefined &&
      generation !== this.interruption.getGeneration()
    ) {
      return null;
    }
    if (this.interruption.isInterrupted()) {
      return null;
    }
    const converted = convertAudio(
      chunk,
      this.aiOutputFormat,
      this.telephonyFormat,
    );
    this.interruption.enqueueOutbound(
      converted,
      generation ?? this.interruption.getGeneration(),
    );
    return converted;
  }

  handleBargeIn(): number {
    return this.interruption.interrupt();
  }

  resumeAfterBargeIn(): void {
    this.interruption.clearInterrupted();
  }
}
