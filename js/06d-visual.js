'use strict';

/* Acabamento da cena. O canvas 2D continua sendo a fonte e recebe todos os comandos
   de jogo. WebGL é somente apresentação: pode desaparecer sem interromper a pesca.
   Texturas e luzes são reutilizadas; o shader trabalha na resolução da pixel art. */
const VISUAL = (() => {
  const movimento = matchMedia('(prefers-reduced-motion: reduce)');
  let completo = true, gl = null, programa = null, textura = null, buffer = null;
  let uniforms = {}, falhou = false, largura = 0, altura = 0;
  try { completo = localStorage.getItem('slowfolk-visual') !== 'leve'; } catch (_) { }
  const luzes = new Map();
  const saida = document.createElement('canvas');
  saida.id = 'screen-fx'; saida.setAttribute('aria-hidden', 'true'); saida.hidden = true;
  cv.after(saida);

  const vertex = `
    attribute vec2 pos;
    varying vec2 uv;
    void main() { uv = pos * .5 + .5; gl_Position = vec4(pos, 0., 1.); }
  `;
  const fragment = `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D cena;
    uniform vec2 resolucao;
    uniform float tempo, aguaY, margemX, cameraX, noite, dourado, chuva;

    vec3 brilho(vec2 p) {
      vec3 c = texture2D(cena, clamp(p, vec2(0.), vec2(1.))).rgb;
      return c * smoothstep(.58, .95, max(c.r, max(c.g, c.b)));
    }
    void main() {
      vec2 px = 1. / resolucao;
      vec2 p = uv;
      float y = (1. - uv.y) * resolucao.y;
      float mundoX = uv.x * resolucao.x + cameraX;
      float submerso = smoothstep(aguaY + 8., aguaY + 28., y)
                      * smoothstep(margemX + 2., margemX + 12., mundoX);
      float profundidade = clamp((y - aguaY) / max(1., resolucao.y - aguaY), 0., 1.);
      // Refração de menos de um pixel: preserva anzol, silhuetas e a linha d'água.
      p.x += sin(y * .16 + tempo * 1.2) * .65 * px.x * submerso;
      vec3 c = texture2D(cena, p).rgb;
      vec3 bloom = brilho(p) * .20;
      bloom += (brilho(p + px * vec2(2.,0.)) + brilho(p - px * vec2(2.,0.))
              + brilho(p + px * vec2(0.,2.)) + brilho(p - px * vec2(0.,2.))) * .12;
      bloom += (brilho(p + px * vec2(4.,4.)) + brilho(p - px * vec2(4.,4.))
              + brilho(p + px * vec2(-4.,4.)) + brilho(p - px * vec2(-4.,4.))) * .08;
      c += bloom * (.13 + dourado * .09 + noite * .10) * (1. - chuva * .4);

      // Redes de luz refratada, ancoradas no mundo e mais visíveis no leito.
      vec2 q = vec2(mundoX, y) * vec2(.13, .22);
      float ondaA = sin(q.x + sin(q.y + tempo * .6)) + sin(q.y - tempo * .7);
      float ondaB = sin(q.x * .73 - q.y * .8 + tempo * .4);
      float caustica = pow(max(0., 1. - abs(ondaA + ondaB) * 1.8), 10.);
      c += vec3(.19,.44,.34) * caustica * submerso * (.25 + profundidade * .75)
           * (1. - noite * .9) * (1. - chuva * .75) * .30;
      // Sombras azul-petróleo, altas luzes âmbar; sem tingir o HUD em HTML.
      float luma = dot(c, vec3(.2126,.7152,.0722));
      c = mix(vec3(luma), c, 1.10);
      c += vec3(-.012,.008,.021) * (1. - smoothstep(.08,.5,luma));
      c += vec3(.028,.010,-.015) * smoothstep(.4,.9,luma) * dourado;
      c = (c - .5) * 1.045 + .5;
      gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
    }
  `;

  function limpaGPU() {
    if (!gl) return;
    if (textura) gl.deleteTexture(textura);
    if (buffer) gl.deleteBuffer(buffer);
    if (programa) gl.deleteProgram(programa);
    textura = buffer = programa = null;
    largura = altura = 0;
  }
  function iniciaGPU() {
    if (programa || falhou || !completo) return;
    try {
      gl = saida.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
      if (!gl || gl.isContextLost()) throw new Error('WebGL indisponível');
      const compila = (tipo, fonte) => {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, fonte); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); throw new Error('Shader indisponível'); }
        return s;
      };
      const shaders = [];
      try {
        shaders.push(compila(gl.VERTEX_SHADER, vertex));
        shaders.push(compila(gl.FRAGMENT_SHADER, fragment));
        programa = gl.createProgram();
        shaders.forEach(s => gl.attachShader(programa, s)); gl.linkProgram(programa);
        if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error('Programa indisponível');
      } finally { shaders.forEach(s => gl.deleteShader(s)); }
      gl.useProgram(programa);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(programa, 'pos');
      gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      textura = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, textura);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      for (const nome of ['cena','resolucao','tempo','aguaY','margemX','cameraX','noite','dourado','chuva']) uniforms[nome] = gl.getUniformLocation(programa, nome);
      gl.uniform1i(uniforms.cena, 0);
    } catch (_) { limpaGPU(); falhou = true; saida.hidden = true; }
    atualizaBotoes();
  }
  saida.addEventListener('webglcontextlost', e => {
    e.preventDefault(); saida.hidden = true; programa = textura = buffer = null;
    largura = altura = 0; falhou = true; atualizaBotoes();
  });
  saida.addEventListener('webglcontextrestored', () => { falhou = false; iniciaGPU(); });

  function apresenta(t) {
    if (!completo || falhou) { saida.hidden = true; return; }
    iniciaGPU();
    if (!programa) return;
    const F = faseAgora();
    if (largura !== W || altura !== H) {
      largura = saida.width = W; altura = saida.height = H;
      gl.viewport(0, 0, W, H);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.uniform2f(uniforms.resolucao, W, H);
    gl.uniform1f(uniforms.tempo, movimento.matches ? 0 : t % 3600);
    gl.uniform1f(uniforms.aguaY, WL);
    gl.uniform1f(uniforms.margemX, TERRA.margem);
    gl.uniform1f(uniforms.cameraX, Math.round(CAM.x));
    gl.uniform1f(uniforms.noite, pesoNoite(F));
    gl.uniform1f(uniforms.dourado, pesoFase(F, 'tarde') + pesoFase(F, 'crep'));
    gl.uniform1f(uniforms.chuva, clima.chuva);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    saida.hidden = false;
  }

  function atualizaBotoes() {
    document.querySelectorAll('[data-visual]').forEach(b => {
      b.textContent = 'Visual: ' + (completo ? (falhou ? 'clássico' : 'cinema') : 'leve');
      b.setAttribute('aria-pressed', String(completo));
      b.title = completo ? 'Alternar para o modo leve' : 'Ativar iluminação e efeitos completos';
    });
  }
  function alterna() {
    completo = !completo;
    if (!completo) saida.hidden = true;
    try { localStorage.setItem('slowfolk-visual', completo ? 'cinema' : 'leve'); } catch (_) { }
    atualizaBotoes();
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-visual]')) alterna(); });

  // Halos em degraus de alfa e pontilhado, sem borrar a pixel art.
  function brilho(x, y, raio, cor, forca = 1) {
    const chave = raio + cor;
    if (!luzes.has(chave)) {
      const c = tela(raio * 2 + 1, raio * 2 + 1), ctx = c.getContext('2d');
      const img = ctx.createImageData(c.width, c.height), rgb = hexRgb(cor);
      for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
        const d = Math.hypot(px - raio, py - raio) / raio;
        const a = Math.pow(Math.max(0, 1 - d), 2.4) * .6;
        const quant = Math.floor(a * 24 + bayer(px, py)) / 24;
        const i = (py * c.width + px) * 4;
        img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = quant * 255;
      }
      ctx.putImageData(img, 0, 0); luzes.set(chave, c);
    }
    cx.save(); cx.globalCompositeOperation = 'screen'; cx.globalAlpha = clamp(forca, 0, 1);
    cx.drawImage(luzes.get(chave), Math.round(x - raio), Math.round(y - raio)); cx.restore();
  }

  function ceu(t, F, ax, ay, dia, sol) {
    const noite = pesoNoite(F), quente = pesoFase(F, 'tarde') + pesoFase(F, 'crep');
    brilho(ax, ay, dia ? 85 : 46, dia ? '#ffc878' : '#91baff', sol * (dia ? .72 : .55));
    if (!completo) return;
    if (noite > .3) {
      // Poeira de estrelas: posições estáveis, cintilação lenta, atrás das montanhas.
      cx.save();
      for (let i = 0; i < W * .8; i++) {
        const x = Math.floor(hash(i, 704) * W);
        const y = Math.round(HOR * .15 + x * .09 + (hash(i, 81) - .5) * HOR * .45);
        cx.globalAlpha = noite * sol * hash(i, 5) * .23;
        cx.fillStyle = i % 3 ? '#b7b9f4' : '#e1ecff'; cx.fillRect(x, y, 1, 1);
      }
      cx.restore();
    }
    if (quente > .1 && dia) {
      cx.save(); cx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 7; i++) {
        const x = ax + (i - 3) * 16, vent = movimento.matches ? 0 : Math.sin(t * .16 + i) * 8;
        const g = cx.createLinearGradient(0, ay, 0, WL);
        g.addColorStop(0, 'rgba(255,204,140,0)'); g.addColorStop(.45, 'rgba(255,204,140,.16)'); g.addColorStop(1, 'rgba(255,204,140,0)');
        cx.globalAlpha = quente * sol * .7; cx.fillStyle = g;
        cx.beginPath(); cx.moveTo(x, ay); cx.lineTo(x + 4, ay);
        cx.lineTo(x - 55 + vent, WL); cx.lineTo(x - 100 + vent, WL); cx.closePath(); cx.fill();
      }
      cx.restore();
    }
  }

  function atmosfera(t, F) {
    if (!completo) return;
    const noite = pesoNoite(F), P = fundo.P, CX = Math.round(CAM.x), tt = movimento.matches ? 0 : t;
    cx.save();
    // Partículas em suspensão, limitadas a uma quantidade proporcional à tela.
    for (let i = 0; i < W / 8; i++) {
      const baseX = hash(i, 125) * MUNDO;
      const x = ((baseX - CX + tt * (1 + hash(i, 8))) % W + W) % W;
      const y = WL + 8 + ((hash(i, 43) * (H - WL - 16) - tt * (1 + hash(i, 7))) % (H - WL - 16) + H - WL - 16) % (H - WL - 16);
      if (x + CX < TERRA.margem + 4) continue;
      cx.globalAlpha = (.07 + hash(i, 3) * .16) * (1 - noite * .65);
      cx.fillStyle = '#bde9ce'; cx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    // Folhas no ar, acima da superfície; a Baía mantém apenas a neve.
    if (!P.neve && clima.chuva < .4) for (let i = 0; i < 11; i++) {
      const x = ((hash(i, 45) * W + tt * (2 + hash(i, 49) * 3) - CX * .6) % (W + 20) + W + 20) % (W + 20) - 10;
      const y = 14 + ((hash(i, 26) * (WL - 20) + tt * 2) % (WL - 20));
      cx.globalAlpha = (1 - noite * .7) * .65;
      cx.fillStyle = luz(i % 3 ? '#e6ad58' : '#c87843');
      cx.fillRect(Math.round(x + Math.sin(tt + i) * 4), Math.round(y), Math.sin(tt * 2 + i) > .2 ? 2 : 1, 1);
    }
    cx.restore();
  }

  function primeiroPlano(t) {
    if (!completo) return;
    const CX = Math.round(CAM.x), P = fundo.P, tt = movimento.matches ? 0 : t;
    cx.save();
    // Vegetação próxima em silhueta: uma moldura discreta, ancorada no leito.
    for (let i = Math.floor(CX / 34) - 2; i < (CX + W) / 34 + 2; i++) {
      const mundo = i * 34 + hash(i, 201) * 20;
      if (mundo < TERRA.margem + 15) continue;
      const x = Math.round(mundo - CX), h = 9 + hash(i, 202) * 22;
      const c = mistura(luz(P.alga[1]), '#061e28', .55);
      for (let folha = 0; folha < 3; folha++) {
        const alturaFolha = h * (.6 + folha * .2);
        cx.fillStyle = c;
        for (let y = 0; y < alturaFolha; y++) {
          const curva = Math.sin(y / alturaFolha * 1.6 + folha * .9 + tt * .55) * y * .16;
          cx.fillRect(Math.round(x + folha * 3 + curva), H - y, y < 6 ? 3 : 1, 1);
          if (y > 5 && y % 5 === 0) {
            const lado = y % 10 ? 1 : -1;
            cx.fillRect(Math.round(x + folha * 3 + curva + lado), H - y - 1, 2, 1);
          }
        }
      }
      cx.fillStyle = mistura(luz(P.pedraFundo), '#071d29', .55);
      for (let y = 0; y < 5; y++) cx.fillRect(x - 5 + y, H - y - 1, 14 - y * 2, 1);
    }
    cx.restore();
  }

  return { apresenta, brilho, ceu, atmosfera, primeiroPlano, atualizaBotoes,
    get completo() { return completo; }, get gpu() { return !!programa && !falhou; } };
})();
