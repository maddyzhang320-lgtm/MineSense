/* ============================================
   矿盾 · ECharts 图表 — 翠绿主题
   ============================================ */

// 全局图表实例（供 DataBridge 更新）
var mainLoadChart = null;
var realTimeChart = null;

document.addEventListener('DOMContentLoaded', function () {
    var axisColor = 'rgba(0,224,122,0.45)';
    var gridColor = 'rgba(0,224,122,0.08)';
    var labelColor = 'rgba(0,224,122,0.55)';

    // ===== 1. 主负载折线图（右上卡片） =====
    var dom1 = document.getElementById('main-load-chart');
    if (dom1) {
        mainLoadChart = echarts.init(dom1);
        e1.setOption({
            backgroundColor: 'transparent',
            grid: { left: 38, right: 18, top: 20, bottom: 28 },
            xAxis: {
                type: 'value', min: 0, max: 300,
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: labelColor, fontSize: 10 },
                splitLine: { lineStyle: { color: gridColor } }
            },
            yAxis: {
                type: 'value', min: 0, max: 400,
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: labelColor, fontSize: 10 },
                splitLine: { lineStyle: { color: gridColor } }
            },
            series: [{
                name: '验收',
                type: 'line',
                data: [[0, 60], [50, 100], [120, 170], [200, 250], [260, 210], [300, 150]],
                lineStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#00e07a' },
                        { offset: 1, color: '#ff6b35' }
                    ]),
                    width: 2
                },
                itemStyle: { color: '#ff3b3b' },
                symbol: 'none',
                smooth: true,
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(255,60,60,0.12)' },
                        { offset: 1, color: 'rgba(255,60,60,0)' }
                    ])
                }
            }]
        });
        bindResize(mainLoadChart);
    }

    // ===== 2. 实时趋势图（右下卡片） =====
    var dom2 = document.getElementById('real-time-chart');
    if (dom2) {
        realTimeChart = echarts.init(dom2);
        e2.setOption({
            backgroundColor: 'transparent',
            grid: { left: 38, right: 18, top: 14, bottom: 26 },
            xAxis: {
                data: ['0', '20', '40', '60', '80', '100', '120'],
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: labelColor, fontSize: 10 }
            },
            yAxis: {
                min: 0, max: 180,
                axisLine: { lineStyle: { color: axisColor } },
                axisTick: { show: false },
                axisLabel: { color: labelColor, fontSize: 10 },
                splitLine: { lineStyle: { color: gridColor } }
            },
            series: [{
                type: 'line',
                data: [82, 92, 98, 102, 99, 95, 90],
                lineStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#00e07a' },
                        { offset: 0.5, color: '#00ff88' },
                        { offset: 1, color: '#ff9800' }
                    ]),
                    width: 2
                },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(0,224,122,0.3)' },
                        { offset: 1, color: 'rgba(0,224,122,0.02)' }
                    ])
                },
                symbol: 'none',
                smooth: true
            }]
        });
        bindResize(realTimeChart);
    }
});

function bindResize(chart) {
    window.addEventListener('resize', function () {
        try { chart.resize(); } catch (e) { /* ignore */ }
    });
}
