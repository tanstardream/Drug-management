// 数据分析页面逻辑

let charts = {};
let currentDateRange = { start: null, end: null };

// 页面加载时初始化
window.onload = function() {
    DataLogic.loadData();
    initCharts();
    
    // 创建日期范围选择器
    UIUtils.DateRangePicker.create('dateRangePicker', (start, end) => {
        currentDateRange = { start, end };
        loadData();
    });
    
    loadData();
    
    // 自动刷新（每30秒）
    setInterval(refreshData, 30000);
};

// 初始化图表
function initCharts() {
    // 库存分布图
    const stockCtx = document.getElementById('stockChart').getContext('2d');
    charts.stock = new Chart(stockCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '当前库存',
                data: [],
                backgroundColor: 'rgba(0, 86, 179, 0.6)',
                borderColor: 'rgba(0, 86, 179, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '药品库存分布'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 出入库趋势图
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '入库',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1
            }, {
                label: '出库',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '出入库趋势'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // 库存价值分布
    const valueCtx = document.getElementById('valueChart').getContext('2d');
    charts.value = new Chart(valueCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '库存价值分布 TOP 5'
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // 月度对比
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    charts.monthly = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '入库量',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }, {
                label: '出库量',
                data: [],
                backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '月度出入库对比'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 加载数据并更新界面
function loadData() {
    const drugs = DataLogic.getDrugs();
    const records = DataLogic.getRecords();
    
    if (drugs.length === 0) {
        document.getElementById('updateTime').textContent = '未找到数据，请先在主系统中添加数据';
        return;
    }
    
    // 根据日期范围过滤记录
    let filteredRecords = records;
    if (currentDateRange.start && currentDateRange.end) {
        const startDate = new Date(currentDateRange.start);
        const endDate = new Date(currentDateRange.end);
        endDate.setHours(23, 59, 59, 999); // 包含结束日期的全天
        
        filteredRecords = records.filter(record => {
            const recordDate = new Date(record.timestamp);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }
    
    // 计算统计数据
    updateStatistics(drugs, filteredRecords);
    updateCharts(drugs, filteredRecords);
    updateTables(drugs, filteredRecords);
    
    // 更新时间
    document.getElementById('updateTime').textContent = `数据更新时间：${new Date().toLocaleString('zh-CN')}`;
}

// 更新统计数据
function updateStatistics(drugs, records) {
    const stats = DataLogic.calculateStatistics();
    
    document.getElementById('totalDrugs').textContent = stats.totalDrugs;
    document.getElementById('totalStock').textContent = stats.totalStock;
    document.getElementById('totalValue').textContent = stats.totalValue.toFixed(2);
    document.getElementById('lowStockCount').textContent = stats.lowStockCount;
    
    // 计算选定时间范围内的统计
    let rangeIn = 0;
    let rangeOut = 0;
    
    records.forEach(record => {
        if (record.type === 'IN') {
            rangeIn += record.quantity;
        } else {
            rangeOut += record.quantity;
        }
    });
    
    document.getElementById('monthlyIn').textContent = rangeIn;
    document.getElementById('monthlyOut').textContent = rangeOut;
}

// 更新图表
function updateCharts(drugs, records) {
    // 1. 库存分布图
    const stockData = drugs.map(drug => ({
        name: drug.name,
        stock: drug.currentStock
    })).sort((a, b) => b.stock - a.stock).slice(0, 10);
    
    charts.stock.data.labels = stockData.map(d => d.name);
    charts.stock.data.datasets[0].data = stockData.map(d => d.stock);
    charts.stock.update();
    
    // 2. 出入库趋势
    const trendData = calculateTrend(records);
    charts.trend.data.labels = trendData.labels;
    charts.trend.data.datasets[0].data = trendData.inData;
    charts.trend.data.datasets[1].data = trendData.outData;
    charts.trend.update();
    
    // 3. 库存价值分布
    const valueData = drugs.map(drug => {
        const price = DataLogic.getRecentPrice(drug.id) || drug.defaultPrice;
        return {
            name: drug.name,
            value: drug.currentStock * price
        };
    }).sort((a, b) => b.value - a.value).slice(0, 5);
    
    charts.value.data.labels = valueData.map(d => d.name);
    charts.value.data.datasets[0].data = valueData.map(d => d.value);
    charts.value.update();
    
    // 4. 月度对比
    const monthlyData = calculateMonthlyData(records);
    charts.monthly.data.labels = monthlyData.labels;
    charts.monthly.data.datasets[0].data = monthlyData.inData;
    charts.monthly.data.datasets[1].data = monthlyData.outData;
    charts.monthly.update();
}

// 更新表格
function updateTables(drugs, records) {
    // 低库存表格
    const lowStockDrugs = drugs
        .filter(d => d.currentStock <= 10)
        .sort((a, b) => a.currentStock - b.currentStock);
    
    const lowStockTable = document.getElementById('lowStockTable');
    if (lowStockDrugs.length > 0) {
        lowStockTable.innerHTML = lowStockDrugs.map(drug => `
            <tr>
                <td>${drug.name}</td>
                <td>${drug.spec || '-'}</td>
                <td class="warning">${drug.currentStock}</td>
                <td>${drug.defaultPrice.toFixed(2)}</td>
                <td>${Math.max(20 - drug.currentStock, 10)}</td>
            </tr>
        `).join('');
    } else {
        lowStockTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">暂无低库存药品</td></tr>';
    }
    
    // 高频使用药品
    const topDrugs = calculateTopDrugs(drugs, records);
    const topDrugsTable = document.getElementById('topDrugsTable');
    if (topDrugs.length > 0) {
        topDrugsTable.innerHTML = topDrugs.map(drug => {
            const stockStatus = drug.stock <= 10 ? '<span class="warning">库存不足</span>' : 
                               drug.stock <= 20 ? '<span style="color: orange;">库存偏低</span>' : 
                               '<span class="success">库存充足</span>';
            return `
                <tr>
                    <td>${drug.name}</td>
                    <td>${drug.monthlyOut}</td>
                    <td>${drug.outCount}</td>
                    <td>${drug.stock}</td>
                    <td>${stockStatus}</td>
                </tr>
            `;
        }).join('');
    }
    
    // 初始化表格排序
    UIUtils.TableSort.init('lowStockTableContainer');
    UIUtils.TableSort.init('topDrugsTableContainer');
}

// 计算趋势数据
function calculateTrend(records) {
    const dayGroups = {};
    const today = new Date();
    
    // 根据时间范围确定天数
    let days = 7;
    if (currentDateRange.start && currentDateRange.end) {
        const start = new Date(currentDateRange.start);
        const end = new Date(currentDateRange.end);
        days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        days = Math.min(days, 30); // 最多显示30天
    }
    
    // 初始化日期
    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toLocaleDateString('zh-CN');
        dayGroups[dateStr] = { in: 0, out: 0 };
    }
    
    // 统计每天的出入库
    records.forEach(record => {
        const date = new Date(record.timestamp).toLocaleDateString('zh-CN');
        if (dayGroups[date]) {
            if (record.type === 'IN') {
                dayGroups[date].in += record.quantity;
            } else {
                dayGroups[date].out += record.quantity;
            }
        }
    });
    
    // 转换为图表数据
    const labels = Object.keys(dayGroups);
    const inData = labels.map(date => dayGroups[date].in);
    const outData = labels.map(date => dayGroups[date].out);
    
    return { labels, inData, outData };
}

// 计算月度数据
function calculateMonthlyData(records) {
    const monthGroups = {};
    const months = [];
    
    // 生成最近6个月
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        months.push(monthStr);
        monthGroups[monthStr] = { in: 0, out: 0 };
    }
    
    // 统计每月的出入库
    records.forEach(record => {
        const date = new Date(record.timestamp);
        const monthStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        if (monthGroups[monthStr]) {
            if (record.type === 'IN') {
                monthGroups[monthStr].in += record.quantity;
            } else {
                monthGroups[monthStr].out += record.quantity;
            }
        }
    });
    
    // 转换为图表数据
    const inData = months.map(month => monthGroups[month].in);
    const outData = months.map(month => monthGroups[month].out);
    
    return { labels: months, inData, outData };
}

// 计算高频使用药品
function calculateTopDrugs(drugs, records) {
    const drugUsage = {};
    
    // 统计出库情况
    records.forEach(record => {
        if (record.type === 'OUT') {
            if (!drugUsage[record.drugId]) {
                drugUsage[record.drugId] = {
                    quantity: 0,
                    count: 0
                };
            }
            drugUsage[record.drugId].quantity += record.quantity;
            drugUsage[record.drugId].count++;
        }
    });
    
    // 生成排行数据
    const topDrugs = [];
    Object.keys(drugUsage).forEach(drugId => {
        const drug = DataLogic.getDrugById(drugId);
        if (drug && drug.isActive) {
            topDrugs.push({
                name: drug.name,
                monthlyOut: drugUsage[drugId].quantity,
                outCount: drugUsage[drugId].count,
                stock: drug.currentStock
            });
        }
    });
    
    // 排序并返回前10
    return topDrugs
        .sort((a, b) => b.monthlyOut - a.monthlyOut)
        .slice(0, 10);
}

// 刷新数据
function refreshData() {
    loadData();
}

// 处理脚本上传
document.getElementById('scriptUploadInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.py')) {
        UIUtils.Toast.warning('分析脚本更新功能将在后续版本中实现');
    }
    e.target.value = '';
});