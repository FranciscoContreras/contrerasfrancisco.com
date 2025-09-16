(function(){
  const STATE = { loaded: true };
  
  function rectsIntersect(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'galaga-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(10,12,28,0.82)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.background = 'rgba(12,15,32,0.92)';
    wrapper.style.border = '1px solid rgba(148, 163, 184, 0.18)';
    wrapper.style.borderRadius = '20px';
    wrapper.style.boxShadow = '0 25px 80px rgba(5,8,20,0.55)';
    wrapper.style.padding = '26px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close game');
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '12px';
    closeBtn.style.right = '14px';
    closeBtn.style.background = 'rgba(148,163,184,0.15)';
    closeBtn.style.border = '1px solid rgba(148,163,184,0.2)';
    closeBtn.style.color = '#e2e8f0';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.cursor = 'pointer';

    const heading = document.createElement('div');
    heading.style.display = 'flex';
    heading.style.justifyContent = 'space-between';
    heading.style.alignItems = 'center';
    heading.style.marginBottom = '12px';
    heading.style.color = '#cbd5f5';
    heading.style.fontFamily = 'monospace';
    heading.style.fontSize = '14px';
    heading.innerHTML = '<span>galaga.mini :: prototype</span><span>← / → move · space / click shoot</span>';

    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 560;
    canvas.style.borderRadius = '16px';
    canvas.style.border = '1px solid rgba(148,163,184,0.18)';
    canvas.style.background = 'radial-gradient(circle at top, rgba(30,39,77,0.85), rgba(8,11,26,0.98))';

    const hud = document.createElement('div');
    hud.style.display = 'flex';
    hud.style.justifyContent = 'space-between';
    hud.style.marginTop = '12px';
    hud.style.fontFamily = 'monospace';
    hud.style.fontSize = '13px';
    hud.style.color = '#94a3b8';
    hud.innerHTML = '<span id="galaga-score">score: 0</span><span id="galaga-lives">lives: ♥♥♥</span>';

    wrapper.appendChild(closeBtn);
    wrapper.appendChild(heading);
    wrapper.appendChild(canvas);
    wrapper.appendChild(hud);
    overlay.appendChild(wrapper);

    document.body.appendChild(overlay);
    return { overlay, canvas, scoreEl: hud.querySelector('#galaga-score'), livesEl: hud.querySelector('#galaga-lives'), closeBtn };
  }

  function launchGame() {
    if (document.getElementById('galaga-overlay')) {
      return;
    }

    const { overlay, canvas, scoreEl, livesEl, closeBtn } = createOverlay();
    const ctx = canvas.getContext('2d');

    const state = {
      running: true,
      keys: {},
      pointerActive: false,
      width: canvas.width,
      height: canvas.height,
      player: { x: canvas.width / 2 - 18, y: canvas.height - 60, width: 36, height: 18, speed: 6, cooldown: 0 },
      bullets: [],
      enemies: [],
      enemyBullets: [],
      explosions: [],
      spawnTimer: 0,
      baseDifficulty: 1,
      difficulty: 1,
      score: 0,
      lives: 3,
      lastTime: performance.now()
    };

    const sounds = {
      shoot: new Audio('data:audio/wav;base64,UklGRhYAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YSgAAAAA'),
      boom: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YSgAAAAA')
    };
    Object.values(sounds).forEach((audio) => (audio.volume = 0.18));

    function updateHUD() {
      scoreEl.textContent = `score: ${state.score}`;
      const hearts = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 3 - state.lives));
      livesEl.textContent = `lives: ${hearts}`;
    }

    function spawnEnemy() {
      const x = Math.random() * (state.width - 40) + 20;
      const speed = 1 + state.difficulty * 0.45;
      const amplitude = 30 + Math.random() * 40;
      const frequency = 0.002 + Math.random() * 0.002 * state.difficulty;
      state.enemies.push({
        x,
        y: -40,
        width: 32,
        height: 22,
        baseX: x,
        speed,
        amplitude,
        frequency,
        time: Math.random() * 1000
      });
    }

    function shoot() {
      if (state.player.cooldown > 0) return;
      state.bullets.push({ x: state.player.x + state.player.width / 2 - 2, y: state.player.y - 10, width: 4, height: 12, speed: 9 });
      state.player.cooldown = 10;
      try { sounds.shoot.currentTime = 0; sounds.shoot.play(); } catch (e) {}
    }

    function enemyShoot(enemy) {
      state.enemyBullets.push({ x: enemy.x + enemy.width / 2 - 2, y: enemy.y + enemy.height, width: 4, height: 10, speed: 5 + state.difficulty * 0.3 });
    }

    function addExplosion(x, y) {
      state.explosions.push({ x, y, radius: 4, maxRadius: 18 });
      try { sounds.boom.currentTime = 0; sounds.boom.play(); } catch (e) {}
    }

    function resetDifficultyAfterHit() {
      state.baseDifficulty = Math.max(1, state.score / 220 + 1);
      state.difficulty = Math.max(1, state.baseDifficulty - 0.6);
    }

    function increaseDifficulty() {
      state.baseDifficulty = Math.max(state.baseDifficulty, 1 + state.score / 200);
      state.difficulty = Math.max(state.difficulty, state.baseDifficulty);
    }

    function handlePlayerHit() {
      state.lives -= 1;
      updateHUD();
      if (state.lives <= 0) {
        gameOver();
      } else {
        resetDifficultyAfterHit();
      }
    }

    function spawnWaveIfEmpty() {
      if (state.enemies.length === 0) {
        for (let i = 0; i < 4; i++) spawnEnemy();
      }
    }

    function update(dt) {
      if (!state.running) return;

      state.player.cooldown = Math.max(0, state.player.cooldown - 1);

      if (state.keys['ArrowLeft'] || state.keys['a']) {
        state.player.x -= state.player.speed;
      }
      if (state.keys['ArrowRight'] || state.keys['d']) {
        state.player.x += state.player.speed;
      }
      state.player.x = Math.max(10, Math.min(state.width - state.player.width - 10, state.player.x));

      state.spawnTimer -= dt;
      const spawnInterval = Math.max(600 - state.difficulty * 80, 220);
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.spawnTimer = spawnInterval;
      }
      spawnWaveIfEmpty();

      state.enemies.forEach((enemy) => {
        enemy.time += dt;
        enemy.y += enemy.speed;
        enemy.x = enemy.baseX + Math.sin(enemy.time * enemy.frequency) * enemy.amplitude;
        if (Math.random() < 0.002 * state.difficulty) {
          enemyShoot(enemy);
        }
      });

      state.bullets.forEach((bullet) => (bullet.y -= bullet.speed));
      state.enemyBullets.forEach((bullet) => (bullet.y += bullet.speed));

      const playerRect = { x: state.player.x, y: state.player.y, width: state.player.width, height: state.player.height };

      state.enemies = state.enemies.filter((enemy) => {
        if (enemy.y > state.height + 40) {
          return false;
        }

        const enemyRect = { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height };
        state.bullets = state.bullets.filter((bullet) => {
          const bulletRect = { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height };
          if (rectsIntersect(bulletRect, enemyRect)) {
            addExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            state.score += 10;
            increaseDifficulty();
            updateHUD();
            return false;
          }
          return bullet.y + bullet.height > 0;
        });

        if (rectsIntersect(enemyRect, playerRect)) {
          addExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
          handlePlayerHit();
          return false;
        }
        return true;
      });

      state.enemyBullets = state.enemyBullets.filter((bullet) => {
        const bulletRect = { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height };
        if (rectsIntersect(bulletRect, playerRect)) {
          addExplosion(state.player.x + state.player.width / 2, state.player.y);
          handlePlayerHit();
          return false;
        }
        return bullet.y < state.height + 10;
      });

      state.explosions = state.explosions.filter((explosion) => {
        explosion.radius += 0.8;
        return explosion.radius < explosion.maxRadius;
      });
    }

    function render() {
      ctx.clearRect(0, 0, state.width, state.height);

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 60; i++) {
        ctx.fillRect((i * 70) % state.width, (i * 110 + Date.now() * 0.05) % state.height, 1, 1);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(state.player.x + 6, state.player.y - 8, state.player.width - 12, 8);

      ctx.fillStyle = '#f8fafc';
      state.bullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height));

      ctx.fillStyle = '#f87171';
      state.enemyBullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height));

      state.enemies.forEach((enemy) => {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(enemy.x + 6, enemy.y + 4, enemy.width - 12, enemy.height - 8);
      });

      state.explosions.forEach((explosion) => {
        const gradient = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, explosion.radius);
        gradient.addColorStop(0, 'rgba(248,250,252,0.8)');
        gradient.addColorStop(1, 'rgba(248,113,113,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    updateHUD();

    function loop(timestamp) {
      if (!state.running) return;
      const dt = timestamp - state.lastTime;
      state.lastTime = timestamp;
      update(dt);
      render();
      requestAnimationFrame(loop);
    }

    function handleKeyDown(e) {
      if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd'].includes(e.key)) {
        e.preventDefault();
      }
      state.keys[e.key] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        shoot();
      }
    }

    function handleKeyUp(e) {
      state.keys[e.key] = false;
    }

    function handlePointerDown(e) {
      state.pointerActive = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      state.player.x = Math.max(10, Math.min(state.width - state.player.width - 10, x - state.player.width / 2));
      shoot();
    }

    function handlePointerMove(e) {
      if (!state.pointerActive) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      state.player.x = Math.max(10, Math.min(state.width - state.player.width - 10, x - state.player.width / 2));
    }

    function handlePointerUp() {
      state.pointerActive = false;
    }

    function cleanup() {
      state.running = false;
      document.body.removeChild(overlay);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
    }

    function gameOver() {
      state.running = false;
      const end = document.createElement('div');
      end.style.position = 'absolute';
      end.style.inset = '0';
      end.style.display = 'flex';
      end.style.flexDirection = 'column';
      end.style.alignItems = 'center';
      end.style.justifyContent = 'center';
      end.style.background = 'rgba(8,10,20,0.88)';
      end.style.borderRadius = '18px';
      end.style.fontFamily = 'monospace';
      end.style.color = '#e2e8f0';
      end.innerHTML = `<div style="text-transform:uppercase; letter-spacing:2px; font-size:18px; margin-bottom:14px;">mission terminated</div><div style="margin-bottom:14px;">final score: ${state.score}</div>`;
      const restart = document.createElement('button');
      restart.textContent = 'play again';
      restart.style.padding = '10px 20px';
      restart.style.borderRadius = '999px';
      restart.style.border = 'none';
      restart.style.cursor = 'pointer';
      restart.style.background = 'rgba(56,189,248,0.18)';
      restart.style.color = '#f8fafc';
      restart.style.fontFamily = 'inherit';
      restart.onclick = () => {
        cleanup();
        launchGame();
      };
      end.appendChild(restart);
      overlay.querySelector('div').appendChild(end);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);

    closeBtn.addEventListener('click', cleanup);

    requestAnimationFrame((timestamp) => {
      state.lastTime = timestamp;
      requestAnimationFrame(loop);
    });

    updateHUD();
  }

  window.launchMiniGalaga = launchGame;
})();
