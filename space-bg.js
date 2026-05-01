(function() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'space-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width, height;
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const particles = [];
    const numParticles = 150;

    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 2 + 0.5,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            color: Math.random() > 0.5 ? '#00f2ff' : '#b600f8'
        });
    }

    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseout', () => {
        mouse.x = -1000;
        mouse.y = -1000;
    });

    function draw() {
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        // Draw and update particles
        for (let i = 0; i < numParticles; i++) {
            let p = particles[i];
            
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off edges
            if (p.x < 0 || p.x > width) p.vx = -p.vx;
            if (p.y < 0 || p.y > height) p.vy = -p.vy;

            // Interactive path: pull slightly to mouse if close, and draw line
            let dx = mouse.x - p.x;
            let dy = mouse.y - p.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150) {
                // Interactive star behavior (moves slightly towards cursor)
                p.x += dx * 0.01;
                p.y += dy * 0.01;
                
                // Draw connecting line to mouse
                ctx.beginPath();
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = 1 - (distance / 150);
                ctx.lineWidth = 1;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            // Make stars glow slightly when near cursor
            if (distance < 150) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = p.color;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }
    
    draw();
})();
