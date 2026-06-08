/* ============================================
   矿盾 · 托辊检测 — 数字动画 + 实时数据
   ============================================ */

window.addEventListener('load', function () {

    function countTo(id, target, decimals) {
        var el = document.getElementById(id);
        if (!el) return;
        var start = 0, startTime = null, duration = 2000;
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var val = start + (target - start) * eased;
            el.textContent = decimals === 0
                ? Math.round(val).toLocaleString()
                : val.toFixed(decimals);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = decimals === 0
                ? target.toLocaleString()
                : target.toFixed(decimals);
        }
        requestAnimationFrame(step);
    }

    function setText(id, val, decimals) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = decimals === 0
            ? Math.round(val).toLocaleString()
            : Number(val).toFixed(decimals);
    }

    countTo('total-rollers', 1280, 0);
    countTo('normal-rate', 98.4, 1);
    countTo('fault-count', 5, 0);
    countTo('plan-count', 12, 0);

    // GSAP 入场
    gsap.from('.metric-card',   { y: -20, opacity: 0, duration: 0.4, stagger: 0.1, delay: 0.15 });
    gsap.from('.video-module',  { x: -20, opacity: 0, duration: 0.4, delay: 0.3 });
    gsap.from('.conveyor-card', { x: 20, opacity: 0, duration: 0.4, delay: 0.35 });
    gsap.from('.spectrum-card', { x: 20, opacity: 0, duration: 0.4, delay: 0.4 });
    gsap.from('.report-card',   { y: 20, opacity: 0, duration: 0.4, delay: 0.5 });

    // ===== 实时数据绑定 =====
    DataBridge.onData(function (d) {
        setText('normal-rate', d.roller_normal, 1);
        setText('fault-count', d.roller_fault, 0);
        setText('plan-count', d.roller_plan, 0);

        // 更新频谱数值
        var freqEls = document.querySelectorAll('.spec-stat span + span');
        if (freqEls[0]) freqEls[0].textContent = d.freq_vib.toFixed(1) + ' Hz';
        if (freqEls[1]) freqEls[1].textContent = d.friction.toFixed(2) + ' μ';
    });
});
