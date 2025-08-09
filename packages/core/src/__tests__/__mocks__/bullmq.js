import { jest } from '@jest/globals';

const mockAdd = jest.fn();
const mockClose = jest.fn().mockResolvedValue(undefined);

// Reset and setup mockAdd properly before each test
mockAdd.mockImplementation(() => Promise.resolve({ 
  waitUntilFinished: jest.fn().mockResolvedValue('mock-result') 
}));

export const Queue = jest.fn().mockImplementation(() => ({
  add: mockAdd,
  close: mockClose,
}));

export const Worker = jest.fn().mockImplementation(() => ({
  close: jest.fn().mockResolvedValue(undefined),
}));

export const getMockAdd = () => mockAdd;
export const getMockClose = () => mockClose;