import { jest } from '@jest/globals';

export const mockPdf = jest.fn().mockResolvedValue(Buffer.from('fake-pdf'));
export const mockScreenshot = jest.fn().mockResolvedValue(Buffer.from('fake-png'));
export const mockGoto = jest.fn().mockResolvedValue(undefined);
export const mockSetContent = jest.fn().mockResolvedValue(undefined);
export const mockEvaluate = jest.fn().mockResolvedValue({ title: 'Mock Title' });
export const mockPageClose = jest.fn().mockResolvedValue(undefined);
export const mockContextClose = jest.fn().mockResolvedValue(undefined);
export const mockBrowserClose = jest.fn().mockResolvedValue(undefined);

export const chromium = {
  launch: jest.fn().mockResolvedValue({
    newContext: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        pdf: mockPdf,
        screenshot: mockScreenshot,
        goto: mockGoto,
        setContent: mockSetContent,
        evaluate: mockEvaluate,
        close: mockPageClose,
      }),
      close: mockContextClose,
    }),
    close: mockBrowserClose,
  }),
};