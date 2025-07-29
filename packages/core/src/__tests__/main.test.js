const PageSnap = require('../main');
const path = require('path');
const fs = require('fs/promises');

// Mocking playwright and p-queue to avoid actual browser launching during tests
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          evaluate: jest.fn().mockResolvedValue(undefined),
          screenshot: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('p-queue', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            add: jest.fn(async (task) => await task()),
            onIdle: jest.fn().mockResolvedValue(undefined),
        })),
    };
});


describe('PageSnap', () => {
  let converter;

  beforeEach(() => {
    converter = new PageSnap();
  });

  it('should generate a valid filename from a URL', () => {
    const url = 'https://example.com/path/to/page/';
    const expected = 'example_com_path_to_page';
    expect(converter.getFileName(url)).toBe(expected);
  });

  it('should handle URLs with query strings', () => {
    const url = 'https://www.google.com/search?q=pagesnap';
    const expected = 'www_google_com_search';
    expect(converter.getFileName(url)).toBe(expected);
  });

  it('should call capture and process a URL', async () => {
    const urls = ['https://example.com'];
    const results = await converter.capture(urls);
    
    // Verify that the mocked browser was used
    const { chromium } = require('playwright');
    expect(chromium.launch).toHaveBeenCalled();

    // Check if the output path was created
    const outputDir = path.resolve(process.cwd(), './snapshots');
    try {
        await fs.access(outputDir);
    } catch (e) {
        // This will fail if the directory doesn't exist, which is what we want to avoid
        fail('Output directory was not created');
    }

    // Clean up the created directory
    await fs.rmdir(outputDir, { recursive: true });
  });
});
