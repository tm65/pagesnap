import asyncio
from playwright.async_api import async_playwright
from urllib.parse import urlparse
import re
import base64
import mimetypes
from .config import load_config

from .storage.file_system_provider import FileSystemProvider
from .storage.in_memory_provider import InMemoryProvider
from .storage.s3_provider import S3Provider

class PageSnap:
    def __init__(self, config: dict = None):
        self.config = config or load_config()
        self.storage_provider = self._init_storage_provider()

    def _init_storage_provider(self):
        storage_config = self.config["output"]["storage"]
        provider = storage_config["provider"]
        if provider == 'filesystem':
            return FileSystemProvider(storage_config)
        elif provider == 'in-memory':
            return InMemoryProvider(storage_config)
        elif provider == 's3':
            return S3Provider(storage_config)
        else:
            raise ValueError(f"Unknown storage provider: {provider}")

    async def _capture_one(self, context, url: str, options: dict):
        page = await context.new_page()
        results = []
        try:
            print(f"Processing: {url}")
            await page.goto(url, wait_until='load', timeout=60000)

            # 2-Stage Sanitization
            custom_rules = self.config["sanitization"]["customRules"]
            if custom_rules:
                print(f"  -> Applying 2-stage sanitization for {url}")
                style_content = f"{', '.join(custom_rules)} {{ display: none !important; }}"
                await page.add_style_tag(content=style_content)
                
                await page.evaluate(f"""async (selectors) => {{
                    for (let i = 0; i < 5; i++) {{
                        for (const selector of selectors) {{
                            document.querySelectorAll(selector).forEach(el => el.remove());
                        }}
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }}
                }}""", custom_rules)

            # Apply watermark if enabled
            if "watermark" in self.config and self.config["watermark"]["enabled"]:
                await self._apply_watermark(page, self.config["watermark"])

            screenshot_options = {
                "full_page": "clip" not in options, # If a clip is provided, full_page must be false
                **options
            }
            
            for fmt in self.config["output"]["formats"]:
                file_name = self._get_file_name(url) + f".{fmt}"
                
                if fmt == 'svg':
                    print("SVG output is not yet supported.")
                    continue

                if fmt == 'pdf':
                    buffer = await page.pdf(**options.get('pdfOptions', {}))
                else:
                    screenshot_options['type'] = 'jpeg' if fmt == 'jpg' else 'png'
                    buffer = await page.screenshot(**screenshot_options)
                
                output_path = await self.storage_provider.save(file_name, buffer)
                results.append({"url": url, "format": fmt, "path": output_path})
                print(f"  -> Saved to {output_path}")

        except Exception as e:
            print(f"Failed to process {url}: {e}")
            results.append({"url": url, "error": str(e)})
        finally:
            await page.close()
        return results

    async def capture(self, urls: list[str], options: dict = {}):
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
            )
            
            semaphore = asyncio.Semaphore(self.config["performance"]["maxConcurrency"])
            
            async def run_with_semaphore(url):
                async with semaphore:
                    return await self._capture_one(context, url, options)

            tasks = [run_with_semaphore(url) for url in urls]
            results_list = await asyncio.gather(*tasks)
            
            await browser.close()
            # Flatten the list of lists
            return [item for sublist in results_list for item in sublist]

    def _get_file_name(self, url: str) -> str:
        parsed = urlparse(url)
        name = f"{parsed.hostname}{parsed.path}".rstrip('/')
        return re.sub(r'[^a-z0-9]', '_', name, flags=re.IGNORECASE).lower()

    async def _apply_watermark(self, page, watermark: dict):
        if not watermark or not watermark.get("enabled"):
            return

        watermark_type = watermark.get("type", "text")
        
        watermark_data = {}
        if watermark_type == "text":
            watermark_data = watermark.get("text", {})
        elif watermark_type == "image":
            watermark_data = watermark.get("image", {})
            image_path = watermark_data.get("path")
            if image_path:
                try:
                    with open(image_path, "rb") as image_file:
                        encoded_string = base64.b64encode(image_file.read()).decode()
                    mime_type, _ = mimetypes.guess_type(image_path)
                    if mime_type:
                        watermark_data["path"] = f"data:{mime_type};base64,{encoded_string}"
                except Exception as e:
                    print(f"Failed to read watermark image: {image_path}, {e}")
                    return

        await page.evaluate("""(watermark) => {
            const watermarkElement = document.createElement('div');
            watermarkElement.id = 'pagesnap-watermark';
            
            let style = 'position: fixed; z-index: 999999; pointer-events: none;';

            if (watermark.type === 'text') {
                watermarkElement.textContent = watermark.text.content;
                style += `
                  font-family: ${watermark.text.font};
                  font-size: ${watermark.text.size};
                  color: ${watermark.text.color};
                `;
            } else if (watermark.type === 'image') {
                const img = document.createElement('img');
                img.src = watermark.image.path; // This will be a data URI
                img.style.width = watermark.image.width;
                img.style.height = watermark.image.height;
                img.style.opacity = watermark.image.opacity;
                watermarkElement.appendChild(img);
            }

            const { position, x_offset, y_offset } = watermark.type === 'text' ? watermark.text : watermark.image;

            switch (position) {
                case 'top-left':
                    style += `top: ${y_offset}px; left: ${x_offset}px;`;
                    break;
                case 'top-right':
                    style += `top: ${y_offset}px; right: ${x_offset}px;`;
                    break;
                case 'bottom-left':
                    style += `bottom: ${y_offset}px; left: ${x_offset}px;`;
                    break;
                case 'bottom-right':
                    style += `bottom: ${y_offset}px; right: ${x_offset}px;`;
                    break;
                case 'center':
                    style += `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
                    break;
                case 'tile':
                    // Tiling will be handled differently
                    break;
            }
            
            watermarkElement.style.cssText = style;

            if (position === 'tile') {
                const tileContainer = document.createElement('div');
                tileContainer.id = 'pagesnap-watermark-container';
                tileContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; pointer-events: none; overflow: hidden;';
                
                const watermarkDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
                    <text x="10" y="50" font-family="${watermark.text.font}" font-size="${watermark.text.size}" fill="${watermark.text.color}" transform="rotate(-30, 10, 50)">
                      ${watermark.text.content}
                    </text>
                  </svg>
                `)}`;
                
                tileContainer.style.backgroundImage = `url("${watermarkDataUri}")`;
                tileContainer.style.backgroundRepeat = 'repeat';
                document.body.appendChild(tileContainer);
            } else {
                document.body.appendChild(watermarkElement);
            }
        }""", watermark)
