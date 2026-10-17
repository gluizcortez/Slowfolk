"""Smoke tests of the real browser renderer; start the static HTTP server first.

python3 -m http.server 8000 --bind 127.0.0.1
python3 tests/visual_smoke.py
"""
import json
import os
from pathlib import Path
import shutil
import unittest

from playwright.sync_api import sync_playwright


URL = os.environ.get("SLOWFOLK_URL", "http://127.0.0.1:8000/")
CAPTURES = os.environ.get("SLOWFOLK_SCREENSHOTS")


class VisualSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        executable = os.environ.get("CHROMIUM_PATH") or shutil.which("chromium")
        cls.browser = cls.playwright.chromium.launch(
            executable_path=executable,
            headless=True,
            args=["--no-sandbox", "--enable-unsafe-swiftshader"],
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        mobile = self._testMethodName == "test_mobile_resize_and_reduced_motion"
        self.context = self.browser.new_context(
            viewport={"width": 1440, "height": 900}, is_mobile=mobile, has_touch=mobile)
        self.page = self.context.new_page()
        self.page.set_default_timeout(20000)
        self.errors = []
        self.responses = []
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        self.page.on("response", lambda r: self.responses.append((r.status, r.url)) if r.status >= 400 else None)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], "JavaScript errors")
        self.assertEqual(self.responses, [], "Broken application resources")

    def open(self):
        self.page.goto(URL, wait_until="networkidle")
        self.page.locator("#ttNew").wait_for(state="visible")

    def start(self):
        self.open()
        self.page.locator("#ttNew").click()
        self.page.locator("#title").wait_for(state="detached")
        self.page.locator("#hud").wait_for(state="visible")

    def capture(self, name):
        if CAPTURES:
            folder = Path(CAPTURES)
            folder.mkdir(parents=True, exist_ok=True)
            self.page.screenshot(path=str(folder / (name + ".png")))

    def assert_rendered(self):
        self.page.wait_for_function("VISUAL.gpu && !document.getElementById('screen-fx').hidden")
        result = self.page.evaluate("""() => {
          VISUAL.apresenta(tempo);
          const out = document.createElement('canvas'); out.width = W; out.height = H;
          const c = out.getContext('2d'); c.drawImage(document.getElementById('screen-fx'), 0, 0);
          const pixels = c.getImageData(0, 0, W, H).data;
          const original = cx.getImageData(0, 0, W, H).data;
          const colors = new Set(); let delta = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            colors.add((pixels[i] << 16) | (pixels[i+1] << 8) | pixels[i+2]);
            for (let j = 0; j < 3; j++) delta += Math.abs(pixels[i+j] - original[i+j]);
          }
          return { colors: colors.size, difference: delta / (W*H*3),
            error: document.getElementById('screen-fx').getContext('webgl').getError() };
        }""")
        self.assertGreater(result["colors"], 100, "Shader output must contain the scene")
        self.assertGreater(result["difference"], .1, "Shader must affect the rendered scene")
        self.assertLess(result["difference"], 40, "Output must retain orientation and scene detail")
        self.assertEqual(result["error"], 0, "WebGL error")

    def test_landscapes_weather_and_lighting(self):
        self.start()
        for region, hour, rain in [
            ("lago", 6.4, 0), ("lago", 12, 0), ("lago", 17.8, 0),
            ("lago", 22, 0), ("rio", 12, 1), ("baia", 22, 0),
        ]:
            with self.subTest(region=region, hour=hour, rain=rain):
                self.page.evaluate("""([region, hour, rain]) => {
                  E.ponto=region; E.minutos=hour*60; E.barco=480; E.auto=false;
                  CAM.x=280; clima.chuva=clima.alvo=rain; clima.t=1000;
                  document.getElementById('avisos').style.display='none';
                }""", [region, hour, rain])
                self.page.wait_for_function("fundo.ponto === E.ponto")
                self.page.wait_for_timeout(300)
                self.assert_rendered()
                self.capture(f"{region}-{hour}")
        self.page.evaluate("E.ponto='lago'; E.minutos=22*60; PE.ativo=true; PE.x=FOGUEIRA.x; CAM.x=TERRA.ini")
        self.page.wait_for_function("fundo.ponto === 'lago'")
        self.assert_rendered()
        self.capture("fogueira-noite")
        timing = self.page.evaluate("""() => new Promise(resolve => {
          const times=[]; let last=performance.now();
          function sample(now) { times.push(now-last); last=now;
            if(times.length < 50) requestAnimationFrame(sample);
            else { times.shift(); times.sort((a,b)=>a-b);
              resolve({median_ms:times[24],p95_ms:times[46]}); }
          } requestAnimationFrame(sample);
        })""")
        print("\nFrame timing (current machine):", json.dumps(timing), flush=True)

    def test_controls_fishing_and_save(self):
        self.start()
        before = self.page.evaluate("E.barco")
        self.page.keyboard.down("d")
        self.page.wait_for_timeout(2500)
        self.page.keyboard.up("d")
        self.assertGreater(self.page.evaluate("E.barco"), before + 30)
        self.page.locator('[data-p="cesto"]').click()
        self.page.locator("#painel").wait_for(state="visible")
        self.assertTrue(self.page.locator("#pCorpo").inner_text().strip())
        self.page.locator("#pFechar").click()
        self.page.wait_for_function("Math.abs(velBarco) < 1")
        # The shader canvas must not intercept the actual pointer used to cast.
        self.page.locator("#screen").click(position={"x": 1050, "y": 480})
        self.page.wait_for_function("PESCA.estado !== 'parado'")
        self.page.locator("#bAuto").click()
        self.page.wait_for_function("E.auto")
        self.page.wait_for_function("JSON.parse(localStorage.getItem('slowfolk-save')).auto", timeout=15000)
        self.page.reload(wait_until="networkidle")
        self.page.locator("#ttCont").click()
        self.page.locator("#hud").wait_for(state="visible")
        self.assertTrue(self.page.evaluate("E.auto"))
        self.assert_rendered()

    def test_quality_preference(self):
        self.open()
        self.assert_rendered()
        self.page.locator("#title [data-visual]").click()
        self.assertEqual(self.page.locator("#title [data-visual]").inner_text(), "Visual: leve")
        self.assertTrue(self.page.locator("#screen-fx").is_hidden())
        self.page.reload(wait_until="networkidle")
        self.assertEqual(self.page.locator("#title [data-visual]").get_attribute("aria-pressed"), "false")
        self.page.locator("#ttNew").click()
        self.page.locator("#title").wait_for(state="detached")
        self.page.locator("#bVisual").click()
        self.assert_rendered()

    def test_context_loss_and_restore(self):
        self.start()
        self.assert_rendered()
        self.assertTrue(self.page.evaluate("""() => {
          window.testLoss = document.getElementById('screen-fx').getContext('webgl').getExtension('WEBGL_lose_context');
          if (!window.testLoss) return false;
          testLoss.loseContext(); return true;
        }"""))
        self.page.wait_for_function("!VISUAL.gpu")
        self.assertTrue(self.page.locator("#screen-fx").is_hidden())
        previous = self.page.evaluate("tempo")
        self.page.wait_for_function("tempo > " + str(previous + .2))
        self.page.locator('[data-p="cesto"]').click()
        self.page.locator("#painel").wait_for(state="visible")
        self.page.evaluate("testLoss.restoreContext()")
        self.assert_rendered()

    def test_no_webgl_and_unavailable_storage(self):
        self.page.add_init_script("""(() => {
          const get = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            return type === 'webgl' ? null : get.call(this, type, ...args);
          };
          Object.defineProperty(window, 'localStorage', {get() { throw new Error('Storage unavailable'); }});
        })();""")
        self.start()
        self.assertFalse(self.page.evaluate("VISUAL.gpu"))
        self.assertTrue(self.page.locator("#screen-fx").is_hidden())
        self.assertEqual(self.page.locator("#bVisual").inner_text(), "Visual: clássico")
        self.page.locator('[data-p="cesto"]').click()
        self.page.locator("#painel").wait_for(state="visible")

    def test_mobile_resize_and_reduced_motion(self):
        self.page.set_viewport_size({"width": 390, "height": 844})
        self.page.emulate_media(reduced_motion="reduce")
        self.start()
        self.assert_rendered()
        quality = self.page.locator('#bVisual').bounding_box()
        action = self.page.locator('#bE').bounding_box()
        self.assertLessEqual(quality['y'] + quality['height'], action['y'])
        toast = self.page.locator('#avisos .av').first.bounding_box()
        self.assertGreaterEqual(toast['x'], 0)
        self.assertLessEqual(toast['x'] + toast['width'], 390)
        self.page.locator('#setas [data-lado="dir"]').wait_for(state='visible')
        self.capture("mobile-portrait")
        self.page.set_viewport_size({"width": 844, "height": 390})
        self.page.wait_for_function("document.getElementById('screen-fx').width === W")
        self.assert_rendered()
        self.capture("mobile-landscape")
        self.page.locator("#bVisual").click()
        self.assertTrue(self.page.locator("#screen-fx").is_hidden())


if __name__ == "__main__":
    unittest.main(verbosity=2)
