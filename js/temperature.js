/* ============================================
   矿盾 · 温度检测 — ECharts 趋势图 + 实时数据
   ============================================ */

var tempChart = null;

document.addEventListener('DOMContentLoaded', function () {

    // ===== 24H 温度趋势图 =====
    var dom = document.getElementById('temp-trend-chart');
    if (dom) {
        tempChart = echarts.init(dom);
        var hours = [];
        for (var i = 0; i < 12; i++) { hours.push((i * 2) + ':00'); }
        tempChart.setOption({
            backgroundColor: 'transparent',
            grid: { left: 42, right: 22, top: 18, bottom: 28 },
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
            series: [{
                type: 'line',
                data: [65, 68, 75, 82, 89, 85, 78, 72, 74, 80, 85, 89],
                lineStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#ffcc00' },
                        { offset: 0.5, color: '#ff9800' },
                        { offset: 1, color: '#ff3b3b' }
                    ]),
                    width: 2.5
                },
                itemStyle: { color: '#ff9800' },
                symbol: 'circle', symbolSize: 3, smooth: true,
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(255,152,0,0.3)' },
                        { offset: 0.6, color: 'rgba(255,100,0,0.1)' },
                        { offset: 1, color: 'rgba(255,60,0,0)' }
                    ])
                },
                markLine: {
                    silent: true,
                    data: [{ yAxis: 90, label: { formatter: '阈值 90°C', fontSize: 10, color: '#ff3b3b' } }],
                    lineStyle: { color: 'rgba(255,60,60,0.5)', type: 'dashed', width: 1 }
                }
            }]
        });
        window.addEventListener('resize', function () {
            try { tempChart.resize(); } catch (e) {}
        });
    }
});

window.addEventListener('load', function () {
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

    function setText(id, val, decimals) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = Number(val).toFixed(decimals);
    }

    countTo('core-temp', 89.2, 1);
    countTo('belt-temp', 72.4, 1);
    countTo('ambient-temp', 27.8, 1);

    // GSAP 入场
    gsap.from('.audit-card',    { y: -15, opacity: 0, duration: 0.3, delay: 0.1 });
    gsap.from('.temp-card',     { y: -20, opacity: 0, duration: 0.4, stagger: 0.1, delay: 0.2 });
    gsap.from('.video-module',  { x: -20, opacity: 0, duration: 0.4, delay: 0.3 });
    gsap.from('.thermal-card',  { x: 20, opacity: 0, duration: 0.4, delay: 0.35 });
    gsap.from('.trend-card',    { x: 20, opacity: 0, duration: 0.4, delay: 0.4 });
    gsap.from('.sensor-card',   { y: 20, opacity: 0, duration: 0.3, stagger: 0.08, delay: 0.5 });

    // ===== 实时数据绑定 =====
    DataBridge.onData(function (d) {
        // 更新温度指标
        setText('core-temp', d.roller_temp, 1);
        setText('belt-temp', d.temp + 45, 1);
        setText('ambient-temp', d.temp, 1);

        // 更新趋势图
        if (tempChart && d.temp_history && d.temp_history.length) {
            tempChart.setOption({
                series: [{ data: d.temp_history }]
            });
        }
    });
});
