// OJT Master - WebLLM Utilities Tests (PRD-0007)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @mlc-ai/web-llm before importing
vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: vi.fn(),
}));

// Import after mock
import * as webllm from '@mlc-ai/web-llm';
import {
  checkWebGPUSupport,
  initWebLLM,
  unloadWebLLM,
  isWebLLMReady,
  getCurrentModel,
  getPreferredEngine,
  setPreferredEngine,
  isModelCached,
} from './webllm';

describe('checkWebGPUSupport', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  it('returns not supported when navigator.gpu is undefined', async () => {
    global.navigator = {};

    const result = await checkWebGPUSupport();

    expect(result.supported).toBe(false);
    expect(result.error).toContain('WebGPU를 지원하지 않습니다');
  });

  it('returns not supported when adapter is null', async () => {
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await checkWebGPUSupport();

    expect(result.supported).toBe(false);
    expect(result.error).toContain('어댑터를 찾을 수 없습니다');
  });

  it('returns supported when adapter exists', async () => {
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' }),
      },
    };

    const result = await checkWebGPUSupport();

    expect(result.supported).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('handles requestAdapter error', async () => {
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockRejectedValue(new Error('GPU init failed')),
      },
    };

    const result = await checkWebGPUSupport();

    expect(result.supported).toBe(false);
    expect(result.error).toContain('GPU init failed');
  });
});

describe('initWebLLM', () => {
  let originalNavigator;
  let mockEngine;

  beforeEach(() => {
    originalNavigator = global.navigator;

    // Mock WebGPU support
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' }),
      },
    };

    // Mock engine
    mockEngine = {
      unload: vi.fn().mockResolvedValue(undefined),
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    webllm.CreateMLCEngine.mockReset();
    webllm.CreateMLCEngine.mockResolvedValue(mockEngine);

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(async () => {
    global.navigator = originalNavigator;
    vi.unstubAllGlobals();
    // Cleanup engine state
    await unloadWebLLM();
  });

  it('throws error for unknown model', async () => {
    await expect(initWebLLM('unknown-model')).rejects.toThrow('Unknown model');
  });

  it('throws error when WebGPU is not supported', async () => {
    global.navigator = {};

    await expect(initWebLLM('qwen-2.5-3b')).rejects.toThrow('WebGPU를 지원하지 않습니다');
  });

  it('initializes engine with correct model ID', async () => {
    await initWebLLM('qwen-2.5-3b');

    expect(webllm.CreateMLCEngine).toHaveBeenCalledWith(
      'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      expect.objectContaining({
        initProgressCallback: expect.any(Function),
      })
    );
  });

  it('calls progress callback during initialization', async () => {
    const onProgress = vi.fn();

    webllm.CreateMLCEngine.mockImplementation(async (modelId, options) => {
      // Simulate progress callbacks
      options.initProgressCallback({ text: 'Loading...', progress: 0.5 });
      options.initProgressCallback({ text: 'Done', progress: 1.0 });
      return mockEngine;
    });

    await initWebLLM('qwen-2.5-3b', onProgress);

    expect(onProgress).toHaveBeenCalledWith({ text: 'Loading...', progress: 0.5 });
    expect(onProgress).toHaveBeenCalledWith({ text: 'Done', progress: 1.0 });
  });

  it('stores model info in localStorage on success', async () => {
    await initWebLLM('qwen-2.5-3b');

    expect(localStorage.setItem).toHaveBeenCalledWith('ojt_webllm_cached', 'qwen-2.5-3b');
    expect(localStorage.setItem).toHaveBeenCalledWith('ojt_webllm_model', 'qwen-2.5-3b');
  });

  it('skips initialization when same model is loaded', async () => {
    await initWebLLM('qwen-2.5-3b');

    webllm.CreateMLCEngine.mockClear();

    await initWebLLM('qwen-2.5-3b');

    expect(webllm.CreateMLCEngine).not.toHaveBeenCalled();
  });

  it('unloads previous model when loading different model', async () => {
    await initWebLLM('qwen-2.5-3b');

    await initWebLLM('gemma-3-2b');

    expect(mockEngine.unload).toHaveBeenCalled();
  });

  it('throws wrapped error on engine creation failure', async () => {
    webllm.CreateMLCEngine.mockRejectedValue(new Error('Out of memory'));

    await expect(initWebLLM('qwen-2.5-3b')).rejects.toThrow('모델 로드 실패: Out of memory');
  });
});

describe('unloadWebLLM', () => {
  let mockEngine;

  beforeEach(() => {
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' }),
      },
    };

    mockEngine = {
      unload: vi.fn().mockResolvedValue(undefined),
    };

    webllm.CreateMLCEngine.mockReset();
    webllm.CreateMLCEngine.mockResolvedValue(mockEngine);

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await unloadWebLLM();
  });

  it('calls engine.unload when engine exists', async () => {
    await initWebLLM('qwen-2.5-3b');

    await unloadWebLLM();

    expect(mockEngine.unload).toHaveBeenCalled();
  });

  it('handles unload error gracefully', async () => {
    await initWebLLM('qwen-2.5-3b');

    mockEngine.unload.mockRejectedValue(new Error('Unload failed'));

    // Should not throw
    await expect(unloadWebLLM()).resolves.toBeUndefined();
  });

  it('does nothing when no engine is loaded', async () => {
    // Ensure no engine
    await unloadWebLLM();

    // Should not throw
    await expect(unloadWebLLM()).resolves.toBeUndefined();
  });
});

describe('isWebLLMReady', () => {
  beforeEach(() => {
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' }),
      },
    };

    webllm.CreateMLCEngine.mockReset();
    webllm.CreateMLCEngine.mockResolvedValue({
      unload: vi.fn().mockResolvedValue(undefined),
    });

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await unloadWebLLM();
  });

  it('returns false when no engine is loaded', async () => {
    await unloadWebLLM();
    expect(isWebLLMReady()).toBe(false);
  });

  it('returns true when engine is loaded', async () => {
    await initWebLLM('qwen-2.5-3b');
    expect(isWebLLMReady()).toBe(true);
  });
});

describe('getCurrentModel', () => {
  beforeEach(() => {
    global.navigator = {
      gpu: {
        requestAdapter: vi.fn().mockResolvedValue({ name: 'test-adapter' }),
      },
    };

    webllm.CreateMLCEngine.mockReset();
    webllm.CreateMLCEngine.mockResolvedValue({
      unload: vi.fn().mockResolvedValue(undefined),
    });

    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await unloadWebLLM();
  });

  it('returns null when no engine is loaded', async () => {
    await unloadWebLLM();
    expect(getCurrentModel()).toBeNull();
  });

  it('returns model info when engine is loaded', async () => {
    await initWebLLM('qwen-2.5-3b');

    const model = getCurrentModel();

    expect(model).not.toBeNull();
    expect(model.key).toBe('qwen-2.5-3b');
    expect(model.config.name).toBe('Qwen 2.5 3B');
  });
});

describe('getPreferredEngine / setPreferredEngine', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns gemini as default engine', () => {
    localStorage.getItem.mockReturnValue(null);

    expect(getPreferredEngine()).toBe('gemini');
  });

  it('returns stored engine preference', () => {
    localStorage.getItem.mockReturnValue('webllm');

    expect(getPreferredEngine()).toBe('webllm');
  });

  it('stores engine preference', () => {
    setPreferredEngine('webllm');

    expect(localStorage.setItem).toHaveBeenCalledWith('ojt_preferred_ai_engine', 'webllm');
  });
});

describe('isModelCached', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when no model is cached', () => {
    localStorage.getItem.mockReturnValue(null);

    expect(isModelCached('qwen-2.5-3b')).toBe(false);
  });

  it('returns false when different model is cached', () => {
    localStorage.getItem.mockReturnValue('gemma-3-2b');

    expect(isModelCached('qwen-2.5-3b')).toBe(false);
  });

  it('returns true when model is cached', () => {
    localStorage.getItem.mockReturnValue('qwen-2.5-3b');

    expect(isModelCached('qwen-2.5-3b')).toBe(true);
  });
});
