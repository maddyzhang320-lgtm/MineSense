/* ============================================
   矿盾 · Three.js 全景建模 — 热力滚筒
   通过 import map 加载 Three.js ES Module
   ============================================ */

import * as THREE from 'three';

(function () {
    var wrap = null;
    var scene, camera, renderer, roller;

    function tryInit() {
        wrap = document.getElementById('three-scene');
        if (!wrap) {
            // DOM 还没渲染完，稍后重试
            requestAnimationFrame(tryInit);
            return;
        }

        var w = wrap.clientWidth;
        var h = wrap.clientHeight;
        if (w <= 0 || h <= 0) {
            // flex 布局尺寸还没计算，下一帧重试
            requestAnimationFrame(tryInit);
            return;
        }

        // 防止重复初始化
        if (renderer) return;

        // --- 场景 ---
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
        camera.position.set(0, 0.5, 5.5);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        wrap.appendChild(renderer.domElement);

        // --- 热力渐变纹理 ---
        var texCanvas = document.createElement('canvas');
        texCanvas.width = 400;
        texCanvas.height = 80;
        var ctx = texCanvas.getContext('2d');
        var grad = ctx.createLinearGradient(0, 0, texCanvas.width, 0);
        grad.addColorStop(0, '#ff2200');
        grad.addColorStop(0.15, '#ff6600');
        grad.addColorStop(0.3, '#ffaa00');
        grad.addColorStop(0.5, '#ffdd00');
        grad.addColorStop(0.7, '#00ccff');
        grad.addColorStop(0.85, '#0066ff');
        grad.addColorStop(1, '#2200ff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, texCanvas.width, texCanvas.height);

        var texture = new THREE.CanvasTexture(texCanvas);

        // --- 主滚筒 ---
        var geo = new THREE.CylinderGeometry(1, 1, 3.6, 48);
        var mat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.92
        });
        roller = new THREE.Mesh(geo, mat);
        roller.rotation.x = Math.PI / 2;
        scene.add(roller);

        // --- 光照 ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // --- 开始渲染 ---
        animate();

        // --- 窗口自适应 ---
        window.addEventListener('resize', onResize);
    }

    function animate() {
        requestAnimationFrame(animate);
        if (roller) {
            roller.rotation.z += 0.006;
        }
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function onResize() {
        if (!wrap || !camera || !renderer) return;
        var w = wrap.clientWidth;
        var h = wrap.clientHeight;
        if (w <= 0 || h <= 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    // 兼容两种加载时机：
    // 1. 如果页面还没加载完，等 load 事件
    // 2. 如果 load 已经触发（document.readyState === 'complete'），直接开始重试
    if (document.readyState === 'complete') {
        setTimeout(tryInit, 80);
    } else {
        window.addEventListener('load', function () {
            setTimeout(tryInit, 80);
        });
    }
})();
