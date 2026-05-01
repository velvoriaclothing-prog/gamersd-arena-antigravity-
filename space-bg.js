(function() {
    const canvas = document.createElement('canvas');
    canvas.id = 'space-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
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

    const stars = [];
    const starCount = 200;

    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 1.5,
            baseX: Math.random() * width,
            baseY: Math.random() * height,
            density: (Math.random() * 30) + 1,
            color: Math.random() > 0.5 ? '#00f2ff' : '#b600f8'
        });
    }

    let mouse = { x: null, y: null, radius: 150 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });

    function animate() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#020202'; // True Deep Space Black
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < stars.length; i++) {
            let s = stars[i];
            
            // Movement logic for "Path to cursor"
            if (mouse.x != null) {
                let dx = mouse.x - s.x;
                let dy = mouse.y - s.y;
                let distance = Math.sqrt(dx*dx + dy*dy);
                let forceDirectionX = dx / distance;
                let forceDirectionY = dy / distance;
                let maxDistance = mouse.radius;
                let force = (maxDistance - distance) / maxDistance;
                let directionX = forceDirectionX * force * s.density;
                let directionY = forceDirectionY * force * s.density;

                if (distance < mouse.radius) {
                    s.x += directionX;
                    s.y += directionY;
                } else {
                    if (s.x !== s.baseX) {
                        let dx = s.x - s.baseX;
                        s.x -= dx/10;
                    }
                    if (s.y !== s.baseY) {
                        let dy = s.y - s.baseY;
                        s.y -= dy/10;
                    }
                }
            }

            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            
            // Draw connecting lines if near mouse to form "Path"
            if (mouse.x != null) {
                let dx = mouse.x - s.x;
                let dy = mouse.y - s.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 100) {
                    ctx.strokeStyle = s.color;
                    ctx.globalAlpha = 1 - (dist/100);
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
            
            ctx.fill();
        }
        requestAnimationFrame(animate);
    }
    animate();
})();
