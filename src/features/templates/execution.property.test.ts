/**
 * @vitest-environment jsdom
 *
 * Feature: ux-power-user-features
 * Property 14: Template sequential execution piping
 * Property 15: Template failure preserves intermediate result
 *
 * Property 14: For any template with N steps and a valid input ArrayBuffer,
 * execution should pass the output of step i as the input to step i+1 for
 * all 0 ≤ i < N-1. The final result should equal the output of step N-1.
 *
 * Property 15: For any template where step i (i > 0) fails, the preserved
 * intermediate result should be byte-identical to the output of step i-1
 * (the last successful step).
 *
 * Validates: Requirements 8.4, 9.1
 */
import { test } from '@fast-check/vitest';
import fc from 'fast-check';
import { beforeEach, vi, expect } from 'vitest';
import { useTemplateStore } from '../../store/templates';

// Mock the pdf-worker-client module
vi.mock('@/workers/pdf-worker-client', () => ({
  getPdfWorkerClient: vi.fn(),
}));

import { getPdfWorkerClient } from '@/workers/pdf-worker-client';

const mockedGetPdfWorkerClient = vi.mocked(getPdfWorkerClient);

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the template store to initial state
  useTemplateStore.getState().reset();
});

/**
 * Predictable transformation: appends a step-specific byte to the input.
 * This makes it easy to verify the piping chain — each step adds one byte
 * with value equal to the step index.
 */
function transformForStep(input: ArrayBuffer, stepIndex: number): ArrayBuffer {
  const inputBytes = new Uint8Array(input);
  const output = new Uint8Array(inputBytes.length + 1);
  output.set(inputBytes);
  output[inputBytes.length] = stepIndex;
  return output.buffer;
}

/**
 * Computes the expected final result after applying N sequential transformations
 * to the initial input.
 */
function computeExpectedResult(input: ArrayBuffer, numSteps: number): ArrayBuffer {
  let current = input;
  for (let i = 0; i < numSteps; i++) {
    current = transformForStep(current, i);
  }
  return current;
}

/**
 * Computes the expected intermediate result after applying steps 0..failIndex-1.
 */
function computeExpectedIntermediate(input: ArrayBuffer, failIndex: number): ArrayBuffer {
  let current = input;
  for (let i = 0; i < failIndex; i++) {
    current = transformForStep(current, i);
  }
  return current;
}

/**
 * Compares two ArrayBuffers for byte-identity.
 */
function buffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  for (let i = 0; i < viewA.length; i++) {
    if (viewA[i] !== viewB[i]) return false;
  }
  return true;
}

/**
 * Sets up a mock PdfWorkerClient where each operation transforms the input
 * predictably by appending a byte. Uses a call counter to determine which
 * step index is being executed.
 */
function setupSuccessfulMock(_numSteps: number) {
  let callCount = 0;

  const mockClient = {
    compress: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    flatten: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    linearize: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    addPageNumbers: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    addHeadersFooters: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    addWatermark: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    redact: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    encrypt: vi.fn().mockImplementation((data: ArrayBuffer) => {
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
  };

  mockedGetPdfWorkerClient.mockReturnValue(mockClient as never);
  return mockClient;
}

/**
 * Sets up a mock PdfWorkerClient where steps 0..failIndex-1 succeed
 * and step failIndex fails with an error.
 */
function setupFailingMock(failIndex: number) {
  let callCount = 0;

  const mockClient = {
    compress: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    flatten: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    linearize: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    addPageNumbers: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    addHeadersFooters: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    addWatermark: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    redact: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
    encrypt: vi.fn().mockImplementation((data: ArrayBuffer) => {
      if (callCount === failIndex) {
        callCount++;
        return Promise.resolve({ success: false, error: 'Step failed' });
      }
      const result = transformForStep(data, callCount);
      callCount++;
      return Promise.resolve({ success: true, data: result });
    }),
  };

  mockedGetPdfWorkerClient.mockReturnValue(mockClient as never);
  return mockClient;
}

/**
 * Arbitrary for generating a number of steps between 2 and 5.
 */
const numStepsArb = fc.integer({ min: 2, max: 5 });

/**
 * Arbitrary for generating a valid input ArrayBuffer (1-20 bytes).
 */
const inputBufferArb = fc.uint8Array({ minLength: 1, maxLength: 20 }).map((arr) => arr.buffer);

/**
 * Available operation types that map to PdfWorkerClient methods.
 */
const operationTypes = ['compress', 'flatten', 'linearize', 'page-numbers', 'headers-footers'];

// ============================================================================
// Property 14: Template sequential execution piping
// ============================================================================

test.prop([numStepsArb, inputBufferArb], { numRuns: 100 })(
  'Feature: ux-power-user-features, Property 14: Template sequential execution piping — output of step i is input to step i+1, final result equals output of last step',
  async (numSteps, inputBuffer) => {
    // Generate step operation types
    const ops = Array.from(
      { length: numSteps },
      (_, i) => operationTypes[i % operationTypes.length],
    );

    // Set up mock that transforms predictably
    setupSuccessfulMock(numSteps);

    // Create a custom template with the generated steps
    const templateId = 'test-template';
    const template = {
      id: templateId,
      name: 'Test Template',
      description: 'Generated test template',
      steps: ops.map((op, i) => ({
        id: `step-${i}`,
        operationType: op,
        label: `Step ${i}`,
        params: {},
        timeoutMs: 30000,
      })),
    };

    // Set the template in the store
    useTemplateStore.setState({
      templates: [template],
      _selectedTemplateId: templateId,
      _cancelRequested: false,
      execution: {
        status: 'configuring',
        currentStepIndex: 0,
        totalSteps: numSteps,
        currentStepName: template.steps[0].label,
        intermediateResult: null,
        finalResult: null,
        error: null,
      },
    });

    // Execute the template
    await useTemplateStore.getState().execute(inputBuffer);

    // Verify the final state
    const { execution } = useTemplateStore.getState();

    // Should have completed successfully
    expect(execution.status).toBe('completed');
    expect(execution.finalResult).not.toBeNull();

    // The final result should equal the expected chain of transformations
    const expectedResult = computeExpectedResult(inputBuffer, numSteps);
    expect(buffersEqual(execution.finalResult!, expectedResult)).toBe(true);
  },
);

// ============================================================================
// Property 15: Template failure preserves intermediate result
// ============================================================================

/**
 * Arbitrary that generates [numSteps, failIndex] where failIndex is in [1, numSteps-1].
 */
const stepsAndFailIndexArb = numStepsArb.chain((numSteps) =>
  fc.tuple(fc.constant(numSteps), fc.integer({ min: 1, max: numSteps - 1 })),
);

test.prop([stepsAndFailIndexArb, inputBufferArb], { numRuns: 100 })(
  'Feature: ux-power-user-features, Property 15: Template failure preserves intermediate result — intermediate result is byte-identical to output of last successful step',
  async ([numSteps, failIndex], inputBuffer) => {
    // Generate step operation types
    const ops = Array.from(
      { length: numSteps },
      (_, i) => operationTypes[i % operationTypes.length],
    );

    // Set up mock that fails at failIndex
    setupFailingMock(failIndex);

    // Create a custom template with the generated steps
    const templateId = 'test-template-fail';
    const template = {
      id: templateId,
      name: 'Test Template Fail',
      description: 'Generated test template for failure',
      steps: ops.map((op, i) => ({
        id: `step-${i}`,
        operationType: op,
        label: `Step ${i}`,
        params: {},
        timeoutMs: 30000,
      })),
    };

    // Set the template in the store
    useTemplateStore.setState({
      templates: [template],
      _selectedTemplateId: templateId,
      _cancelRequested: false,
      execution: {
        status: 'configuring',
        currentStepIndex: 0,
        totalSteps: numSteps,
        currentStepName: template.steps[0].label,
        intermediateResult: null,
        finalResult: null,
        error: null,
      },
    });

    // Execute the template
    await useTemplateStore.getState().execute(inputBuffer);

    // Verify the failure state
    const { execution } = useTemplateStore.getState();

    // Should have failed
    expect(execution.status).toBe('failed');
    expect(execution.error).not.toBeNull();
    expect(execution.error!.stepIndex).toBe(failIndex);

    // The intermediate result should be byte-identical to the output of step failIndex-1
    const expectedIntermediate = computeExpectedIntermediate(inputBuffer, failIndex);
    expect(execution.intermediateResult).not.toBeNull();
    expect(buffersEqual(execution.intermediateResult!, expectedIntermediate)).toBe(true);
  },
);
