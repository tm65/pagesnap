import argparse
import asyncio
import json
from .main import PageSnap
from .config import load_config

def main():
    parser = argparse.ArgumentParser(
        description='Capture screenshots of one or more webpages.'
    )
    parser.add_argument(
        'urls',
        metavar='URL',
        type=str,
        nargs='+',
        help='One or more space-separated URLs to capture'
    )
    parser.add_argument(
        '-c', '--config',
        type=str,
        help='Path to a custom config file'
    )
    parser.add_argument('--x', type=int, help='X coordinate of the capture region')
    parser.add_argument('--y', type=int, help='Y coordinate of the capture region')
    parser.add_argument('--width', type=int, help='Width of the capture region')
    parser.add_argument('--height', type=int, help='Height of the capture region')

    args = parser.parse_args()

    if args.urls:
        config = load_config(args.config) if args.config else load_config()
        converter = PageSnap(config)
        
        print('Starting capture...')
        
        # Prepare region options for capture
        options = {}
        if args.x is not None and args.y is not None and args.width and args.height:
            options['clip'] = {
                'x': args.x,
                'y': args.y,
                'width': args.width,
                'height': args.height,
            }

        async def run_capture():
            results = await converter.capture(args.urls, options)
            print('\nCapture complete.')
            print(json.dumps(results, indent=2))

        asyncio.run(run_capture())
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
