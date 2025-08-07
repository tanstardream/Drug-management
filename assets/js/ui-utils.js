// UI工具模块 - 提供Toast通知和Modal对话框功能

const UIUtils = (function() {
    'use strict';
    
    // Toast通知
    const Toast = {
        show: function(message, type = 'info', duration = 3000) {
            // 移除已存在的toast
            const existingToast = document.querySelector('.toast');
            if (existingToast) {
                existingToast.remove();
            }
            
            // 创建新的toast
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // 触发显示动画
            setTimeout(() => toast.classList.add('show'), 10);
            
            // 自动隐藏
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        },
        
        success: function(message, duration) {
            this.show(message, 'success', duration);
        },
        
        error: function(message, duration) {
            this.show(message, 'error', duration);
        },
        
        warning: function(message, duration) {
            this.show(message, 'warning', duration);
        }
    };
    
    // Modal对话框
    const Modal = {
        create: function(options) {
            const defaults = {
                title: '提示',
                content: '',
                confirmText: '确定',
                cancelText: '取消',
                showCancel: true,
                onConfirm: null,
                onCancel: null
            };
            
            const settings = Object.assign({}, defaults, options);
            
            // 创建modal结构
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // 创建header
            const header = document.createElement('div');
            header.className = 'modal-header';
            
            const title = document.createElement('h3');
            title.textContent = settings.title;
            title.style.margin = '0';
            
            const closeBtn = document.createElement('span');
            closeBtn.className = 'modal-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => this.close(modal, settings.onCancel);
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            // 创建内容区
            const body = document.createElement('div');
            body.className = 'modal-body';
            body.innerHTML = settings.content;
            
            // 创建按钮区
            const buttons = document.createElement('div');
            buttons.className = 'modal-buttons';
            
            if (settings.showCancel) {
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-secondary';
                cancelBtn.textContent = settings.cancelText;
                cancelBtn.onclick = () => this.close(modal, settings.onCancel);
                buttons.appendChild(cancelBtn);
            }
            
            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn';
            confirmBtn.textContent = settings.confirmText;
            confirmBtn.onclick = () => {
                if (settings.onConfirm) {
                    const result = settings.onConfirm();
                    if (result !== false) {
                        this.close(modal);
                    }
                } else {
                    this.close(modal);
                }
            };
            buttons.appendChild(confirmBtn);
            
            // 组装modal
            modalContent.appendChild(header);
            modalContent.appendChild(body);
            modalContent.appendChild(buttons);
            modal.appendChild(modalContent);
            
            // 点击背景关闭
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.close(modal, settings.onCancel);
                }
            };
            
            // 添加到页面
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            return modal;
        },
        
        close: function(modal, callback) {
            if (callback) callback();
            modal.style.display = 'none';
            modal.remove();
        },
        
        confirm: function(message, onConfirm, onCancel) {
            return this.create({
                title: '确认',
                content: message,
                onConfirm: onConfirm,
                onCancel: onCancel
            });
        },
        
        alert: function(message, onClose) {
            return this.create({
                title: '提示',
                content: message,
                showCancel: false,
                onConfirm: onClose
            });
        },
        
        prompt: function(message, defaultValue = '', onConfirm, onCancel) {
            const inputId = 'modal-input-' + Date.now();
            const content = `
                <p>${message}</p>
                <input type="text" id="${inputId}" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" value="${defaultValue}">
            `;
            
            return this.create({
                title: '输入',
                content: content,
                onConfirm: () => {
                    const value = document.getElementById(inputId).value;
                    if (onConfirm) {
                        return onConfirm(value);
                    }
                },
                onCancel: onCancel
            });
        }
    };
    
    // 表格排序功能
    const TableSort = {
        init: function(tableId) {
            const table = document.getElementById(tableId);
            if (!table) return;
            
            const headers = table.querySelectorAll('th');
            headers.forEach((header, index) => {
                // 跳过操作列
                if (header.textContent === '操作') return;
                
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                
                // 添加排序图标
                const sortIcon = document.createElement('span');
                sortIcon.style.marginLeft = '5px';
                sortIcon.innerHTML = '↕';
                header.appendChild(sortIcon);
                
                let sortOrder = 0; // 0: 未排序, 1: 升序, -1: 降序
                
                header.addEventListener('click', () => {
                    // 切换排序顺序
                    sortOrder = sortOrder === 1 ? -1 : 1;
                    
                    // 更新图标
                    sortIcon.innerHTML = sortOrder === 1 ? '↑' : '↓';
                    
                    // 获取表格数据
                    const tbody = table.querySelector('tbody');
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    
                    // 排序
                    rows.sort((a, b) => {
                        const cellA = a.cells[index].textContent;
                        const cellB = b.cells[index].textContent;
                        
                        // 尝试数字比较
                        const numA = parseFloat(cellA);
                        const numB = parseFloat(cellB);
                        
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return (numA - numB) * sortOrder;
                        }
                        
                        // 字符串比较
                        return cellA.localeCompare(cellB, 'zh-CN') * sortOrder;
                    });
                    
                    // 重新排列行
                    rows.forEach(row => tbody.appendChild(row));
                    
                    // 重置其他列的图标
                    headers.forEach((h, i) => {
                        if (i !== index) {
                            const icon = h.querySelector('span');
                            if (icon) icon.innerHTML = '↕';
                        }
                    });
                });
            });
        }
    };
    
    // 日期范围选择器
    const DateRangePicker = {
        create: function(containerId, onChange) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const html = `
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
                    <label>开始日期：</label>
                    <input type="date" id="startDate" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                    <label>结束日期：</label>
                    <input type="date" id="endDate" style="padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                    <button class="btn btn-secondary" id="applyDateRange">应用</button>
                    <button class="btn btn-secondary" id="resetDateRange">重置</button>
                </div>
            `;
            
            container.innerHTML = html;
            
            // 设置默认值（最近30天）
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
            
            // 事件处理
            document.getElementById('applyDateRange').onclick = () => {
                const start = document.getElementById('startDate').value;
                const end = document.getElementById('endDate').value;
                if (onChange) onChange(start, end);
            };
            
            document.getElementById('resetDateRange').onclick = () => {
                document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
                document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
                if (onChange) onChange(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
            };
        }
    };
    
    // 公开API
    return {
        Toast,
        Modal,
        TableSort,
        DateRangePicker
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIUtils;
}