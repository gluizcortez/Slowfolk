"""Web Audio integration and rendered PCM checks (requires Playwright/Chromium)."""
import os
from pathlib import Path
import shutil
import unittest

from playwright.sync_api import sync_playwright


class AudioSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.p = sync_playwright().start()
        cls.browser = cls.p.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),
            args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.p.stop()

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def open_game(self):
        self.page.goto(os.environ.get('SLOWFOLK_URL', 'http://127.0.0.1:8000/'), wait_until='networkidle')

    def offline(self, script):
        self.page.goto('about:blank')
        source = (Path(__file__).resolve().parents[1] / 'js/05-audio.js').read_text()
        self.page.add_script_tag(content="""
          const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)); const $=()=>null;
          const PESCA={boia:{x:200}}, BARCO={x:100}, W=420;
          const ORDEM_RAR=['comum','incomum','raro','epico','lendario'];
          function aviso() {}
        """ + source)
        return self.page.evaluate("""async script => {
          AC=new OfflineAudioContext(2, 48000*8, 48000); MIX=criaMixerAudio(AC);
          MIX.master.gain.value=.75; mudo=false;
          Function(script)();
          const out=await AC.startRendering(), l=out.getChannelData(0), r=out.getChannelData(1);
          let peak=0, sum=0, tail=0, stereo=0, early=0;
          for(let i=0;i<l.length;i++) {
            peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));
            sum+=l[i]*l[i]; stereo+=(l[i]-r[i])**2;
            if(i>l.length-48000) tail+=l[i]*l[i];
            if(i<48000) early+=l[i]*l[i];
          }
          return {peak, rms:Math.sqrt(sum/l.length), tail:Math.sqrt(tail/48000),
            early:Math.sqrt(early/48000), stereo:Math.sqrt(stereo/l.length)};
        }""", script)

    def test_fishing_effects_produce_audio_without_clipping(self):
        for effect in ['lanca', 'splash', 'belisca', 'mordida', 'fisgou', 'carretel', 'pegou', 'arrebentou', 'escapou']:
            with self.subTest(effect=effect):
                arg = "'raro'" if effect == 'pegou' else '.9' if effect == 'carretel' else ''
                result = self.offline(f'sfx.{effect}({arg});')
                self.assertGreater(result['early'], .0001)
                self.assertLess(result['peak'], .95)
                self.assertLess(result['tail'], .00001)

    def test_ambient_stereo_and_global_mute(self):
        for region in ['lago', 'rio', 'baia']:
            with self.subTest(region=region):
                setup = f"iniciaAmbiente(); MIX.camadas.forEach((c,i)=>c.g.gain.value=AMBIENTES.{region}[i]);"
                result = self.offline(setup)
                self.assertGreater(result['rms'], .001)
                self.assertGreater(result['stereo'], .001)
                self.assertLess(result['peak'], .95)
                muted = self.offline(setup + 'MIX.master.gain.setTargetAtTime(0, 1, .025);')
                self.assertGreater(muted['early'], .001)
                self.assertLess(muted['tail'], .00001)

    def test_user_gesture_mute_persistence_and_travel(self):
        self.open_game()
        self.page.wait_for_timeout(1800)
        self.assertTrue(self.page.evaluate('AC === null'))
        self.page.locator('#ttNew').click()
        self.page.locator('#title').wait_for(state='detached')
        self.page.wait_for_function("AC.state === 'running' && MIX.camadas.length === 5")
        self.page.evaluate("E.ponto='baia'; clima.chuva=clima.alvo=1")
        self.page.wait_for_function('MIX.camadas[0].alvo === AMBIENTES.baia[0] && MIX.camadas[4].alvo > .09')
        self.page.evaluate("E.ponto='rio'; PE.ativo=true")
        self.page.wait_for_function('MIX.camadas[0].alvo < AMBIENTES.rio[0]')
        self.assertEqual(self.page.evaluate('MIX.camadas.length'), 5)
        self.page.locator('#bSom').click()
        self.page.wait_for_function('MIX.master.gain.value < .0001')
        self.assertEqual(self.page.locator('#bSom').get_attribute('aria-pressed'), 'false')
        self.page.keyboard.press('m')
        self.page.wait_for_function('MIX.master.gain.value > .7')
        # Repeated keydown must not flip the toggle repeatedly.
        self.page.evaluate("dispatchEvent(new KeyboardEvent('keydown',{code:'KeyM',repeat:true}))")
        self.assertFalse(self.page.evaluate('mudo'))
        self.page.locator('#bSom').click()
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.locator('#ttSom').inner_text(), 'Som: desligado')
        self.page.locator('#ttSom').click()
        self.page.wait_for_function('MIX.master.gain.value > .7')
        self.assertEqual(self.page.locator('#ttSom').inner_text(), 'Som: ligado')

    def test_background_and_missing_web_audio(self):
        self.open_game()
        self.page.locator('#ttNew').click()
        self.page.wait_for_function("AC && AC.state === 'running'")
        # Exercise the browser visibility handler without relying on headless focus.
        self.page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("AC.state === 'suspended'")
        self.page.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))")
        self.page.wait_for_function("AC.state === 'running'")
        self.page.add_init_script('window.AudioContext=window.webkitAudioContext=undefined')
        self.page.reload(wait_until='networkidle')
        self.page.locator('#ttSom').click()
        self.assertTrue(self.page.evaluate('AC === null'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
