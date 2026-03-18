from __future__ import annotations

import contextlib
import io
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
OUTPUT = ROOT / "public" / "motion-lab" / "gifs"
PORT = 4173
BASE_URL = f"http://127.0.0.1:{PORT}/motion-lab/index.html"

CANDIDATES = [
    ("a-split-lane-editorial.gif", 0),
    ("b-reveal-and-trace.gif", 1),
    ("c-shared-latent-spotlight.gif", 2),
    ("d-dual-window-procedure.gif", 3),
    ("e-detach-guardrail.gif", 4),
]

FRAME_COUNT = 18
FRAME_INTERVAL_MS = 333
MAX_WIDTH = 960


class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        return


def serve_dist(stop_event: threading.Event) -> None:
    handler = lambda *args, **kwargs: SilentHandler(*args, directory=str(DIST), **kwargs)
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        httpd.timeout = 0.5
        while not stop_event.is_set():
            httpd.handle_request()


def normalize_frame(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    if image.width > MAX_WIDTH:
        height = int(image.height * (MAX_WIDTH / image.width))
        image = image.resize((MAX_WIDTH, height), Image.LANCZOS)
    return image


def export_candidate(page, index: int, output_path: Path) -> None:
    page.goto(BASE_URL, wait_until="networkidle")
    page.wait_for_timeout(1200)
    locator = page.locator(".candidate").nth(index)
    frames: list[Image.Image] = []

    for frame_idx in range(FRAME_COUNT):
        if frame_idx:
            page.wait_for_timeout(FRAME_INTERVAL_MS)
        image_bytes = locator.screenshot(type="png", animations="allow")
        frame = normalize_frame(image_bytes)
        frames.append(frame)

    palette_frames = [frame.convert("P", palette=Image.ADAPTIVE, colors=128) for frame in frames]
    palette_frames[0].save(
        output_path,
        save_all=True,
        append_images=palette_frames[1:],
        duration=FRAME_INTERVAL_MS,
        loop=0,
        disposal=2,
        optimize=False,
    )


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    stop_event = threading.Event()
    server = threading.Thread(target=serve_dist, args=(stop_event,), daemon=True)
    server.start()
    time.sleep(0.8)

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page(viewport={"width": 1440, "height": 2600}, device_scale_factor=1)
            for filename, index in CANDIDATES:
                export_candidate(page, index, OUTPUT / filename)
                print(f"exported {filename}")
            browser.close()
    finally:
        stop_event.set()
        with contextlib.suppress(Exception):
            import urllib.request

            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/")
        server.join(timeout=2)


if __name__ == "__main__":
    main()
