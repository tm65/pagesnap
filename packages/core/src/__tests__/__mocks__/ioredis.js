import { jest } from '@jest/globals';

export default jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  quit: jest.fn(),
  duplicate: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue(['test:cache:key1', 'test:cache:key2']),
  info: jest.fn().mockResolvedValue('used_memory:1048576'),
}));