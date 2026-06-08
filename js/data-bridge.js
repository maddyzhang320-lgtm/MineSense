/* ============================================
   矿盾 · 数据桥接层
   连接 ESP32 WebSocket 或回退到模拟数据
   ============================================ */

(function () {
    'use strict';

    // ===== 配置 =====
    var ESP32_IP = '192.168.42.176';   // ESP32 STA 模式 IP
    var ESP32_PORT = 81;
    var WS_URL = 'ws://' + ESP32_IP + ':' + ESP32_PORT;

    // ===== 状态 =====
    var connected = false;
    var ws = null;
    var reconnectTimer = null;
    var listeners = {};   // { key: [callback, ...] }
    var latestData = {};  // 最新一次收到的完整数据

    // ===== 模拟数据生成器（ESP32 未连接时使用） =====
    function rand(min, max, decimals) {
        var val = min + Math.random() * (max - min);
        var factor = Math.pow(10, decimals || 1);
        return Math.round(val * factor) / factor;
    }

    function generateMockData() {
        return {
            temp:             rand(26, 30, 1),
            humidity:         rand(45, 65, 1),
            roller_temp:      rand(75, 92, 1),
            motor_speed:      rand(96, 104, 1),
            bearing_vib:      rand(0.8, 1.8, 1),
            belt_speed:       rand(20, 26, 1),
            belt_deviation:   rand(30, 36, 1),
            co_ppm:           rand(22, 30, 1),
            ch4_pct:          rand(0.28, 0.35, 2),
            o2_pct:           rand(20.6, 20.9, 1),
            load_vol:         rand(92, 115, 0),
            load_weight:      rand(305, 330, 0),
            load_volume:      rand(7, 11, 0),
            load_real:        rand(93, 98, 0),
            rate_s701:        rand(98, 100, 1),
            rate_1018:        rand(97, 100, 1),
            rate_8128:        rand(98, 100, 1),
            rate_cw1:         rand(95, 100, 1),
            rate_bwt:         rand(97, 100, 1),
            rate_hdc:         rand(94, 100, 1),
            granularity:      rand(6.2, 7.4, 1),
            composition:      rand(16, 20, 0),
            water_content:    rand(12, 16, 0),
            density:          rand(6.8, 8.0, 1),
            stability:        rand(13, 17, 0),
            hardness:         rand(3, 5, 0),
            co_history:       genHistory(12, 22, 30, 1),
            ch4_history:      genHistory(12, 0.20, 0.35, 2),
            temp_history:     genHistory(12, 60, 92, 1),
            roller_total:     1280,
            roller_normal:    rand(98.0, 98.8, 1),
            roller_fault:     rand(3, 7, 0),
            roller_plan:      rand(10, 15, 0),
            freq_vib:         rand(13.0, 15.5, 1),
            friction:         rand(0.38, 0.46, 2)
        };
    }

    function genHistory(len, min, max, decimals) {
        var arr = [];
        for (var i = 0; i < len; i++) {
            arr.push(rand(min, max, decimals));
        }
        return arr;
    }

    // ===== WebSocket 连接 =====
    function connect() {
        if (ws) {
            try { ws.close(); } catch (e) {}
        }

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            console.warn('[DataBridge] WebSocket 创建失败，使用模拟数据');
            fallbackToMock();
            return;
        }

        ws.onopen = function () {
            connected = true;
            console.log('[DataBridge] ESP32 已连接 (' + WS_URL + ')');
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            // 通知监听者连接状态变化
            notify('$connect', { connected: true });
        };

        ws.onmessage = function (e) {
            try {
                var data = JSON.parse(e.data);
                latestData = data;
                // 通知所有监听者
                notify('$data', data);
                // 也按字段通知
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        notify(key, data[key], data);
                    }
                }
            } catch (err) {
                console.warn('[DataBridge] JSON 解析失败:', err);
            }
        };

        ws.onclose = function () {
            connected = false;
            console.warn('[DataBridge] 连接断开，3秒后重连...');
            notify('$connect', { connected: false });
            reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = function () {
            // onclose 会接着触发，这里只记录
            console.warn('[DataBridge] WebSocket 连接失败');
        };
    }

    function fallbackToMock() {
        connected = false;
        notify('$connect', { connected: false });

        // 每 2 秒用模拟数据更新一次
        setInterval(function () {
            if (!connected) {
                var data = generateMockData();
                latestData = data;
                notify('$data', data);
                for (var key in data) {
                    if (data.hasOwnProperty(key)) {
                        notify(key, data[key], data);
                    }
                }
            }
        }, 2000);

        // 立即推送一次
        var data = generateMockData();
        latestData = data;
        notify('$data', data);
    }

    // ===== 事件系统 =====
    function notify(key, value, fullData) {
        var list = listeners[key];
        if (!list) return;
        for (var i = 0; i < list.length; i++) {
            try {
                list[i](value, fullData || latestData);
            } catch (e) {
                console.warn('[DataBridge] 回调异常 (' + key + '):', e);
            }
        }
    }

    // ===== 公开 API =====
    window.DataBridge = {
        // 监听特定字段变化
        on: function (key, callback) {
            if (!listeners[key]) listeners[key] = [];
            listeners[key].push(callback);
            // 如果已有缓存数据，立即回调一次
            if (latestData && key !== '$data' && key !== '$connect' && latestData.hasOwnProperty(key)) {
                setTimeout(function () {
                    callback(latestData[key], latestData);
                }, 0);
            }
        },

        // 监听所有数据变化
        onData: function (callback) {
            this.on('$data', callback);
        },

        // 监听连接状态
        onConnect: function (callback) {
            this.on('$connect', callback);
            // 立即通知当前状态
            setTimeout(function () {
                callback({ connected: connected });
            }, 0);
        },

        // 获取最新数据快照
        getData: function () {
            return latestData;
        },

        // 是否已连接
        isConnected: function () {
            return connected;
        },

        // 设置 ESP32 地址并重连
        setServer: function (ip, port) {
            ESP32_IP = ip;
            ESP32_PORT = port || 81;
            WS_URL = 'ws://' + ESP32_IP + ':' + ESP32_PORT;
            connect();
        }
    };

    // ===== 启动 =====
    // 页面加载后自动尝试连接 ESP32
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            connect();
            // 如果 3 秒内没连上，切到模拟数据
            setTimeout(function () {
                if (!connected) fallbackToMock();
            }, 3000);
        });
    } else {
        connect();
        setTimeout(function () {
            if (!connected) fallbackToMock();
        }, 3000);
    }
    // ==========================================
    //  高温告警模块
    //  芯片温度 > 38°C 橙色预警  > 42°C 红色危险
    // ==========================================
    var tempAlert = {
        WARN_THRESHOLD:   38,
        DANGER_THRESHOLD: 42,
        CLEAR_THRESHOLD:  35,
        currentLevel: '',
        popup: null,
        dismissed: false,

        init: function () {
            DataBridge.on('chip_temp', function (val) {
                tempAlert.check(val);
            });
        },

        check: function (temp) {
            if (temp < this.CLEAR_THRESHOLD) {
                if (this.currentLevel !== '') {
                    this.close();
                    this.currentLevel = '';
                    this.dismissed = false;
                }
                return;
            }
            if (this.dismissed) return;

            var level = '';
            if (temp >= this.DANGER_THRESHOLD) level = 'danger';
            else if (temp >= this.WARN_THRESHOLD) level = 'warn';

            if (level && level !== this.currentLevel) {
                this.currentLevel = level;
                this.show(level, temp);
            } else if (level && level === this.currentLevel && this.popup) {
                this.update(temp);
            }
        },

        show: function (level, temp) {
            this.close();
            var overlay = document.createElement('div');
            overlay.className = 'alert-overlay';
            var pct = Math.min(temp / this.DANGER_THRESHOLD * 100, 100);
            var icon  = level === 'danger' ? '🔴' : '🟠';
            var title = level === 'danger' ? '高温危险报警' : '温度异常预警';
            overlay.innerHTML =
                '<div class="alert-popup ' + level + '">' +
                '<div class="alert-header">' +
                '<span class="alert-icon">' + icon + '</span>' +
                '<span class="alert-title">' + title + '</span>' +
                '</div>' +
                '<div class="alert-body">' +
                '<div class="alert-row">' +
                '<span class="ar-label">芯片温度</span>' +
                '<span class="ar-value hot">' + temp.toFixed(1) + ' °C</span>' +
                '</div>' +
                '<div class="alert-bar">' +
                '<div class="alert-bar-fill" style="width:' + pct + '%;"></div>' +
                '</div>' +
                '<div class="alert-row">' +
                '<span class="ar-label">预警阈值</span>' +
                '<span class="ar-value">' + this.WARN_THRESHOLD + ' °C</span>' +
                '</div>' +
                '<div class="alert-row">' +
                '<span class="ar-label">危险阈值</span>' +
                '<span class="ar-value" style="color:#ff3b3b;">' + this.DANGER_THRESHOLD + ' °C</span>' +
                '</div>' +
                '</div>' +
                '<button class="alert-btn confirm" onclick="document.querySelector(\'.alert-overlay\').remove();DataBridge._dismissAlert();">确认已知</button>' +
                '</div>';
            document.body.appendChild(overlay);
            this.popup = overlay;
        },

        update: function (temp) {
            if (!this.popup) return;
            var hot = this.popup.querySelector('.ar-value.hot');
            if (hot) hot.textContent = temp.toFixed(1) + ' °C';
            var bar = this.popup.querySelector('.alert-bar-fill');
            if (bar) bar.style.width = Math.min(temp / this.DANGER_THRESHOLD * 100, 100) + '%';
        },

        close: function () {
            if (this.popup) { this.popup.remove(); this.popup = null; }
        },

        dismiss: function () {
            this.dismissed = true;
            this.close();
        }
    };

    DataBridge._dismissAlert = function () { tempAlert.dismiss(); };
    tempAlert.init();

})();
