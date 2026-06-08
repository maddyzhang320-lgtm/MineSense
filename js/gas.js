/* ============================================
   矿盾 · 气体检测 — ECharts 趋势图 + 实时数据
   ============================================ */

var gasChart = null;

document.addEventListener('DOMContentLoaded', function () {

    // ===== 24H 气体浓度趋势图 =====
    var dom = document.getElementById('gas-trend-chart');
    if (dom) {
        gasChart = echarts.init(dom);
        var hours = [];
        for (var i = 0; i < 12; i++) { hours.push((i * 2) + ':00'); }
        chart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 42, right: 22, top: 16, bottom: 28 },
            tooltip: { trigger: 'axis' },
            xAxis: {
                data: hours,
                axisLine: { lineStyle: { color: 'rgba(0,224,122,0.4)' } },
                axisTick: { show: false },
                axisLabel: { color: 'rgba(0,224,122,0.5)', fontSize: 10 }
            },
            yAxis: {
                type: 'value',
                axisLine: { lineStyle: { color: 'rgba(0,224,122,0.4)' } },
                axisTick: { show: false },
                axisLabel: { color: 'rgba(0,224,122,0.5)', fontSize: 10 },
                splitLine: { lineStyle: { color: 'rgba(0,224,122,0.06)' } }
            },
            series: [
                {
                    name: 'CO (ppm)',
                    type: 'line',
                    data: [12, 14, 18, 28, 26, 24, 22, 25, 27, 28, 25, 23],
                    lineStyle: { color: '#ff9800', width: 2.5 },
                    itemStyle: { color: '#ff9800' },
                    symbol: 'circle',
                    symbolSize: 3,
                    smooth: true,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(255,152,0,0.3)' },
                            { offset: 1, color: 'rgba(255,152,0,0)' }
                        ])
                    }
                },
                {
                    name: 'CH₄ (%)',
                    type: 'line',
                    data: [0.20, 0.22, 0.25, 0.32, 0.31, 0.28, 0.25, 0.24, 0.26, 0.30, 0.28, 0.25],
                    lineStyle: { color: '#00e07a', width: 2 },
                    itemStyle: { color: '#00e07a' },
                    symbol: 'circle',
                    symbolSize: 3,
                    smooth: true,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(0,224,122,0.2)' },
                            { offset: 1, color: 'rgba(0,224,122,0)' }
                        ])
                    }
                }
            ]
        });
        window.addEventListener('resize', function () {
            try { gasChart.resize(); } catch (e) {}
        });
    }

    // ===== 数字滚动 =====
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

    // ===== SVG 环形仪表动画 =====
    function animateGauge(id, pct) {
        var el = document.getElementById(id);
        if (!el) return;
        var r = 48;
        var circumference = 2 * Math.PI * r;
        var target = circumference * (1 - pct / 100);
        // 初始设为空
        el.setAttribute('stroke-dasharray', circumference);
        el.setAttribute('stroke-dashoffset', circumference);
        // 延迟一点让浏览器先渲染初始状态，然后过渡到目标值
        setTimeout(function () {
            el.style.transition = 'stroke-dashoffset 1.8s ease-out';
            el.setAttribute('stroke-dashoffset', target);
        }, 200);
    }

    window.addEventListener('load', function () {
        countTo('co-val', 28.0, 1);
        countTo('ch4-val', 0.32, 2);
        countTo('o2-val', 20.8, 1);

        // 环形仪表动画
        animateGauge('gauge-co', 93);
        animateGauge('gauge-ch4', 32);
        animateGauge('gauge-o2', 83);

        // GSAP 入场
        gsap.from('.gauge-card',     { y: -20, opacity: 0, duration: 0.4, stagger: 0.1, delay: 0.15 });
        gsap.from('.video-module',   { x: -20, opacity: 0, duration: 0.4, delay: 0.3 });
        gsap.from('.gas-chart-card', { x: 20, opacity: 0, duration: 0.4, delay: 0.35 });
        gsap.from('.gas-map-card',   { x: 20, opacity: 0, duration: 0.4, delay: 0.4 });
        gsap.from('.sensor-item',    { y: 20, opacity: 0, duration: 0.3, stagger: 0.08, delay: 0.5 });

        // ===== 实时数据绑定 =====
        DataBridge.onData(function (d) {
            // 更新环形仪表中心数值
            setText('co-val', d.co_ppm, 1);
            setText('ch4-val', d.ch4_pct, 2);
            setText('o2-val', d.o2_pct, 1);

            // 更新环形仪表弧线
            var coPct  = Math.round(d.co_ppm / 30 * 100);
            var ch4Pct = Math.round(d.ch4_pct / 1 * 100);
            var o2Pct  = Math.round(d.o2_pct / 25 * 100);
            updateGauge('gauge-co', Math.min(coPct, 100));
            updateGauge('gauge-ch4', Math.min(ch4Pct, 100));
            updateGauge('gauge-o2', Math.min(o2Pct, 100));

            // 更新气体叠加层
            var coTag = document.querySelector('.go-sensor.warn .go-val');
            var ch4Tag = document.querySelector('.go-sensor.ok .go-val');
            if (coTag) coTag.textContent = 'CO ' + d.co_ppm.toFixed(1) + 'ppm';
            if (ch4Tag) ch4Tag.textContent = 'CH₄ ' + d.ch4_pct.toFixed(2) + '%';
        });

        // 更新环形仪表弧线（不打乱入场动画）
        function updateGauge(id, pct) {
            var el = document.getElementById(id);
            if (!el) return;
            var r = 48;
            var circumference = 2 * Math.PI * r;
            el.style.transition = 'stroke-dashoffset 1s ease-out';
            el.setAttribute('stroke-dashoffset', circumference * (1 - pct / 100));
        }

        function setText(id, val, decimals) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = Number(val).toFixed(decimals);
        }

        // 更新气体趋势图
        if (gasChart && d.co_history && d.ch4_history) {
            gasChart.setOption({
                series: [
                    { data: d.co_history },
                    { data: d.ch4_history }
                ]
            });
        }
    });
});
