/* ============================================
   矿盾 · 主逻辑 — 入场动画 + 实时数据绑定
   ============================================ */

window.addEventListener('load', function () {

    // ===== 工具函数 =====
    function setText(id, val, decimals) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = (decimals || decimals === 0)
            ? Number(val).toFixed(decimals)
            : val;
    }

    function countTo(id, target, decimals) {
        var el = document.getElementById(id);
        if (!el) return;
        var start = 0, startTime = null, duration = 2000;
        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (start + (target - start) * eased).toFixed(decimals);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = target.toFixed(decimals);
        }
        requestAnimationFrame(step);
    }

    // ===== 入场数字滚动 =====
    countTo('load-vol', 100, 0);
    countTo('load-weight', 318, 0);
    countTo('load-volume', 9, 0);
    countTo('load-real', 96, 0);

    countTo('param1-warn', 25.8, 1);
    countTo('param1-health', 19.8, 1);
    countTo('param2-warn', 100.0, 1);
    countTo('param2-health', 0.0, 1);
    countTo('param3-warn', 1.2, 1);
    countTo('param3-health', 0.0, 1);
    countTo('param4-warn', 24.2, 1);
    countTo('param4-health', 21.8, 1);
    countTo('param5-warn', 33.5, 1);
    countTo('param5-health', 31.5, 1);

    countTo('param6-rate', 100.0, 1);
    countTo('param7-rate', 100.0, 1);
    countTo('param8-rate', 100.0, 1);
    countTo('param9-rate', 100.0, 1);
    countTo('param10-rate', 100.0, 1);
    countTo('param11-rate', 100.0, 1);

    countTo('param12-res', 6.8, 1);
    countTo('param13-res', 18, 0);
    countTo('param14-res', 14, 0);
    countTo('param15-res', 7.4, 1);
    countTo('param16-res', 15, 0);
    countTo('param17-res', 4, 0);

    // ===== GSAP 入场 =====
    gsap.from('.container', { opacity: 0, duration: 0.5 });
    gsap.from('.header', { y: -20, opacity: 0, duration: 0.4, delay: 0.1 });
    gsap.from('.main-visual', { x: -25, opacity: 0, duration: 0.5, delay: 0.2 });
    gsap.from('.data-card', { x: 25, opacity: 0, duration: 0.4, stagger: 0.12, delay: 0.3 });
    gsap.from('.params-card', { y: 25, opacity: 0, duration: 0.4, stagger: 0.08, delay: 0.5 });
    gsap.from('.model-window', { scale: 0.9, opacity: 0, duration: 0.4, delay: 0.6 });

    // ===== 实时数据绑定（ESP32 或模拟） =====
    DataBridge.onData(function (d) {
        // 原负载数据
        setText('load-vol', d.load_vol, 0);
        setText('load-weight', d.load_weight, 0);
        setText('load-volume', d.load_volume, 0);
        setText('load-real', d.load_real, 0);
        // 负载进度条
        var bar = document.querySelector('.load-bar-fill');
        if (bar) bar.style.width = d.load_real + '%';

        // 设备运行参数
        setText('param1-warn', d.roller_temp, 1);
        setText('param1-health', d.temp, 1);
        setText('param2-warn', d.motor_speed, 1);
        setText('param3-warn', d.bearing_vib, 1);
        setText('param4-warn', d.belt_speed, 1);
        setText('param4-health', (d.belt_speed - 2.4).toFixed(1), 1);
        setText('param5-warn', d.belt_deviation, 1);
        setText('param5-health', (d.belt_deviation - 2).toFixed(1), 1);

        // 分站合格率
        setText('param6-rate', d.rate_s701, 1);
        setText('param7-rate', d.rate_1018, 1);
        setText('param8-rate', d.rate_8128, 1);
        setText('param9-rate', d.rate_cw1, 1);
        setText('param10-rate', d.rate_bwt, 1);
        setText('param11-rate', d.rate_hdc, 1);

        // 矿质分析
        setText('param12-res', d.granularity, 1);
        setText('param13-res', d.composition, 0);
        setText('param14-res', d.water_content, 0);
        setText('param15-res', d.density, 1);
        setText('param16-res', d.stability, 0);
        setText('param17-res', d.hardness, 0);

        // 更新主负载图表（随机微调最后几个点）
        if (mainLoadChart) {
            var base = [[0,60],[50,100],[120,170],[200,250]];
            var last = [260, d.load_weight ? d.load_weight * 0.7 : 210];
            var end  = [300, d.load_weight ? d.load_weight * 0.5 : 150];
            mainLoadChart.setOption({ series: [{ data: base.concat([last, end]) }] });
        }
        if (realTimeChart && d.load_real) {
            var pts = [82,92,98,102,99,95,90].map(function (v, i) {
                return v + (Math.random() - 0.5) * 10;
            });
            realTimeChart.setOption({ series: [{ data: pts }] });
        }
    });
});
