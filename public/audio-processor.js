// AudioWorklet processor for converting Float32 audio to 16-bit PCM with resampling
// This runs in a separate audio thread for real-time processing

class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Get target sample rate from options, default to 16000
    this.inputSampleRate = sampleRate; // AudioWorklet global
    this.outputSampleRate = options.processorOptions?.targetSampleRate || 16000;
    this.resampleRatio = this.inputSampleRate / this.outputSampleRate;
    
    // Buffer for accumulating samples before sending
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Resampling state
    this.resampleBuffer = [];
    this.resampleIndex = 0;
    
    // Debug
    this.frameCount = 0;
    this.lastLogTime = 0;
    
    console.log(`[PCMProcessor] Initialized: inputRate=${this.inputSampleRate}, outputRate=${this.outputSampleRate}, ratio=${this.resampleRatio}`);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true;
    }

    const inputChannel = input[0];
    this.frameCount++;
    
    // Calculate audio level for debugging
    let maxSample = 0;
    for (let i = 0; i < inputChannel.length; i++) {
      maxSample = Math.max(maxSample, Math.abs(inputChannel[i]));
    }
    
    // Send audio level to main thread periodically
    const now = currentTime;
    if (now - this.lastLogTime > 0.5) { // Every 500ms
      this.port.postMessage({
        type: 'debug',
        frameCount: this.frameCount,
        maxSample: maxSample,
        bufferIndex: this.bufferIndex,
      });
      this.lastLogTime = now;
    }
    
    // If sample rates match, no resampling needed
    if (this.resampleRatio === 1) {
      this.processWithoutResampling(inputChannel);
    } else {
      this.processWithResampling(inputChannel);
    }

    return true;
  }

  processWithoutResampling(inputChannel) {
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      if (this.bufferIndex >= this.bufferSize) {
        this.sendBuffer();
      }
    }
  }

  processWithResampling(inputChannel) {
    // Simple linear interpolation resampling
    for (let i = 0; i < inputChannel.length; i++) {
      this.resampleBuffer.push(inputChannel[i]);
    }

    // Process accumulated samples
    while (this.resampleIndex + this.resampleRatio < this.resampleBuffer.length) {
      const index = Math.floor(this.resampleIndex);
      const fraction = this.resampleIndex - index;
      
      // Linear interpolation between samples
      const sample1 = this.resampleBuffer[index] || 0;
      const sample2 = this.resampleBuffer[index + 1] || sample1;
      const interpolated = sample1 + (sample2 - sample1) * fraction;
      
      this.buffer[this.bufferIndex++] = interpolated;
      this.resampleIndex += this.resampleRatio;

      if (this.bufferIndex >= this.bufferSize) {
        this.sendBuffer();
      }
    }

    // Remove processed samples from resample buffer
    const processedSamples = Math.floor(this.resampleIndex);
    if (processedSamples > 0) {
      this.resampleBuffer = this.resampleBuffer.slice(processedSamples);
      this.resampleIndex -= processedSamples;
    }
  }

  sendBuffer() {
    // Convert Float32 to Int16 PCM
    const pcmData = this.float32ToInt16(this.buffer);
    
    // Send to main thread
    this.port.postMessage({
      type: 'pcm',
      data: pcmData,
    }, [pcmData.buffer]);

    // Reset buffer
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and convert to Int16 range
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
